"""
Seed Data Script for TP.HCM LST WebGIS
Populates the 10 entities with realistic geospatial and time-series records:
- TP.HCM Districts with GeoJSON Polygons
- Landsat LST 2021-2025 time-series
- Preprocessing configs
- 4 AI models (ARIMA, RF, XGBoost, GCN-LSTM)
- Evaluation Metrics (MAE, RMSE, R2, MAPE)
- Future 2026 Forecasts
"""

import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import json
from datetime import datetime, timedelta
import math
import random
from database import db

# Realistic District Polygons around Ho Chi Minh City
DISTRICTS = [
    {
        "name": "Toàn Thành phố Hồ Chí Minh",
        "type": "Thành phố trực thuộc TW",
        "parent": None,
        "desc": "Khu vực đất liền toàn TP.HCM, tọa độ trung tâm 10.776°N, 106.700°E",
        "coords": [
            [106.40, 10.50], [106.95, 10.35], [107.02, 10.70], [106.85, 11.15],
            [106.50, 11.15], [106.35, 10.75], [106.40, 10.50]
        ]
    },
    {
        "name": "Quận 1",
        "type": "Quận trung tâm",
        "parent": 1,
        "desc": "Trung tâm hành chính - thương mại, mật độ xây dựng cao, hiệu ứng đảo nhiệt đô thị (UHI) rõ rệt",
        "coords": [
            [106.685, 10.765], [106.705, 10.765], [106.710, 10.785], [106.690, 10.790], [106.685, 10.765]
        ]
    },
    {
        "name": "Thành phố Thủ Đức",
        "type": "Thành phố thuộc TP.HCM",
        "parent": 1,
        "desc": "Khu đô thị sáng tạo, Khu Công nghệ cao và bán đảo Thủ Thiêm",
        "coords": [
            [106.720, 10.790], [106.830, 10.820], [106.850, 10.890], [106.750, 10.870], [106.720, 10.790]
        ]
    },
    {
        "name": "Quận 7",
        "type": "Quận đô thị mới",
        "parent": 1,
        "desc": "Khu đô thị Phú Mỹ Hưng, nhiều kênh rạch điều hòa nhiệt độ",
        "coords": [
            [106.700, 10.710], [106.750, 10.715], [106.745, 10.750], [106.700, 10.745], [106.700, 10.710]
        ]
    },
    {
        "name": "Bình Thạnh",
        "type": "Quận nội thành",
        "parent": 1,
        "desc": "Bán đảo Thanh Đa và khu vực ven sông Sài Gòn",
        "coords": [
            [106.695, 10.795], [106.735, 10.810], [106.730, 10.840], [106.690, 10.825], [106.695, 10.795]
        ]
    },
    {
        "name": "Tân Bình",
        "type": "Quận nội thành",
        "parent": 1,
        "desc": "Khu vực Cụm Cảng Hàng không Quốc tế Tân Sơn Nhất, bề mặt bê tông hóa lớn",
        "coords": [
            [106.640, 10.790], [106.680, 10.800], [106.670, 10.835], [106.635, 10.820], [106.640, 10.790]
        ]
    },
    {
        "name": "Bình Tân",
        "type": "Quận cửa ngõ phía Tây",
        "parent": 1,
        "desc": "Khu công nghiệp Tân Tạo, dân cư đông đúc",
        "coords": [
            [106.570, 10.730], [106.620, 10.740], [106.615, 10.800], [106.575, 10.790], [106.570, 10.730]
        ]
    },
    {
        "name": "Hóc Môn",
        "type": "Huyện ngoại thành",
        "parent": 1,
        "desc": "Khu vực nông nghiệp ven đô xen kẽ đô thị hóa",
        "coords": [
            [106.560, 10.840], [106.630, 10.850], [106.640, 10.910], [106.570, 10.900], [106.560, 10.840]
        ]
    },
    {
        "name": "Củ Chi",
        "type": "Huyện ngoại thành phía Bắc",
        "parent": 1,
        "desc": "Khu vực nhiều cây xanh, đất nông lâm nghiệp và sông Sài Gòn bao bọc",
        "coords": [
            [106.450, 10.920], [106.580, 10.950], [106.560, 11.130], [106.420, 11.080], [106.450, 10.920]
        ]
    },
    {
        "name": "Cần Giờ",
        "type": "Huyện sinh thái biển",
        "parent": 1,
        "desc": "Khu dự trữ sinh quyển Rừng Sác Cần Giờ, nhiệt độ LST thấp và độ che phủ thực vật cao nhất",
        "coords": [
            [106.780, 10.380], [107.010, 10.420], [106.980, 10.700], [106.790, 10.650], [106.780, 10.380]
        ]
    }
]

