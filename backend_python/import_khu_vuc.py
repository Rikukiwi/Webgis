"""
import_khu_vuc.py
=================
Nạp ranh giới TP.HCM (sau sáp nhập) và 168 đơn vị hành chính cấp xã vào bảng KHU_VUC.

Đầu vào: file GeoJSON hệ toạ độ WGS84 (EPSG:4326) xuất từ SHP bằng QGIS:
    Chuột phải layer -> Export -> Save Features As... -> Format: GeoJSON -> CRS: EPSG:4326
(hoặc: ogr2ogr -f GeoJSON -t_srs EPSG:4326 xa_phuong.geojson xa_phuong.shp)

Mỗi feature = 1 phường / xã / đặc khu. File KHÔNG cần chứa dòng "TP.HCM"; script tự tạo/cập nhật
bản ghi gốc 'HCM' từ phần hợp nhất ranh giới của các đơn vị con.

Cách chạy (trong thư mục backend_python):
    python import_khu_vuc.py xa_phuong.geojson --code-field MA_DVHC --name-field TEN_DVHC
    python import_khu_vuc.py xa_phuong.geojson --code-field MA_DVHC --name-field TEN_DVHC --type-field LOAI
    python import_khu_vuc.py xa_phuong.geojson --code-field MA_DVHC --name-field TEN_DVHC --dry-run

Cột trong KHU_VUC:
    ma_khu_vuc     = <LOAI>_<MA_DVHC>, vd PHUONG_26734   (gốc: 'HCM')
    ma_hanh_chinh  = MA_DVHC
    ten_khu_vuc    = TEN_DVHC
    loai_khu_vuc   = từ --type-field, nếu không có thì suy ra từ tiền tố tên (Phường/Xã/Đặc khu)
    ma_khu_vuc_cha = 'HCM'
    dien_tich_km2  = từ --area-field (đơn vị km2) nếu có, nếu không thì tính từ hình học
    ranh_gioi      = MultiPolygon WGS84
"""
import argparse
import json
import math
import sys
import unicodedata
from collections import Counter

ROOT_CODE = "HCM"
ROOT_ADMIN_CODE = "79"
ROOT_NAME = "Thành phố Hồ Chí Minh"
EARTH_RADIUS_KM = 6371.0088


# ---------------------------------------------------------------- hình học thuần Python
def to_multipolygon_coords(geometry):
    """Trả về list các polygon: mỗi polygon = [outer_ring, hole1, ...]."""
    gtype = geometry.get("type")
    if gtype == "Polygon":
        return [geometry["coordinates"]]
    if gtype == "MultiPolygon":
        return geometry["coordinates"]
    raise ValueError(f"Kiểu hình học không hỗ trợ: {gtype}")


def _ring_area_km2(ring):
    """Diện tích 1 vòng toạ độ (lon, lat) bằng phép chiếu equirectangular quanh vĩ độ trung bình."""
    if len(ring) < 4:
        return 0.0
    lat0 = math.radians(sum(p[1] for p in ring) / len(ring))
    k = EARTH_RADIUS_KM * math.pi / 180.0
    pts = [(p[0] * k * math.cos(lat0), p[1] * k) for p in ring]
    s = 0.0
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


def area_km2(multipolygon):
    total = 0.0
    for poly in multipolygon:
        outer = _ring_area_km2(poly[0])
        holes = sum(_ring_area_km2(r) for r in poly[1:])
        total += max(outer - holes, 0.0)
    return total


def _point_in_ring(x, y, ring):
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def point_in_multipolygon(x, y, multipolygon):
    for poly in multipolygon:
        if _point_in_ring(x, y, poly[0]) and not any(_point_in_ring(x, y, h) for h in poly[1:]):
            return True
    return False


def bbox_of(multipolygon):
    xs = [p[0] for poly in multipolygon for p in poly[0]]
    ys = [p[1] for poly in multipolygon for p in poly[0]]
    return min(xs), min(ys), max(xs), max(ys)


# ---------------------------------------------------------------- đọc & chuẩn hoá thuộc tính
def _strip_accents(text):
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return text.replace("đ", "d").replace("Đ", "D").lower().strip()


