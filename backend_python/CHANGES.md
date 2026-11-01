# Thay đổi so với bản LST-HCM-updated.zip

Chép đè 4 file này vào `backend_python/` (giữ nguyên các file còn lại):
`models_ai.py`, `main.py`, `requirements.txt` + file mới `gcn_lstm_torch.py`.
Sau đó: `pip install -r requirements.txt` (có thêm `torch`).

## Đã sửa
1. **Chia train/val/test theo thời gian** cho RF, XGBoost, GCN-LSTM.
   Trước: sort theo (kinh_do, vi_do, thoi_gian) rồi cắt 70/15/15 theo dòng => cắt theo *trạm*,
   tập test lẫn quá khứ/tương lai. Nay: dùng `ngay_ket_thuc_train` / `ngay_ket_thuc_val`
   của bảng `tien_xu_ly` (mặc định 2023-12-31 / 2024-12-31), cả 4 mô hình dùng chung mốc.
2. **GCN-LSTM thật** (`gcn_lstm_torch.py`): graph conv (ma trận kề k-NN chuẩn hoá) + LSTM,
   dự báo bước kế tiếp cho tất cả trạm. Bản cũ là XGBoost + công thức tay và dùng `y_test`
   để chỉnh dự đoán (rò rỉ dữ liệu) — đã bỏ hoàn toàn.
3. **ARIMA**: bỏ nhánh `except` tự bịa số `np.linspace(...)`; lỗi fit nay báo lỗi thật.
4. `main.py`: lấy mốc chia từ `tien_xu_ly`, lưu `ma_tien_xu_ly` vào `training_run`
   (cột NOT NULL trong schema PostgreSQL, trước đó không được điền).

## Chưa sửa — cần bạn quyết định
- `Be/src/aiEngine.js` (Node): KHÔNG huấn luyện mô hình nào. "Dự đoán" = giá trị thật + nhiễu nhỏ,
  nhiễu của GCN-LSTM được đặt nhỏ nhất. Nếu dùng backend Node để báo cáo kết quả thì số liệu là giả.
- Số liệu mẫu trong `seed_data.py` / `Be/src/seedData.js` là con số gõ cứng (vd GCN-LSTM RMSE 0.96),
  không phải kết quả huấn luyện. Cần xoá và huấn luyện lại bằng dữ liệu thật.
- Dữ liệu `lst_data` trong `lst_hcm.db` là dữ liệu mô phỏng từ `seed_data.py` (12 điểm, sin + nhiễu),
  nên R² rất cao (~0.98) là bình thường — không phản ánh chất lượng dự báo thực tế.
- Giá trị `tap_danh_gia`: Python dùng 'Kiem_dinh'/'Kiem_tra', còn `schema.sql` và backend Node dùng
  'KIEM_DINH'/'KIEM_TRA' (CHECK constraint). Trên PostgreSQL với schema.sql, insert từ Python sẽ bị từ chối
  và tự rơi về SQLite. Chọn một kiểu rồi đổi đồng bộ (kể cả `frontend_react/src/App.jsx`).

## Dọn số liệu cũ trong SQLite (sau khi đã chép file mới)
```sql
DELETE FROM model_metric; DELETE FROM forecast_result; DELETE FROM map_layer; DELETE FROM training_run;
```
rồi huấn luyện lại từng mô hình qua `POST /api/training/run`.


---
# Bổ sung: bảng KHU_VUC theo SHP (TP.HCM sau sáp nhập + 168 đơn vị cấp xã)

Kiểm tra trước đó: web CHƯA có. KHU_VUC cũ dùng khoá số tự tăng, không có `ma_hanh_chinh`/`dien_tich_km2`,
chỉ có 10 hình chữ nhật vẽ tay. Đã thay theo đúng DDL của nhóm.

## File thay đổi
- `schema.sql` (thư mục gốc project): KHU_VUC mới (khoá `VARCHAR(50)`, `ma_hanh_chinh UNIQUE`, `dien_tich_km2`);
  `forecast_result.ma_khu_vuc` và `map_layer.ma_khu_vuc` đổi sang `VARCHAR(50)`; seed chỉ còn bản ghi gốc `HCM`.
  Chạy lại schema.sql sẽ DROP/CREATE toàn bộ bảng (mất dữ liệu PostgreSQL cũ).
- `database.py`: bảng SQLite mới + tự migrate DB cũ khi khởi động (bỏ khu_vuc cũ, gán forecast/map_layer về 'HCM').
- `seed_data.py`: seed chỉ gốc `HCM`; forecast/map_layer trỏ 'HCM'.
- `main.py`: `GET /api/khu-vuc` trả thêm `ma_hanh_chinh`, `dien_tich_km2`; lọc `?loai=`, `?cha=HCM`,
  `?geometry=true` (mặc định không kèm ranh giới vì 168 đa giác khá nặng). Bản cũ gọi `typeof()` — hàm không
  có trong PostgreSQL nên luôn lỗi rồi âm thầm rơi về SQLite; đã bỏ.
  `GET /api/forecast?ma_khu_vuc=` nhận mã chuỗi, lọc cả đơn vị con; 'HCM' = toàn thành phố.
- `import_khu_vuc.py` (MỚI): nạp ranh giới từ GeoJSON.

## Cách nạp 168 đơn vị (cần file SHP của bạn — mình không có file này)
1. QGIS: chuột phải layer -> Export -> Save Features As -> GeoJSON, CRS = EPSG:4326 (WGS84).
2. Trong `backend_python/`:
   python import_khu_vuc.py xa_phuong.geojson --code-field MA_DVHC --name-field TEN_DVHC --dry-run
   python import_khu_vuc.py xa_phuong.geojson --code-field MA_DVHC --name-field TEN_DVHC
   (thêm `--type-field <cột loại>` nếu SHP có cột Phường/Xã/Đặc khu; `--area-field` nếu có sẵn diện tích km2)
3. Script báo số đơn vị theo loại, cảnh báo nếu khác 168, tự tính diện tích nếu file không có,
   dựng ranh giới 'HCM' (PostgreSQL: ST_Union; SQLite: ghép đa giác để hiển thị),
   và gán lại `forecast_result` về đúng phường/xã chứa điểm (điểm nằm ngoài mọi xã giữ 'HCM').
Tên cột trong SHP phải đúng với --code-field/--name-field (docx ghi MA_DVHC, TEN_DVHC nhưng "tuỳ file").

## Chưa làm / lưu ý
- Bản đồ React vẫn vẽ 24 quận/huyện cũ từ `frontend_react/public/geo/hcm_districts.geojson`;
  chưa chuyển sang 168 đơn vị mới.
- Backend Node (`Be/`) vẫn dùng KHU_VUC khoá số -> sẽ lỗi với schema.sql mới. Dùng backend Python.
- Đường PostgreSQL của import_khu_vuc.py (ST_MakeValid/ST_Union) chưa chạy thử được trong môi trường của mình
  (không có PostgreSQL); đường SQLite đã chạy thử với GeoJSON giả lập 168 ô.
