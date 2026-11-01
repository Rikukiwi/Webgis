"""
AI Models Engine for Land Surface Temperature (LST) Time-Series and Spatio-Temporal Forecasting
Includes:
1. ARIMA (Statsmodels)
2. Random Forest (Scikit-Learn)
3. XGBoost (XGBRegressor)
4. GCN-LSTM thật (xem gcn_lstm_torch.py — Graph Conv + LSTM, không phải giả lập)

Evaluation metrics: MAE, RMSE, R², MAPE.

QUAN TRỌNG — đã sửa 2 lỗi so với bản trước:
  1. GCN-LSTM trước đây không phải GCN/LSTM thật và còn dùng giá trị thật của
     tập test để "chỉnh" dự đoán (data leakage). Nay dùng module gcn_lstm_torch.py,
     không truy cập y_test khi suy luận.
  2. Random Forest / XGBoost / GCN-LSTM trước đây chia train/val/test bằng cách
     cắt theo VỊ TRÍ DÒNG sau khi sort theo (kinh_do, vi_do, thoi_gian) — tức là
     cắt theo TRẠM chứ không phải theo THỜI GIAN, làm rò rỉ dữ liệu tương lai.
     Nay chia đúng theo mốc ngày train_end_date / val_end_date, thống nhất với
     ARIMA và với preprocessor.chronological_split().
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from sklearn.ensemble import RandomForestRegressor
import xgboost as xgb
from statsmodels.tsa.arima.model import ARIMA

from gcn_lstm_torch import train_gcn_lstm

DEFAULT_TRAIN_END = "2023-12-31"
DEFAULT_VAL_END = "2024-12-31"


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    MAE  = (1/n) * sum(|y - y_hat|)
    RMSE = sqrt((1/n) * sum((y - y_hat)^2))
    R2   = 1 - sum((y - y_hat)^2) / sum((y - y_mean)^2)
    MAPE = (100/n) * sum(|y - y_hat| / |y|)
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    n = len(y_true)
    if n == 0:
        return {"mae": 0.0, "rmse": 0.0, "r2": 0.0, "mape": 0.0}

    diff = y_true - y_pred
    mae = float(np.mean(np.abs(diff)))
    rmse = float(np.sqrt(np.mean(diff ** 2)))

    y_mean = np.mean(y_true)
    ss_tot = np.sum((y_true - y_mean) ** 2)
    ss_res = np.sum(diff ** 2)
    r2 = float(1.0 - (ss_res / ss_tot)) if ss_tot > 1e-7 else 0.0

    non_zeros = np.abs(y_true) > 1e-4
    if np.any(non_zeros):
        mape = float(np.mean(np.abs(diff[non_zeros]) / np.abs(y_true[non_zeros])) * 100.0)
    else:
        mape = 0.0

    return {
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "r2": round(r2, 3),
        "mape": round(mape, 2),
    }


def _date_masks(dates: pd.Series, train_end_date: str, val_end_date: str):
    dates = pd.to_datetime(dates)
    train_end = pd.to_datetime(train_end_date)
    val_end = pd.to_datetime(val_end_date)
    train_mask = dates <= train_end
    val_mask = (dates > train_end) & (dates <= val_end)
    test_mask = dates > val_end
    return train_mask, val_mask, test_mask


def train_arima(
    series: pd.Series,
    order: Tuple[int, int, int] = (2, 1, 1),
    train_end_date: str = DEFAULT_TRAIN_END,
    val_end_date: str = DEFAULT_VAL_END,
):
    """
    series: index = ngày (datetime), value = LST trung bình toàn vùng tại ngày đó.
    Chia đúng theo mốc ngày (không theo tỉ lệ dòng).
    """
    series = series.copy()
    series.index = pd.to_datetime(series.index)
    series = series.sort_index()

    train_mask, val_mask, test_mask = _date_masks(series.index.to_series(), train_end_date, val_end_date)
    train_data = series[train_mask]
    val_data = series[val_mask]
    test_data = series[test_mask]

    if len(train_data) < 5 or len(val_data) == 0 or len(test_data) == 0:
        raise ValueError(
            f"Không đủ dữ liệu theo mốc thời gian train_end={train_end_date}, "
            f"val_end={val_end_date} để huấn luyện ARIMA "
            f"(train={len(train_data)}, val={len(val_data)}, test={len(test_data)})."
        )

    model = ARIMA(train_data, order=order)
    fitted = model.fit()
    val_pred = fitted.forecast(steps=len(val_data))

    # Refit trên train+val để dự báo test (đúng chuẩn walk-forward, không dùng y_test)
    model_test = ARIMA(pd.concat([train_data, val_data]), order=order)
    fitted_test = model_test.fit()
    test_pred = fitted_test.forecast(steps=len(test_data))

    val_metrics = calculate_metrics(val_data.values, np.asarray(val_pred))
    test_metrics = calculate_metrics(test_data.values, np.asarray(test_pred))

    return {
        "model": "ARIMA",
        "val_metrics": val_metrics,
        "test_metrics": test_metrics,
        "details": f"ARIMA{order} — train:{len(train_data)}, val:{len(val_data)}, test:{len(test_data)} mốc thời gian",
    }


def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Sinh đặc trưng dạng bảng cho RF/XGBoost:
    - lag_1, lag_2 (theo đúng thứ tự thời gian của TỪNG trạm)
    - toạ độ không gian: kinh_do, vi_do
    - khí hậu & thực vật: ndvi, luong_mua, do_am_dat
    - mùa vụ: month_sin, month_cos
    Trả về df đã thêm cột (giữ nguyên 'thoi_gian_dt' để lọc theo mốc sau này).
    """
    df = df.copy().sort_values(["kinh_do", "vi_do", "thoi_gian"])
    df["thoi_gian_dt"] = pd.to_datetime(df["thoi_gian"])
    df["month"] = df["thoi_gian_dt"].dt.month
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    df["lag_1"] = df.groupby(["kinh_do", "vi_do"])["gia_tri_lst"].shift(1)
    df["lag_2"] = df.groupby(["kinh_do", "vi_do"])["gia_tri_lst"].shift(2)
    df["lag_1"] = df["lag_1"].fillna(df["gia_tri_lst"].mean())
    df["lag_2"] = df["lag_2"].fillna(df["lag_1"])

    for col in ["ndvi", "luong_mua", "do_am_dat"]:
        if col not in df.columns:
            df[col] = np.nan
        df[col] = df[col].fillna(df[col].median() if not df[col].isna().all() else 0.0)

    return df


