import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Shield, LogOut, CheckCircle, Database } from 'lucide-react';

export default function UserProfilePopup({ user, isOpen, onClose, onLogout }) {
  const popupRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Quản trị viên (Admin)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'CHUYEN_GIA':
        return { label: 'Chuyên gia (Expert)', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
      default:
        return { label: 'Người xem (Viewer)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    }
  };

  const roleInfo = getRoleBadge(user.vai_tro);
  const initials = (user.ten_dang_nhap || 'U').substring(0, 2).toUpperCase();

  return (
    <AnimatePresence>
      <motion.div
        ref={popupRef}
        className="profile-popup"
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.18 }}
      >
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar-large">
            {initials}
          </div>
          <div className="profile-header-info">
            <h4 className="profile-name">{user.ten_dang_nhap}</h4>
            <span
              className="profile-role-tag"
              style={{ color: roleInfo.color, backgroundColor: roleInfo.bg, borderColor: `${roleInfo.color}40` }}
            >
              <Shield size={11} /> {roleInfo.label}
            </span>
          </div>
        </div>

        {/* Profile Details */}
        <div className="profile-body">
          <div className="profile-row">
            <span className="profile-label"><Mail size={13} /> Email:</span>
            <span className="profile-val">{user.email || 'Chưa cập nhật'}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label"><Database size={13} /> Mã người dùng:</span>
            <span className="profile-val">#{user.ma_nguoi_dung || '1'}</span>
          </div>
          <div className="profile-row">
            <span className="profile-label"><CheckCircle size={13} /> Trạng thái:</span>
            <span className="profile-val" style={{ color: '#10b981' }}>Đang hoạt động</span>
          </div>
        </div>

        {/* Profile Actions */}
        <div className="profile-footer">
          <button className="profile-logout-btn" onClick={onLogout}>
            <LogOut size={14} />
            Đăng xuất
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