def classify(type_value, name):
    """Trả về PHUONG | XA | DAC_KHU hoặc None nếu không đoán được."""
    for raw in (type_value, name):
        if not raw:
            continue
        t = _strip_accents(str(raw))
        if t.startswith("dac khu") or t == "dac_khu":
            return "DAC_KHU"
        if t.startswith("phuong") or t == "phuong":
            return "PHUONG"
        if t.startswith("xa") and (len(t) == 2 or not t[2].isalpha()):
            return "XA"
    return None


def clean_code(value):
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    text = str(value).strip()
    return text or None


def load_units(path, code_field, name_field, type_field, area_field):
    with open(path, encoding="utf-8") as f:
        gj = json.load(f)
    features = gj["features"] if gj.get("type") == "FeatureCollection" else [gj]

    units, problems = [], []
    for i, ft in enumerate(features):
        props = ft.get("properties") or {}
        code = clean_code(props.get(code_field))
        name = (props.get(name_field) or "").strip() if props.get(name_field) else ""
        if not code or not name:
            problems.append(f"Feature #{i}: thiếu '{code_field}' hoặc '{name_field}' (props: {list(props)[:8]})")
            continue
        loai = classify(props.get(type_field) if type_field else None, name)
        if loai is None:
            problems.append(f"Feature #{i} '{name}': không xác định được loại (Phường/Xã/Đặc khu) -> mặc định XA")
            loai = "XA"
        try:
            mp = to_multipolygon_coords(ft["geometry"])
        except Exception as exc:  # noqa: BLE001
            problems.append(f"Feature #{i} '{name}': {exc}")
            continue

        a = None
        if area_field and props.get(area_field) not in (None, ""):
            try:
                a = float(props[area_field])
            except (TypeError, ValueError):
                a = None
        units.append({
            "ma_khu_vuc": f"{loai}_{code}",
            "ma_hanh_chinh": code,
            "ten_khu_vuc": name,
            "loai_khu_vuc": loai,
            "dien_tich_km2": a if a is not None else round(area_km2(mp), 4),
            "area_source": "file" if a is not None else "tinh_tu_hinh_hoc",
            "multipolygon": mp,
        })
    return units, problems


def check_wgs84(units):
    x0 = min(bbox_of(u["multipolygon"])[0] for u in units)
    y0 = min(bbox_of(u["multipolygon"])[1] for u in units)
    x1 = max(bbox_of(u["multipolygon"])[2] for u in units)
    y1 = max(bbox_of(u["multipolygon"])[3] for u in units)
    if not (95 <= x0 and x1 <= 115 and 5 <= y0 and y1 <= 25):
        raise SystemExit(
            f"Toạ độ ngoài vùng Việt Nam (lon {x0:.2f}..{x1:.2f}, lat {y0:.2f}..{y1:.2f}). "
            "File có vẻ không ở EPSG:4326 — xuất lại từ QGIS với CRS EPSG:4326 (WGS84)."
        )


