"""
Lớp truy cập CSDL PostgreSQL / PostGIS cho đồ án WebGIS LST TP.HCM.

CSDL: lst_hcm (v8_Final) - 10 bảng:
  nguoi_dung, khu_vuc, danh_muc_chi_so, dataset, tien_xu_ly,
  model, training_run, model_metric, du_lieu_chi_so, thong_ke_va_lop_ban_do

Cấu hình kết nối đọc từ file .env (cùng thư mục):
  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

Không còn SQLite dự phòng: nếu không kết nối được thì báo lỗi rõ ràng ngay khi khởi động.
"""

import os
from typing import Any, Dict, List, Optional

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "lst_hcm")


class DatabaseManager:
    def __init__(self):
        self.conn_params = dict(
            host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, dbname=DB_NAME
        )
        self._check_connection()

    def _connect(self):
        return psycopg2.connect(connect_timeout=5, **self.conn_params)

    def _check_connection(self):
        try:
            conn = self._connect()
        except Exception as e:
            raise RuntimeError(
                f"Không kết nối được PostgreSQL ({DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}). "
                f"Kiểm tra file .env (DB_PASSWORD, DB_NAME) và PostgreSQL đã chạy chưa.\nChi tiết: {e}"
            ) from e
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT to_regclass('public.du_lieu_chi_so'), to_regclass('public.khu_vuc')")
                missing = [n for n, v in zip(("du_lieu_chi_so", "khu_vuc"), cur.fetchone()) if v is None]
        finally:
            conn.close()
        if missing:
            raise RuntimeError(
                f"Đã kết nối PostgreSQL nhưng database '{DB_NAME}' thiếu bảng: {', '.join(missing)}. "
                "Kiểm tra DB_NAME có đúng database lst_hcm đã nạp file .sql/.dump chưa."
            )
        print(f"Connected successfully to PostgreSQL / PostGIS! ({DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME})")

    def query(self, sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Chạy câu SQL (tham số dạng %s), trả về list[dict]. Lệnh ghi được commit tự động."""
        conn = self._connect()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, params)
                rows = [dict(r) for r in cur.fetchall()] if cur.description else []
            conn.commit()
            return rows
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def execute_insert(self, sql: str, params: tuple = ()) -> Optional[int]:
        """INSERT ... RETURNING <id>, trả về id vừa tạo."""
        rows = self.query(sql, params)
        if rows:
            return list(rows[0].values())[0]
        return None


db = DatabaseManager()