FEATURE_COLUMNS = ["kinh_do", "vi_do", "lag_1", "lag_2", "month_sin", "month_cos", "ndvi", "luong_mua", "do_am_dat"]


def _chronological_xy_split(df_feat: pd.DataFrame, train_end_date: str, val_end_date: str):
    train_mask, val_mask, test_mask = _date_masks(df_feat["thoi_gian_dt"], train_end_date, val_end_date)

    def _xy(mask):
        sub = df_feat[mask]
        return sub[FEATURE_COLUMNS], sub["gia_tri_lst"]

    X_train, y_train = _xy(train_mask)
    X_val, y_val = _xy(val_mask)
    X_test, y_test = _xy(test_mask)

    if len(X_train) == 0 or len(X_val) == 0 or len(X_test) == 0:
        raise ValueError(
            f"Không đủ dữ liệu theo mốc thời gian train_end={train_end_date}, "
            f"val_end={val_end_date} (train={len(X_train)}, val={len(X_val)}, test={len(X_test)})."
        )
    return X_train, y_train, X_val, y_val, X_test, y_test


def train_random_forest(
    df: pd.DataFrame,
    params: Dict[str, Any] = None,
    train_end_date: str = DEFAULT_TRAIN_END,
    val_end_date: str = DEFAULT_VAL_END,
):
    params = params or {"n_estimators": 100, "max_depth": 10, "random_state": 42}
    df_feat = extract_features(df)
    X_train, y_train, X_val, y_val, X_test, y_test = _chronological_xy_split(df_feat, train_end_date, val_end_date)

    rf = RandomForestRegressor(**params)
    rf.fit(X_train, y_train)

    val_pred = rf.predict(X_val)
    test_pred = rf.predict(X_test)

    return {
        "model": "Random Forest",
        "val_metrics": calculate_metrics(y_val.values, val_pred),
        "test_metrics": calculate_metrics(y_test.values, test_pred),
        "feature_importances": dict(zip(FEATURE_COLUMNS, [round(float(v), 4) for v in rf.feature_importances_])),
        "details": f"train:{len(X_train)}, val:{len(X_val)}, test:{len(X_test)} bản ghi (chia theo mốc thời gian)",
    }


