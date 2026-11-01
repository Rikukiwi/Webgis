"""
gcn_lstm_torch.py
==================
GCN-LSTM THẬT (thay thế bản giả lập cũ trong models_ai.py).

Kiến trúc:
  - GCN layer: khuếch tán đặc trưng giữa các trạm lân cận qua ma trận kề
    chuẩn hoá đối xứng A_hat = D^-1/2 (A + I) D^-1/2 (kiểu Kipf & Welling 2017).
  - LSTM: học quy luật chuỗi thời gian trên chuỗi đặc trưng đã qua GCN,
    trọng số LSTM dùng chung cho mọi trạm (node).
  - Dự báo bước kế tiếp (next-step forecasting): từ seq_len bước quá khứ,
    dự đoán LST ở bước kế tiếp cho TẤT CẢ các trạm cùng lúc.

KHÔNG dùng giá trị thật của tập val/test để chỉnh sửa dự đoán (không có
data leakage như bản cũ).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


FEATURE_COLS = ["gia_tri_lst", "ndvi", "luong_mua", "do_am_dat", "month_sin", "month_cos"]


def build_adjacency(coords: np.ndarray, k: int = 4) -> np.ndarray:
    """
    coords: (N, 2) mảng [kinh_do, vi_do] của từng trạm.
    Trả về ma trận kề chuẩn hoá A_hat (N, N), dùng k-NN theo khoảng cách Euclid.
    """
    n = coords.shape[0]
    k = min(k, n - 1) if n > 1 else 0

    dist = np.sqrt(((coords[:, None, :] - coords[None, :, :]) ** 2).sum(-1))  # (N,N)
    A = np.zeros((n, n), dtype=np.float64)

    if k > 0:
        for i in range(n):
            order = np.argsort(dist[i])
            order = order[order != i][:k]
            for j in order:
                w = 1.0 / (dist[i, j] + 1e-6)
                A[i, j] = w
                A[j, i] = w  # đối xứng hoá

    A_tilde = A + np.eye(n)  # self-loop
    deg = A_tilde.sum(axis=1)
    deg_inv_sqrt = np.zeros_like(deg)
    np.power(deg, -0.5, where=deg > 0, out=deg_inv_sqrt)
    D_inv_sqrt = np.diag(deg_inv_sqrt)
    A_hat = D_inv_sqrt @ A_tilde @ D_inv_sqrt
    return A_hat


def pivot_to_tensor(df: pd.DataFrame):
    """
    Biến df dạng (point, date, feature...) thành:
      - X: mảng (T, N, F) đã điền thiếu bằng ffill/bfill theo từng trạm
      - dates: danh sách ngày đã sort tăng dần (len T)
      - stations: danh sách (kinh_do, vi_do) theo đúng thứ tự trục N
    """
    df = df.copy()
    df["thoi_gian_dt"] = pd.to_datetime(df["thoi_gian"])
    df["station"] = list(zip(df["kinh_do"], df["vi_do"]))

    dates = sorted(df["thoi_gian_dt"].unique())
    stations = sorted(df["station"].unique())
    date_idx = {d: i for i, d in enumerate(dates)}
    station_idx = {s: i for i, s in enumerate(stations)}

    T, N, Fdim = len(dates), len(stations), len(FEATURE_COLS)
    X = np.full((T, N, Fdim), np.nan, dtype=np.float64)

    for row in df.itertuples(index=False):
        ti = date_idx[row.thoi_gian_dt]
        si = station_idx[row.station]
        for fi, col in enumerate(FEATURE_COLS):
            X[ti, si, fi] = getattr(row, col)

    # Điền thiếu: ffill rồi bfill theo trục thời gian, cho từng trạm/đặc trưng
    for si in range(N):
        for fi in range(Fdim):
            series = pd.Series(X[:, si, fi])
            series = series.ffill().bfill()
            X[:, si, fi] = series.fillna(0.0).values

    coords = np.array(stations, dtype=np.float64)  # (N, 2) = [kinh_do, vi_do]
    return X, dates, coords


def make_windows(X: np.ndarray, seq_len: int):
    """
    X: (T, N, F). Trả về (inputs, targets):
      inputs:  (num_samples, seq_len, N, F)
      targets: (num_samples, N)   -- LST (cột 0 của FEATURE_COLS) ở bước kế tiếp
    """
    T = X.shape[0]
    inputs, targets = [], []
    for t in range(seq_len, T):
        inputs.append(X[t - seq_len:t])     # seq_len bước quá khứ
        targets.append(X[t, :, 0])          # LST thật ở bước t (chỉ dùng để tính loss, KHÔNG đưa vào input)
    if not inputs:
        return np.empty((0, seq_len, X.shape[1], X.shape[2])), np.empty((0, X.shape[1]))
    return np.stack(inputs), np.stack(targets)


if TORCH_AVAILABLE:

    class _GCNLayer(nn.Module):
        def __init__(self, in_f: int, out_f: int):
            super().__init__()
            self.lin = nn.Linear(in_f, out_f)

        def forward(self, x: "torch.Tensor", a_hat: "torch.Tensor") -> "torch.Tensor":
            # x: (B, N, in_f), a_hat: (N, N)
            support = self.lin(x)                 # (B, N, out_f)
            out = torch.matmul(a_hat, support)     # khuếch tán qua đồ thị: (B, N, out_f)
            return torch.relu(out)

    class GCNLSTM(nn.Module):
        def __init__(self, in_features: int, gcn_hidden: int = 16, lstm_hidden: int = 32):
            super().__init__()
            self.gcn = _GCNLayer(in_features, gcn_hidden)
            self.lstm = nn.LSTM(gcn_hidden, lstm_hidden, batch_first=True)
            self.out = nn.Linear(lstm_hidden, 1)

        def forward(self, x_seq: "torch.Tensor", a_hat: "torch.Tensor") -> "torch.Tensor":
            # x_seq: (B, T, N, F)
            B, T, N, _ = x_seq.shape
            gcn_outs = [self.gcn(x_seq[:, t], a_hat) for t in range(T)]
            gcn_seq = torch.stack(gcn_outs, dim=1)                      # (B, T, N, gcn_hidden)
            gcn_seq = gcn_seq.permute(0, 2, 1, 3).reshape(B * N, T, -1)  # mỗi trạm thành 1 chuỗi riêng, LSTM dùng chung trọng số
            lstm_out, _ = self.lstm(gcn_seq)                            # (B*N, T, lstm_hidden)
            last = lstm_out[:, -1, :]                                   # trạng thái cuối chuỗi
            pred = self.out(last).reshape(B, N)                         # (B, N) dự báo LST bước kế tiếp
            return pred


def _standardize_fit(X_train: np.ndarray):
    """Z-score fit CHỈ trên tập train (tránh rò rỉ dữ liệu), áp dụng theo từng đặc trưng."""
    mean = X_train.reshape(-1, X_train.shape[-1]).mean(axis=0)
    std = X_train.reshape(-1, X_train.shape[-1]).std(axis=0)
    std[std < 1e-6] = 1.0
    return mean, std


def _standardize_apply(X: np.ndarray, mean: np.ndarray, std: np.ndarray) -> np.ndarray:
    return (X - mean) / std


def train_gcn_lstm(
    df: pd.DataFrame,
    train_end_date: str,
    val_end_date: str,
    seq_len: int = 8,
    gcn_hidden: int = 16,
    lstm_hidden: int = 32,
    epochs: int = 40,
    lr: float = 0.01,
    k_neighbors: int = 4,
):
    """
    Huấn luyện GCN-LSTM thật, chia TRAIN/VAL/TEST theo mốc thời gian
    (không theo vị trí dòng như bản cũ), và KHÔNG dùng y_test để chỉnh sửa
    kết quả dự đoán.
    """
    if not TORCH_AVAILABLE:
        raise ImportError(
            "Thiếu thư viện 'torch' để chạy GCN-LSTM thật. "
            "Cài bằng: pip install torch (xem requirements.txt)."
        )

    df = df.copy()
    df["thoi_gian"] = pd.to_datetime(df["thoi_gian"])
    df["month"] = df["thoi_gian"].dt.month
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    for col in ["ndvi", "luong_mua", "do_am_dat"]:
        if col not in df.columns:
            df[col] = 0.0
        df[col] = df[col].fillna(df[col].median() if not df[col].isna().all() else 0.0)

    X, dates, coords = pivot_to_tensor(df)
    dates = pd.to_datetime(dates)
    train_end = pd.to_datetime(train_end_date)
    val_end = pd.to_datetime(val_end_date)

    train_mask = dates <= train_end
    val_mask = (dates > train_end) & (dates <= val_end)
    test_mask = dates > val_end

    if train_mask.sum() <= seq_len:
        raise ValueError(
            f"Không đủ dữ liệu TRAIN trước {train_end_date} để tạo cửa sổ {seq_len} bước "
            f"(chỉ có {int(train_mask.sum())} mốc thời gian)."
        )

    # Chuẩn hoá: fit trên TRAIN, áp dụng cho cả 3 tập (đúng nguyên tắc chống rò rỉ)
    mean, std = _standardize_fit(X[train_mask])
    X_norm = _standardize_apply(X, mean, std)
    lst_mean, lst_std = mean[0], std[0]  # để un-standardize dự báo LST (feature 0)

    a_hat = build_adjacency(coords, k=k_neighbors)

    # Cửa sổ trượt được tạo trên TOÀN BỘ chuỗi đã chuẩn hoá, sau đó lọc theo
    # ngày của NHÃN (target date) để đảm bảo input của 1 mẫu test không
    # "nhìn thấy" nhãn test khác, và KHÔNG mẫu nào có input vượt quá ngày hiện tại của nó.
    X_all, y_all = make_windows(X_norm, seq_len)
    target_dates = dates[seq_len:]  # ngày tương ứng với mỗi target trong X_all/y_all

    train_idx = np.where(target_dates <= train_end)[0]
    val_idx = np.where((target_dates > train_end) & (target_dates <= val_end))[0]
    test_idx = np.where(target_dates > val_end)[0]

    if len(val_idx) == 0 or len(test_idx) == 0:
        raise ValueError(
            "Không đủ dữ liệu để tạo tập VAL/TEST cho GCN-LSTM với seq_len="
            f"{seq_len}. Hãy giảm seq_len hoặc nạp thêm dữ liệu."
        )

    device = torch.device("cpu")
    model = GCNLSTM(in_features=X.shape[-1], gcn_hidden=gcn_hidden, lstm_hidden=lstm_hidden).to(device)
    a_hat_t = torch.tensor(a_hat, dtype=torch.float32, device=device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.MSELoss()

    X_train_t = torch.tensor(X_all[train_idx], dtype=torch.float32, device=device)
    y_train_t = torch.tensor(y_all[train_idx], dtype=torch.float32, device=device)

    best_val_loss = float("inf")
    best_state = None

    model.train()
    for epoch in range(epochs):
        optimizer.zero_grad()
        pred = model(X_train_t, a_hat_t)
        loss = loss_fn(pred, y_train_t)
        loss.backward()
        optimizer.step()

        # Theo dõi val loss để giữ lại checkpoint tốt nhất (early-stopping đơn giản)
        model.eval()
        with torch.no_grad():
            X_val_t = torch.tensor(X_all[val_idx], dtype=torch.float32, device=device)
            y_val_t = torch.tensor(y_all[val_idx], dtype=torch.float32, device=device)
            val_pred = model(X_val_t, a_hat_t)
            val_loss = loss_fn(val_pred, y_val_t).item()
        model.train()

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {k: v.clone() for k, v in model.state_dict().items()}

    if best_state is not None:
        model.load_state_dict(best_state)

    def _predict_unstandardized(idx):
        model.eval()
        with torch.no_grad():
            Xt = torch.tensor(X_all[idx], dtype=torch.float32, device=device)
            pred_norm = model(Xt, a_hat_t).numpy()
        return pred_norm * lst_std + lst_mean  # un-standardize về độ C thật

    val_pred = _predict_unstandardized(val_idx).flatten()
    val_true = (y_all[val_idx] * lst_std + lst_mean).flatten()
    test_pred = _predict_unstandardized(test_idx).flatten()
    test_true = (y_all[test_idx] * lst_std + lst_mean).flatten()

    return {
        "val_pred": val_pred,
        "val_true": val_true,
        "test_pred": test_pred,
        "test_true": test_true,
        "num_stations": X.shape[1],
        "seq_len": seq_len,
        "epochs_run": epochs,
        "best_val_loss": round(float(best_val_loss), 5),
    }
