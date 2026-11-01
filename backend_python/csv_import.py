"""
Đọc, kiểm tra và nạp CSV (xuất từ GEE) vào bảng du_lieu_chi_so.

Cột bắt buộc : ngay, kinh_do, vi_do, lst
Cột tùy chọn : ndvi, tvdi, luong_mua, do_am_dat, lop_phu_be_mat, ma_khu_vuc
Khoảng thời gian cho phép: 2021-01-01 -> 2025-12-31.
"""
import io
import json
import re
import unicodedata
from typing import Any, Dict, List, Optional

import pandas as pd
from psycopg2.extras import execute_values

NGAY_MIN = pd.Timestamp("2021-01-01")
NGAY_MAX = pd.Timestamp("2025-12-31")
MAX_BYTES = 50 * 1024 * 1024

REQUIRED = ["ngay", "kinh_do", "vi_do", "lst"]
OPTIONAL_NUM = {"ndvi": (-1.0, 1.0), "tvdi": (0.0, 1.0), "luong_mua": (0.0, 2000.0), "do_am_dat": (0.0, 100.0)}
OPTIONAL_TXT = ["lop_phu_be_mat", "ma_khu_vuc"]
LST_RANGE = (10.0, 65.0)  # theo danh_muc_chi_so
LON_RANGE = (106.0, 107.5)
LAT_RANGE = (10.0, 11.5)

ALIASES = {
    "ngay": ["ngay", "date", "thoi_gian", "system_time_start", "time"],
    "kinh_do": ["kinh_do", "lon", "lng", "longitude", "x"],
    "vi_do": ["vi_do", "lat", "latitude", "y"],
    "lst": ["lst", "gia_tri_lst", "gia_tri", "lst_celsius", "lst_day"],
    "ndvi": ["ndvi"], "tvdi": ["tvdi"],
    "luong_mua": ["luong_mua", "rain", "rainfall", "precipitation"],
    "do_am_dat": ["do_am_dat", "soil_moisture", "do_am"],
    "lop_phu_be_mat": ["lop_phu_be_mat", "landcover", "land_cover", "lulc"],
    "ma_khu_vuc": ["ma_khu_vuc", "ma_hanh_chinh", "ma_dvhc"],
}

TEMPLATE_CSV = (
    "ngay,kinh_do,vi_do,lst,ndvi,tvdi,luong_mua,do_am_dat,lop_phu_be_mat,ma_khu_vuc\n"
    "2021-01-01,106.7009,10.7769,33.45,0.312,0.58,2.1,68.5,Do_thi,\n"
    "2021-01-17,106.7009,10.7769,34.10,0.298,0.61,0.0,66.2,Do_thi,\n"
)


class CsvError(Exception):
    pass


def _norm(name: str) -> str:
    s = unicodedata.normalize("NFD", str(name).strip().lower().replace("đ", "d"))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")


def parse_and_validate(raw: bytes) -> Dict[str, Any]:
    """Trả về {df (hợp lệ), report}. Ném CsvError nếu file không dùng được."""
    if not raw:
        raise CsvError("Tệp rỗng.")
    if len(raw) > MAX_BYTES:
        raise CsvError("Tệp vượt quá 50MB.")
    try:
        df = pd.read_csv(io.BytesIO(raw), sep=None, engine="python", encoding="utf-8-sig", dtype=str)
    except Exception as e:
        raise CsvError(f"Không đọc được CSV: {e}")

    # Chuẩn hóa tên cột theo bí danh
    lookup = {a: k for k, al in ALIASES.items() for a in al}
    rename, seen = {}, set()
    for c in df.columns:
        k = lookup.get(_norm(c))
        if k and k not in seen:
            rename[c] = k
            seen.add(k)
    df = df.rename(columns=rename)
    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        raise CsvError(f"Thiếu cột bắt buộc: {', '.join(missing)}. Các cột tìm thấy: {', '.join(map(str, df.columns))}")

    total = len(df)
    df = df.reset_index(drop=True)
    df["_dong"] = df.index + 2  # số dòng trong file (có dòng tiêu đề)
    errors: List[Dict[str, Any]] = []
    reasons: Dict[str, int] = {}
    bad = pd.Series(False, index=df.index)

    def flag(mask: pd.Series, reason: str):
        nonlocal bad
        m = mask & ~bad
        if m.any():
            reasons[reason] = reasons.get(reason, 0) + int(m.sum())
            for d in df.loc[m, "_dong"].head(10 - min(10, len(errors))):
                errors.append({"dong": int(d), "loi": reason})
            bad = bad | m

    df["ngay"] = pd.to_datetime(df["ngay"].str.strip().str[:10], errors="coerce")
    flag(df["ngay"].isna(), "ngày không hợp lệ (cần YYYY-MM-DD)")
    flag((df["ngay"] < NGAY_MIN) | (df["ngay"] > NGAY_MAX), "ngày ngoài khoảng 2021-01-01 → 2025-12-31")
    for c, (lo, hi), label in [("kinh_do", LON_RANGE, "kinh độ"), ("vi_do", LAT_RANGE, "vĩ độ"), ("lst", LST_RANGE, "LST")]:
        df[c] = pd.to_numeric(df[c].str.strip().str.replace(",", ".", regex=False), errors="coerce")
        flag(df[c].isna(), f"{label} trống hoặc không phải số")
        flag((df[c] < lo) | (df[c] > hi), f"{label} ngoài khoảng hợp lệ [{lo}, {hi}]")
    for c, (lo, hi) in OPTIONAL_NUM.items():
        if c in df.columns:
            df[c] = pd.to_numeric(df[c].str.strip().str.replace(",", ".", regex=False), errors="coerce")
            flag(df[c].notna() & ((df[c] < lo) | (df[c] > hi)), f"{c} ngoài khoảng hợp lệ [{lo}, {hi}]")
    flag(df.duplicated(subset=["ngay", "kinh_do", "vi_do"], keep="first") & ~bad, "trùng (ngày, kinh độ, vĩ độ)")

    ok = df[~bad].copy()
    if ok.empty:
        raise CsvError("Không có dòng hợp lệ nào. " + "; ".join(f"{k}: {v} dòng" for k, v in reasons.items()))
    report = {
        "tong_dong": total,
        "dong_hop_le": int(len(ok)),
        "dong_bi_loai": int(total - len(ok)),
        "ly_do_bi_loai": reasons,
        "vi_du_loi": errors,
        "cot_nhan_dien": sorted(seen),
        "cot_tuy_chon_thieu": [c for c in list(OPTIONAL_NUM) + OPTIONAL_TXT if c not in df.columns],
        "ngay_dau": ok["ngay"].min().strftime("%Y-%m-%d"),
        "ngay_cuoi": ok["ngay"].max().strftime("%Y-%m-%d"),
        "so_diem": int(ok[["kinh_do", "vi_do"]].drop_duplicates().shape[0]),
        "lst_tb": round(float(ok["lst"].mean()), 2),
        "lst_min": round(float(ok["lst"].min()), 2),
        "lst_max": round(float(ok["lst"].max()), 2),
    }
    return {"df": ok, "report": report}