# ---------------------------------------------------------------- ghi vào DB
def write_units(db, units):
    pg = db.use_postgres
    geo_expr_pg = "ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)), 3))"

    # bản ghi gốc
    if pg:
        db.query(
            "INSERT INTO khu_vuc (ma_khu_vuc, ma_hanh_chinh, ten_khu_vuc, loai_khu_vuc, ma_khu_vuc_cha) "
            "VALUES ($1, $2, $3, 'THANH_PHO', NULL) ON CONFLICT (ma_khu_vuc) DO NOTHING",
            params=(ROOT_CODE, ROOT_ADMIN_CODE, ROOT_NAME),
        )
    else:
        db.query(
            "", "INSERT OR IGNORE INTO khu_vuc (ma_khu_vuc, ma_hanh_chinh, ten_khu_vuc, loai_khu_vuc, ma_khu_vuc_cha) "
                "VALUES (?, ?, ?, 'THANH_PHO', NULL)",
            params=(ROOT_CODE, ROOT_ADMIN_CODE, ROOT_NAME),
        )

    for u in units:
        geojson = json.dumps({"type": "MultiPolygon", "coordinates": u["multipolygon"]}, separators=(",", ":"))
        if pg:
            db.query(
                "INSERT INTO khu_vuc (ma_khu_vuc, ma_hanh_chinh, ten_khu_vuc, loai_khu_vuc, ma_khu_vuc_cha, dien_tich_km2, ranh_gioi) "
                "VALUES ($1, $2, $3, $4, $5, $6, "
                "ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($7), 4326)), 3))) "
                "ON CONFLICT (ma_khu_vuc) DO UPDATE SET ma_hanh_chinh = EXCLUDED.ma_hanh_chinh, "
                "ten_khu_vuc = EXCLUDED.ten_khu_vuc, loai_khu_vuc = EXCLUDED.loai_khu_vuc, "
                "ma_khu_vuc_cha = EXCLUDED.ma_khu_vuc_cha, dien_tich_km2 = EXCLUDED.dien_tich_km2, "
                "ranh_gioi = EXCLUDED.ranh_gioi",
                params=(u["ma_khu_vuc"], u["ma_hanh_chinh"], u["ten_khu_vuc"], u["loai_khu_vuc"],
                        ROOT_CODE, u["dien_tich_km2"], geojson),
            )
        else:
            db.query(
                "",
                "INSERT INTO khu_vuc (ma_khu_vuc, ma_hanh_chinh, ten_khu_vuc, loai_khu_vuc, ma_khu_vuc_cha, dien_tich_km2, ranh_gioi) "
                "VALUES (?, ?, ?, ?, ?, ?, ?) "
                "ON CONFLICT (ma_khu_vuc) DO UPDATE SET ma_hanh_chinh = excluded.ma_hanh_chinh, "
                "ten_khu_vuc = excluded.ten_khu_vuc, loai_khu_vuc = excluded.loai_khu_vuc, "
                "ma_khu_vuc_cha = excluded.ma_khu_vuc_cha, dien_tich_km2 = excluded.dien_tich_km2, "
                "ranh_gioi = excluded.ranh_gioi",
                params=(u["ma_khu_vuc"], u["ma_hanh_chinh"], u["ten_khu_vuc"], u["loai_khu_vuc"],
                        ROOT_CODE, u["dien_tich_km2"], geojson),
            )

    # ranh giới + diện tích của gốc 'HCM' = hợp nhất các đơn vị con
    if pg:
        db.query(
            "UPDATE khu_vuc SET "
            "ranh_gioi = (SELECT ST_Multi(ST_CollectionExtract(ST_Union(ranh_gioi), 3)) FROM khu_vuc WHERE ma_khu_vuc_cha = $1), "
            "dien_tich_km2 = (SELECT SUM(dien_tich_km2) FROM khu_vuc WHERE ma_khu_vuc_cha = $2) "
            "WHERE ma_khu_vuc = $3",
            params=(ROOT_CODE, ROOT_CODE, ROOT_CODE),
        )
    else:
        # SQLite không có ST_Union: ghép các đa giác con (chỉ để hiển thị, không phải hợp nhất đúng nghĩa)
        all_polys = [p for u in units for p in u["multipolygon"]]
        root_geojson = json.dumps({"type": "MultiPolygon", "coordinates": all_polys}, separators=(",", ":"))
        total_area = round(sum(u["dien_tich_km2"] for u in units), 4)
        db.query(
            "", "UPDATE khu_vuc SET ranh_gioi = ?, dien_tich_km2 = ? WHERE ma_khu_vuc = ?",
            params=(root_geojson, total_area, ROOT_CODE),
        )