GRID_POINTS = [
    {"name": "Quận 1 - Bến Nghé", "lng": 106.698, "lat": 10.776, "base_lst": 35.8, "base_ndvi": 0.18, "base_rain": 5.0, "base_hum": 65, "khu_vuc_id": 2},
    {"name": "TP Thủ Đức - Thảo Điền", "lng": 106.735, "lat": 10.803, "base_lst": 34.5, "base_ndvi": 0.28, "base_rain": 8.0, "base_hum": 68, "khu_vuc_id": 3},
    {"name": "TP Thủ Đức - Khu CNC", "lng": 106.802, "lat": 10.856, "base_lst": 33.8, "base_ndvi": 0.35, "base_rain": 12.0, "base_hum": 70, "khu_vuc_id": 3},
    {"name": "Quận 7 - Tân Phong", "lng": 106.711, "lat": 10.730, "base_lst": 34.0, "base_ndvi": 0.30, "base_rain": 10.0, "base_hum": 72, "khu_vuc_id": 4},
    {"name": "Bình Thạnh - Thanh Đa", "lng": 106.721, "lat": 10.817, "base_lst": 33.2, "base_ndvi": 0.42, "base_rain": 15.0, "base_hum": 75, "khu_vuc_id": 5},
    {"name": "Tân Bình - Sân Bay TSN", "lng": 106.660, "lat": 10.818, "base_lst": 37.2, "base_ndvi": 0.12, "base_rain": 3.0, "base_hum": 60, "khu_vuc_id": 6},
    {"name": "Bình Tân - KCN Tân Tạo", "lng": 106.592, "lat": 10.755, "base_lst": 36.5, "base_ndvi": 0.15, "base_rain": 4.0, "base_hum": 62, "khu_vuc_id": 7},
    {"name": "Hóc Môn - Bà Điểm", "lng": 106.602, "lat": 10.849, "base_lst": 33.0, "base_ndvi": 0.45, "base_rain": 18.0, "base_hum": 76, "khu_vuc_id": 8},
    {"name": "Củ Chi - Tân An Hội", "lng": 106.510, "lat": 10.970, "base_lst": 32.5, "base_ndvi": 0.52, "base_rain": 22.0, "base_hum": 78, "khu_vuc_id": 9},
    {"name": "Cần Giờ - Rừng Sác", "lng": 106.880, "lat": 10.450, "base_lst": 29.8, "base_ndvi": 0.75, "base_rain": 35.0, "base_hum": 84, "khu_vuc_id": 10},
    {"name": "Quận 5 - Chợ Lớn", "lng": 106.662, "lat": 10.754, "base_lst": 36.8, "base_ndvi": 0.14, "base_rain": 4.0, "base_hum": 61, "khu_vuc_id": 2},
    {"name": "Quận 12 - An Phú Đông", "lng": 106.685, "lat": 10.865, "base_lst": 33.6, "base_ndvi": 0.38, "base_rain": 14.0, "base_hum": 72, "khu_vuc_id": 8},
]

