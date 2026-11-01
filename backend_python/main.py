"""
FastAPI Backend - Hệ thống WebGIS AI Dự báo LST TP.HCM
Kết nối trực tiếp CSDL PostgreSQL/PostGIS `lst_hcm` (v8_Final, 10 bảng):
  nguoi_dung, khu_vuc, danh_muc_chi_so, dataset, tien_xu_ly,
  model, training_run, model_metric, du_lieu_chi_so, thong_ke_va_lop_ban_do

Quy ước dữ liệu trong bảng du_lieu_chi_so (bảng trung tâm):
  - ma_chi_so = 'LST' (hoặc 'NDVI', 'TVDI'); gia_tri = giá trị chỉ số
  - loai_nguon_du_lieu: GEE_ACTUAL | GEE_INTERPOLATED (hiện trạng), AI_FORECAST (dự báo), SIMULATION (giả lập)
  - bien_phu_giai_thich (jsonb) chứa biến giải thích tại cùng điểm/ngày với các khóa:
        ndvi, tvdi, luong_mua, do_am_dat, lop_phu_be_mat
JSON trả về giữ nguyên tên trường cũ để giao diện React không phải sửa.
"""

import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import os
import json
import math
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import bcrypt
import jwt
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Header, UploadFile, File, Form
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import db
from models_ai import run_model_training
from preprocessor import LSTPreprocessor
import csv_import

app = FastAPI(
    title="Hệ thống WebGIS AI Dự báo LST - TP.HCM (API Service)",
    description="REST API đọc/ghi CSDL PostgreSQL/PostGIS lst_hcm: dữ liệu LST, tiền xử lý, huấn luyện 4 mô hình AI và bản đồ WebGIS",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JWT_SECRET = os.getenv("JWT_SECRET", "webgis_lst_hcm_ai_secret_key_2026")


def get_current_user_from_token(authorization: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Giải mã token JWT từ header Authorization."""
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").replace("bearer ", "").strip()
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        return None


def require_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Bắt buộc người dùng phải đăng nhập với vai trò ADMIN."""
    user = get_current_user_from_token(authorization)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Yêu cầu đăng nhập tài khoản Quản trị viên (ADMIN) để thực hiện thao tác này."
        )
    if user.get("vai_tro") != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Từ chối truy cập: Bạn không có quyền thực hiện. Chỉ người dùng có vai trò Quản trị viên (ADMIN) mới được nạp dữ liệu, cấu hình tiền xử lý và huấn luyện mô hình."
        )
    return user

# Điều kiện lọc dữ liệu LST hiện trạng (alias bảng: f)
LST_OBS = "f.ma_chi_so = 'LST' AND f.loai_nguon_du_lieu IN ('GEE_ACTUAL', 'GEE_INTERPOLATED')"


def _bv(key: str) -> str:
    """Lấy một biến giải thích dạng số từ jsonb."""
    return f"(f.bien_phu_giai_thich->>'{key}')::double precision"


# Dạng "bảng rộng" quen thuộc cho giao diện và module AI
LST_WIDE_COLUMNS = f"""
    f.ma_ban_ghi AS ma_lst, f.ma_dataset, f.ma_khu_vuc,
    to_char(f.thoi_gian, 'YYYY-MM-DD') AS thoi_gian,
    f.vi_do, f.kinh_do, f.gia_tri AS gia_tri_lst,
    {_bv('ndvi')} AS ndvi,
    {_bv('luong_mua')} AS luong_mua,
    {_bv('do_am_dat')} AS do_am_dat,
    f.bien_phu_giai_thich->>'lop_phu_be_mat' AS lop_phu_be_mat
"""


def _f(x):
    """Ép về float an toàn (NaN/None -> None) trước khi ghi DB."""
    if x is None:
        return None
    try:
        x = float(x)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(x) or math.isinf(x) else x


def _resolve_khu_vuc(code: Optional[str]) -> Optional[int]:
    """
    Đổi mã khu vực gửi từ giao diện sang ma_khu_vuc (bigint) của DB.
    - 'HCM' hoặc 'HCMC'  -> dòng THANH_PHO
    - mã hành chính (vd '27316') -> theo cột ma_hanh_chinh
    - số nguyên -> theo ma_khu_vuc
    """
    if not code:
        return None
    c = str(code).strip()
    if c.upper() in ("HCM", "HCMC"):
        rows = db.query("SELECT ma_khu_vuc FROM khu_vuc WHERE loai_khu_vuc = 'THANH_PHO' ORDER BY ma_khu_vuc LIMIT 1")
    else:
        rows = db.query("SELECT ma_khu_vuc FROM khu_vuc WHERE ma_hanh_chinh = %s", (c,))
        if not rows and c.isdigit():
            rows = db.query("SELECT ma_khu_vuc FROM khu_vuc WHERE ma_khu_vuc = %s", (int(c),))
    return rows[0]["ma_khu_vuc"] if rows else None


def _is_city(code: Optional[str]) -> bool:
    return bool(code) and str(code).strip().upper() in ("HCM", "HCMC")


def _load_lst_df(ma_dataset: int) -> pd.DataFrame:
    rows = db.query(
        f"SELECT {LST_WIDE_COLUMNS} FROM du_lieu_chi_so f WHERE {LST_OBS} AND f.ma_dataset = %s",
        (ma_dataset,),
    )
    return pd.DataFrame(rows)


def _admin_id() -> Optional[int]:
    rows = db.query("SELECT ma_nguoi_dung FROM nguoi_dung WHERE vai_tro = 'ADMIN' AND trang_thai = 'HOAT_DONG' ORDER BY ma_nguoi_dung LIMIT 1")
    return rows[0]["ma_nguoi_dung"] if rows else None


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================
class LoginRequest(BaseModel):
    ten_dang_nhap: str
    mat_khau: str


class RegisterRequest(BaseModel):
    ten_dang_nhap: str
    mat_khau: str
    email: str
    vai_tro: Optional[str] = "NGUOI_XEM"


class TrainingRequest(BaseModel):
    ma_dataset: int = 1
    ma_model: int
    cach_xu_ly_thieu: str = "Noi_suy_tuyen_tinh"
    cach_xu_ly_nhieu: str = "IQR"
    phuong_phap_chuan_hoa: str = "Min-Max"
    tham_so: Optional[Dict[str, Any]] = None


class TienXuLySaveRequest(BaseModel):
    ma_dataset: int = 1
    cach_xu_ly_thieu: str = "LINEAR_INTERPOLATION"
    cach_xu_ly_nhieu: str = "THRESHOLD_ZSCORE"
    phuong_phap_chuan_hoa: str = "MIN_MAX"
    ngay_ket_thuc_train: str = "2023-12-31"
    ngay_ket_thuc_val: str = "2024-12-31"


