# HƯỚNG DẪN KHỞI ĐỘNG HỆ THỐNG WEBGIS DỰ BÁO LST TP.HCM

## 1. Yêu cầu môi trường
- **Python**: 3.9 - 3.11 (đã cài các gói: `fastapi`, `uvicorn`, `psycopg2-binary`, `pandas`, `scikit-learn`, `bcrypt`, `pyjwt`, `pydantic`).
- **PostgreSQL / PostGIS**:
  - CSDL: `lst_hcm`
  - User: `postgres`
  - Mật khẩu mặc định: `123456`
  - Cổng: `5432`
  - File dữ liệu: Nạp file `lst_hcm_v8_Final.sql` (kèm sẵn trong thư mục gốc) vào database `lst_hcm`.

## 2. Cách khởi động hệ thống (1 cú nhấp chuột)
1. Nhấp đúp vào file **`start_webgis.bat`**.
2. Mở trình duyệt web truy cập địa chỉ: **`http://localhost:8000`**
   *(Giao diện React SPA đã được biên dịch sẵn trong `frontend_react/dist`, không cần cài Node.js hay build lại)*.

## 3. Tài khoản đăng nhập kiểm thử
| Tên đăng nhập | Mật khẩu | Quyền hạn | Chức năng |
|---|---|---|---|
| `admin` | `admin123` | **ADMIN** | Toàn quyền: chạy huấn luyện AI, tải dữ liệu vệ tinh GEE, quản lý người dùng |
| `user` | `user123` | **NGƯỜI XEM** | Tra cứu bản đồ 2D/3D, xem bảng xếp hạng 167 phường, xuất CSV/A4 |
| `chuyengia` | `chuyengia123` | **CHUYÊN GIA** | Đánh giá chỉ số, phân tích chuỗi thời gian, xem mô hình AI |

## 4. Các tính năng nổi bật trên bản đồ
- **Bản đồ nền đa dạng & Tốc độ cao**:
  - 🗺️ **Nhẹ nhàng (CARTO Voyager)**: Tải siêu tốc qua CDN, hiển thị rõ sông ngòi, bờ biển, mạng lưới giao thông và địa danh các tỉnh lân cận.
  - 🛰️ **Vệ tinh (Esri World Imagery)**: Chế độ ảnh vệ tinh thực tế độ phân giải cao.
  - 🛣️ **Đường phố (OpenStreetMap)**: Bản đồ giao thông chuẩn quốc tế.
- **Hiển thị 8 Tỉnh lân cận giáp ranh TP.HCM**:
  - Bao gồm: **Bình Dương, Đồng Nai, Bà Rịa – Vũng Tàu, Long An, Tây Ninh, Tiền Giang, Bến Tre**.
  - Ranh giới phối màu pastel nhẹ nhàng, có nhãn định danh và tooltip tra cứu khi rê chuột.
- **Chuyển đổi 2D / 3D & Chỉnh độ cao**:
  - Chuyển đổi giữa bản đồ nhiệt 2D và khối lăng trụ 3D nổi (Extruded Prism Polygons).
  - Tùy chỉnh độ đùn 3D: `1x`, `1.5x`, `2x`.
- **Lọc ngưỡng & Xếp hạng 167 Phường**:
  - Lọc nhanh các phường vượt ngưỡng cảnh báo nhiệt LST hoặc khô hạn TVDI.
  - Xuất báo cáo bảng xếp hạng dạng file CSV UTF-8.
