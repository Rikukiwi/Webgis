import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, Mail, Shield, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('NGUOI_XEM');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ten_dang_nhap: username,
            mat_khau: password
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Đăng nhập thất bại');
        }
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        if (onAuthSuccess) onAuthSuccess(data.user);
        onClose();
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ten_dang_nhap: username,
            mat_khau: password,
            email: email,
            vai_tro: role
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Đăng ký thất bại');
        }
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        setSuccessMsg('Đăng ký tài khoản thành công!');
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess(data.user);
          onClose();
        }, 800);
      }
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="auth-backdrop" onClick={onClose}>
        <motion.div
          className="auth-modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="auth-header">
            <div>
              <h3 className="auth-title">
                {mode === 'login' ? 'Đăng nhập hệ thống' : 'Tạo tài khoản mới'}
              </h3>
              <p className="auth-subtitle">
                {mode === 'login'
                  ? 'Truy cập tài nguyên WebGIS và mô hình dự báo LST'
                  : 'Trở thành thành viên hệ thống WebGIS AI TP.HCM'}
              </p>
            </div>
            <button className="auth-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Switch Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); }}
            >
              Đăng ký
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="auth-alert error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="auth-alert success">
              <CheckCircle size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Tên đăng nhập</label>
              <div className="auth-input-wrapper">
                <User size={16} className="auth-icon" />
                <input
                  type="text"
                  required
                  placeholder="Nhập tên đăng nhập..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="auth-field">
                <label>Email</label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-icon" />
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label>Mật khẩu</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-icon" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="auth-field">
                <label>Vai trò người dùng</label>
                <div className="auth-input-wrapper">
                  <Shield size={16} className="auth-icon" />
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="NGUOI_XEM">Người xem (Xem WebGIS & Dự báo)</option>
                    <option value="CHUYEN_GIA">Chuyên gia (Huấn luyện AI, xử lý dữ liệu)</option>
                    <option value="ADMIN">Quản trị viên (Toàn quyền hệ thống)</option>
                  </select>
                </div>
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Đang xử lý...' : (
                <>
                  {mode === 'login' ? 'Đăng nhập ngay' : 'Hoàn tất đăng ký'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            {mode === 'login' ? (
              <span>Chưa có tài khoản? <a href="#register" onClick={(e) => { e.preventDefault(); setMode('register'); setError(''); }}>Đăng ký ngay</a></span>
            ) : (
              <span>Đã có tài khoản? <a href="#login" onClick={(e) => { e.preventDefault(); setMode('login'); setError(''); }}>Đăng nhập</a></span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