def reassign_forecasts(db, units):
    """Gán lại forecast_result.ma_khu_vuc về đơn vị cấp xã chứa điểm dự báo (điểm ngoài mọi xã giữ 'HCM')."""
    if db.use_postgres:
        db.query(
            "UPDATE forecast_result f SET ma_khu_vuc = kv.ma_khu_vuc FROM khu_vuc kv "
            "WHERE kv.ma_khu_vuc_cha = $1 AND ST_Contains(kv.ranh_gioi, f.geom)",
            params=(ROOT_CODE,),
        )
        return None

    boxes = [(bbox_of(u["multipolygon"]), u) for u in units]
    points = db.query("", "SELECT DISTINCT kinh_do, vi_do FROM forecast_result")
    moved = 0
    for p in points:
        x, y = p["kinh_do"], p["vi_do"]
        for (x0, y0, x1, y1), u in boxes:
            if x0 <= x <= x1 and y0 <= y <= y1 and point_in_multipolygon(x, y, u["multipolygon"]):
                db.query("", "UPDATE forecast_result SET ma_khu_vuc = ? WHERE kinh_do = ? AND vi_do = ?",
                         params=(u["ma_khu_vuc"], x, y))
                moved += 1
                break
    return moved


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description="Nạp ranh giới TP.HCM + đơn vị cấp xã vào KHU_VUC")
    ap.add_argument("geojson", help="Đường dẫn file GeoJSON (EPSG:4326)")
    ap.add_argument("--code-field", default="MA_DVHC", help="Thuộc tính mã hành chính (mặc định MA_DVHC)")
    ap.add_argument("--name-field", default="TEN_DVHC", help="Thuộc tính tên (mặc định TEN_DVHC)")
    ap.add_argument("--type-field", default=None, help="Thuộc tính loại: Phường/Xã/Đặc khu (nếu có)")
    ap.add_argument("--area-field", default=None, help="Thuộc tính diện tích đã có sẵn, đơn vị km2 (nếu có)")
    ap.add_argument("--expected", type=int, default=168, help="Số đơn vị cấp xã kỳ vọng (mặc định 168)")
    ap.add_argument("--no-reassign", action="store_true", help="Không gán lại forecast_result theo toạ độ")
    ap.add_argument("--dry-run", action="store_true", help="Chỉ kiểm tra file, không ghi DB")
    args = ap.parse_args()

    units, problems = load_units(args.geojson, args.code_field, args.name_field, args.type_field, args.area_field)
    if not units:
        print("Không đọc được đơn vị nào. Vấn đề:")
        print("\n".join("  - " + p for p in problems[:20]))
        sys.exit(1)

    check_wgs84(units)

    codes = Counter(u["ma_hanh_chinh"] for u in units)
    dup = [c for c, n in codes.items() if n > 1]
    if dup:
        print(f"LỖI: trùng mã hành chính {dup[:10]} — ma_hanh_chinh phải UNIQUE. Kiểm tra --code-field.")
        sys.exit(1)

    by_type = Counter(u["loai_khu_vuc"] for u in units)
    print(f"Đọc {len(units)} đơn vị: {dict(by_type)}")
    print(f"Tổng diện tích: {sum(u['dien_tich_km2'] for u in units):,.1f} km2 "
          f"(nguồn: {Counter(u['area_source'] for u in units)})")
    if len(units) != args.expected:
        print(f"CẢNH BÁO: số đơn vị là {len(units)}, kỳ vọng {args.expected}. "
              "Kiểm tra file có thừa/thiếu đơn vị (vd lẫn dòng tỉnh/huyện cũ) không.")
    for p in problems[:15]:
        print("  ! " + p)

    if args.dry_run:
        print("--dry-run: không ghi DB.")
        return

    from database import db  # import muộn để --dry-run không cần kết nối DB
    mode_before = db.use_postgres
    write_units(db, units)
    if db.use_postgres != mode_before:
        print("LỖI: kết nối PostgreSQL bị lỗi giữa chừng và code đã chuyển sang SQLite -> dữ liệu có thể ghi dở. "
              "Kiểm tra schema.sql đã chạy chưa, rồi chạy lại.")
        sys.exit(1)

    if not args.no_reassign:
        moved = reassign_forecasts(db, units)
        print("Đã gán lại forecast_result theo toạ độ" + (f" ({moved} điểm)." if moved is not None else "."))

    n = db.query("SELECT COUNT(*) AS c FROM khu_vuc WHERE ma_khu_vuc_cha = $1", "SELECT COUNT(*) AS c FROM khu_vuc WHERE ma_khu_vuc_cha = ?", (ROOT_CODE,))[0]["c"]
    print(f"Xong. Bảng KHU_VUC hiện có {n} đơn vị con của '{ROOT_CODE}' "
          f"({'PostgreSQL/PostGIS' if db.use_postgres else 'SQLite'}).")


if __name__ == "__main__":
    main()