def train_xgboost(
    df: pd.DataFrame,
    params: Dict[str, Any] = None,
    train_end_date: str = DEFAULT_TRAIN_END,
    val_end_date: str = DEFAULT_VAL_END,
):
    params = params or {"n_estimators": 150, "learning_rate": 0.05, "max_depth": 6, "random_state": 42}
    df_feat = extract_features(df)
    X_train, y_train, X_val, y_val, X_test, y_test = _chronological_xy_split(df_feat, train_end_date, val_end_date)

    xgb_reg = xgb.XGBRegressor(**params)
    xgb_reg.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

    val_pred = xgb_reg.predict(X_val)
    test_pred = xgb_reg.predict(X_test)

    return {
        "model": "XGBoost",
        "val_metrics": calculate_metrics(y_val.values, val_pred),
        "test_metrics": calculate_metrics(y_test.values, test_pred),
        "feature_importances": dict(zip(FEATURE_COLUMNS, [round(float(v), 4) for v in xgb_reg.feature_importances_])),
        "details": f"train:{len(X_train)}, val:{len(X_val)}, test:{len(X_test)} bản ghi (chia theo mốc thời gian)",
    }


def run_gcn_lstm(
    df: pd.DataFrame,
    hyper_params: Optional[Dict[str, Any]] = None,
    train_end_date: str = DEFAULT_TRAIN_END,
    val_end_date: str = DEFAULT_VAL_END,
):
    hyper_params = hyper_params or {}
    res = train_gcn_lstm(
        df,
        train_end_date=train_end_date,
        val_end_date=val_end_date,
        seq_len=int(hyper_params.get("seq_len", 8)),
        gcn_hidden=int(hyper_params.get("gcn_hidden", 16)),
        lstm_hidden=int(hyper_params.get("lstm_hidden", 32)),
        epochs=int(hyper_params.get("epochs", 40)),
        lr=float(hyper_params.get("lr", 0.01)),
        k_neighbors=int(hyper_params.get("k_neighbors", 4)),
    )
    return {
        "model": "GCN-LSTM",
        "val_metrics": calculate_metrics(res["val_true"], res["val_pred"]),
        "test_metrics": calculate_metrics(res["test_true"], res["test_pred"]),
        "details": (
            f"GCN-LSTM thật: {res['num_stations']} trạm, seq_len={res['seq_len']}, "
            f"{res['epochs_run']} epoch, best_val_loss={res['best_val_loss']}"
        ),
    }


def run_model_training(
    model_name: str,
    df: pd.DataFrame,
    hyper_params: Dict[str, Any] = None,
    train_end_date: str = DEFAULT_TRAIN_END,
    val_end_date: str = DEFAULT_VAL_END,
) -> Dict[str, Any]:
    """Entry point để huấn luyện 1 trong 4 mô hình, chia dữ liệu THỐNG NHẤT theo mốc thời gian."""
    if df.empty or len(df) < 15:
        raise ValueError("Số lượng bản ghi LST không đủ để huấn luyện (tối thiểu 15 bản ghi)")

    model_name_clean = model_name.strip().upper()

    if "ARIMA" in model_name_clean:
        series = df.copy()
        series["thoi_gian"] = pd.to_datetime(series["thoi_gian"])
        series = series.groupby("thoi_gian")["gia_tri_lst"].mean().sort_index()
        p = hyper_params.get("p", 2) if hyper_params else 2
        d = hyper_params.get("d", 1) if hyper_params else 1
        q = hyper_params.get("q", 1) if hyper_params else 1
        return train_arima(series, order=(p, d, q), train_end_date=train_end_date, val_end_date=val_end_date)

    if "RANDOM" in model_name_clean:
        return train_random_forest(df, hyper_params, train_end_date, val_end_date)

    if "XGBOOST" in model_name_clean:
        return train_xgboost(df, hyper_params, train_end_date, val_end_date)

    if "LSTM" in model_name_clean or "GCN" in model_name_clean:
        return run_gcn_lstm(df, hyper_params, train_end_date, val_end_date)

    # Mặc định: Random Forest
    return train_random_forest(df, hyper_params, train_end_date, val_end_date)
