# Kế hoạch triển khai: Hệ thống WebGIS tích hợp AI dự báo LST TP.HCM

## 1. Tổng quan hệ thống
Hệ thống WebGIS tích hợp các mô hình trí tuệ nhân tạo (AI/Machine Learning & Deep Learning) để dự báo nhiệt độ bề mặt đất (**LST – Land Surface Temperature**) theo chuỗi thời gian tại khu vực TP.HCM.

### Thành phần kiến trúc:
1. **Database**: PostgreSQL + PostGIS, cấu trúc chuẩn **10 bảng**:
   - `nguoi_dung`, `dataset`, `khu_vuc`, `lst_data`, `tien_xu_ly`
   - `model`, `training_run`, `model_metric`, `forecast_result`, `map_layer`
2. **Backend (`Be`)**: 
   - **Core API Service**: Node.js / Express (REST API, PostGIS GIS queries, xác thực JWT, quản lý dataset, layer GIS).
   - **AI/ML Engine Module**: Thực thi các mô hình dự báo LST (ARIMA, RF, XGBoost, LSTM) và tính toán 4 chỉ số (MAE, RMSE, R², MAPE).
3. **Frontend (`Fe`)**:
   - WebGIS Dashboard trực quan hóa bản đồ LST bằng **Leaflet / OpenStreetMap**.
   - Thể hiện ranh giới TP.HCM và các khu vực.
   - Bảng phân tích dự báo LST theo vị trí, thời gian (time-slider).
   - Bảng quản lý dataset, cấu hình tiền xử lý, kích hoạt huấn luyện mô hình & so sánh chỉ số đánh giá.

---

## 2. Kế hoạch triển khai từng bước
- **Bước 1**: Khởi tạo Schema CSDL 10 bảng và dữ liệu mẫu chuẩn (TP.HCM + các quận/huyện, bộ dữ liệu LST).
- **Bước 2**: Xây dựng Backend Node.js / Express trong thư mục `Be`.
- **Bước 3**: Xây dựng Frontend WebGIS tương tác trong thư mục `Fe`.
- **Bước 4**: Tích hợp, chạy thử nghiệm hệ thống và bàn giao.