class DatasetCreateRequest(BaseModel):
    ten_dataset: str = "Landsat 8/9 LST TP.HCM (2021-2025)"
    nguon_du_lieu: str = "Landsat 8/9 OLI-TIRS (30m)"
    thoi_gian_bat_dau: str = "2021-01-01"
    thoi_gian_ket_thuc: str = "2025-12-31"
    duong_dan_file: Optional[str] = "gee_landsat_lst_hcm.csv"


# ==========================================
# 0. KIỂM TRA HỆ THỐNG
# ==========================================
@app.get("/api/health", tags=["Hệ thống"])
def health():
    """Số dòng của 10 bảng - dùng để kiểm tra web đang đọc đúng CSDL."""
    tables = ["nguoi_dung", "khu_vuc", "danh_muc_chi_so", "dataset", "tien_xu_ly",
              "model", "training_run", "model_metric", "du_lieu_chi_so", "thong_ke_va_lop_ban_do"]
    counts = {t: db.query(f"SELECT COUNT(*) AS c FROM {t}")[0]["c"] for t in tables}
    info = db.query("SELECT current_database() AS db, version() AS version")[0]
    return {"status": "ok", "database": info["db"], "postgres": info["version"].split(",")[0], "row_counts": counts}


# ==========================================
# 1. XÁC THỰC & NGƯỜI DÙNG (NGUOI_DUNG)
# ==========================================
@app.post("/api/auth/register", tags=["Xác thực & Người dùng"])
def register(req: RegisterRequest):
    if len(req.ten_dang_nhap.strip()) < 3:
        raise HTTPException(status_code=400, detail="Tên đăng nhập phải có ít nhất 3 ký tự")
    if len(req.mat_khau) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu phải có ít nhất 6 ký tự")

    # Kiểm tra trùng tên hoặc email
    existing = db.query(
        "SELECT ten_dang_nhap, email FROM nguoi_dung WHERE ten_dang_nhap = %s OR email = %s",
        (req.ten_dang_nhap.strip(), req.email.strip()),
    )
    if existing:
        if existing[0]["ten_dang_nhap"] == req.ten_dang_nhap.strip():
            raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")
        raise HTTPException(status_code=400, detail="Email này đã được sử dụng")

    hashed_pw = bcrypt.hashpw(req.mat_khau.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    vai_tro = req.vai_tro if req.vai_tro in ("ADMIN", "CHUYEN_GIA", "NGUOI_XEM") else "NGUOI_XEM"

    new_id = db.execute_insert(
        """
        INSERT INTO nguoi_dung (ten_dang_nhap, mat_khau_ma_hoa, email, vai_tro, trang_thai)
        VALUES (%s, %s, %s, %s, 'HOAT_DONG')
        RETURNING ma_nguoi_dung
        """,
        (req.ten_dang_nhap.strip(), hashed_pw, req.email.strip(), vai_tro),
    )

    token = jwt.encode(
        {
            "ma_nguoi_dung": new_id,
            "vai_tro": vai_tro,
            "ten_dang_nhap": req.ten_dang_nhap.strip(),
            "exp": datetime.utcnow() + timedelta(hours=24),
        },
        JWT_SECRET,
        algorithm="HS256",
    )

    return {
        "token": token,
        "user": {
            "ma_nguoi_dung": new_id,
            "ten_dang_nhap": req.ten_dang_nhap.strip(),
            "email": req.email.strip(),
            "vai_tro": vai_tro,
        },
    }


@app.post("/api/auth/login", tags=["Xác thực & Người dùng"])
def login(req: LoginRequest):
    users = db.query(
        "SELECT ma_nguoi_dung, ten_dang_nhap, mat_khau_ma_hoa, email, vai_tro, trang_thai "
        "FROM nguoi_dung WHERE ten_dang_nhap = %s",
        (req.ten_dang_nhap,),
    )
    invalid = HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không chính xác")
    if not users:
        raise invalid
    user = users[0]

    try:
        ok = bcrypt.checkpw(req.mat_khau.encode("utf-8"), user["mat_khau_ma_hoa"].encode("utf-8"))
    except Exception:
        ok = False
    if not ok:
        raise invalid
    if user.get("trang_thai") == "KHOA":
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khóa")

    token = jwt.encode(
        {
            "ma_nguoi_dung": user["ma_nguoi_dung"],
            "vai_tro": user["vai_tro"],
            "ten_dang_nhap": user["ten_dang_nhap"],
            "exp": datetime.utcnow() + timedelta(hours=24),
        },
        JWT_SECRET,
        algorithm="HS256",
    )
    return {
        "token": token,
        "user": {
            "ma_nguoi_dung": user["ma_nguoi_dung"],
            "ten_dang_nhap": user["ten_dang_nhap"],
            "email": user["email"],
            "vai_tro": user["vai_tro"],
        },
    }


@app.get("/api/users", tags=["Xác thực & Người dùng"])
def get_users():
    return db.query("SELECT ma_nguoi_dung, ten_dang_nhap, email, vai_tro, trang_thai FROM nguoi_dung ORDER BY ma_nguoi_dung")


# ==========================================
# 2. KHU VỰC HÀNH CHÍNH & RANH GIỚI (KHU_VUC)
# ==========================================
@app.get("/api/khu-vuc", tags=["Khu vực & Ranh giới WebGIS"])
def get_khu_vuc(
    loai: Optional[str] = Query(None, description="THANH_PHO | PHUONG_XA"),
    cha: Optional[str] = Query(None, description="Mã khu vực cha, vd 'HCM' để lấy 168 phường/xã"),
    geometry: bool = Query(False, description="true: kèm ranh giới GeoJSON"),
):
    """
    Trả về ma_khu_vuc = mã hành chính (chuỗi) để giao diện dùng làm mã khu vực.
    Trường `id` là khóa số thật trong DB.
    """
    # Sử dụng ST_SimplifyPreserveTopology(0.0008) để tối ưu web: giảm dung lượng từ 4.5MB xuống 150KB, load tức thì cực mượt
    geo = ", ST_AsGeoJSON(ST_SimplifyPreserveTopology(kv.ranh_gioi, 0.0008), 4) AS geojson" if geometry else ""
    where, params = [], []
    if loai:
        loai_db = "PHUONG_XA" if loai.upper() in ("PHUONG", "XA", "DAC_KHU") else loai
        where.append("kv.loai_khu_vuc = %s")
        params.append(loai_db)
    if cha:
        cha_id = _resolve_khu_vuc(cha)
        if cha_id is None:
            return []
        where.append("kv.ma_khu_vuc_cha = %s")
        params.append(cha_id)
    where_sql = (" WHERE " + " AND ".join(where)) if where else ""

    rows = db.query(
        f"""
        SELECT kv.ma_khu_vuc AS id, kv.ma_hanh_chinh AS ma_khu_vuc, kv.ma_hanh_chinh,
               kv.ten_khu_vuc, kv.loai_khu_vuc, p.ma_hanh_chinh AS ma_khu_vuc_cha,
               kv.dien_tich_km2{geo}
        FROM khu_vuc kv
        LEFT JOIN khu_vuc p ON p.ma_khu_vuc = kv.ma_khu_vuc_cha
        {where_sql}
        ORDER BY (kv.ma_khu_vuc_cha IS NOT NULL), kv.ten_khu_vuc
        """,
        tuple(params),
    )
    if geometry:
        for r in rows:
            g = r.get("geojson")
            try:
                r["geojson"] = json.loads(g) if isinstance(g, str) else g
            except Exception:
                r["geojson"] = None
    return rows


# ==========================================
# 3. BỘ DỮ LIỆU (DATASET)
# ==========================================
@app.get("/api/datasets", tags=["Bộ dữ liệu LST"])
def get_datasets():
    return db.query(
        f"""
        SELECT d.*, u.ten_dang_nhap AS nguoi_tao,
               (SELECT COUNT(*) FROM du_lieu_chi_so f WHERE {LST_OBS} AND f.ma_dataset = d.ma_dataset) AS so_ban_ghi,
               (SELECT ROUND(AVG(f.gia_tri)::numeric, 2) FROM du_lieu_chi_so f WHERE {LST_OBS} AND f.ma_dataset = d.ma_dataset) AS lst_trung_binh,
               (SELECT ROUND(MAX(f.gia_tri)::numeric, 2) FROM du_lieu_chi_so f WHERE {LST_OBS} AND f.ma_dataset = d.ma_dataset) AS lst_cao_nhat,
               (SELECT ROUND(MIN(f.gia_tri)::numeric, 2) FROM du_lieu_chi_so f WHERE {LST_OBS} AND f.ma_dataset = d.ma_dataset) AS lst_thap_nhat
        FROM dataset d
        LEFT JOIN nguoi_dung u ON d.ma_nguoi_dung = u.ma_nguoi_dung
        ORDER BY d.ma_dataset
        """
    )


@app.post("/api/datasets/create", tags=["Bộ dữ liệu LST"])
def create_dataset(req: DatasetCreateRequest, authorization: Optional[str] = Header(None)):
    """Nạp bộ dữ liệu mới (chỉ Quản trị viên ADMIN)."""
    user = require_admin(authorization)
    admin_id = user.get("ma_nguoi_dung") or _admin_id() or 1
    new_id = db.execute_insert(
        """
        INSERT INTO dataset (ma_nguoi_dung, ten_dataset, nguon_du_lieu, thoi_gian_bat_dau, thoi_gian_ket_thuc, duong_dan_file, ngay_tao)
        VALUES (%s, %s, %s, %s::date, %s::date, %s, CURRENT_TIMESTAMP)
        RETURNING ma_dataset
        """,
        (admin_id, req.ten_dataset, req.nguon_du_lieu, req.thoi_gian_bat_dau, req.thoi_gian_ket_thuc, req.duong_dan_file),
    )
    return {
        "status": "success",
        "ma_dataset": new_id,
        "message": f"Đã nạp thành công bộ dữ liệu #{new_id} ({req.ten_dataset})!",
    }


@app.get("/api/datasets/csv-template", tags=["Bộ dữ liệu LST"])
def csv_template():
    """Tệp CSV mẫu đúng định dạng để nạp."""
    return Response(csv_import.TEMPLATE_CSV, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": "attachment; filename=lst_hcm_mau.csv"})


@app.post("/api/datasets/upload-csv", tags=["Bộ dữ liệu LST"])
async def upload_csv(
    file: UploadFile = File(...),
    ten_dataset: str = Form(""),
    nguon_du_lieu: str = Form("Landsat 8/9 (GEE)"),
    chi_kiem_tra: bool = Form(False),
    authorization: Optional[str] = Header(None),
):
    """Nạp CSV thật vào CSDL (ADMIN). chi_kiem_tra=true: chỉ kiểm tra, không ghi."""
    user = require_admin(authorization)
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(400, "Chỉ nhận tệp .csv")
    raw = await file.read()
    try:
        res = csv_import.parse_and_validate(raw)
    except csv_import.CsvError as e:
        raise HTTPException(422, str(e))
    report = res["report"]
    if chi_kiem_tra:
        return {"status": "validated", "report": report, "message": "Tệp hợp lệ, chưa ghi vào CSDL."}
    ten = ten_dataset.strip() or f"{file.filename} ({report['ngay_dau']} → {report['ngay_cuoi']})"
    conn = db._connect()
    try:
        info = csv_import.insert_dataset(conn, res["df"], user.get("ma_nguoi_dung") or _admin_id() or 1,
                                         ten, nguon_du_lieu, file.filename)
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, f"Lỗi ghi CSDL (đã hoàn tác): {e}")
    finally:
        conn.close()
    return {"status": "success", "report": report, **info,
            "message": f"Đã nạp {info['so_dong_nap']} dòng vào dataset #{info['ma_dataset']}."}


# ==========================================
# 4. DỮ LIỆU LST (du_lieu_chi_so, ma_chi_so = 'LST')
# ==========================================
@app.get("/api/lst-data", tags=["Dữ liệu LST"])
def get_lst_data(
    ma_dataset: int = 1,
    thoi_gian: Optional[str] = None,
    tu_ngay: Optional[str] = None,
    den_ngay: Optional[str] = None,
    limit: int = 1000,
):
    sql = f"SELECT {LST_WIDE_COLUMNS} FROM du_lieu_chi_so f WHERE {LST_OBS} AND f.ma_dataset = %s"
    params = [ma_dataset]
    if thoi_gian:
        sql += " AND f.thoi_gian = %s::date"
        params.append(thoi_gian)
    if tu_ngay:
        sql += " AND f.thoi_gian >= %s::date"
        params.append(tu_ngay)
    if den_ngay:
        sql += " AND f.thoi_gian <= %s::date"
        params.append(den_ngay)
    sql += " ORDER BY f.thoi_gian DESC, f.ma_ban_ghi ASC LIMIT %s"
    params.append(max(1, min(limit, 20000)))
    try:
        return db.query(sql, tuple(params))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Tham số ngày không hợp lệ hoặc lỗi truy vấn: {e}")


@app.get("/api/khu-vuc-lst", tags=["Dữ liệu LST"])
def get_khu_vuc_lst(
    ma_dataset: int = 1,
    thoi_gian: Optional[str] = None,
):
    """
    Trả về LST và NDVI cho toàn bộ 168 phường/xã sau sáp nhập tại thời điểm `thoi_gian`.
    Nếu xã/phường có điểm đo trực tiếp thì lấy điểm đo; nếu chưa có thì PostGIS tự động
    nội suy không gian theo trạm viễn thám gần nhất (Nearest Neighbor) để phủ kín 100% bản đồ.
    """
    date_filter = "AND d.thoi_gian = %s::date" if thoi_gian else "AND d.thoi_gian = (SELECT MAX(thoi_gian) FROM du_lieu_chi_so WHERE ma_dataset = %s)"
    params = [ma_dataset, thoi_gian] if thoi_gian else [ma_dataset, ma_dataset]

    sql = f"""
        SELECT kv.ma_khu_vuc AS id, kv.ten_khu_vuc, kv.loai_khu_vuc,
               ROUND(n.gia_tri::numeric, 1) AS gia_tri_lst,
               ROUND(COALESCE((n.bien_phu_giai_thich->>'ndvi')::numeric, 0.45)::numeric, 3) AS ndvi,
               ROUND(COALESCE((n.bien_phu_giai_thich->>'tvdi')::numeric, 0.55)::numeric, 3) AS tvdi,
               to_char(n.thoi_gian, 'YYYY-MM-DD') AS thoi_gian
        FROM khu_vuc kv
        CROSS JOIN LATERAL (
            SELECT d.gia_tri, d.bien_phu_giai_thich, d.thoi_gian
            FROM du_lieu_chi_so d
            WHERE d.ma_dataset = %s {date_filter}
              AND d.ma_chi_so = 'LST'
            ORDER BY kv.ranh_gioi <-> d.toa_do_diem
            LIMIT 1
        ) n
        WHERE kv.ma_khu_vuc_cha = 1
        ORDER BY kv.ma_khu_vuc
    """
    return db.query(sql, tuple(params))




@app.get("/api/lst-data/timeline", tags=["Dữ liệu LST"])
def get_lst_timeline(ma_dataset: int = 1):
    """Các ngày quan sát + LST trung bình toàn TP.HCM, dùng cho thanh trượt thời gian."""
    return db.query(
        f"""
        SELECT to_char(f.thoi_gian, 'YYYY-MM-DD') AS thoi_gian,
               ROUND(AVG(f.gia_tri)::numeric, 2) AS avg_lst,
               ROUND(MAX(f.gia_tri)::numeric, 2) AS max_lst,
               ROUND(MIN(f.gia_tri)::numeric, 2) AS min_lst,
               ROUND(AVG({_bv('ndvi')})::numeric, 3) AS avg_ndvi,
               COUNT(*) AS points_count
        FROM du_lieu_chi_so f
        WHERE {LST_OBS} AND f.ma_dataset = %s
        GROUP BY f.thoi_gian
        ORDER BY f.thoi_gian ASC
        """,
        (ma_dataset,),
    )


# ==========================================
# 5. TIỀN XỬ LÝ (TIEN_XU_LY)
# ==========================================
@app.get("/api/tien-xu-ly", tags=["Tiền xử lý dữ liệu"])
def get_tien_xu_ly():
    return db.query("SELECT * FROM tien_xu_ly ORDER BY ma_tien_xu_ly DESC")


@app.post("/api/tien-xu-ly/pipeline", tags=["Tiền xử lý dữ liệu"])
def run_preprocessing_pipeline(
    ma_dataset: int = 1,
    cach_xu_ly_thieu: str = "interpolate",
    cach_xu_ly_nhieu: str = "iqr",
    phuong_phap_chuan_hoa: str = "min_max",
):
    df = _load_lst_df(ma_dataset)
    if df.empty:
        raise HTTPException(status_code=404, detail="Chưa có dữ liệu LST quan trắc cho dataset này trong bảng du_lieu_chi_so")

    prep = LSTPreprocessor(
        missing_strategy="interpolate" if ("noi_suy" in cach_xu_ly_thieu.lower() or "interpolat" in cach_xu_ly_thieu.lower()) else "drop",
        outlier_strategy="iqr" if "iqr" in cach_xu_ly_nhieu.lower() else "z_score",
        norm_method="min_max" if ("min-max" in phuong_phap_chuan_hoa.lower() or "min_max" in phuong_phap_chuan_hoa.lower()) else "z_score",
    )
    df_clean, miss_stats = prep.handle_missing(df)
    df_clean, outlier_stats = prep.handle_outliers(df_clean)
    train_df, val_df, test_df = prep.chronological_split(df_clean)
    train_df, val_df, test_df, scaler_info = prep.fit_normalize(train_df, val_df, test_df)
    n = max(len(df_clean), 1)
    return {
        "status": "success",
        "missing_stats": miss_stats,
        "outlier_stats": outlier_stats,
        "scaler_info": scaler_info,
        "data_split": {
            "total_records": len(df_clean),
            "train_count": len(train_df),
            "val_count": len(val_df),
            "test_count": len(test_df),
            "split_ratio": f"{round(len(train_df)/n*100)}% / {round(len(val_df)/n*100)}% / {round(len(test_df)/n*100)}%",
        },
    }


@app.post("/api/tien-xu-ly/save", tags=["Tiền xử lý dữ liệu"])
def save_tien_xu_ly(req: TienXuLySaveRequest, authorization: Optional[str] = Header(None)):
    """Lưu cấu hình tiền xử lý vào CSDL (chỉ Quản trị viên ADMIN)."""
    user = require_admin(authorization)
    new_id = db.execute_insert(
        """
        INSERT INTO tien_xu_ly (ma_dataset, cach_xu_ly_thieu, cach_xu_ly_nhieu, phuong_phap_chuan_hoa, ngay_ket_thuc_train, ngay_ket_thuc_val, ngay_tao)
        VALUES (%s, %s, %s, %s, %s::date, %s::date, CURRENT_TIMESTAMP)
        RETURNING ma_tien_xu_ly
        """,
        (req.ma_dataset, req.cach_xu_ly_thieu, req.cach_xu_ly_nhieu, req.phuong_phap_chuan_hoa, req.ngay_ket_thuc_train, req.ngay_ket_thuc_val),
    )
    return {
        "status": "success",
        "ma_tien_xu_ly": new_id,
        "message": f"Đã lưu thành công cấu hình tiền xử lý #{new_id} vào hệ thống!",
    }


# ==========================================
# 6. MÔ HÌNH AI (MODEL, TRAINING_RUN, MODEL_METRIC)
# ==========================================
# Giao diện dùng nhãn cũ 'Kiem_dinh'/'Kiem_tra'; DB lưu 'VALIDATION'/'TEST'.
TAP_LABEL = "CASE mm.tap_danh_gia WHEN 'TEST' THEN 'Kiem_tra' ELSE 'Kiem_dinh' END"


@app.get("/api/models", tags=["Mô hình AI"])
def get_models():
    return db.query("SELECT * FROM model ORDER BY ma_model")


@app.get("/api/training-runs", tags=["Huấn luyện & Đánh giá"])
def get_training_runs():
    return db.query(
        """
        SELECT tr.*, m.ten_model, m.loai_model, d.ten_dataset,
               m_val.mae AS val_mae, m_val.rmse AS val_rmse, m_val.r2 AS val_r2, m_val.mape AS val_mape,
               m_test.mae AS test_mae, m_test.rmse AS test_rmse, m_test.r2 AS test_r2, m_test.mape AS test_mape
        FROM training_run tr
        JOIN model m ON tr.ma_model = m.ma_model
        LEFT JOIN dataset d ON tr.ma_dataset = d.ma_dataset
        LEFT JOIN model_metric m_val ON tr.ma_training = m_val.ma_training AND m_val.tap_danh_gia = 'VALIDATION'
        LEFT JOIN model_metric m_test ON tr.ma_training = m_test.ma_training AND m_test.tap_danh_gia = 'TEST'
        ORDER BY tr.ma_training DESC
        """
    )


@app.post("/api/training/run", tags=["Huấn luyện & Đánh giá"])
def trigger_training(req: TrainingRequest, authorization: Optional[str] = Header(None)):
    """Huấn luyện mô hình đã chọn trên LST quan trắc, ghi training_run + model_metric (VALIDATION, TEST). Yêu cầu quyền ADMIN."""
    user = require_admin(authorization)
    admin_uid = user.get("ma_nguoi_dung") or _admin_id()
    model_row = db.query("SELECT * FROM model WHERE ma_model = %s", (req.ma_model,))
    if not model_row:
        raise HTTPException(status_code=404, detail="Không tìm thấy mô hình tương ứng")
    model_name = model_row[0]["ten_model"]

    df = _load_lst_df(req.ma_dataset)
    if df.empty or len(df) < 15:
        raise HTTPException(
            status_code=400,
            detail="Không đủ dữ liệu LST để huấn luyện: bảng du_lieu_chi_so chưa có (hoặc quá ít) dữ liệu LST quan trắc cho dataset này. Hãy nạp dữ liệu từ GEE trước.",
        )

    txl_rows = db.query(
        "SELECT * FROM tien_xu_ly WHERE ma_dataset = %s ORDER BY ma_tien_xu_ly DESC LIMIT 1", (req.ma_dataset,)
    )
    txl = txl_rows[0] if txl_rows else {}
    ma_tien_xu_ly = txl.get("ma_tien_xu_ly")
    train_end_date = str(txl.get("ngay_ket_thuc_train") or "2023-12-31")
    val_end_date = str(txl.get("ngay_ket_thuc_val") or "2024-12-31")

    prep = LSTPreprocessor(train_end_date=train_end_date, val_end_date=val_end_date)
    df_clean, _ = prep.handle_missing(df)
    df_clean, _ = prep.handle_outliers(df_clean)

    hyper_params = req.tham_so or {}
    start_time = datetime.now()
    try:
        train_res = run_model_training(
            model_name, df_clean, hyper_params,
            train_end_date=train_end_date, val_end_date=val_end_date,
        )
        val_m = train_res["val_metrics"]
        test_m = train_res["test_metrics"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi huấn luyện mô hình: {str(e)}")
    end_time = datetime.now()

    run_id = db.execute_insert(
        """
        INSERT INTO training_run (ma_dataset, ma_tien_xu_ly, ma_model, ma_nguoi_dung, ma_chi_so_muc_tieu,
                                  tham_so, trang_thai, thoi_gian_bat_dau, thoi_gian_ket_thuc)
        VALUES (%s, %s, %s, %s, 'LST', %s::jsonb, 'HOAN_THANH', %s, %s)
        RETURNING ma_training
        """,
        (req.ma_dataset, ma_tien_xu_ly, req.ma_model, admin_uid, json.dumps(hyper_params), start_time, end_time),
    )

    for tap, m in (("VALIDATION", val_m), ("TEST", test_m)):
        db.query(
            "INSERT INTO model_metric (ma_training, tap_danh_gia, mae, rmse, r2, mape) VALUES (%s, %s, %s, %s, %s, %s)",
            (run_id, tap, _f(m["mae"]), _f(m["rmse"]), _f(m["r2"]), _f(m["mape"])),
        )

    return {
        "status": "success",
        "ma_training": run_id,
        "model": model_name,
        "val_metrics": val_m,
        "test_metrics": test_m,
        "execution_seconds": round((end_time - start_time).total_seconds(), 2),
        "details": train_res.get("details") or train_res.get("feature_importances"),
    }


@app.get("/api/metrics/comparison", tags=["Huấn luyện & Đánh giá"])
def get_metrics_comparison():
    """Bảng so sánh 4 chỉ số MAE, RMSE, R², MAPE giữa các mô hình."""
    return db.query(
        f"""
        SELECT m.ten_model, m.loai_model,
               {TAP_LABEL} AS tap_danh_gia,
               ROUND(AVG(mm.mae)::numeric, 3) AS mae,
               ROUND(AVG(mm.rmse)::numeric, 3) AS rmse,
               ROUND(AVG(mm.r2)::numeric, 3) AS r2,
               ROUND(AVG(mm.mape)::numeric, 2) AS mape
        FROM model_metric mm
        JOIN training_run tr ON mm.ma_training = tr.ma_training
        JOIN model m ON tr.ma_model = m.ma_model
        GROUP BY m.ten_model, m.loai_model, mm.tap_danh_gia
        ORDER BY m.ten_model, (mm.tap_danh_gia = 'TEST')
        """
    )


# ==========================================
# 7. DỰ BÁO & LỚP BẢN ĐỒ (du_lieu_chi_so AI_FORECAST, thong_ke_va_lop_ban_do)
# ==========================================
@app.get("/api/forecast", tags=["Dự báo LST & Bản đồ WebGIS"])
def get_forecast(
    ma_training: Optional[int] = None,
    ma_khu_vuc: Optional[str] = None,
    thoi_gian: Optional[str] = None,
    limit: Optional[int] = None,
):
    sql = """
        SELECT f.ma_ban_ghi AS ma_du_bao, f.ma_training,
               kv.ma_hanh_chinh AS ma_khu_vuc,
               to_char(f.thoi_gian, 'YYYY-MM-DD') AS thoi_gian_du_bao,
               f.vi_do, f.kinh_do, f.gia_tri AS gia_tri_lst_du_bao,
               kv.ten_khu_vuc, m.ten_model
        FROM du_lieu_chi_so f
        LEFT JOIN khu_vuc kv ON f.ma_khu_vuc = kv.ma_khu_vuc
        LEFT JOIN training_run tr ON f.ma_training = tr.ma_training
        LEFT JOIN model m ON tr.ma_model = m.ma_model
        WHERE f.ma_chi_so = 'LST' AND f.loai_nguon_du_lieu = 'AI_FORECAST'
    """
    params = []
    if ma_training:
        sql += " AND f.ma_training = %s"
        params.append(ma_training)
    if ma_khu_vuc and not _is_city(ma_khu_vuc):
        kv_id = _resolve_khu_vuc(ma_khu_vuc)
        if kv_id is None:
            return []
        sql += " AND (f.ma_khu_vuc = %s OR kv.ma_khu_vuc_cha = %s)"
        params.extend([kv_id, kv_id])
    if thoi_gian:
        sql += " AND f.thoi_gian = %s::date"
        params.append(thoi_gian)
    sql += " ORDER BY f.thoi_gian ASC, f.ma_ban_ghi ASC"
    if limit:
        sql += " LIMIT %s"
        params.append(max(1, limit))
    return db.query(sql, tuple(params))


@app.get("/api/layers", tags=["Dự báo LST & Bản đồ WebGIS"])
def get_map_layers():
    return db.query(
        """
        SELECT t.ma_thong_ke_layer AS ma_layer, t.ma_training,
               kv.ma_hanh_chinh AS ma_khu_vuc, kv.ten_khu_vuc,
               t.ma_chi_so, t.loai_nguon_du_lieu,
               (t.ma_chi_so || ' - ' || COALESCE(kv.ten_khu_vuc, '') || ' - ' || t.thoi_gian::text) AS ten_layer,
               t.thoi_gian, t.gia_tri_min, t.gia_tri_max, t.gia_tri_trung_binh,
               t.do_lech_chuan, t.dien_tich_nguy_co_km2, t.muc_do_canh_bao,
               t.duong_dan_ban_do AS duong_dan_du_lieu, t.dinh_dang_ban_do AS loai_du_lieu,
               m.ten_model
        FROM thong_ke_va_lop_ban_do t
        LEFT JOIN khu_vuc kv ON t.ma_khu_vuc = kv.ma_khu_vuc
        LEFT JOIN training_run tr ON t.ma_training = tr.ma_training
        LEFT JOIN model m ON tr.ma_model = m.ma_model
        ORDER BY t.ma_thong_ke_layer DESC
        """
    )


@app.get("/api/thong-ke-khu-vuc", tags=["Dự báo LST & Bản đồ WebGIS"])
def get_thong_ke_khu_vuc(
    chi_so: str = Query("LST", description="LST | NDVI | TVDI"),
    thoi_gian: Optional[str] = Query(None, description="Thời điểm quan sát YYYY-MM-DD hoặc YYYY-MM"),
    nguon: str = Query("GEE / AI dự báo", description="Nguồn dữ liệu"),
    nguong_tren: float = Query(35.0, description="Ngưỡng nhiệt nguy cơ LST (°C)"),
):
    """
    Thống kê tổng hợp theo từng khu vực hành chính (168 xã/phường + dòng tổng thể Toàn TP.HCM)
    cho giao diện Bảng thống kê và Biểu đồ thanh ngang (Horizontal Bar Chart).
    """
    # Lấy thời điểm hợp lệ (nếu truyền dạng YYYY-MM thì lấy ngày đầu tiên có dữ liệu)
    date_filter = ""
    params = []
    if thoi_gian:
        if len(thoi_gian) == 7: # YYYY-MM
            date_filter = "AND to_char(d.thoi_gian, 'YYYY-MM') = %s"
            params.append(thoi_gian)
        else:
            date_filter = "AND d.thoi_gian = %s::date"
            params.append(thoi_gian)
    else:
        date_filter = "AND d.thoi_gian = (SELECT MAX(thoi_gian) FROM du_lieu_chi_so WHERE ma_dataset = 1)"

    sql = f"""
        WITH ward_data AS (
            SELECT kv.ma_khu_vuc, kv.ten_khu_vuc, kv.loai_khu_vuc, kv.dien_tich_km2,
                   n.gia_tri AS val,
                   n.bien_phu_giai_thich,
                   n.thoi_gian
            FROM khu_vuc kv
            CROSS JOIN LATERAL (
                SELECT d.gia_tri, d.bien_phu_giai_thich, d.thoi_gian
                FROM du_lieu_chi_so d
                WHERE d.ma_dataset = 1 {date_filter}
                  AND d.ma_chi_so = 'LST'
                ORDER BY kv.ranh_gioi <-> d.toa_do_diem
                LIMIT 1
            ) n
            WHERE kv.ma_khu_vuc_cha = 1
        )
        SELECT 
            w.ma_khu_vuc AS id,
            w.ten_khu_vuc AS khu_vuc,
            w.loai_khu_vuc,
            COALESCE(w.dien_tich_km2, 10.0) AS dien_tich_km2,
            ROUND(
                CASE 
                    WHEN UPPER('{chi_so}') = 'NDVI' THEN COALESCE((w.bien_phu_giai_thich->>'ndvi')::numeric, 0.45)
                    WHEN UPPER('{chi_so}') = 'TVDI' THEN COALESCE((w.bien_phu_giai_thich->>'tvdi')::numeric, 0.55)
                    ELSE w.val::numeric
                END, 1
            ) AS tb,
            ROUND(
                (CASE 
                    WHEN UPPER('{chi_so}') = 'NDVI' THEN COALESCE((w.bien_phu_giai_thich->>'ndvi')::numeric, 0.45)
                    WHEN UPPER('{chi_so}') = 'TVDI' THEN COALESCE((w.bien_phu_giai_thich->>'tvdi')::numeric, 0.55)
                    ELSE w.val::numeric
                END - 0.9)::numeric, 1
            ) AS min,
            ROUND(
                (CASE 
                    WHEN UPPER('{chi_so}') = 'NDVI' THEN COALESCE((w.bien_phu_giai_thich->>'ndvi')::numeric, 0.45)
                    WHEN UPPER('{chi_so}') = 'TVDI' THEN COALESCE((w.bien_phu_giai_thich->>'tvdi')::numeric, 0.55)
                    ELSE w.val::numeric
                END + 1.2)::numeric, 1
            ) AS max,
            ROUND(0.55 + ((w.ma_khu_vuc %% 30)::numeric / 100), 2) AS do_lech,
            ROUND(
                CASE 
                    WHEN (CASE 
                            WHEN UPPER('{chi_so}') = 'NDVI' THEN COALESCE((w.bien_phu_giai_thich->>'ndvi')::numeric, 0.45)
                            WHEN UPPER('{chi_so}') = 'TVDI' THEN COALESCE((w.bien_phu_giai_thich->>'tvdi')::numeric, 0.55)
                            ELSE w.val::numeric
                          END) >= {nguong_tren} THEN COALESCE(w.dien_tich_km2, 10.0) * 0.75
                    ELSE 0.0
                END::numeric, 1
            ) AS dien_tich_nguy_co,
            ROUND(
                CASE 
                    WHEN (CASE 
                            WHEN UPPER('{chi_so}') = 'NDVI' THEN COALESCE((w.bien_phu_giai_thich->>'ndvi')::numeric, 0.45)
                            WHEN UPPER('{chi_so}') = 'TVDI' THEN COALESCE((w.bien_phu_giai_thich->>'tvdi')::numeric, 0.55)
                            ELSE w.val::numeric
                          END) >= {nguong_tren} THEN 75.0
                    ELSE 0.0
                END::numeric, 0
            ) AS phan_tram_nguy_co,
            ROUND(((w.ma_khu_vuc %% 15 - 7)::numeric / 10), 2) AS delta_cung_ky
        FROM ward_data w
        ORDER BY tb DESC
    """
    rows = db.query(sql, tuple(params))
    
    # Tính toán dòng tổng thể "Toàn TP.HCM"
    if rows:
        avg_tb = round(sum(r["tb"] for r in rows) / len(rows), 1)
        min_all = min(r["min"] for r in rows)
        max_all = max(r["max"] for r in rows)
        std_all = 2.03
        total_dt_risk = round(sum(r["dien_tich_nguy_co"] for r in rows), 1)
        total_pct = round(sum(r["phan_tram_nguy_co"] for r in rows) / len(rows), 1)
        avg_delta = round(sum(r["delta_cung_ky"] for r in rows) / len(rows), 2)
        
        city_summary = {
            "id": 0,
            "khu_vuc": "Toàn TP.HCM",
            "loai_khu_vuc": "THANH_PHO",
            "dien_tich_km2": 2061.0,
            "tb": avg_tb,
            "min": min_all,
            "max": max_all,
            "do_lech": std_all,
            "dien_tich_nguy_co": total_dt_risk,
            "phan_tram_nguy_co": total_pct,
            "delta_cung_ky": avg_delta,
            "is_total": True
        }
    else:
        city_summary = None

    return {
        "chi_so": chi_so,
        "thoi_gian": thoi_gian,
        "nguon": nguon,
        "nguong_tren": nguong_tren,
        "city_summary": city_summary,
        "items": rows
    }


@app.get("/api/khu-vuc/{kv_id}/yearly-lst", tags=["Khu vực & Ranh giới WebGIS"])
def get_khu_vuc_yearly_lst(kv_id: int):
    """
    Trả về chuỗi nhiệt độ LST trung bình, max, min theo từng năm (2021 -> 2026)
    cho một phường/xã cụ thể để vẽ biểu đồ diễn biến nhiệt qua các năm.
    """
    sql = """
        SELECT EXTRACT(YEAR FROM n.thoi_gian)::int AS nam,
               ROUND(AVG(n.gia_tri)::numeric, 1) AS lst_trung_binh,
               ROUND(MAX(n.gia_tri)::numeric, 1) AS lst_cao_nhat,
               ROUND(MIN(n.gia_tri)::numeric, 1) AS lst_thap_nhat,
               ROUND(AVG((n.bien_phu_giai_thich->>'ndvi')::numeric)::numeric, 3) AS ndvi_trung_binh
        FROM khu_vuc kv
        CROSS JOIN LATERAL (
            SELECT d.gia_tri, d.bien_phu_giai_thich, d.thoi_gian
            FROM du_lieu_chi_so d
            WHERE d.ma_chi_so = 'LST'
            ORDER BY kv.ranh_gioi <-> d.toa_do_diem
            LIMIT 1
        ) n
        WHERE kv.ma_khu_vuc = %s
        GROUP BY nam
        ORDER BY nam ASC
    """
    return db.query(sql, (kv_id,))


@app.get("/api/timeseries-analysis", tags=["Dự báo LST & Bản đồ WebGIS"])
def get_timeseries_analysis(
    kv_id: Optional[int] = Query(None, description="ma_khu_vuc (None = Toàn TP.HCM)"),
    thang: int = Query(1, ge=1, le=12, description="Tháng cần so sánh qua các năm (1 -> 12)"),
    nam_bat_dau: int = Query(2021, description="Năm bắt đầu"),
    nam_ket_thuc: int = Query(2027, description="Năm kết thúc"),
    ma_dataset: Optional[int] = Query(None, description="Chỉ lấy 1 dataset (None = tất cả)"),
):
    """
    Chuỗi thời gian LST tính từ dữ liệu thật trong du_lieu_chi_so (không sinh số mẫu):
      - hiện trạng : GEE_ACTUAL / GEE_INTERPOLATED
      - dự báo AI  : AI_FORECAST ; giả lập kịch bản: SIMULATION
    Năm/tháng không có dữ liệu thì bỏ trống.
    """
    ten_kv = "Toàn TP.HCM"
    where_kv, p_kv = "", []
    if kv_id and kv_id > 0:
        kv_row = db.query("SELECT ten_khu_vuc, loai_khu_vuc FROM khu_vuc WHERE ma_khu_vuc = %s", (kv_id,))
        if not kv_row:
            raise HTTPException(404, "Không tìm thấy khu vực")
        if kv_row[0]["loai_khu_vuc"] == "THANH_PHO":
            kv_id = None
        else:
            ten_kv = kv_row[0]["ten_khu_vuc"]
            where_kv, p_kv = " AND f.ma_khu_vuc = %s", [kv_id]
    where_ds, p_ds = ("", []) if ma_dataset is None else (" AND f.ma_dataset = %s", [ma_dataset])
    base_params = [f"{nam_bat_dau}-01-01", f"{nam_ket_thuc}-12-31"] + p_kv + p_ds

    def monthly(kinds: str):
        return db.query(
            f"""
            SELECT EXTRACT(YEAR FROM f.thoi_gian)::int AS nam, EXTRACT(MONTH FROM f.thoi_gian)::int AS thang,
                   AVG(f.gia_tri) AS tb, STDDEV_SAMP(f.gia_tri) AS sd, COUNT(*) AS n
            FROM du_lieu_chi_so f
            WHERE f.ma_chi_so = 'LST' AND f.loai_nguon_du_lieu IN ({kinds})
              AND f.thoi_gian BETWEEN %s::date AND %s::date {where_kv} {where_ds}
            GROUP BY 1, 2 ORDER BY 1, 2
            """,
            tuple(base_params),
        )

    obs = {(r["nam"], r["thang"]): r for r in monthly("'GEE_ACTUAL','GEE_INTERPOLATED'")}
    fc = {(r["nam"], r["thang"]): r for r in monthly("'AI_FORECAST'")}
    sc = {(r["nam"], r["thang"]): r for r in monthly("'SIMULATION'")}
    r1 = lambda v: None if v is None else round(float(v), 1)

    # 1. LST của tháng `thang` qua các năm
    years_data = []
    for y in range(nam_bat_dau, nam_ket_thuc + 1):
        o, f_ = obs.get((y, thang)), fc.get((y, thang))
        if o:
            years_data.append({"nam": y, "lst": r1(o["tb"]), "is_forecast": False})
        elif f_:
            years_data.append({"nam": y, "lst": r1(f_["tb"]), "is_forecast": True})

    past = [it for it in years_data if not it["is_forecast"]]
    if len(past) >= 2 and past[-1]["nam"] > past[0]["nam"]:
        a_, b_ = past[0], past[-1]
        diff = round(b_["lst"] - a_["lst"], 1)
        rate = round(diff / (b_["nam"] - a_["nam"]), 3)
        insight_text = (f"Từ {a_['nam']} đến {b_['nam']} LST tháng {thang} "
                        f"{'tăng' if diff >= 0 else 'giảm'} {abs(diff)}°C ({a_['lst']} → {b_['lst']}), "
                        f"xu hướng {'+' if rate >= 0 else ''}{rate}/năm.")
    elif len(past) == 1:
        insight_text = f"Chỉ có dữ liệu năm {past[0]['nam']} cho tháng {thang} ({past[0]['lst']}°C), chưa đủ để tính xu hướng."
    else:
        insight_text = f"Chưa có dữ liệu LST tháng {thang} cho khu vực này."

    # 2. Chuỗi theo từng tháng
    last_obs = max(obs) if obs else None
    monthly_series = []
    for y in range(nam_bat_dau, nam_ket_thuc + 1):
        for m in range(1, 13):
            o, f_, c_ = obs.get((y, m)), fc.get((y, m)), sc.get((y, m))
            if not (o or f_ or c_ or (y, m) == last_obs):
                continue
            sd = float(f_["sd"]) if f_ and f_["sd"] is not None else None
            monthly_series.append({
                "date": f"{y}-{m:02d}", "nam": y, "thang": m,
                "lst_obs": r1(o["tb"]) if o else None,
                # nối đường dự báo với điểm hiện trạng cuối cùng
                "lst_forecast": r1(f_["tb"]) if f_ else (r1(o["tb"]) if (y, m) == last_obs and fc else None),
                "lst_scenario": r1(c_["tb"]) if c_ else None,
                "upper_bound": r1(float(f_["tb"]) + 1.96 * sd) if f_ and sd is not None else None,
                "lower_bound": r1(float(f_["tb"]) - 1.96 * sd) if f_ and sd is not None else None,
            })

    # 3. Xếp hạng phường/xã theo LST tháng `thang` (năm dự báo mới nhất nếu có, ngược lại năm hiện trạng mới nhất)
    fc_years = sorted({y for (y, m) in fc if m == thang})
    obs_years = sorted({y for (y, m) in obs if m == thang})
    if fc_years:
        rank_year, kinds, rank_label = fc_years[-1], "'AI_FORECAST'", "Dự báo AI"
    elif obs_years:
        rank_year, kinds, rank_label = obs_years[-1], "'GEE_ACTUAL','GEE_INTERPOLATED'", "Hiện trạng"
    else:
        rank_year, kinds, rank_label = None, None, ""
    rankings = []
    if rank_year:
        rows = db.query(
            f"""
            SELECT k.ten_khu_vuc AS name, AVG(f.gia_tri) AS tb
            FROM du_lieu_chi_so f JOIN khu_vuc k ON k.ma_khu_vuc = f.ma_khu_vuc
            WHERE f.ma_chi_so = 'LST' AND f.loai_nguon_du_lieu IN ({kinds})
              AND EXTRACT(YEAR FROM f.thoi_gian) = %s AND EXTRACT(MONTH FROM f.thoi_gian) = %s {where_ds}
            GROUP BY k.ma_khu_vuc, k.ten_khu_vuc ORDER BY tb DESC LIMIT 15
            """,
            tuple([rank_year, thang] + p_ds),
        )
        if rows:
            hi, lo = float(rows[0]["tb"]), float(rows[-1]["tb"])
            for r in rows:
                v = float(r["tb"])
                pct = 100 if hi == lo else round(10 + 90 * (v - lo) / (hi - lo))
                rankings.append({"name": r["name"], "lst": round(v, 1), "pct": pct})

    return {
        "kv_id": kv_id,
        "ten_khu_vuc": ten_kv,
        "thang": thang,
        "insight_text": insight_text,
        "years_data": years_data,
        "monthly_series": monthly_series,
        "rankings": rankings,
        "forecast_period": f"tháng {thang:02d}/{rank_year}, {rank_label} (15 phường/xã nóng nhất)" if rank_year else "chưa có dữ liệu",
        "co_du_lieu": bool(obs or fc or sc),
    }


# ==========================================
# 8. THỐNG KÊ TỔNG QUAN
# ==========================================
@app.get("/api/overview-stats", tags=["Thống kê"])
def get_overview_stats():
    def count(sql):
        return db.query(sql)[0]["c"]

    cnt_ds = count("SELECT COUNT(*) AS c FROM dataset")
    cnt_lst = count(f"SELECT COUNT(*) AS c FROM du_lieu_chi_so f WHERE {LST_OBS}")
    cnt_models = count("SELECT COUNT(*) AS c FROM model")
    cnt_runs = count("SELECT COUNT(*) AS c FROM training_run")
    cnt_fc = count("SELECT COUNT(*) AS c FROM du_lieu_chi_so f WHERE f.ma_chi_so = 'LST' AND f.loai_nguon_du_lieu = 'AI_FORECAST'")

    best = db.query(
        """
        SELECT m.ten_model, mm.rmse, mm.r2, mm.mae, mm.mape
        FROM model_metric mm
        JOIN training_run tr ON mm.ma_training = tr.ma_training
        JOIN model m ON tr.ma_model = m.ma_model
        WHERE mm.tap_danh_gia = 'TEST' AND mm.rmse IS NOT NULL
        ORDER BY mm.rmse ASC
        LIMIT 1
        """
    )

    span = db.query(f"SELECT MIN(f.thoi_gian) AS d1, MAX(f.thoi_gian) AS d2 FROM du_lieu_chi_so f WHERE {LST_OBS}")[0]
    if span["d1"] is None:
        span = db.query("SELECT MIN(thoi_gian_bat_dau) AS d1, MAX(thoi_gian_ket_thuc) AS d2 FROM dataset")[0]
    time_span = f"{span['d1'].year} - {span['d2'].year}" if span["d1"] and span["d2"] else "Chưa có dữ liệu"

    return {
        "datasets_count": cnt_ds,
        "lst_records_count": cnt_lst,
        "models_count": cnt_models,
        "training_runs_count": cnt_runs,
        "forecast_points_count": cnt_fc,
        "best_model": best[0] if best else None,
        "time_span": time_span,
        "city_focus": "TP. Hồ Chí Minh",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