def _nn(v):
    return None if v is None or (isinstance(v, float) and pd.isna(v)) or (isinstance(v, str) and not v.strip()) else v


def insert_dataset(conn, df: pd.DataFrame, ma_nguoi_dung: int, ten: str, nguon: str, ten_file: str) -> Dict[str, Any]:
    """Tạo dataset + ghi các dòng LST (biến giải thích vào jsonb) trong 1 transaction."""
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO dataset (ma_nguoi_dung, ten_dataset, nguon_du_lieu, thoi_gian_bat_dau, thoi_gian_ket_thuc, duong_dan_file, ngay_tao)
               VALUES (%s,%s,%s,%s,%s,%s,CURRENT_TIMESTAMP) RETURNING ma_dataset""",
            (ma_nguoi_dung, ten, nguon, df["ngay"].min().date(), df["ngay"].max().date(), ten_file[:255]),
        )
        ma_dataset = cur.fetchone()[0]

        # Tra mã khu vực nếu CSV có cột ma_khu_vuc (mã hành chính hoặc khóa số)
        kv_map: Dict[str, int] = {}
        if "ma_khu_vuc" in df.columns:
            cur.execute("SELECT ma_khu_vuc, ma_hanh_chinh FROM khu_vuc")
            for pk, mhc in cur.fetchall():
                kv_map[str(pk)] = pk
                if mhc:
                    kv_map[str(mhc).strip()] = pk

        rows = []
        for r in df.itertuples(index=False):
            d = r._asdict()
            bien: Dict[str, Any] = {}
            for k in list(OPTIONAL_NUM) + ["lop_phu_be_mat"]:
                v = _nn(d.get(k))
                if v is not None:
                    bien[k] = float(v) if k in OPTIONAL_NUM else str(v).strip()
            kv = kv_map.get(str(_nn(d.get("ma_khu_vuc")) or "").strip()) if kv_map else None
            rows.append((ma_dataset, kv, d["ngay"].date(), float(d["vi_do"]), float(d["kinh_do"]),
                         "LST", float(d["lst"]), "GEE_ACTUAL", json.dumps(bien, ensure_ascii=False)))
        execute_values(
            cur,
            """INSERT INTO du_lieu_chi_so (ma_dataset, ma_khu_vuc, thoi_gian, vi_do, kinh_do, ma_chi_so, gia_tri, loai_nguon_du_lieu, bien_phu_giai_thich)
               VALUES %s""",
            rows, page_size=2000,
        )
        # Gán khu vực theo không gian cho các điểm chưa có ma_khu_vuc (đơn vị nhỏ nhất chứa điểm)
        cur.execute(
            """UPDATE du_lieu_chi_so f SET ma_khu_vuc = k.ma_khu_vuc
               FROM (SELECT DISTINCT ON (d.ma_ban_ghi) d.ma_ban_ghi, kv.ma_khu_vuc
                     FROM du_lieu_chi_so d JOIN khu_vuc kv ON kv.ranh_gioi IS NOT NULL AND ST_Intersects(kv.ranh_gioi, d.toa_do_diem)
                     WHERE d.ma_dataset = %s AND d.ma_khu_vuc IS NULL
                     ORDER BY d.ma_ban_ghi, kv.dien_tich_km2 ASC NULLS LAST) k
               WHERE f.ma_ban_ghi = k.ma_ban_ghi""",
            (ma_dataset,),
        )
        gan_kv = cur.rowcount
        cur.execute("SELECT COUNT(*) FROM du_lieu_chi_so WHERE ma_dataset=%s AND ma_khu_vuc IS NULL", (ma_dataset,))
        chua_gan = cur.fetchone()[0]
    return {"ma_dataset": ma_dataset, "so_dong_nap": len(rows), "gan_khu_vuc_theo_khong_gian": gan_kv, "chua_gan_khu_vuc": chua_gan}
