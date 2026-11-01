import { useMemo, useState } from 'react';
import { MeshGradient, PulsingBorder } from '@paper-design/shaders-react';
import { motion } from 'framer-motion';
import { Flame, ArrowUpRight, Map as MapIcon, Cpu, BarChart3, Database, User, LogIn, UserPlus } from 'lucide-react';
import AuthModal from './AuthModal';
import UserProfilePopup from './UserProfilePopup';
import './landing.css';

const FEATURES = [
  { icon: MapIcon, title: 'Bản đồ WebGIS', text: 'Ranh giới 168 phường/xã, trạm đo và phân vùng nhiệt độ LST.', tab: 'gis' },
  { icon: BarChart3, title: 'Thống kê khu vực', text: 'Biểu đồ thanh ngang và bảng thống kê chi tiết từng xã/phường.', tab: 'statistics' },
  { icon: Cpu, title: 'Huấn luyện AI Lab', text: 'ARIMA, Random Forest, XGBoost và GCN-LSTM.', tab: 'training' },
  { icon: BarChart3, title: 'So sánh mô hình', text: 'MAE, RMSE, R² và MAPE trên cùng một bộ dữ liệu.', tab: 'comparison' },
  { icon: Database, title: 'Dữ liệu viễn thám', text: 'Landsat/MODIS, tiền xử lý và chuỗi thời gian 2021–2026.', tab: 'datasets' },
];

export default function Landing({ onEnter, currentUser, setCurrentUser }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [profileOpen, setProfileOpen] = useState(false);

  // fixed particle positions so they don't jump on every re-render
  const particles = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({
      left: 20 + ((i * 37) % 60),
      top: 20 + ((i * 53) % 60),
      dx: ((i * 7) % 20) - 10,
    })),
    []
  );

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setCurrentUser(null);
    setProfileOpen(false);
  };

  return (
    <div className="lp">
      <svg className="lp-defs" aria-hidden="true">
        <defs>
          <filter id="lp-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
      </svg>

      <MeshGradient
        className="lp-bg"
        colors={['#000000', '#06b6d4', '#0891b2', '#164e63', '#f97316']}
        speed={0.3}
        backgroundColor="#000000"
      />
      <MeshGradient
        className="lp-bg lp-bg-wire"
        colors={['#000000', '#ffffff', '#06b6d4', '#f97316']}
        speed={0.2}
        wireframe="true"
        backgroundColor="transparent"
      />

      <header className="lp-header">
        <motion.div className="lp-brand" whileHover={{ scale: 1.04 }} transition={{ type: 'spring', stiffness: 400, damping: 10 }}>
          <span className="lp-logo"><Flame size={20} color="#fff" /></span>
          <span className="lp-brand-name">LST-HCM</span>
          <span className="lp-sparks" aria-hidden="true">
            {particles.map((p, i) => (
              <motion.i
                key={i}
                style={{ left: `${p.left}%`, top: `${p.top}%` }}
                animate={{ y: [-6, -16, -6], x: [0, p.dx, 0], opacity: [0, 1, 0], scale: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
              />
            ))}
          </span>
        </motion.div>

        <nav className="lp-nav">
          <button onClick={() => onEnter('gis')}>Bản đồ</button>
          <button onClick={() => onEnter('training')}>Mô hình AI</button>
          <button onClick={() => onEnter('datasets')}>Dữ liệu</button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentUser ? (
            <div style={{ position: 'relative' }}>
              <button
                className="lp-user-btn"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <div className="lp-avatar">
                  {(currentUser.ten_dang_nhap || 'U').substring(0, 2).toUpperCase()}
                </div>
                <span className="lp-user-name">{currentUser.ten_dang_nhap}</span>
              </button>
              <UserProfilePopup
                user={currentUser}
                isOpen={profileOpen}
                onClose={() => setProfileOpen(false)}
                onLogout={handleLogout}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="lp-auth-btn lp-auth-login"
                onClick={() => { setAuthMode('login'); setAuthOpen(true); }}
              >
                <LogIn size={14} />
                Đăng nhập
              </button>
              <button
                className="lp-auth-btn lp-auth-register"
                onClick={() => { setAuthMode('register'); setAuthOpen(true); }}
              >
                <UserPlus size={14} />
                Đăng ký
              </button>
            </div>
          )}

          <button className="lp-login" onClick={() => onEnter('gis')}>
            Vào hệ thống <ArrowUpRight size={14} />
          </button>
        </div>
      </header>

      <AuthModal
        isOpen={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      <main className="lp-main">
        <motion.div
          className="lp-badge"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          ✨ WebGIS + AI · TP. Hồ Chí Minh
        </motion.div>

        <motion.h1
          className="lp-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <motion.span
            className="lp-title-grad"
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >
            Dự báo nhiệt độ
          </motion.span>
          <span className="lp-title-strong">Bề mặt đất</span>
          <span className="lp-title-soft">& đảo nhiệt đô thị</span>
        </motion.h1>

        <motion.p
          className="lp-desc"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          Theo dõi LST từ ảnh vệ tinh Landsat/MODIS, huấn luyện và so sánh bốn mô hình AI,
          rồi xem dự báo ngay trên bản đồ ranh giới tỉnh và quận/huyện của TP.HCM.
        </motion.p>

        <motion.div
          className="lp-cta"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <motion.button className="lp-btn lp-btn-ghost" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onEnter('comparison')}>
            So sánh mô hình
          </motion.button>
          <motion.button className="lp-btn lp-btn-primary" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onEnter('gis')}>
            Mở bản đồ
          </motion.button>
        </motion.div>

        <motion.div
          className="lp-features"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          {FEATURES.map(({ icon: Icon, title, text, tab }) => (
            <button key={tab} className="lp-feature" onClick={() => onEnter(tab)}>
              <Icon size={18} />
              <strong>{title}</strong>
              <span>{text}</span>
            </button>
          ))}
        </motion.div>
      </main>

      <div className="lp-pulse">
        <PulsingBorder
          colors={['#06b6d4', '#0891b2', '#f97316', '#00FF88', '#FFD700', '#FF6B35', '#ffffff']}
          colorBack="#00000000"
          speed={1.5}
          roundness={1}
          thickness={0.1}
          softness={0.2}
          intensity={5}
          spotsPerColor={5}
          spotSize={0.1}
          pulse={0.1}
          smoke={0.5}
          smokeSize={4}
          scale={0.65}
          rotation={0}
          frame={9161408.251009725}
          style={{ width: 60, height: 60, borderRadius: '50%' }}
        />
        <motion.svg
          className="lp-ring"
          viewBox="0 0 100 100"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <defs>
            <path id="lp-circle" d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
          </defs>
          <text>
            <textPath href="#lp-circle" startOffset="0%">
              LST-HCM • WebGIS AI • Landsat · MODIS • GCN-LSTM •
            </textPath>
          </text>
        </motion.svg>
      </div>
    </div>
  );
}