def seed_database():
    print("==> Khởi tạo dữ liệu mẫu 10 thực thể cho hệ thống LST WebGIS TP.HCM...")

    # 1. NGUOI_DUNG
    users = [
        ("admin", "$2a$10$demoHashedPasswordAdminAdminAdminAdmin", "admin@gmail.com", "ADMIN", "HOAT_DONG"),
        ("researcher", "$2a$10$demoHashedPasswordExpertExpertExpert", "researcher@gmail.com", "CHUYEN_GIA", "HOAT_DONG"),
        ("viewer", "$2a$10$demoHashedPasswordViewerViewerViewer", "viewer@gmail.com", "NGUOI_XEM", "HOAT_DONG")
    ]
    for u in users:
        db.query(
            "INSERT INTO nguoi_dung (ten_dang_nhap, mat_khau_ma_hoa, email, vai_tro, trang_thai) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (ten_dang_nhap) DO NOTHING",
            "INSERT OR IGNORE INTO nguoi_dung (ten_dang_nhap, mat_khau_ma_hoa, email, vai_tro, trang_thai) VALUES (?, ?, ?, ?, ?)",
            u
        )

    # 2. KHU_VUC — chỉ tạo bản ghi gốc 'HCM' với ranh giới tạm.
    # Ranh giới thật + 168 xã/phường nạp bằng: python import_khu_vuc.py <file.geojson>
    root = DISTRICTS[0]
    root_geojson = json.dumps({"type": "Polygon", "coordinates": [root["coords"]]})
    db.query(
        "INSERT INTO khu_vuc (ma_khu_vuc, ma_hanh_chinh, ten_khu_vuc, loai_khu_vuc, ma_khu_vuc_cha, ranh_gioi) "
        "VALUES ($1, $2, $3, $4, NULL, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326))) ON CONFLICT (ma_khu_vuc) DO NOTHING",
        "INSERT OR IGNORE INTO khu_vuc (ma_khu_vuc, ma_hanh_chinh, ten_khu_vuc, loai_khu_vuc, ma_khu_vuc_cha, ranh_gioi) "
        "VALUES (?, ?, ?, ?, NULL, ?)",
        ("HCM", "79", "Thành phố Hồ Chí Minh", "THANH_PHO", root_geojson)
    )

    # 3. DATASET
    datasets = [
        (1, "Landsat 8/9 LST TP.HCM (2021-2025)", "Chuỗi thời gian ảnh viễn thám độ phân giải không gian 30m, chu kỳ 16 ngày", "Landsat", "2021-01-01", "2025-12-31", "SAN_SANG"),
        (1, "MODIS Terra/Aqua LST Daily TP.HCM", "Chuỗi LST hàng ngày MOD11A1 độ phân giải 1km, giám sát chu kỳ ngày/đêm", "MODIS", "2021-01-01", "2025-12-31", "SAN_SANG"),
        (1, "Landsat-MODIS Fusion Harmonized LST", "Bộ dữ liệu tổng hợp không gian - thời gian phục vụ dự báo AI sâu", "Landsat_MODIS_Combined", "2021-01-01", "2025-12-31", "SAN_SANG")
    ]
    for ds in datasets:
        db.query(
            "INSERT INTO dataset (ma_nguoi_dung, ten_dataset, mo_ta, nguon_du_lieu, thoi_gian_bat_dau, thoi_gian_ket_thuc, trang_thai) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING",
            "INSERT OR IGNORE INTO dataset (ma_nguoi_dung, ten_dataset, mo_ta, nguon_du_lieu, thoi_gian_bat_dau, thoi_gian_ket_thuc, trang_thai) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ds
        )

    # 4. TIEN_XU_LY
    txl_records = [
        (1, "Noi_suy_tuyen_tinh", "IQR", "Min-Max", "2023-12-31", "2024-12-31"),
        (1, "Loai_bo", "Z-score", "Z-score", "2023-12-31", "2024-12-31"),
        (2, "Noi_suy_tuyen_tinh", "IQR", "Min-Max", "2023-12-31", "2024-12-31")
    ]
    for txl in txl_records:
        db.query(
            "INSERT INTO tien_xu_ly (ma_dataset, cach_xu_ly_thieu, cach_xu_ly_nhieu, phuong_phap_chuan_hoa, ngay_ket_thuc_train, ngay_ket_thuc_val) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING",
            "INSERT OR IGNORE INTO tien_xu_ly (ma_dataset, cach_xu_ly_thieu, cach_xu_ly_nhieu, phuong_phap_chuan_hoa, ngay_ket_thuc_train, ngay_ket_thuc_val) VALUES (?, ?, ?, ?, ?, ?)",
            txl
        )

    # 5. MODEL
    models = [
        ("ARIMA", "Thống kê", "Mô hình tự hồi quy tích hợp trung bình trượt phân tích xu thế và mùa vụ chuỗi thời gian"),
        ("Random Forest", "Học máy", "Tập hợp các cây quyết định phi tuyến kết hợp dữ liệu LST, NDVI, lượng mưa và độ ẩm"),
        ("XGBoost", "Học máy", "Mô hình tăng cường gradient cây quyết định với độ chính xác cao trên bảng đặc trưng không gian - thời gian"),
        ("GCN-LSTM", "Học sâu", "Kiến trúc mạng tích chập đồ thị kết hợp bộ nhớ dài ngắn hạn nắm bắt tương quan không gian và phụ thuộc thời gian")
    ]
    for m in models:
        db.query(
            "INSERT INTO model (ten_model, loai_model, mo_ta) VALUES ($1, $2, $3) ON CONFLICT (ten_model) DO NOTHING",
            "INSERT OR IGNORE INTO model (ten_model, loai_model, mo_ta) VALUES (?, ?, ?)",
            m
        )

    # 6. LST_DATA (2021-2025 across stations)
    existing = db.query("SELECT COUNT(*) as cnt FROM lst_data")
    if existing and existing[0]["cnt"] > 20:
        print(f"LST_DATA đã có sẵn {existing[0]['cnt']} bản ghi.")
    else:
        print("Đang nạp chuỗi thời gian LST viễn thám 2021-2025...")
        cur_date = datetime(2021, 1, 1)
        end_date = datetime(2025, 12, 31)
        
        while cur_date <= end_date:
            d_str = cur_date.strftime("%Y-%m-%d")
            month = cur_date.month
            # Mùa khô TP.HCM (T12 - T4) nhiệt độ cao; mùa mưa (T5 - T11) mát hơn
            season_factor = 2.4 if (2 <= month <= 5) else (-1.8 if (7 <= month <= 10) else 0.2)
            
            for p in GRID_POINTS:
                noise = math.sin(month + p["lat"] * 10) * 0.8 + (random.random() * 0.6 - 0.3)
                lst_val = round(p["base_lst"] + season_factor + noise, 2)
                ndvi_val = round(max(0.05, min(0.85, p["base_ndvi"] - season_factor * 0.02 + (random.random() * 0.04 - 0.02))), 3)
                rain_val = round(max(0.0, p["base_rain"] + (40.0 if season_factor < 0 else 2.0) + (random.random() * 10)), 1)
                hum_val = round(max(40.0, min(95.0, p["base_hum"] - season_factor * 2 + (random.random() * 4 - 2))), 1)

                db.query(
                    """
                    INSERT INTO lst_data (ma_dataset, thoi_gian, vi_do, kinh_do, gia_tri_lst, ndvi, luong_mua, do_am_dat, lop_phu_be_mat)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (ma_dataset, thoi_gian, kinh_do, vi_do) DO NOTHING
                    """,
                    """
                    INSERT OR IGNORE INTO lst_data (ma_dataset, thoi_gian, vi_do, kinh_do, gia_tri_lst, ndvi, luong_mua, do_am_dat, lop_phu_be_mat)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (1, d_str, p["lat"], p["lng"], lst_val, ndvi_val, rain_val, hum_val, "Do_thi_va_thuc_vat")
                )
            cur_date += timedelta(days=16)

    # 7. TRAINING_RUN & MODEL_METRICS
    tr_existing = db.query("SELECT COUNT(*) as cnt FROM training_run")
    if not tr_existing or tr_existing[0]["cnt"] == 0:
        model_metrics_map = {
            1: {"name": "ARIMA", "params": {"p": 2, "d": 1, "q": 2}, "val": (1.62, 1.95, 0.74, 4.80), "test": (1.75, 2.10, 0.71, 5.10)},
            2: {"name": "Random Forest", "params": {"n_estimators": 100, "max_depth": 12}, "val": (0.95, 1.25, 0.88, 2.80), "test": (1.05, 1.38, 0.86, 3.10)},
            3: {"name": "XGBoost", "params": {"learning_rate": 0.05, "max_depth": 6, "n_estimators": 200}, "val": (0.78, 1.05, 0.92, 2.30), "test": (0.85, 1.15, 0.91, 2.50)},
            4: {"name": "GCN-LSTM", "params": {"hidden_dim": 64, "seq_len": 12, "epochs": 50}, "val": (0.62, 0.88, 0.95, 1.85), "test": (0.69, 0.96, 0.94, 2.05)},
        }

        for m_id, info in model_metrics_map.items():
            run_id = db.execute_insert(
                "INSERT INTO training_run (ma_dataset, ma_tien_xu_ly, ma_model, ma_nguoi_dung, trang_thai, tham_so, thoi_gian_ket_thuc) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING ma_training",
                "INSERT INTO training_run (ma_dataset, ma_tien_xu_ly, ma_model, ma_nguoi_dung, trang_thai, tham_so, thoi_gian_ket_thuc) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                (1, 1, m_id, 2, "HOAN_THANH", json.dumps(info["params"]))
            )
            if run_id:
                # Validation metrics
                db.query(
                    "INSERT INTO model_metric (ma_training, tap_danh_gia, mae, rmse, r2, mape) VALUES ($1, $2, $3, $4, $5, $6)",
                    "INSERT INTO model_metric (ma_training, tap_danh_gia, mae, rmse, r2, mape) VALUES (?, ?, ?, ?, ?, ?)",
                    (run_id, "Kiem_dinh", *info["val"])
                )
                # Test metrics
                db.query(
                    "INSERT INTO model_metric (ma_training, tap_danh_gia, mae, rmse, r2, mape) VALUES ($1, $2, $3, $4, $5, $6)",
                    "INSERT INTO model_metric (ma_training, tap_danh_gia, mae, rmse, r2, mape) VALUES (?, ?, ?, ?, ?, ?)",
                    (run_id, "Kiem_tra", *info["test"])
                )

    # 8. FORECAST_RESULT & MAP_LAYER (2026 forecast predictions)
    fc_existing = db.query("SELECT COUNT(*) as cnt FROM forecast_result")
    if not fc_existing or fc_existing[0]["cnt"] == 0:
        forecast_dates = ["2026-01-15", "2026-02-15", "2026-03-15", "2026-04-15", "2026-05-15", "2026-06-15"]
        for f_date in forecast_dates:
            month = int(f_date.split("-")[1])
            season_add = 2.8 if (2 <= month <= 5) else 0.5
            for p in GRID_POINTS:
                pred_lst = round(p["base_lst"] + season_add + (random.random() * 0.6 - 0.3), 2)
                db.query(
                    "INSERT INTO forecast_result (ma_training, ma_khu_vuc, thoi_gian_du_bao, vi_do, kinh_do, gia_tri_lst_du_bao) VALUES ($1, $2, $3, $4, $5, $6)",
                    "INSERT INTO forecast_result (ma_training, ma_khu_vuc, thoi_gian_du_bao, vi_do, kinh_do, gia_tri_lst_du_bao) VALUES (?, ?, ?, ?, ?, ?)",
                    (4, "HCM", f_date, p["lat"], p["lng"], pred_lst)
                )

        # MAP_LAYER
        layers = [
            (4, "HCM", "Bản đồ LST Dự báo TP.HCM - Tháng 03/2026 (GCN-LSTM)", "2026-03-15", "/layers/hcm_lst_forecast_20260315.geojson", "GeoJSON", "Lớp nhiệt độ bề mặt đất cực đại mùa khô TP.HCM dự báo bởi mô hình GCN-LSTM"),
            (4, "HCM", "Bản đồ LST Dự báo TP.HCM - Tháng 04/2026 (GCN-LSTM)", "2026-04-15", "/layers/hcm_lst_forecast_20260415.geojson", "GeoJSON", "Lớp nhiệt độ bề mặt đất đỉnh điểm nắng nóng UHI"),
            (3, "HCM", "Bản đồ LST Dự báo TP.HCM - Tháng 03/2026 (XGBoost)", "2026-03-15", "/layers/hcm_lst_forecast_xgb_20260315.geojson", "GeoJSON", "Lớp dự báo bằng mô hình XGBoost Regressor")
        ]
        for lyr in layers:
            db.query(
                "INSERT INTO map_layer (ma_training, ma_khu_vuc, ten_layer, thoi_gian, duong_dan_du_lieu, loai_du_lieu, mo_ta) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                "INSERT INTO map_layer (ma_training, ma_khu_vuc, ten_layer, thoi_gian, duong_dan_du_lieu, loai_du_lieu, mo_ta) VALUES (?, ?, ?, ?, ?, ?, ?)",
                lyr
            )

    print("==> Khởi tạo dữ liệu mẫu hoàn tất thành công!")

if __name__ == "__main__":
    seed_database()
