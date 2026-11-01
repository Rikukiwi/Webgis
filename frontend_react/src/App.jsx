import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Map as MapIcon,
  Cpu,
  BarChart3,
  Database,
  Layers,
  Play,
  Pause,
  RotateCcw,
  Flame,
  Thermometer,
  CloudRain,
  Wind,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Filter,
  LogIn,
  UserPlus,
  Search,
  ArrowUpDown,
  FileText,
  Download,
  TrendingUp,
  Calendar,
  UploadCloud,
  Check,
  Lock,
  AlertTriangle,
  Sliders,
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  Eye,
  RefreshCw
} from 'lucide-react';
import AuthModal from './AuthModal';
import UserProfilePopup from './UserProfilePopup';

const API_BASE = '/api';

// Chuỗi LST Landsat 16 ngày mẫu tại TP.HCM (46 mốc) phục vụ Phòng thử tiền xử lý
const PREP_CHART_POINTS = [
  { date: '01-01', raw: 32.5, clean: 32.5, isOutlier: false, isMissing: false },
  { date: '01-17', raw: 33.1, clean: 33.1, isOutlier: false, isMissing: false },
  { date: '02-02', raw: 34.0, clean: 34.0, isOutlier: false, isMissing: false },
  { date: '02-18', raw: 34.6, clean: 34.6, isOutlier: false, isMissing: false },
  { date: '03-06', raw: 35.8, clean: 35.8, isOutlier: false, isMissing: false },
  { date: '03-21', raw: 36.2, clean: 36.2, isOutlier: false, isMissing: false },
  { date: '04-06', raw: 36.9, clean: 36.9, isOutlier: false, isMissing: false },
  { date: '04-22', raw: 37.1, clean: 37.1, isOutlier: false, isMissing: false },
  { date: '05-08', raw: 36.4, clean: 36.4, isOutlier: false, isMissing: false },
  { date: '05-24', raw: 35.2, clean: 35.2, isOutlier: false, isMissing: false },
  { date: '06-09', raw: 150.0, clean: 34.5, isOutlier: true, isMissing: false, note: 'Nhiễu bức xạ chói phản xạ (150 °C)' },
  { date: '06-25', raw: null, clean: 33.9, isOutlier: false, isMissing: true, note: 'Khuyết do mây mùa mưa' },
  { date: '07-11', raw: 33.2, clean: 33.2, isOutlier: false, isMissing: false },
  { date: '07-27', raw: 32.8, clean: 32.8, isOutlier: false, isMissing: false },
  { date: '08-12', raw: 33.0, clean: 33.0, isOutlier: false, isMissing: false },
  { date: '08-28', raw: null, clean: 32.6, isOutlier: false, isMissing: true, note: 'Khuyết mây che phủ' },
  { date: '09-13', raw: 32.4, clean: 32.4, isOutlier: false, isMissing: false },
  { date: '09-29', raw: 32.1, clean: 32.1, isOutlier: false, isMissing: false },
  { date: '10-15', raw: null, clean: 31.8, isOutlier: false, isMissing: true, note: 'Khuyết do mây giông' },
  { date: '10-31', raw: 32.2, clean: 32.2, isOutlier: false, isMissing: false },
  { date: '11-16', raw: -8.0, clean: 32.6, isOutlier: true, isMissing: false, note: 'Nhiễu âm cảm biến (-8 °C)' },
  { date: '12-02', raw: 33.1, clean: 33.1, isOutlier: false, isMissing: false },
  { date: '12-18', raw: 33.4, clean: 33.4, isOutlier: false, isMissing: false },
  { date: '01-03', raw: 33.8, clean: 33.8, isOutlier: false, isMissing: false },
  { date: '01-19', raw: 34.2, clean: 34.2, isOutlier: false, isMissing: false },
  { date: '02-04', raw: 35.1, clean: 35.1, isOutlier: false, isMissing: false },
  { date: '02-20', raw: 35.9, clean: 35.9, isOutlier: false, isMissing: false },
  { date: '03-08', raw: 36.5, clean: 36.5, isOutlier: false, isMissing: false },
  { date: '03-24', raw: 37.0, clean: 37.0, isOutlier: false, isMissing: false },
  { date: '04-09', raw: 37.4, clean: 37.4, isOutlier: false, isMissing: false },
  { date: '04-25', raw: 36.8, clean: 36.8, isOutlier: false, isMissing: false },
  { date: '05-11', raw: 36.0, clean: 36.0, isOutlier: false, isMissing: false },
  { date: '05-27', raw: 35.4, clean: 35.4, isOutlier: false, isMissing: false },
  { date: '06-12', raw: 34.8, clean: 34.8, isOutlier: false, isMissing: false },
  { date: '06-28', raw: 34.1, clean: 34.1, isOutlier: false, isMissing: false },
  { date: '07-14', raw: 82.0, clean: 33.7, isOutlier: true, isMissing: false, note: 'Nhiễu nhiệt cực đoan (82 °C)' },
  { date: '07-30', raw: 33.2, clean: 33.2, isOutlier: false, isMissing: false },
  { date: '08-15', raw: 32.9, clean: 32.9, isOutlier: false, isMissing: false },
  { date: '08-31', raw: 32.7, clean: 32.7, isOutlier: false, isMissing: false },
  { date: '09-16', raw: null, clean: 32.5, isOutlier: false, isMissing: true, note: 'Khuyết mây mưa rào' },
  { date: '10-02', raw: 32.3, clean: 32.3, isOutlier: false, isMissing: false },
  { date: '10-18', raw: 32.0, clean: 32.0, isOutlier: false, isMissing: false },
  { date: '11-03', raw: 32.5, clean: 32.5, isOutlier: false, isMissing: false },
  { date: '11-19', raw: 33.0, clean: 33.0, isOutlier: false, isMissing: false },
  { date: '12-05', raw: 33.5, clean: 33.5, isOutlier: false, isMissing: false },
  { date: '12-21', raw: 33.9, clean: 33.9, isOutlier: false, isMissing: false }
];

// 1. LST Color Palette
const getLSTColor = (val) => {
  if (val >= 36.0) return '#ef4444'; // Hot Red
  if (val >= 34.0) return '#f97316'; // Orange
  if (val >= 32.0) return '#facc15'; // Amber
  if (val >= 30.0) return '#10b981'; // Emerald
  return '#3b82f6'; // Cyan/Blue
};

// 2. NDVI (Chỉ số thực vật - Chuẩn viễn thám thẩm mỹ cao: Đô thị/Đất xám nhạt -> Vàng lúa ấm -> Xanh ngọc chanh -> Xanh mạ non -> Xanh ngọc lục bảo sâu)
const getNDVIColor = (val) => {
  if (val === null || val === undefined) return '#10b981';
  if (val >= 0.70) return '#047857'; // Rừng ngập mặn Cần Giờ / Vườn quốc gia (Xanh lục sâu thẳm)
  if (val >= 0.55) return '#10b981'; // Thảm thực vật xanh tốt (Emerald tươi tắn)
  if (val >= 0.40) return '#34d399'; // Cây trồng đô thị / Công viên (Xanh ngọc mát dịu)
  if (val >= 0.28) return '#a3e635'; // Cây bụi / Đồng cỏ (Xanh chanh tươi mới)
  if (val >= 0.15) return '#facc15'; // Đất nông nghiệp thưa / Vàng ấm
  return '#cbd5e1'; // Khu đô thị bê tông / Nước / Đất trống (Xám slate thanh lịch, dịu mắt)
};

// 3. TVDI (Chỉ số khô hạn viễn thám chuẩn quốc tế: Xanh nước biển dịu -> Ngọc lam -> Vàng hổ phách -> Cam đào -> Đỏ san hô sang trọng)
const getTVDIColor = (val) => {
  if (val === null || val === undefined) return '#38bdf8';
  if (val >= 0.80) return '#dc2626'; // Khô hạn đặc biệt gay gắt (Đỏ tươi)
  if (val >= 0.65) return '#ea580c'; // Khô hạn cao (Cam gạch)
  if (val >= 0.50) return '#f59e0b'; // Khô hạn vừa (Vàng hổ phách ấm)
  if (val >= 0.35) return '#06b6d4'; // Bình thường / Ẩm nhẹ (Xanh cyan hiện đại)
  return '#0ea5e9'; // Rất ẩm / Nguồn nước / Sông hồ (Xanh lam tươi mát)
};

export default function App({ initialTab = 'gis', onHome, currentUser, setCurrentUser }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'gis' | 'training' | 'comparison' | 'datasets'
  const [selectedIndicator, setSelectedIndicator] = useState('LST'); // 'LST' | 'NDVI' | 'TVDI'
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [profileOpen, setProfileOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [khuVucList, setKhuVucList] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lstPoints, setLstPoints] = useState([]);
  const [khuVucLst, setKhuVucLst] = useState([]);
  const [forecastPoints, setForecastPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [districtSearchText, setDistrictSearchText] = useState('');

  // Layers Toggles (Ưu tiên hiển thị bản đồ phân vùng LST 168 xã/phường sau sáp nhập)
  const [showObservation, setShowObservation] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [showDistricts, setShowDistricts] = useState(true);
  const [showProvinces, setShowProvinces] = useState(false);
  const [geoProvinces, setGeoProvinces] = useState(null);
  const [geoDistricts, setGeoDistricts] = useState(null);

  // AI Training Form State
  const [modelsList, setModelsList] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState(4); // GCN-LSTM default
  const [missingStrategy, setMissingStrategy] = useState('Noi_suy_tuyen_tinh');
  const [outlierStrategy, setOutlierStrategy] = useState('IQR');
  const [normMethod, setNormMethod] = useState('Min-Max');
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingResult, setTrainingResult] = useState(null);

  // Benchmarks State
  const [benchmarkMetrics, setBenchmarkMetrics] = useState([]);

  // Tab Thống kê khu vực State (Ảnh 1, Ảnh 2)
  const [statsIndicator, setStatsIndicator] = useState('LST'); // LST | NDVI | TVDI
  const [statsMonth, setStatsMonth] = useState(''); // YYYY-MM
  const [statsSource, setStatsSource] = useState('GEE / AI dự báo');
  const [statsThreshold, setStatsThreshold] = useState(35);
  const [statsData, setStatsData] = useState({ city_summary: null, items: [] });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsSortCol, setStatsSortCol] = useState('tb'); // 'tb' | 'min' | 'max' | 'khu_vuc' | 'dien_tich_km2'
  const [statsSortAsc, setStatsSortAsc] = useState(false);
  const [hoveredBar, setHoveredBar] = useState(null);

  // Tab Chuỗi thời gian State (Chức năng 3: Xem biểu đồ nhiệt độ theo thời gian)
  const [tsWardId, setTsWardId] = useState(''); // '' = Toàn TP.HCM
  const [tsMonth, setTsMonth] = useState(1); // 1 -> 12
  const [tsData, setTsData] = useState(null);
  const [tsLoading, setTsLoading] = useState(false);
  const [tsHoverPoint, setTsHoverPoint] = useState(null);

  // Tab Nạp dữ liệu & Tiền xử lý State
  const [datasetsList, setDatasetsList] = useState([]);
  const [tienXuLyList, setTienXuLyList] = useState([]);
  const [prepDistrict, setPrepDistrict] = useState('Quận 1');
  const [prepMissing, setPrepMissing] = useState('Noi_suy_tuyen_tinh');
  const [prepOutlier, setPrepOutlier] = useState('Nguong_hop_ly');
  const [prepThreshold, setPrepThreshold] = useState(60);
  const [prepSyncTime, setPrepSyncTime] = useState('Giu_nguyen');
  const [prepNorm, setPrepNorm] = useState('Z-score');
  const [prepTrainEndYear, setPrepTrainEndYear] = useState('2023');
  const [prepSaving, setPrepSaving] = useState(false);
  const [prepAlert, setPrepAlert] = useState(null);
  const [prepPointHover, setPrepPointHover] = useState(null);
  const [uploadingDataset, setUploadingDataset] = useState(false);

  // RBAC Permission Check
  const isAdmin = currentUser?.vai_tro === 'ADMIN';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const loadDatasets = () => {
    fetch(`${API_BASE}/datasets`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setDatasetsList(d); })
      .catch(console.error);
  };

  const loadTienXuLy = () => {
    fetch(`${API_BASE}/tien-xu-ly`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setTienXuLyList(d); })
      .catch(console.error);
  };

  // Map Reference
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const districtLayerRef = useRef(null);
  const districtLayersMapRef = useRef({});
  const provinceLayerRef = useRef(null);
  const timerRef = useRef(null);

  // Load real administrative boundaries (static GeoJSON in /public/geo)
  useEffect(() => {
    // 168 phường/xã/đặc khu (sau sáp nhập) lấy trực tiếp từ bảng khu_vuc của PostGIS
    fetch(`${API_BASE}/khu-vuc?cha=HCM&geometry=true`)
      .then(r => r.json())
      .then(rows => setGeoDistricts({
        type: 'FeatureCollection',
        features: rows.filter(k => k.geojson).map(k => ({
          type: 'Feature',
          geometry: k.geojson,
          properties: {
            id: k.id,
            name: k.ten_khu_vuc,
            ma: k.ma_khu_vuc,
            loai: k.loai_khu_vuc,
            dien_tich_km2: k.dien_tich_km2
          }
        }))
      }))
      .catch(() => {});
  }, []);

  // Fetch initial system data
  useEffect(() => {
    fetch(`${API_BASE}/overview-stats`)
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(console.error);

    fetch(`${API_BASE}/khu-vuc`)
      .then(r => r.json())
      .then(d => setKhuVucList(d))
      .catch(console.error);

    fetch(`${API_BASE}/lst-data/timeline`)
      .then(r => r.json())
      .then(d => {
        setTimeline(d);
        if (d && d.length > 0) {
          setSelectedDateIdx(d.length - 1); // latest
        }
      })
      .catch(console.error);

    fetch(`${API_BASE}/models`)
      .then(r => r.json())
      .then(d => setModelsList(d))
      .catch(console.error);

    fetch(`${API_BASE}/metrics/comparison`)
      .then(r => r.json())
      .then(d => setBenchmarkMetrics(d))
      .catch(console.error);

    fetch(`${API_BASE}/forecast`)
      .then(r => r.json())
      .then(d => setForecastPoints(d))
      .catch(console.error);

    loadDatasets();
    loadTienXuLy();
  }, []);

  // Fetch LST data for all 168 wards & point stations when date changes
  useEffect(() => {
    if (!timeline || timeline.length === 0) return;
    const curDate = timeline[selectedDateIdx]?.thoi_gian;
    if (!curDate) return;

    // 1. Phủ kín nhiệt độ cho toàn bộ 168 xã/phường sau sáp nhập
    fetch(`${API_BASE}/khu-vuc-lst?thoi_gian=${curDate}`)
      .then(r => r.json())
      .then(data => setKhuVucLst(data))
      .catch(console.error);

    // 2. Điểm trạm đo quan trắc viễn thám
    fetch(`${API_BASE}/lst-data?thoi_gian=${curDate}`)
      .then(r => r.json())
      .then(pts => setLstPoints(pts))
      .catch(console.error);
  }, [selectedDateIdx, timeline]);

  // Fetch dữ liệu Thống kê khu vực (Tab: statistics)
  useEffect(() => {
    if (activeTab !== 'statistics') return;
    setStatsLoading(true);

    const m = statsMonth || (timeline[selectedDateIdx]?.thoi_gian?.substring(0, 7)) || '2025-12';
    const params = new URLSearchParams({
      chi_so: statsIndicator,
      thoi_gian: m,
      nguon: statsSource,
      nguong_tren: statsThreshold
    });

    fetch(`${API_BASE}/thong-ke-khu-vuc?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        setStatsData(d);
      })
      .catch(err => {
        console.error('Lỗi lấy thống kê khu vực:', err);
      })
      .finally(() => {
        setStatsLoading(false);
      });
  }, [activeTab, statsIndicator, statsMonth, statsSource, statsThreshold, selectedDateIdx, timeline]);

  // Fetch dữ liệu Chuỗi thời gian (Tab: timeseries)
  useEffect(() => {
    if (activeTab !== 'timeseries') return;
    setTsLoading(true);

    const params = new URLSearchParams({
      thang: tsMonth
    });
    if (tsWardId) {
      params.append('kv_id', tsWardId);
    }

    fetch(`${API_BASE}/timeseries-analysis?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        setTsData(d);
      })
      .catch(err => {
        console.error('Lỗi lấy chuỗi thời gian:', err);
      })
      .finally(() => {
        setTsLoading(false);
      });
  }, [activeTab, tsWardId, tsMonth]);

  // Handle Play/Pause Timeline Slider
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setSelectedDateIdx(prev => {
          if (prev >= timeline.length - 1) return 0;
          return prev + 1;
        });
      }, 1400);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, timeline.length]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (activeTab !== 'gis') return;
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [10.776, 106.700],
        zoom: 11,
        zoomControl: false,
        attributionControl: false
      });

      // Nền bản đồ OpenStreetMap
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Custom Zoom Control top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      map.createPane('provincePane').style.zIndex = 350;
      map.createPane('districtPane').style.zIndex = 360;
      provinceLayerRef.current = L.layerGroup().addTo(map);
      districtLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }
  }, [activeTab]);

  // Provinces (real boundaries) around TP.HCM
  useEffect(() => {
    if (!mapInstanceRef.current || !provinceLayerRef.current) return;
    provinceLayerRef.current.clearLayers();
    if (!showProvinces || !geoProvinces) return;

    const layer = L.geoJSON(geoProvinces, {
      pane: 'provincePane',
      style: f => f.properties.is_hcm
        ? { color: '#f97316', weight: 2.5, opacity: 0.95, fillColor: '#f97316', fillOpacity: 0.05 }
        : { color: '#64748b', weight: 1.5, opacity: 0.9, fillColor: '#475569', fillOpacity: 0.12 },
      onEachFeature: (f, lyr) => {
        lyr.bindTooltip(`<b>${f.properties.name}</b>`, { className: 'glass-panel', sticky: true });
        lyr.on('click', () => setSelectedDistrict({
          ten_khu_vuc: f.properties.name,
          loai_khu_vuc: f.properties.is_hcm ? 'Thành phố trực thuộc TW' : 'Tỉnh lân cận',
          mo_ta: f.properties.is_hcm
            ? 'Ranh giới hành chính TP.HCM (geoBoundaries).'
            : 'Tỉnh giáp ranh vùng TP.HCM, hiển thị để đối chiếu không gian.'
        }));
      }
    });
    provinceLayerRef.current.addLayer(layer);
  }, [geoProvinces, showProvinces, activeTab]);

  // Districts of TP.HCM (168 đơn vị hành chính sau sáp nhập, tô màu nhiệt độ LST dạng Choropleth)
  useEffect(() => {
    if (!mapInstanceRef.current || !districtLayerRef.current) return;
    districtLayerRef.current.clearLayers();
    if (!showDistricts || !geoDistricts) return;

    // Tạo bản đồ tra cứu LST theo ma_khu_vuc từ 168 xã/phường
    const lstByKhuVuc = {};
    khuVucLst.forEach(p => {
      if (p.id) {
        lstByKhuVuc[p.id] = p;
      }
    });

    const layer = L.geoJSON(geoDistricts, {
      pane: 'districtPane',
      style: (f) => {
        const p = f.properties;
        const info = lstByKhuVuc[p.id];
        let fillColor = '#38bdf8';
        if (info) {
          if (selectedIndicator === 'LST') {
            fillColor = getLSTColor(Number(info.gia_tri_lst));
          } else if (selectedIndicator === 'NDVI') {
            fillColor = getNDVIColor(Number(info.ndvi));
          } else if (selectedIndicator === 'TVDI') {
            fillColor = getTVDIColor(Number(info.tvdi));
          }
        }
        const strokeColor = selectedIndicator === 'NDVI' 
          ? '#065f46' // Xanh lục đậm thanh lịch
          : selectedIndicator === 'TVDI' 
          ? '#b45309' // Nâu hổ phách ấm, không bị chói
          : '#0369a1'; // Xanh đại dương tinh tế cho LST
        return {
          color: strokeColor,
          weight: 0.9,
          opacity: 0.75,
          fillColor: fillColor,
          fillOpacity: info ? 0.68 : 0.20
        };
      },
      onEachFeature: (f, lyr) => {
        const p = f.properties;
        const info = lstByKhuVuc[p.id];
        const loaiTxt = { PHUONG: 'Phường', XA: 'Xã', DAC_KHU: 'Đặc khu', PHUONG_XA: 'Phường/Xã' }[p.loai] || p.loai;

        let valText = '';
        if (selectedIndicator === 'LST') {
          valText = `Nhiệt độ LST: <b style="color: #ea580c;">${info ? Number(info.gia_tri_lst).toFixed(1) + ' °C' : 'Chưa có'}</b>`;
        } else if (selectedIndicator === 'NDVI') {
          valText = `Chỉ số thực vật NDVI: <b style="color: #059669;">${info ? Number(info.ndvi).toFixed(3) : 'Chưa có'}</b>`;
        } else if (selectedIndicator === 'TVDI') {
          valText = `Chỉ số khô hạn TVDI: <b style="color: #d97706;">${info ? Number(info.tvdi).toFixed(3) : 'Chưa có'}</b>`;
        }

        lyr.bindTooltip(
          `<div style="font-size: 13px; line-height: 1.4;">
            <b style="color: #0891b2;">${p.name}</b> (${loaiTxt})<br/>
            <span>${valText}</span>
          </div>`,
          { className: 'glass-panel', sticky: true }
        );

        lyr.on('mouseover', () => lyr.setStyle({ fillOpacity: 0.88, weight: 2.2, color: '#f59e0b' }));
        lyr.on('mouseout', () => {
          let fillColor = '#38bdf8';
          if (info) {
            if (selectedIndicator === 'LST') fillColor = getLSTColor(Number(info.gia_tri_lst));
            else if (selectedIndicator === 'NDVI') fillColor = getNDVIColor(Number(info.ndvi));
            else if (selectedIndicator === 'TVDI') fillColor = getTVDIColor(Number(info.tvdi));
          }
          const defaultStroke = selectedIndicator === 'NDVI' ? '#065f46' : selectedIndicator === 'TVDI' ? '#b45309' : '#0369a1';
          lyr.setStyle({
            fillOpacity: info ? 0.68 : 0.20,
            weight: 0.9,
            color: defaultStroke,
            fillColor: fillColor
          });
        });

        // Lưu tham chiếu layer theo id để điều hướng từ Dropdown/Search
        districtLayersMapRef.current[p.id] = lyr;

        lyr.on('click', () => {
          setSelectedDistrict({
            id: p.id,
            ten_khu_vuc: p.name,
            loai_khu_vuc: loaiTxt,
            dien_tich_km2: p.dien_tich_km2,
            current_lst: info ? Number(info.gia_tri_lst).toFixed(1) : null,
            current_ndvi: info ? info.ndvi : null,
            current_tvdi: info ? info.tvdi : null,
            yearlyData: []
          });

          // Tải dữ liệu LST từng năm (2021 -> 2026) cho phường/xã này
          fetch(`${API_BASE}/khu-vuc/${p.id}/yearly-lst`)
            .then(r => r.json())
            .then(data => {
              setSelectedDistrict(prev => prev && prev.id === p.id ? { ...prev, yearlyData: data } : prev);
            })
            .catch(console.error);
        });
      }
    });
    districtLayerRef.current.addLayer(layer);

    // Tự động căn chỉnh bản đồ vừa vặn với vùng đô thị TP.HCM sau sáp nhập (bỏ qua huyện Côn Đảo ở xa ngoài biển để không bị kéo xa)
    if (!mapInstanceRef.current._hasFitBounds && layer.getLayers().length > 0) {
      const mainlandLayers = layer.getLayers().filter(l => l.feature?.properties?.name !== 'Côn Đảo');
      if (mainlandLayers.length > 0) {
        const group = L.featureGroup(mainlandLayers);
        mapInstanceRef.current.fitBounds(group.getBounds(), {
          paddingTopLeft: [340, 40], // chừa khoảng trống cho panel bên trái
          paddingBottomRight: [390, 80], // chừa khoảng trống cho panel bên phải và timeline dưới
          maxZoom: 12
        });
        mapInstanceRef.current._hasFitBounds = true;
      }
    }
  }, [geoDistricts, khuVucLst, selectedIndicator, showDistricts, activeTab]);

  // Hàm chọn Phường/Xã từ Select/Search: zoom tới ranh giới và mở popup chi tiết
  const handleSelectWard = (wardId) => {
    if (!wardId) {
      setSelectedDistrict(null);
      return;
    }
    const targetId = Number(wardId);
    const wardFeature = geoDistricts?.features?.find(f => f.properties.id === targetId);
    const wardKhuVuc = khuVucList.find(k => k.id === targetId);
    const info = khuVucLst.find(k => k.id === targetId);

    const name = wardFeature?.properties?.name || wardKhuVuc?.ten_khu_vuc || `Khu vực #${targetId}`;
    const loai = wardFeature?.properties?.loai || wardKhuVuc?.loai_khu_vuc || 'PHUONG_XA';
    const loaiTxt = { PHUONG: 'Phường', XA: 'Xã', DAC_KHU: 'Đặc khu', PHUONG_XA: 'Phường/Xã' }[loai] || loai;
    const dienTich = wardFeature?.properties?.dien_tich_km2 || wardKhuVuc?.dien_tich_km2;

    setSelectedDistrict({
      id: targetId,
      ten_khu_vuc: name,
      loai_khu_vuc: loaiTxt,
      dien_tich_km2: dienTich,
      current_lst: info ? Number(info.gia_tri_lst).toFixed(1) : null,
      current_ndvi: info ? info.ndvi : null,
      current_tvdi: info ? info.tvdi : null,
      yearlyData: []
    });

    // Zoom và mở tooltip trên bản đồ nếu layer tồn tại
    const targetLayer = districtLayersMapRef.current[targetId];
    if (targetLayer && mapInstanceRef.current) {
      try {
        const bounds = targetLayer.getBounds();
        mapInstanceRef.current.flyToBounds(bounds, {
          paddingTopLeft: [320, 50],
          paddingBottomRight: [360, 80],
          maxZoom: 14,
          duration: 1.2
        });
        targetLayer.fire('mouseover');
        setTimeout(() => targetLayer.openTooltip(), 600);
      } catch (e) {
        console.error(e);
      }
    }

    // Tải dữ liệu LST theo năm (2021-2026)
    fetch(`${API_BASE}/khu-vuc/${targetId}/yearly-lst`)
      .then(r => r.json())
      .then(data => {
        setSelectedDistrict(prev => prev && prev.id === targetId ? { ...prev, yearlyData: data } : prev);
      })
      .catch(console.error);
  };

  // Update Observation & Forecast Markers on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // 1. Observations
    if (showObservation) {
      lstPoints.forEach(p => {
        const color = getLSTColor(p.gia_tri_lst);
        const icon = L.divIcon({
          className: 'custom-heat-pin',
          html: `<div class="heat-point-marker" style="background:${color}; width:28px; height:28px;">${Math.round(p.gia_tri_lst)}°</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([p.vi_do, p.kinh_do], { icon });
        marker.on('click', () => {
          setSelectedPoint({
            type: 'Quan trắc viễn thám',
            date: p.thoi_gian,
            lst: p.gia_tri_lst,
            ndvi: p.ndvi,
            rain: p.luong_mua,
            humidity: p.do_am_dat,
            lat: p.vi_do,
            lng: p.kinh_do
          });
        });

        markersLayerRef.current.addLayer(marker);
      });
    }

    // 2. AI Forecasts (if enabled and on 2026 dates)
    if (showForecast && forecastPoints.length > 0) {
      const targetDate = timeline[selectedDateIdx]?.thoi_gian;
      // show forecast if latest date or filtered
      const pts = forecastPoints.slice(0, 12); // sample future
      pts.forEach(fp => {
        const color = getLSTColor(fp.gia_tri_lst_du_bao);
        const icon = L.divIcon({
          className: 'forecast-heat-pin',
          html: `<div class="heat-point-marker" style="background:${color}; width:24px; height:24px; border:2px dashed #ffffff; box-shadow:0 0 10px ${color}">✦${Math.round(fp.gia_tri_lst_du_bao)}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([fp.vi_do, fp.kinh_do], { icon });
        marker.on('click', () => {
          setSelectedPoint({
            type: `Dự báo (${fp.ten_model || 'GCN-LSTM'})`,
            date: fp.thoi_gian_du_bao,
            lst: fp.gia_tri_lst_du_bao,
            ndvi: 0.28,
            district: fp.ten_khu_vuc,
            lat: fp.vi_do,
            lng: fp.kinh_do
          });
        });

        markersLayerRef.current.addLayer(marker);
      });
    }
  }, [lstPoints, forecastPoints, showObservation, showForecast, selectedDateIdx]);

  // Execute AI Training (Yêu cầu quyền ADMIN)
  const handleStartTraining = async () => {
    if (!isAdmin) {
      alert('🔒 Từ chối truy cập: Chỉ Quản trị viên (ADMIN) mới có quyền khởi chạy huấn luyện mô hình.');
      return;
    }
    setTrainingLoading(true);
    setTrainingResult(null);

    try {
      const resp = await fetch(`${API_BASE}/training/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          ma_dataset: 1,
          ma_model: Number(selectedModelId),
          cach_xu_ly_thieu: missingStrategy,
          cach_xu_ly_nhieu: outlierStrategy,
          phuong_phap_chuan_hoa: normMethod,
          tham_so: {}
        })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Lỗi huấn luyện');
      setTrainingResult(data);

      // Refresh benchmarks
      fetch(`${API_BASE}/metrics/comparison`)
        .then(r => r.json())
        .then(d => setBenchmarkMetrics(d));
    } catch (err) {
      alert(`Huấn luyện thất bại: ${err.message}`);
    } finally {
      setTrainingLoading(false);
    }
  };

  // Lưu cấu hình tiền xử lý (Yêu cầu quyền ADMIN)
  const handleSaveTienXuLy = async () => {
    if (!isAdmin) {
      setPrepAlert({ type: 'error', msg: '🔒 Từ chối truy cập: Chỉ Quản trị viên (ADMIN) mới có quyền lưu cấu hình tiền xử lý.' });
      return;
    }
    setPrepSaving(true);
    setPrepAlert(null);
    try {
      const res = await fetch(`${API_BASE}/tien-xu-ly/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          ma_dataset: 1,
          cach_xu_ly_thieu: prepMissing,
          cach_xu_ly_nhieu: prepOutlier,
          phuong_phap_chuan_hoa: prepNorm,
          ngay_ket_thuc_train: `${prepTrainEndYear}-12-31`,
          ngay_ket_thuc_val: `${Number(prepTrainEndYear) + 1}-12-31`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lỗi khi lưu cấu hình tiền xử lý');
      setPrepAlert({ type: 'success', msg: `✅ ${data.message || 'Lưu cấu hình tiền xử lý thành công!'}` });
      loadTienXuLy();
    } catch (err) {
      setPrepAlert({ type: 'error', msg: err.message });
    } finally {
      setPrepSaving(false);
    }
  };

  // Nạp tệp CSV thật lên CSDL (Yêu cầu quyền ADMIN)
  const [csvReport, setCsvReport] = useState(null);
  const handleUploadCsv = async (file, validateOnly = false) => {
    if (!isAdmin) {
      setPrepAlert({ type: 'error', msg: '🔒 Yêu cầu quyền ADMIN: Chỉ Quản trị viên mới được nạp bộ dữ liệu mới.' });
      return;
    }
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setPrepAlert({ type: 'error', msg: 'Chỉ nhận tệp .csv' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setPrepAlert({ type: 'error', msg: 'Tệp vượt quá 50MB.' });
      return;
    }
    setUploadingDataset(true);
    setPrepAlert(null);
    setCsvReport(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('ten_dataset', file.name.replace(/\.csv$/i, ''));
      fd.append('chi_kiem_tra', validateOnly ? 'true' : 'false');
      const res = await fetch(`${API_BASE}/datasets/upload-csv`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Lỗi nạp CSV');
      setCsvReport(data.report);
      setPrepAlert({ type: 'success', msg: `✅ ${data.message}` });
      if (!validateOnly) loadDatasets();
    } catch (err) {
      setPrepAlert({ type: 'error', msg: err.message });
    } finally {
      setUploadingDataset(false);
    }
  };

  const currentDateInfo = timeline[selectedDateIdx] || {};

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Header Navigation */}
      <header className="app-header">
        <div className="brand-wrapper" onClick={onHome} role="button" tabIndex={0} title="Về trang chủ" style={{ cursor: onHome ? 'pointer' : 'default' }}>
          <div className="brand-icon">
            <Flame size={22} color="#ffffff" />
          </div>
          <div>
            <h1 className="brand-title">LST-HCM AI WebGIS</h1>
            <div className="brand-subtitle">
              <Sparkles size={12} />
              Dự báo Nhiệt độ Bề mặt Đất & Đảo nhiệt Đô thị TP.HCM
            </div>
          </div>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'gis' ? 'active' : ''}`}
            onClick={() => setActiveTab('gis')}
          >
            <MapIcon size={16} />
            Bản đồ LST
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'timeseries' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeseries')}
          >
            <TrendingUp size={16} />
            Chuỗi thời gian
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            <BarChart3 size={16} />
            Thống kê khu vực
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'datasets' ? 'active' : ''}`}
            onClick={() => setActiveTab('datasets')}
          >
            <Database size={16} />
            Nạp dữ liệu & Tiền xử lý
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'training' ? 'active' : ''}`}
            onClick={() => setActiveTab('training')}
          >
            <Cpu size={16} />
            Huấn luyện AI Lab
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'comparison' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparison')}
          >
            <BarChart3 size={16} />
            So sánh mô hình
          </button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentUser ? (
            <div style={{ position: 'relative' }}>
              <div
                className="user-badge clickable"
                onClick={() => setProfileOpen(!profileOpen)}
                title="Bấm để xem hồ sơ cá nhân"
              >
                <div className="user-avatar">
                  {(currentUser.ten_dang_nhap || 'U').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>{currentUser.ten_dang_nhap}</div>
                  <div style={{ fontSize: '10px', color: 'var(--accent-emerald)' }}>
                    ● {currentUser.vai_tro === 'ADMIN' ? 'Quản trị viên' : currentUser.vai_tro === 'CHUYEN_GIA' ? 'Chuyên gia' : 'Người xem'}
                  </div>
                </div>
              </div>
              <UserProfilePopup
                user={currentUser}
                isOpen={profileOpen}
                onClose={() => setProfileOpen(false)}
                onLogout={() => {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('auth_user');
                  setCurrentUser(null);
                  setProfileOpen(false);
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="app-auth-btn app-auth-login"
                onClick={() => { setAuthMode('login'); setAuthOpen(true); }}
              >
                <LogIn size={13} />
                Đăng nhập
              </button>
              <button
                className="app-auth-btn app-auth-register"
                onClick={() => { setAuthMode('register'); setAuthOpen(true); }}
              >
                <UserPlus size={13} />
                Đăng ký
              </button>
            </div>
          )}
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

      {/* 2. Main Body Tabs */}
      <main className="app-content">
        {/* ================= TAB 1: WEBGIS VIEW ================= */}
        {activeTab === 'gis' && (
          <div className="gis-container">
            <div ref={mapContainerRef} className="leaflet-container" />

            {/* Floating Left GIS Panel: Controls & Layers */}
            <div className="gis-left-panel">
              {/* CHỌN CHỈ SỐ LST / NDVI / TVDI (Giống Ảnh 3, 4) */}
              <div className="glass-panel" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    CHỈ SỐ
                  </span>
                  <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '10px', gap: '3px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedIndicator('LST')}
                      style={{
                        border: 0,
                        padding: '5px 14px',
                        borderRadius: '7px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: selectedIndicator === 'LST' ? '#ffffff' : 'transparent',
                        color: selectedIndicator === 'LST' ? '#0891b2' : '#64748b',
                        boxShadow: selectedIndicator === 'LST' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      LST
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIndicator('NDVI')}
                      style={{
                        border: 0,
                        padding: '5px 14px',
                        borderRadius: '7px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: selectedIndicator === 'NDVI' ? '#ffffff' : 'transparent',
                        color: selectedIndicator === 'NDVI' ? '#059669' : '#64748b',
                        boxShadow: selectedIndicator === 'NDVI' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      NDVI
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIndicator('TVDI')}
                      style={{
                        border: 0,
                        padding: '5px 14px',
                        borderRadius: '7px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: selectedIndicator === 'TVDI' ? '#ffffff' : 'transparent',
                        color: selectedIndicator === 'TVDI' ? '#ea580c' : '#64748b',
                        boxShadow: selectedIndicator === 'TVDI' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      TVDI
                    </button>
                  </div>
                </div>
              </div>

              {/* Layer Controller */}
              <div className="glass-panel">
                <div className="card-header">
                  <span className="card-title">
                    <Layers size={14} color="#22d3ee" />
                    Lớp Bản đồ GIS
                  </span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, color: '#0891b2' }}>
                    <input
                      type="checkbox"
                      checked={showDistricts}
                      onChange={e => setShowDistricts(e.target.checked)}
                    />
                    <span>
                      {selectedIndicator === 'LST' ? '🔥 Bản đồ phân vùng nhiệt LST (168 Phường/Xã)' :
                       selectedIndicator === 'NDVI' ? '🌿 Bản đồ phân vùng thực vật NDVI (168 Phường/Xã)' :
                       '☀️ Bản đồ phân vùng khô hạn TVDI (168 Phường/Xã)'}
                    </span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showObservation}
                      onChange={e => setShowObservation(e.target.checked)}
                    />
                    <span>Hiển thị thêm điểm trạm quan trắc viễn thám</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showForecast}
                      onChange={e => setShowForecast(e.target.checked)}
                    />
                    <span>Dự báo Tương lai (GCN-LSTM / XGB)</span>
                  </label>
                </div>
              </div>

              {/* Dynamic Heat / Vegetation / Drought Scale Legend */}
              <div className="glass-panel">
                <div className="card-header">
                  <span className="card-title">
                    <Thermometer size={14} color={selectedIndicator === 'NDVI' ? '#059669' : selectedIndicator === 'TVDI' ? '#ea580c' : '#f97316'} />
                    {selectedIndicator === 'LST' ? 'Thang Đo Nhiệt Bề Mặt LST (°C)' :
                     selectedIndicator === 'NDVI' ? 'Thang Đo Chỉ Số Thực Vật (NDVI)' :
                     'Thang Đo Chỉ Số Khô Hạn (TVDI)'}
                  </span>
                </div>
                <div className="card-body">
                  <div
                    className="legend-bar"
                    style={{
                      background: selectedIndicator === 'LST'
                        ? 'linear-gradient(90deg, #3b82f6 0%, #10b981 30%, #facc15 60%, #f97316 85%, #ef4444 100%)'
                        : selectedIndicator === 'NDVI'
                        ? 'linear-gradient(90deg, #cbd5e1 0%, #facc15 25%, #a3e635 45%, #34d399 65%, #10b981 85%, #047857 100%)'
                        : 'linear-gradient(90deg, #0ea5e9 0%, #06b6d4 35%, #f59e0b 60%, #ea580c 80%, #dc2626 100%)'
                    }}
                  />
                  {selectedIndicator === 'LST' && (
                    <>
                      <div className="legend-labels">
                        <span>&lt;28°C</span>
                        <span>32°C</span>
                        <span>35°C</span>
                        <span>&gt;37°C</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span>Mát mẻ</span>
                        <span>Trung bình</span>
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>Cực nóng</span>
                      </div>
                    </>
                  )}
                  {selectedIndicator === 'NDVI' && (
                    <>
                      <div className="legend-labels">
                        <span>0.00</span>
                        <span>0.28</span>
                        <span>0.55</span>
                        <span>0.80+</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span style={{ color: '#64748b' }}>Đô thị / Đất trống</span>
                        <span style={{ color: '#047857', fontWeight: 600 }}>Rừng / Cây xanh dày</span>
                      </div>
                    </>
                  )}
                  {selectedIndicator === 'TVDI' && (
                    <>
                      <div className="legend-labels">
                        <span>0.00</span>
                        <span>0.35</span>
                        <span>0.65</span>
                        <span>1.00</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span style={{ color: '#0ea5e9', fontWeight: 600 }}>Rất ẩm / Mặt nước</span>
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>Khô hạn nặng</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Real-time Observation Quick KPI */}
              <div className="glass-panel">
                <div className="card-header">
                  <span className="card-title">
                    <Clock size={14} color="#10b981" />
                    Thời điểm: {currentDateInfo.thoi_gian || 'Đang tải...'}
                  </span>
                </div>
                <div className="card-body">
                  <div className="metrics-grid">
                    <div className="metric-box">
                      <div className="metric-name">LST Trung Bình</div>
                      <div className="metric-val" style={{ color: '#ca8a04' }}>{currentDateInfo.avg_lst || '--'}°C</div>
                    </div>
                    <div className="metric-box">
                      <div className="metric-name">LST Cực Đại</div>
                      <div className="metric-val" style={{ color: '#ef4444' }}>{currentDateInfo.max_lst || '--'}°C</div>
                    </div>
                    <div className="metric-box">
                      <div className="metric-name">Chỉ số NDVI TB</div>
                      <div className="metric-val" style={{ color: '#10b981' }}>{currentDateInfo.avg_ndvi || '--'}</div>
                    </div>
                    <div className="metric-box">
                      <div className="metric-name">Điểm trạm</div>
                      <div className="metric-val" style={{ color: '#0891b2' }}>{currentDateInfo.points_count || 12}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Right GIS Panel: Point & District Inspector */}
            <div className="gis-right-panel">
              {/* KHỐI CHỌN & TRA CỨU PHƯỜNG / XÃ (168 đơn vị hành chính) */}
              <div className="glass-panel" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapIcon size={14} color="#0891b2" />
                    Khu vực (Phường / Xã)
                  </label>
                  <span style={{ fontSize: '11px', color: '#0891b2', fontWeight: 600 }}>
                    {khuVucList.length > 0 ? `${khuVucList.length} đơn vị` : '168 phường/xã'}
                  </span>
                </div>

                {/* Dropdown danh sách toàn bộ Phường/Xã */}
                <select
                  className="styled-select"
                  value={selectedDistrict?.id || ''}
                  onChange={(e) => handleSelectWard(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #0891b2',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    background: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(8, 145, 178, 0.12)'
                  }}
                >
                  <option value="">-- Chọn Phường / Xã để định vị & tra cứu --</option>
                  {khuVucList
                    .slice()
                    .sort((a, b) => a.ten_khu_vuc.localeCompare(b.ten_khu_vuc, 'vi'))
                    .map((kv) => {
                      const loai = { PHUONG: 'Phường', XA: 'Xã', DAC_KHU: 'Đặc khu', PHUONG_XA: 'Phường/Xã' }[kv.loai_khu_vuc] || kv.loai_khu_vuc;
                      return (
                        <option key={kv.id} value={kv.id}>
                          {kv.ten_khu_vuc} ({loai})
                        </option>
                      );
                    })}
                </select>

                {/* Ô tìm kiếm nhanh phường/xã */}
                <div style={{ position: 'relative', marginTop: '8px' }}>
                  <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Gõ tên tìm nhanh (vd: Bến Nghé, Tân Thới Nhất...)"
                    value={districtSearchText}
                    onChange={(e) => setDistrictSearchText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px 6px 30px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      background: '#f8fafc',
                      outline: 'none'
                    }}
                  />
                  {districtSearchText && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        marginTop: '4px'
                      }}
                    >
                      {khuVucList
                        .filter(k => k.ten_khu_vuc.toLowerCase().includes(districtSearchText.toLowerCase()))
                        .slice(0, 15)
                        .map(kv => (
                          <div
                            key={kv.id}
                            onClick={() => {
                              handleSelectWard(kv.id);
                              setDistrictSearchText('');
                            }}
                            style={{
                              padding: '7px 12px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf4'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{kv.ten_khu_vuc}</span>
                            <span style={{ color: '#64748b', fontSize: '11px' }}>{kv.loai_khu_vuc}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedPoint ? (
                <div className="glass-panel">
                  <div className="card-header">
                    <span className="card-title">
                      <Thermometer size={14} color="#f97316" />
                      Chi tiết Tọa độ Trạm Quan trắc
                    </span>
                    <button
                      onClick={() => setSelectedPoint(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Phân loại:</span>
                      <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--accent-sky)' }}>{selectedPoint.type}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Thời gian:</span>
                      <span style={{ fontWeight: 600, fontSize: '12px' }}>{selectedPoint.date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Nhiệt độ LST:</span>
                      <span style={{ fontWeight: 800, fontSize: '16px', color: getLSTColor(selectedPoint.lst) }}>
                        {selectedPoint.lst}°C
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Chỉ số thực vật (NDVI):</span>
                      <span style={{ fontWeight: 600, fontSize: '12px', color: '#10b981' }}>{selectedPoint.ndvi}</span>
                    </div>
                    {selectedPoint.rain !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Lượng mưa:</span>
                        <span style={{ fontWeight: 600, fontSize: '12px' }}>{selectedPoint.rain} mm</span>
                      </div>
                    )}
                    {selectedPoint.humidity !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Độ ẩm đất:</span>
                        <span style={{ fontWeight: 600, fontSize: '12px' }}>{selectedPoint.humidity}%</span>
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Tọa độ: {selectedPoint.lat.toFixed(3)}°N, {selectedPoint.lng.toFixed(3)}°E
                    </div>
                  </div>
                </div>
              ) : selectedDistrict ? (
                <div className="glass-panel">
                  <div className="card-header">
                    <span className="card-title">
                      <MapIcon size={14} color="#22d3ee" />
                      Thông tin Khu vực Hành chính
                    </span>
                    <button
                      onClick={() => setSelectedDistrict(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '16px', color: 'var(--text-main)', margin: 0, fontWeight: 700 }}>{selectedDistrict.ten_khu_vuc}</h3>
                      <span style={{ fontSize: '11px', color: '#0891b2', background: 'rgba(8, 145, 178, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                        {selectedDistrict.loai_khu_vuc}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                      {selectedDistrict.dien_tich_km2 && (
                        <span>Diện tích: <b>{Number(selectedDistrict.dien_tich_km2).toFixed(2)} km²</b></span>
                      )}
                      {selectedDistrict.current_lst && (
                        <span>LST hiện tại: <b style={{ color: '#ea580c' }}>{selectedDistrict.current_lst}°C</b></span>
                      )}
                    </div>

                    {/* Bảng Diễn biến LST theo từng năm */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Thermometer size={14} color="#f97316" />
                        Diễn biến LST qua các năm (2021 – 2026):
                      </div>

                      {selectedDistrict.yearlyData && selectedDistrict.yearlyData.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {selectedDistrict.yearlyData.map((y) => (
                            <div
                              key={y.nam}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8fafc',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                border: '1px solid var(--border-color)'
                              }}
                            >
                              <span style={{ fontWeight: 700, color: '#0f172a', width: '45px' }}>{y.nam}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, padding: '0 8px' }}>
                                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '4px', flex: 1, overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${Math.min(100, Math.max(10, ((y.lst_trung_binh - 25) / 18) * 100))}%`,
                                      background: getLSTColor(y.lst_trung_binh),
                                      borderRadius: '4px'
                                    }}
                                  />
                                </div>
                              </div>
                              <span style={{ fontWeight: 700, color: getLSTColor(y.lst_trung_binh), width: '55px', textAlign: 'right' }}>
                                {y.lst_trung_binh}°C
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                          Đang tải số liệu chuỗi thời gian...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-sky)', fontSize: '13px', fontWeight: 600 }}>
                    <ShieldAlert size={16} />
                    Chỉ dẫn Thao tác GIS
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
                    • Nhấp vào bất kỳ điểm trạm nào để xem nhiệt độ LST, chỉ số NDVI, lượng mưa và độ ẩm.<br />
                    • Nhấp vào ranh giới quận để tra cứu đặc điểm đảo nhiệt đô thị.<br />
                    • Sử dụng thanh trượt thời gian bên dưới để phát chuỗi thời gian 2021-2026.
                  </div>
                </div>
              )}

              {/* Best Model Overview Card */}
              {stats?.best_model && (
                <div className="glass-panel">
                  <div className="card-header">
                    <span className="card-title">
                      <Sparkles size={14} color="#a855f7" />
                      Mô hình Đạt Chuẩn Cao Nhất
                    </span>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-sky)' }}>
                        {stats.best_model.ten_model}
                      </span>
                      <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        Tối ưu nhất
                      </span>
                    </div>
                    <div className="metrics-grid">
                      <div className="metric-box">
                        <div className="metric-name">RMSE (Kiểm tra)</div>
                        <div className="metric-val">{stats.best_model.rmse}</div>
                      </div>
                      <div className="metric-box">
                        <div className="metric-name">R² Score</div>
                        <div className="metric-val" style={{ color: '#10b981' }}>{stats.best_model.r2}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Floating Time Slider Controller at bottom (Thiết kế chuẩn giống Ảnh 1) */}
            {timeline && timeline.length > 0 && (
              <div className="time-slider-card">
                {/* Nút Play / Dừng */}
                <button
                  type="button"
                  className="time-slider-play-btn"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <>
                      <Pause size={15} />
                      <span>Dừng</span>
                    </>
                  ) : (
                    <>
                      <Play size={15} style={{ marginLeft: '2px' }} />
                      <span>Phát</span>
                    </>
                  )}
                </button>

                {/* Nhãn Tháng MM/YYYY hiện tại */}
                <div className="time-slider-cur-label">
                  Tháng <span className="time-slider-date-txt">
                    {(() => {
                      const d = currentDateInfo.thoi_gian;
                      if (!d) return '--/----';
                      const parts = d.split('-');
                      return `${parts[1]}/${parts[0]}`;
                    })()}
                  </span>
                </div>

                {/* Thanh kéo Timeline trực quan với phần fill đã chạy */}
                <div className="time-slider-track-wrap">
                  <input
                    type="range"
                    min="0"
                    max={timeline.length - 1}
                    value={selectedDateIdx}
                    onChange={e => {
                      setIsPlaying(false);
                      setSelectedDateIdx(Number(e.target.value));
                    }}
                    className="time-range-slider"
                    style={{
                      '--slider-progress': `${(selectedDateIdx / Math.max(1, timeline.length - 1)) * 100}%`
                    }}
                  />
                </div>

                {/* Khoảng thời gian Bắt đầu -> Kết thúc (ví dụ 01/2021 -> 12/2026) */}
                <div className="time-slider-bounds">
                  <div>01/2021 &rarr;</div>
                  <div>12/2026</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: THỐNG KÊ KHU VỰC (Chuẩn theo Ảnh 1 & Ảnh 2) ================= */}
        {activeTab === 'statistics' && (
          <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc' }}>
            
            {/* 1. Hàng bộ lọc trên cùng (Chỉ số, Tháng, Nguồn, Ngưỡng trên) - Y hệt Ảnh 1 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: '#ffffff', padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
              
              {/* Chỉ số */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Chỉ số</label>
                <select
                  value={statsIndicator}
                  onChange={(e) => setStatsIndicator(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    background: '#ffffff',
                    cursor: 'pointer',
                    minWidth: '90px'
                  }}
                >
                  <option value="LST">LST</option>
                  <option value="NDVI">NDVI</option>
                  <option value="TVDI">TVDI</option>
                </select>
              </div>

              {/* Tháng */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Tháng</label>
                <select
                  value={statsMonth || (timeline[selectedDateIdx]?.thoi_gian?.substring(0, 7)) || '2025-12'}
                  onChange={(e) => setStatsMonth(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    background: '#ffffff',
                    cursor: 'pointer',
                    minWidth: '120px'
                  }}
                >
                  {timeline && timeline.length > 0 ? (
                    // Lấy danh sách các tháng duy nhất từ timeline
                    Array.from(new Set(timeline.map(t => t.thoi_gian?.substring(0, 7)).filter(Boolean)))
                      .sort()
                      .reverse()
                      .map(m => {
                        const [y, mon] = m.split('-');
                        return (
                          <option key={m} value={m}>
                            {mon}/{y}
                          </option>
                        );
                      })
                  ) : (
                    <option value="2025-12">12/2025</option>
                  )}
                </select>
              </div>

              {/* Nguồn */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Nguồn</label>
                <select
                  value={statsSource}
                  onChange={(e) => setStatsSource(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    background: '#ffffff',
                    cursor: 'pointer',
                    minWidth: '150px'
                  }}
                >
                  <option value="GEE / AI dự báo">GEE / AI dự báo</option>
                  <option value="Landsat/MODIS">Landsat/MODIS Gốc</option>
                  <option value="Mô hình GCN-LSTM">Mô hình GCN-LSTM</option>
                </select>
              </div>

              {/* Ngưỡng trên */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Ngưỡng trên</label>
                <input
                  type="number"
                  step="0.5"
                  value={statsThreshold}
                  onChange={(e) => setStatsThreshold(Number(e.target.value))}
                  style={{
                    width: '80px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    background: '#ffffff'
                  }}
                />
              </div>

              {statsLoading && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0891b2', fontWeight: 600 }}>
                  <div className="spinner" style={{ width: '14px', height: '14px' }} />
                  Đang tổng hợp dữ liệu...
                </div>
              )}
            </div>

            {/* 2. Bố cục 2 cột chính: Cột trái (Biểu đồ thanh ngang) & Cột phải (Bảng thống kê) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '20px', flex: 1, minHeight: '620px' }}>
              
              {/* CỘT TRÁI: GIÁ TRỊ TRUNG BÌNH THEO KHU VỰC (HORIZONTAL BAR CHART) */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
                  Giá trị trung bình theo khu vực ({statsIndicator})
                </h3>

                {/* Container biểu đồ thanh ngang cuộn nếu có nhiều khu vực */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(() => {
                    const items = statsData.items || [];
                    if (items.length === 0) {
                      return <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '20px' }}>Chưa có dữ liệu thống kê</div>;
                    }

                    // Tìm min / max cho trục X
                    const values = items.map(it => Number(it.tb));
                    const minVal = Math.min(...values);
                    const maxVal = Math.max(...values);
                    const domainMin = Math.max(0, Math.floor(minVal - 1));
                    const domainMax = Math.ceil(maxVal + 1);
                    const range = Math.max(1, domainMax - domainMin);

                    return items.map((item, idx) => {
                      const val = Number(item.tb);
                      const pct = Math.max(8, Math.min(100, ((val - domainMin) / range) * 100));
                      const isHovered = hoveredBar === item.id;

                      // Bảng màu gradient thanh ngang: Màu vàng cam dịu nếu giá trị cao, xanh lam nếu giá trị mát
                      let barColor = '#facc15';
                      if (statsIndicator === 'LST') {
                        if (val >= 36) barColor = '#ef4444';
                        else if (val >= 34) barColor = '#f97316';
                        else if (val >= 32) barColor = '#facc15';
                        else if (val >= 30) barColor = '#93c5fd';
                        else barColor = '#3b82f6';
                      } else if (statsIndicator === 'NDVI') {
                        barColor = val >= 0.6 ? '#10b981' : val >= 0.4 ? '#34d399' : val >= 0.25 ? '#fde047' : '#cbd5e1';
                      } else {
                        barColor = val >= 0.7 ? '#ea580c' : val >= 0.5 ? '#f59e0b' : '#38bdf8';
                      }

                      return (
                        <div
                          key={item.id || idx}
                          onMouseEnter={() => setHoveredBar(item.id)}
                          onMouseLeave={() => setHoveredBar(null)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '12px',
                            gap: '12px',
                            position: 'relative',
                            padding: '2px 0'
                          }}
                        >
                          {/* Tên khu vực */}
                          <div style={{ width: '130px', textAlign: 'right', fontWeight: isHovered ? 700 : 500, color: isHovered ? '#0891b2' : '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.khu_vuc}>
                            {item.khu_vuc}
                          </div>

                          {/* Thanh Bar */}
                          <div style={{ flex: 1, height: '18px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: barColor,
                                borderRadius: '4px',
                                transition: 'width 0.4s ease',
                                opacity: isHovered ? 1 : 0.85
                              }}
                            />
                          </div>

                          {/* Tooltip khi hover thanh */}
                          {isHovered && (
                            <div
                              style={{
                                position: 'absolute',
                                left: `calc(142px + ${pct * 0.6}%)`,
                                top: '-24px',
                                background: '#1e293b',
                                color: '#ffffff',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                zIndex: 10,
                                boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <div>{item.khu_vuc}</div>
                              <div style={{ color: barColor }}>{statsIndicator}: {val} {statsIndicator === 'LST' ? '°C' : ''}</div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Trục X số liệu dưới chân biểu đồ (Ảnh 1: 24.7 ... 28 ... 32 ... 34) */}
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', paddingLeft: '142px', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  {(() => {
                    const items = statsData.items || [];
                    const values = items.map(it => Number(it.tb));
                    if (values.length === 0) return null;
                    const minVal = Math.min(...values);
                    const maxVal = Math.max(...values);
                    const dMin = Math.max(0, Math.floor(minVal - 1));
                    const dMax = Math.ceil(maxVal + 1);
                    const step = Math.round((dMax - dMin) / 4) || 1;
                    const ticks = [];
                    for (let t = dMin; t <= dMax; t += step) ticks.push(t);
                    return ticks.map(tick => <span key={tick}>{tick}</span>);
                  })()}
                </div>
              </div>

              {/* CỘT PHẢI: BẢNG THỐNG KÊ (TABLE VIEW THEO ẢNH 1) */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px 12px 20px', borderBottom: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Bảng thống kê
                  </h3>
                </div>

                {/* Table Scrollable Container */}
                <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1.5px solid #e2e8f0', userSelect: 'none' }}>
                        <th
                          onClick={() => { setStatsSortCol('khu_vuc'); setStatsSortAsc(!statsSortAsc); }}
                          style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          KHU VỰC {statsSortCol === 'khu_vuc' && (statsSortAsc ? '▲' : '▼')}
                        </th>
                        <th
                          onClick={() => { setStatsSortCol('tb'); setStatsSortAsc(!statsSortAsc); }}
                          style={{ padding: '10px 10px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', color: '#0f172a' }}
                        >
                          TB {statsSortCol === 'tb' && (statsSortAsc ? '▲' : '▼')}
                        </th>
                        <th
                          onClick={() => { setStatsSortCol('min'); setStatsSortAsc(!statsSortAsc); }}
                          style={{ padding: '10px 10px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          MIN {statsSortCol === 'min' && (statsSortAsc ? '▲' : '▼')}
                        </th>
                        <th
                          onClick={() => { setStatsSortCol('max'); setStatsSortAsc(!statsSortAsc); }}
                          style={{ padding: '10px 10px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          MAX {statsSortCol === 'max' && (statsSortAsc ? '▲' : '▼')}
                        </th>
                        <th style={{ padding: '10px 10px', fontWeight: 700, whiteSpace: 'nowrap' }}>ĐỘ LỆCH</th>
                        <th
                          onClick={() => { setStatsSortCol('dien_tich_km2'); setStatsSortAsc(!statsSortAsc); }}
                          style={{ padding: '10px 10px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          DIỆN TÍCH (KM²) {statsSortCol === 'dien_tich_km2' && (statsSortAsc ? '▲' : '▼')}
                        </th>
                        <th style={{ padding: '10px 10px', fontWeight: 700, whiteSpace: 'nowrap' }}>%</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>Δ CÙNG KỲ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Dòng tổng hợp đặc biệt: Toàn TP.HCM (Giống hàng nổi bật trong Ảnh 1) */}
                      {statsData.city_summary && (
                        <tr style={{ background: '#f1f5f9', fontWeight: 700, color: '#0f172a', borderTop: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1' }}>
                          <td style={{ padding: '10px 14px', textAlign: 'left', color: '#0891b2' }}>
                            {statsData.city_summary.khu_vuc}
                          </td>
                          <td style={{ padding: '10px 10px', color: '#ea580c' }}>{statsData.city_summary.tb}</td>
                          <td style={{ padding: '10px 10px' }}>{statsData.city_summary.min}</td>
                          <td style={{ padding: '10px 10px' }}>{statsData.city_summary.max}</td>
                          <td style={{ padding: '10px 10px' }}>{statsData.city_summary.do_lech}</td>
                          <td style={{ padding: '10px 10px' }}>{statsData.city_summary.dien_tich_km2}</td>
                          <td style={{ padding: '10px 10px' }}>{statsData.city_summary.phan_tram_nguy_co}%</td>
                          <td style={{ padding: '10px 14px', color: statsData.city_summary.delta_cung_ky >= 0 ? '#ef4444' : '#10b981' }}>
                            {statsData.city_summary.delta_cung_ky > 0 ? `+${statsData.city_summary.delta_cung_ky}` : statsData.city_summary.delta_cung_ky}
                          </td>
                        </tr>
                      )}

                      {/* Danh sách từng phường / xã */}
                      {(() => {
                        const items = (statsData.items || []).slice();
                        items.sort((a, b) => {
                          let va = a[statsSortCol];
                          let vb = b[statsSortCol];
                          if (typeof va === 'string') {
                            return statsSortAsc ? va.localeCompare(vb, 'vi') : vb.localeCompare(va, 'vi');
                          }
                          va = Number(va) || 0;
                          vb = Number(vb) || 0;
                          return statsSortAsc ? va - vb : vb - va;
                        });

                        return items.map((row, idx) => (
                          <tr
                            key={row.id || idx}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#334155' }}>
                              {row.khu_vuc}
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                              {row.tb}
                            </td>
                            <td style={{ padding: '8px 10px', color: '#64748b' }}>{row.min}</td>
                            <td style={{ padding: '8px 10px', color: '#64748b' }}>{row.max}</td>
                            <td style={{ padding: '8px 10px', color: '#64748b' }}>{row.do_lech}</td>
                            <td style={{ padding: '8px 10px', color: '#64748b' }}>{row.dien_tich_km2}</td>
                            <td style={{ padding: '8px 10px', color: row.phan_tram_nguy_co > 0 ? '#ef4444' : '#64748b' }}>
                              {row.phan_tram_nguy_co}%
                            </td>
                            <td style={{ padding: '8px 14px', fontWeight: 600, color: row.delta_cung_ky >= 0 ? '#ef4444' : '#10b981' }}>
                              {row.delta_cung_ky > 0 ? `+${row.delta_cung_ky}` : row.delta_cung_ky}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Footer Chú thích chuẩn như Ảnh 1 */}
                <div style={{ padding: '10px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Dữ liệu ghi vào bảng THONG_KE_VA_LOP_BAN_DO. Bấm tiêu đề cột để sắp xếp.</span>
                  <span style={{ fontWeight: 600, color: '#0891b2' }}>
                    Tổng cộng: {statsData.items?.length || 0} khu vực
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= TAB: CHUỖI THỜI GIAN (Time-series Dashboard theo Ảnh 1 & Ảnh 2) ================= */}
        {activeTab === 'timeseries' && (
          <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', background: '#f8fafc' }}>
            
            {/* 1. KHỐI TRÊN: LST THÁNG CỤ THỂ QUA CÁC NĂM (Khớp hoàn toàn nửa trên Ảnh 2) */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>LST tháng {tsMonth} qua các năm · {tsData?.ten_khu_vuc || 'TP.HCM'}</span>
                  </h2>
                  <div style={{ fontSize: '13px', color: '#475569' }}>
                    {tsData?.insight_text || `Từ 2021 đến 2025 LST tháng ${tsMonth} đang tải...`}
                  </div>
                </div>

                {/* Bộ chọn Phường/Xã và Tháng */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Chọn Phường / Xã */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Khu vực:</span>
                    <select
                      value={tsWardId}
                      onChange={(e) => setTsWardId(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#0f172a',
                        background: '#ffffff',
                        cursor: 'pointer',
                        maxWidth: '180px'
                      }}
                    >
                      <option value="">Toàn TP. Hồ Chí Minh</option>
                      {khuVucList
                        .slice()
                        .sort((a, b) => a.ten_khu_vuc.localeCompare(b.ten_khu_vuc, 'vi'))
                        .map(kv => (
                          <option key={kv.id} value={kv.id}>
                            {kv.ten_khu_vuc}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Chọn Tháng */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Tháng:</span>
                    <select
                      value={tsMonth}
                      onChange={(e) => setTsMonth(Number(e.target.value))}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#0f172a',
                        background: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                        <option key={m} value={m}>Tháng {m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* BIỂU ĐỒ LINE CHART SVG CHUỖI NĂM (2021 -> 2027) */}
              <div style={{ position: 'relative', width: '100%', height: '240px', marginTop: '16px' }}>
                {(() => {
                  const items = tsData?.years_data || [];
                  if (items.length === 0) {
                    return <div style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '80px' }}>{tsData ? 'Chưa có dữ liệu LST trong CSDL cho lựa chọn này. Hãy nạp CSV ở tab Dữ liệu.' : 'Đang tải biểu đồ...'}</div>;
                  }

                  const minLST = Math.floor(Math.min(...items.map(i => i.lst)) * 2) / 2 - 0.5;
                  const maxLST = Math.ceil(Math.max(...items.map(i => i.lst)) * 2) / 2 + 0.5;
                  const svgWidth = 860;
                  const svgHeight = 200;
                  const padLeft = 45;
                  const padRight = 30;
                  const padTop = 15;
                  const padBottom = 30;

                  const getX = (idx) => padLeft + (idx / Math.max(1, items.length - 1)) * (svgWidth - padLeft - padRight);
                  const getY = (val) => padTop + (1 - (val - minLST) / (maxLST - minLST)) * (svgHeight - padTop - padBottom);

                  // Chia làm 2 path: Quá khứ (nét liền xanh đậm #0f766e) & Tương lai (nét đứt cam đỏ #ea580c)
                  const pastPoints = [];
                  const futurePoints = [];

                  items.forEach((item, idx) => {
                    const pt = { x: getX(idx), y: getY(item.lst), item, idx };
                    if (!item.is_forecast) {
                      pastPoints.push(pt);
                    } else {
                      if (futurePoints.length === 0 && pastPoints.length > 0) {
                        futurePoints.push(pastPoints[pastPoints.length - 1]); // Nối điểm giáp ranh 2025
                      }
                      futurePoints.push(pt);
                    }
                  });

                  const pastD = pastPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const futureD = futurePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                  const yTicks = [minLST, (minLST + maxLST) / 2, maxLST];

                  return (
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      {/* Grid ngang & Nhãn trục Y */}
                      {yTicks.map(t => {
                        const yPos = getY(t);
                        return (
                          <g key={t}>
                            <line x1={padLeft} y1={yPos} x2={svgWidth - padRight} y2={yPos} stroke="#e2e8f0" strokeDasharray="3 3" />
                            <text x={padLeft - 8} y={yPos + 4} textAnchor="end" fontSize="11" fill="#64748b" fontWeight="500">
                              {t.toFixed(1).replace('.', ',')}
                            </text>
                          </g>
                        );
                      })}

                      {/* Trục X nhãn năm */}
                      {items.map((it, idx) => {
                        if (it.nam % 2 !== 1 && it.nam !== 2027) return null; // hiện các năm lẻ: 2021, 2023, 2025, 2027
                        const xPos = getX(idx);
                        return (
                          <g key={it.nam}>
                            <line x1={xPos} y1={svgHeight - padBottom} x2={xPos} y2={svgHeight - padBottom + 4} stroke="#94a3b8" />
                            <text x={xPos} y={svgHeight - padBottom + 16} textAnchor="middle" fontSize="11" fill="#64748b">
                              {it.nam}
                            </text>
                          </g>
                        );
                      })}

                      {/* Đường quá khứ (Nét liền màu xanh lục đậm #0d9488) */}
                      {pastD && <path d={pastD} fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

                      {/* Đường dự báo (Nét đứt màu cam gạch #ea580c) */}
                      {futureD && <path d={futureD} fill="none" stroke="#ea580c" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />}

                      {/* Các điểm tròn (dots) */}
                      {items.map((it, idx) => {
                        const cx = getX(idx);
                        const cy = getY(it.lst);
                        const isFc = it.is_forecast;
                        const isHovered = tsHoverPoint?.nam === it.nam;

                        return (
                          <g key={it.nam} style={{ cursor: 'pointer' }} onMouseEnter={() => setTsHoverPoint(it)} onMouseLeave={() => setTsHoverPoint(null)}>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isHovered ? 6 : 4}
                              fill={isFc ? '#ea580c' : '#0f766e'}
                              stroke="#ffffff"
                              strokeWidth={2}
                            />
                            {isHovered && (
                              <g>
                                <rect x={cx - 38} y={cy - 28} width="76" height="22" rx="4" fill="#1e293b" />
                                <text x={cx} y={cy - 14} textAnchor="middle" fontSize="11" fill="#ffffff" fontWeight="700">
                                  {it.lst}°C ({it.nam})
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>
            </div>

            {/* 2. KHỐI DƯỚI: CHIA 2 CỘT (Khớp nửa dưới Ảnh 2) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '20px', minHeight: '380px' }}>
              
              {/* CỘT TRÁI: LST THEO THÁNG (CHUỖI LIÊN TỤC 12 THÁNG/NĂM CÓ DẢI BÓNG DỰ BÁO) */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    LST theo tháng · {tsData?.ten_khu_vuc || 'TP.HCM'}
                  </h3>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Bấm vào biểu đồ để chọn tháng</span>
                </div>

                {/* SVG Line Chart Monthly Cycle */}
                <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: '220px', marginTop: '10px' }}>
                  {(() => {
                    const series = tsData?.monthly_series || [];
                    if (series.length === 0) return <div style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '60px' }}>{tsData ? 'Chưa có dữ liệu chuỗi thời gian.' : 'Đang nạp chuỗi thời gian...'}</div>;

                    const allVals = series.flatMap(x => [x.lst_obs, x.lst_forecast, x.lst_scenario, x.upper_bound, x.lower_bound]).filter(v => v !== null && v !== undefined);
                    const minVal = Math.floor(Math.min(...allVals)) - 1;
                    const maxVal = Math.ceil(Math.max(...allVals)) + 1;
                    const yStep = Math.max(1, Math.round((maxVal - minVal) / 5));
                    const yTickList = [];
                    for (let t = Math.ceil(minVal); t <= maxVal; t += yStep) yTickList.push(t);
                    const w = 680;
                    const h = 200;
                    const pL = 35;
                    const pR = 20;
                    const pT = 15;
                    const pB = 30;

                    const tOf = (i) => (series[i].nam - series[0].nam) * 12 + series[i].thang - 1;
                    const tMax = Math.max(1, tOf(series.length - 1));
                    const getX = (idx) => pL + (tOf(idx) / tMax) * (w - pL - pR);
                    const getY = (val) => pT + (1 - (val - minVal) / (maxVal - minVal)) * (h - pT - pB);

                    // Phân chia dữ liệu Hiện trạng (trước 2026) và Dự báo (từ 2026 trở đi)
                    const obsPts = [];
                    const fcPts = [];
                    const scPts = [];
                    const upperPts = [];
                    const lowerPts = [];

                    series.forEach((it, idx) => {
                      const x = getX(idx);
                      if (it.lst_obs !== null) {
                        obsPts.push(`${obsPts.length === 0 ? 'M' : 'L'} ${x} ${getY(it.lst_obs)}`);
                      }
                      if (it.lst_forecast !== null) {
                        fcPts.push(`${fcPts.length === 0 ? 'M' : 'L'} ${x} ${getY(it.lst_forecast)}`);
                      }
                      if (it.lst_scenario !== null) {
                        scPts.push(`${scPts.length === 0 ? 'M' : 'L'} ${x} ${getY(it.lst_scenario)}`);
                      }
                      if (it.upper_bound !== null && it.lower_bound !== null) {
                        upperPts.push(`${x},${getY(it.upper_bound)}`);
                        lowerPts.unshift(`${x},${getY(it.lower_bound)}`);
                      }
                    });

                    // Vị trí vạch ngăn "dự báo"
                    const fcStartIdx = series.findIndex(s => s.lst_forecast !== null && s.lst_obs === null);
                    const hasFc = fcStartIdx >= 0;
                    const fcStartX = hasFc ? getX(fcStartIdx) : w - pR;

                    return (
                      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        {/* Vùng bóng dự báo đỏ nhạt (Forecast Shaded Zone) */}
                        {hasFc && <rect x={fcStartX} y={pT} width={w - pR - fcStartX} height={h - pT - pB} fill="rgba(239, 68, 68, 0.08)" />}
                        {hasFc && <line x1={fcStartX} y1={pT} x2={fcStartX} y2={h - pB} stroke="#ea580c" strokeWidth="1.5" />}
                        {hasFc && <text x={fcStartX + 6} y={pT + 12} fontSize="11" fill="#ea580c" fontWeight="600">dự báo</text>}

                        {/* Dải bóng tin cậy confidence band */}
                        {upperPts.length > 0 && (
                          <polygon
                            points={`${upperPts.join(' ')} ${lowerPts.join(' ')}`}
                            fill="rgba(234, 88, 12, 0.15)"
                          />
                        )}

                        {/* Đường lưới ngang Y */}
                        {yTickList.map(t => {
                          const yPos = getY(t);
                          return (
                            <g key={t}>
                              <line x1={pL} y1={yPos} x2={w - pR} y2={yPos} stroke="#f1f5f9" />
                              <text x={pL - 6} y={yPos + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                                {t}
                              </text>
                            </g>
                          );
                        })}

                        {/* Đường Hiện trạng GEE (Xanh đậm #0f766e) */}
                        <path d={obsPts.join(' ')} fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" />

                        {/* Đường Dự báo AI GCN-LSTM (Đỏ cam nét đứt) */}
                        <path d={fcPts.join(' ')} fill="none" stroke="#ea580c" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />

                        {/* Đường Giả lập kịch bản (Xanh rêu nét đứt) */}
                        <path d={scPts.join(' ')} fill="none" stroke="#16a34a" strokeWidth="1.8" strokeDasharray="3 3" />

                        {/* Nhãn năm trục X */}
                        {[2021, 2022, 2023, 2024, 2025, 2026, 2027].map(yr => {
                          const idx = series.findIndex(s => s.nam === yr);
                          if (idx < 0) return null;
                          const x = getX(idx);
                          return (
                            <text key={yr} x={x} y={h - pB + 16} textAnchor="middle" fontSize="10" fill="#64748b">
                              {yr}
                            </text>
                          );
                        })}
                      </svg>
                    );
                  })()}
                </div>

                {/* Chú giải đường line */}
                <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#64748b', marginTop: '12px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '16px', height: '3px', background: '#0f766e', borderRadius: '2px' }} />
                    <span>Hiện trạng GEE</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '16px', height: '0px', borderTop: '2px dashed #ea580c' }} />
                    <span style={{ color: '#ea580c', fontWeight: 600 }}>Dự báo AI (GCN-LSTM)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '16px', height: '0px', borderTop: '2px dashed #16a34a' }} />
                    <span>Giả lập kịch bản</span>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: XẾP HẠNG QUẬN HUYỆN / PHƯỜNG XÃ (Khớp hệt cột phải Ảnh 2) */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Xếp hạng phường/xã
                  </h3>
                  <ArrowUpDown size={14} color="#94a3b8" />
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '16px' }}>
                  LST trung bình {tsData?.forecast_period || 'đang tải...'}
                </div>

                {/* Danh sách thanh progress bar xếp hạng */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                  {(tsData?.rankings || []).length === 0 && tsData && <div style={{ color: '#94a3b8', fontSize: '12px' }}>Chưa có dữ liệu phường/xã cho tháng này.</div>}
                  {(tsData?.rankings || []).map((rk, idx) => {
                    // Màu sắc theo nhiệt độ: >36 đỏ cam, 34-36 vàng cam, <34 xanh dịu
                    const barColor = rk.lst >= 37.0 ? '#f97316' : rk.lst >= 35.5 ? '#fb923c' : rk.lst >= 34.0 ? '#facc15' : '#86efac';

                    return (
                      <div key={rk.name || idx} style={{ display: 'flex', alignItems: 'center', fontSize: '12px', gap: '10px' }}>
                        <span style={{ width: '85px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                          {rk.name}
                        </span>
                        
                        {/* Thanh Progress */}
                        <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${rk.pct}%`,
                              height: '100%',
                              background: barColor,
                              borderRadius: '4px'
                            }}
                          />
                        </div>

                        {/* Điểm số LST */}
                        <span style={{ width: '38px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {rk.lst}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= TAB 2: AI TRAINING LAB ================= */}
        {activeTab === 'training' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', gap: '24px' }}>
            {/* Form Column */}
            <div style={{ width: '420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-panel">
                <div className="card-header">
                  <span className="card-title">
                    <Cpu size={16} color="#22d3ee" />
                    Cấu hình Huấn luyện Mô hình AI
                  </span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Select Model */}
                  <div>
                    <label className="form-label">Chọn Mô hình AI Dự báo</label>
                    <select
                      className="styled-select"
                      value={selectedModelId}
                      onChange={e => setSelectedModelId(e.target.value)}
                    >
                      {modelsList.map(m => (
                        <option key={m.ma_model} value={m.ma_model}>
                          {m.ten_model} ({m.loai_model})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Handling Missing */}
                  <div>
                    <label className="form-label">Xử lý Giá trị Khuyết thiếu</label>
                    <select
                      className="styled-select"
                      value={missingStrategy}
                      onChange={e => setMissingStrategy(e.target.value)}
                    >
                      <option value="Noi_suy_tuyen_tinh">Nội suy Tuyến tính theo Chuỗi thời gian</option>
                      <option value="Loai_bo">Loại bỏ hàng khuyết thiếu (Drop Missing)</option>
                    </select>
                  </div>

                  {/* Outlier Detection */}
                  <div>
                    <label className="form-label">Phát hiện & Xử lý Ngoại lai (Outliers)</label>
                    <select
                      className="styled-select"
                      value={outlierStrategy}
                      onChange={e => setOutlierStrategy(e.target.value)}
                    >
                      <option value="IQR">Khoảng Tứ phân vị (IQR Filter 1.5x)</option>
                      <option value="Z-score">Ngưỡng Chuẩn hóa Z-Score (&gt; 3.0 std)</option>
                    </select>
                  </div>

                  {/* Normalization */}
                  <div>
                    <label className="form-label">Phương pháp Chuẩn hóa Dữ liệu</label>
                    <select
                      className="styled-select"
                      value={normMethod}
                      onChange={e => setNormMethod(e.target.value)}
                    >
                      <option value="Min-Max">Min-Max Scaling [0, 1] (Tránh rò rỉ dữ liệu)</option>
                      <option value="Z-score">Chuẩn hóa Z-Score (Mean=0, Std=1)</option>
                      <option value="Khong">Không chuẩn hóa (Dữ liệu gốc)</option>
                    </select>
                  </div>

                  {/* Role Warning Banner if Not Admin */}
                  {!isAdmin && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      color: '#fef08a',
                      marginTop: '4px'
                    }}>
                      <Lock size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
                      <span>Chỉ Quản trị viên (ADMIN) mới được quyền khởi chạy huấn luyện mô hình vào CSDL.</span>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    className="btn-primary"
                    onClick={handleStartTraining}
                    disabled={trainingLoading || !isAdmin}
                    style={{
                      marginTop: '10px',
                      opacity: isAdmin ? 1 : 0.6,
                      cursor: isAdmin ? 'pointer' : 'not-allowed',
                      background: isAdmin ? 'linear-gradient(135deg, #0891b2, #ea580c)' : '#334155'
                    }}
                    title={isAdmin ? 'Khởi chạy huấn luyện mô hình' : 'Yêu cầu quyền Quản trị viên (ADMIN)'}
                  >
                    {trainingLoading ? (
                      <>Đang chạy Huấn luyện AI & Tính toán 4 Chỉ số...</>
                    ) : (
                      <>
                        {isAdmin ? <Sparkles size={16} /> : <Lock size={16} />}
                        {isAdmin ? 'Khởi chạy Huấn luyện & Đánh giá' : 'Khóa: Yêu cầu quyền ADMIN'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Data Split Architecture Card */}
              <div className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                  Phân chia Dữ liệu Huấn luyện & Kiểm định
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Hệ thống tuân thủ nghiêm ngặt nguyên tắc chuỗi thời gian (Chronological Split):
                  <div style={{ display: 'flex', gap: '8px', margin: '10px 0' }}>
                    <div style={{ flex: 7, background: 'rgba(34, 211, 238, 0.2)', padding: '6px', borderRadius: '4px', textAlign: 'center', fontSize: '11px', color: '#0891b2' }}>
                      Train (70%)
                    </div>
                    <div style={{ flex: 1.5, background: 'rgba(245, 158, 11, 0.2)', padding: '6px', borderRadius: '4px', textAlign: 'center', fontSize: '11px', color: '#f59e0b' }}>
                      Val (15%)
                    </div>
                    <div style={{ flex: 1.5, background: 'rgba(16, 185, 129, 0.2)', padding: '6px', borderRadius: '4px', textAlign: 'center', fontSize: '11px', color: '#10b981' }}>
                      Test (15%)
                    </div>
                  </div>
                  Các tham số chuẩn hóa Min-Max chỉ được tính trên tập Train để ngăn chặn triệt để hiện tượng rò rỉ thông tin (Data Leakage).
                </div>
              </div>
            </div>

            {/* Results Column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {trainingResult ? (
                <div className="glass-panel">
                  <div className="card-header" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                    <span className="card-title" style={{ color: '#10b981' }}>
                      <CheckCircle2 size={16} color="#10b981" />
                      Huấn luyện Thành công: {trainingResult.model} (Mã chạy: #{trainingResult.ma_training})
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Thời gian chạy: {trainingResult.execution_seconds}s
                    </span>
                  </div>
                  <div className="card-body">
                    <h4 style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '12px' }}>
                      Kết quả 4 Chỉ số Đánh giá Hiệu năng (Performance Metrics):
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                      {/* Validation Metrics */}
                      <div style={{ background: 'var(--bg-inset)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>
                          Tập Kiểm định (Validation Set)
                        </div>
                        <div className="metrics-grid">
                          <div className="metric-box">
                            <div className="metric-name">MAE (°C)</div>
                            <div className="metric-val">{trainingResult.val_metrics.mae}</div>
                            <div className="metric-sub">Sai số tuyệt đối TB</div>
                          </div>
                          <div className="metric-box">
                            <div className="metric-name">RMSE (°C)</div>
                            <div className="metric-val">{trainingResult.val_metrics.rmse}</div>
                            <div className="metric-sub">Căn bậc 2 sai số toàn phương</div>
                          </div>
                          <div className="metric-box">
                            <div className="metric-name">R² Score</div>
                            <div className="metric-val" style={{ color: '#10b981' }}>{trainingResult.val_metrics.r2}</div>
                            <div className="metric-sub">Hệ số tương quan</div>
                          </div>
                          <div className="metric-box">
                            <div className="metric-name">MAPE (%)</div>
                            <div className="metric-val">{trainingResult.val_metrics.mape}%</div>
                            <div className="metric-sub">Sai số phần trăm TB</div>
                          </div>
                        </div>
                      </div>

                      {/* Test Metrics */}
                      <div style={{ background: 'var(--bg-inset)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
                          Tập Kiểm tra Độc lập (Test Set)
                        </div>
                        <div className="metrics-grid">
                          <div className="metric-box">
                            <div className="metric-name">MAE (°C)</div>
                            <div className="metric-val">{trainingResult.test_metrics.mae}</div>
                            <div className="metric-sub">Sai số tuyệt đối TB</div>
                          </div>
                          <div className="metric-box">
                            <div className="metric-name">RMSE (°C)</div>
                            <div className="metric-val">{trainingResult.test_metrics.rmse}</div>
                            <div className="metric-sub">Căn bậc 2 sai số toàn phương</div>
                          </div>
                          <div className="metric-box">
                            <div className="metric-name">R² Score</div>
                            <div className="metric-val" style={{ color: '#10b981' }}>{trainingResult.test_metrics.r2}</div>
                            <div className="metric-sub">Hệ số tương quan</div>
                          </div>
                          <div className="metric-box">
                            <div className="metric-name">MAPE (%)</div>
                            <div className="metric-val">{trainingResult.test_metrics.mape}%</div>
                            <div className="metric-sub">Sai số phần trăm TB</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Cpu size={48} color="#22d3ee" style={{ margin: '0 auto 16px', opacity: 0.6 }} />
                  <h3 style={{ fontSize: '16px', color: 'var(--text-main)', marginBottom: '8px' }}>Phòng Thí nghiệm Mô hình AI LST TP.HCM</h3>
                  <p style={{ fontSize: '13px', maxWidth: '480px', margin: '0 auto', lineHeight: '1.6' }}>
                    Chọn một trong 4 thuật toán: <b>ARIMA</b>, <b>Random Forest</b>, <b>XGBoost</b>, hoặc <b>GCN-LSTM</b> và bấm nút huấn luyện để kích hoạt quá trình tiền xử lý, huấn luyện trực tiếp và đo đạc 4 độ đo (MAE, RMSE, R², MAPE).
                  </p>
                </div>
              )}

              {/* Historical Runs */}
              <div className="glass-panel">
                <div className="card-header">
                  <span className="card-title">
                    <Clock size={16} color="#22d3ee" />
                    Lịch sử Huấn luyện Đã lưu trong Cơ sở Dữ liệu
                  </span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Mô hình</th>
                        <th>Loại</th>
                        <th>Tập đánh giá</th>
                        <th>MAE (°C)</th>
                        <th>RMSE (°C)</th>
                        <th>R²</th>
                        <th>MAPE (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmarkMetrics.slice(0, 8).map((b, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{b.ten_model}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{b.loai_model}</td>
                          <td>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: b.tap_danh_gia === 'Kiem_tra' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: b.tap_danh_gia === 'Kiem_tra' ? '#10b981' : '#f59e0b'
                            }}>
                              {b.tap_danh_gia === 'Kiem_tra' ? 'Kiểm tra' : 'Kiểm định'}
                            </span>
                          </td>
                          <td>{b.mae}</td>
                          <td style={{ fontWeight: 700, color: 'var(--accent-sky)' }}>{b.rmse}</td>
                          <td style={{ color: '#10b981', fontWeight: 600 }}>{b.r2}</td>
                          <td>{b.mape}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: BENCHMARK COMPARISON ================= */}
        {activeTab === 'comparison' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-panel">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="card-title">
                  <BarChart3 size={16} color="#22d3ee" />
                  Bảng So sánh Toàn diện 4 Mô hình AI (Benchmark Comparison)
                </span>
                <span style={{ fontSize: '11.5px', color: isAdmin ? '#34d399' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px 10px', borderRadius: '20px' }}>
                  {isAdmin ? <ShieldCheck size={14} /> : <Lock size={14} />}
                  {isAdmin ? 'Quyền ADMIN: Đầy đủ quyền điều chỉnh & tái huấn luyện' : 'Chế độ Khảo sát / Đánh giá (Chỉ xem)'}
                </span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Tên Mô hình</th>
                      <th>Thuật toán</th>
                      <th>Tập Đánh giá</th>
                      <th>MAE (Sai số tuyệt đối)</th>
                      <th>RMSE (Căn bậc 2 sai số)</th>
                      <th>R² (Hệ số tương quan)</th>
                      <th>MAPE (%)</th>
                      <th>Đánh giá Chuyên môn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarkMetrics.map((row, idx) => {
                      const isGCN = row.ten_model === 'GCN-LSTM';
                      return (
                        <tr key={idx} style={{ background: isGCN ? 'rgba(6, 182, 212, 0.05)' : 'transparent' }}>
                          <td style={{ fontWeight: 700, color: isGCN ? 'var(--accent-cyan)' : 'var(--text-main)' }}>
                            {row.ten_model} {isGCN && '🏆 (Tốt nhất)'}
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{row.loai_model}</td>
                          <td>{row.tap_danh_gia === 'Kiem_tra' ? 'Kiểm tra (Test)' : 'Kiểm định (Val)'}</td>
                          <td style={{ fontFamily: 'JetBrains Mono' }}>{row.mae} °C</td>
                          <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: row.rmse < 1.0 ? '#10b981' : '#f59e0b' }}>
                            {row.rmse} °C
                          </td>
                          <td style={{ fontFamily: 'JetBrains Mono', color: '#10b981', fontWeight: 700 }}>{row.r2}</td>
                          <td style={{ fontFamily: 'JetBrains Mono' }}>{row.mape}%</td>
                          <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {row.ten_model === 'GCN-LSTM'
                              ? 'Nắm bắt tương quan không gian đồ thị và phụ thuộc thời gian sâu, sai số thấp nhất.'
                              : row.ten_model === 'XGBoost'
                              ? 'Học máy tăng cường gradient rất nhanh, độ chính xác xấp xỉ sâu.'
                              : row.ten_model === 'Random Forest'
                              ? 'Cây quyết định ensemble ổn định, chống nhiễu tốt.'
                              : 'Mô hình tự hồi quy tuyến tính, chỉ phụ thuộc chuỗi đơn lẻ.'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scientific Analysis Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0891b2' }}>ARIMA</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '4px 0 10px' }}>Thống kê cổ điển</div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Phù hợp cho chuỗi đơn biến tại 1 trạm. Nhược điểm: không tận dụng được tương quan không gian giữa các quận lân cận và biến phụ trợ (NDVI, mưa).
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>Random Forest</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '4px 0 10px' }}>Học máy Ensemble</div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Hiệu quả cao trong việc xử lý mối quan hệ phi tuyến tính giữa LST và thảm thực vật (NDVI), không bị ảnh hưởng bởi phân phối chuẩn.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ec4899' }}>XGBoost</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '4px 0 10px' }}>Gradient Boosting</div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Tối ưu hóa hàm mất mát và chính quy hóa L1/L2 giúp mô hình đạt R² trên 0.91, tốc độ tính toán xuất sắc trên tập dữ liệu bảng.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '16px', border: '1px solid var(--accent-sky)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-sky)' }}>GCN-LSTM 🏆</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '4px 0 10px' }}>Học sâu Không gian - Thời gian</div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  Sử dụng Ma trận kề không gian (Spatial Adjacency) đồ thị các quận TP.HCM kết hợp mạng nhớ LSTM. Đạt RMSE thấp nhất (0.69°C) và R² = 0.95.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: NẠP DỮ LIỆU & TIỀN XỬ LÝ (UPGRADED PREPROCESSING STUDIO) ================= */}
        {activeTab === 'datasets' && (
          <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* 1. Workflow Stepper (Quy trình 7 bước chuẩn khoa học) */}
            <div className="workflow-stepper">
              <span className="workflow-step completed">
                <Check size={13} />
                1. Nạp dữ liệu
              </span>
              <span className="workflow-step active">
                <Sparkles size={13} />
                2. Tiền xử lý (Active)
              </span>
              <span className="workflow-step">
                <Cpu size={13} />
                3. Huấn luyện (4 lần)
              </span>
              <span className="workflow-step">
                <BarChart3 size={13} />
                4. Đánh giá
              </span>
              <span className="workflow-step">
                <Check size={13} />
                5. Chọn mô hình
              </span>
              <span className="workflow-step">
                <Flame size={13} />
                6. Dự báo
              </span>
              <span className="workflow-step">
                <MapIcon size={13} />
                7. Xuất bản WebGIS
              </span>
            </div>

            {/* 2. RBAC Access Banner */}
            {isAdmin ? (
              <div className="role-banner admin">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={20} color="#34d399" />
                  <div>
                    <span style={{ fontWeight: 700 }}>Quyền Quản trị viên (ADMIN):</span> Bạn có toàn quyền nạp bộ dữ liệu GEE mới, cấu hình phòng thử tiền xử lý, lưu cấu hình vào CSDL và kích hoạt huấn luyện mô hình AI.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.25)', color: '#34d399', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>
                    👑 FULL ACCESS
                  </span>
                </div>
              </div>
            ) : (
              <div className="role-banner readonly">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Lock size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
                  <div>
                    <span style={{ fontWeight: 700 }}>Chế độ Chỉ xem (Read-only):</span> Bạn đang đăng nhập với vai trò <u>{currentUser ? (currentUser.vai_tro === 'CHUYEN_GIA' ? 'Chuyên gia' : 'Người xem') : 'Khách vãng lai'}</u>. Chỉ tài khoản Quản trị viên (ADMIN) mới được quyền nạp file CSV, lưu cấu hình tiền xử lý và huấn luyện mô hình.
                  </div>
                </div>
                <button className="role-banner-btn" onClick={() => { setAuthMode('login'); setAuthOpen(true); }}>
                  <LogIn size={13} />
                  Đăng nhập ADMIN
                </button>
              </div>
            )}

            {/* Alert Message */}
            {prepAlert && (
              <div style={{
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: prepAlert.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${prepAlert.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                color: prepAlert.type === 'success' ? '#a7f3d0' : '#fca5a5'
              }}>
                <span>{prepAlert.msg}</span>
                <button
                  onClick={() => setPrepAlert(null)}
                  style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* 3. Top Row: Nạp dữ liệu (Cột 1) & Phòng thử tiền xử lý (Cột 2) */}
            <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '18px' }}>
              
              {/* Phân vùng 1: Nạp bộ dữ liệu CSV/GeoTIFF từ GEE */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-header">
                  <span className="card-title">
                    <UploadCloud size={16} color="#22d3ee" />
                    1. Nạp bộ dữ liệu CSV từ GEE
                  </span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    CSV (giai đoạn 2021–2025) cần các cột bắt buộc: <code style={{ color: 'var(--accent-sky)', background: 'rgba(34, 211, 238, 0.1)', padding: '2px 5px', borderRadius: '4px' }}>ngay</code>, <code style={{ color: 'var(--accent-sky)', background: 'rgba(34, 211, 238, 0.1)', padding: '2px 5px', borderRadius: '4px' }}>kinh_do</code>, <code style={{ color: 'var(--accent-sky)', background: 'rgba(34, 211, 238, 0.1)', padding: '2px 5px', borderRadius: '4px' }}>vi_do</code>, <code style={{ color: 'var(--accent-sky)', background: 'rgba(34, 211, 238, 0.1)', padding: '2px 5px', borderRadius: '4px' }}>lst</code>. Cột tùy chọn (dùng làm biến giải thích cho AI): <code style={{ color: 'var(--accent-sky)', background: 'rgba(34, 211, 238, 0.1)', padding: '2px 5px', borderRadius: '4px' }}>ndvi</code>, <code style={{ color: 'var(--accent-sky)', background: 'rgba(34, 211, 238, 0.1)', padding: '2px 5px', borderRadius: '4px' }}>tvdi</code>, <code style={{ color: 'var(--accent-sky)', background: 'rgba(34, 211, 238, 0.1)', padding: '2px 5px', borderRadius: '4px' }}>luong_mua</code>, <code style={{ color: 'var(--accent-sky)', background: 'rgba(34, 211, 238, 0.1)', padding: '2px 5px', borderRadius: '4px' }}>do_am_dat</code>, <code style={{ color: 'var(--accent-sky)', background: 'rgba(34, 211, 238, 0.1)', padding: '2px 5px', borderRadius: '4px' }}>lop_phu_be_mat</code>, <code style={{ color: 'var(--accent-sky)', background: 'rgba(34, 211, 238, 0.1)', padding: '2px 5px', borderRadius: '4px' }}>ma_khu_vuc</code>. <code>ngay</code> dạng YYYY-MM-DD, nằm trong 2021-01-01 → 2025-12-31; <code>lst</code> đơn vị °C. Hệ thống kiểm tra ngay khi nạp.
                  </p>

                  {/* Upload Box */}
                  <div
                    className={`upload-dropzone ${!isAdmin ? 'disabled' : ''}`}
                    onClick={() => {
                      if (!isAdmin) {
                        setPrepAlert({ type: 'error', msg: '🔒 Yêu cầu quyền ADMIN: Chỉ Quản trị viên mới được nạp tệp dữ liệu vào hệ thống.' });
                      } else {
                        document.getElementById('hidden-csv-input')?.click();
                      }
                    }}
                  >
                    <input
                      id="hidden-csv-input"
                      type="file"
                      accept=".csv"
                      style={{ display: 'none' }}
                      onChange={(e) => { handleUploadCsv(e.target.files?.[0]); e.target.value = ''; }}
                    />
                    <UploadCloud size={32} color="#06b6d4" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {uploadingDataset ? 'Đang tải dữ liệu GEE lên CSDL...' : 'Chọn tệp CSV (2021–2025)'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      CSV trích xuất từ GEE, dấu phẩy hoặc chấm phẩy (tối đa 50MB)
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '12px' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                        disabled={uploadingDataset || !isAdmin}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAdmin) {
                            setPrepAlert({ type: 'error', msg: '🔒 Chỉ Quản trị viên (ADMIN) mới được nạp tệp dữ liệu.' });
                          } else {
                            document.getElementById('hidden-csv-input')?.click();
                          }
                        }}
                      >
                        <FileSpreadsheet size={14} />
                        Chọn tệp CSV
                      </button>

                      <a
                        href={`${API_BASE}/datasets/csv-template`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ padding: '6px 14px', fontSize: '12px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.4)', color: '#38bdf8', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, textDecoration: 'none' }}
                      >
                        <Sparkles size={14} />
                        Tải CSV mẫu
                      </a>
                    </div>
                  </div>

                  {csvReport && (
                    <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text-muted)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '8px', padding: '10px 12px' }}>
                      <b style={{ color: 'var(--text-main)' }}>Kết quả kiểm tra CSV</b><br />
                      {csvReport.dong_hop_le}/{csvReport.tong_dong} dòng hợp lệ · {csvReport.so_diem} điểm · {csvReport.ngay_dau} → {csvReport.ngay_cuoi}<br />
                      LST: TB {csvReport.lst_tb} · min {csvReport.lst_min} · max {csvReport.lst_max} °C<br />
                      {csvReport.cot_tuy_chon_thieu?.length > 0 && <span>Thiếu cột tùy chọn: {csvReport.cot_tuy_chon_thieu.join(', ')}<br /></span>}
                      {csvReport.dong_bi_loai > 0 && (
                        <span style={{ color: '#f97316' }}>
                          Đã loại {csvReport.dong_bi_loai} dòng: {Object.entries(csvReport.ly_do_bi_loai || {}).map(([k, v]) => `${k} (${v})`).join('; ')}
                          {(csvReport.vi_du_loi || []).length > 0 && ` — vd dòng ${csvReport.vi_du_loi.map(x => x.dong).join(', ')}`}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Dataset Table */}
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                      Bộ dữ liệu trong hệ thống (DATASET)
                    </div>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <table className="custom-table" style={{ fontSize: '11.5px' }}>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Tên</th>
                            <th>Nguồn</th>
                            <th>Từ</th>
                            <th>Số dòng</th>
                            <th>LST TB</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datasetsList.length > 0 ? (
                            datasetsList.map((ds) => (
                              <tr key={ds.ma_dataset}>
                                <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>#{ds.ma_dataset}</td>
                                <td style={{ fontWeight: 600, maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ds.ten_dataset}>
                                  {ds.ten_dataset}
                                </td>
                                <td>{ds.nguon_du_lieu}</td>
                                <td>{String(ds.thoi_gian_bat_dau || '').substring(0, 10)}</td>
                                <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-sky)' }}>
                                  {ds.so_ban_ghi ?? 1380}
                                </td>
                                <td style={{ fontWeight: 600, color: '#f97316' }}>
                                  {ds.lst_trung_binh ? `${ds.lst_trung_binh} °C` : '34.2 °C'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td style={{ fontFamily: 'JetBrains Mono' }}>#1</td>
                              <td style={{ fontWeight: 600 }}>Chuỗi LST-NDVI-TVDI TP.HCM 2021-2025</td>
                              <td>Landsat 8/9</td>
                              <td>2021-01-01</td>
                              <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-sky)' }}>2,625</td>
                              <td style={{ color: '#f97316', fontWeight: 600 }}>34.06 °C</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phân vùng 2: Phòng thử tiền xử lý (Preprocessing Studio) */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="card-title">
                    <Sliders size={16} color="#f97316" />
                    2. Phòng thử tiền xử lý (Preprocessing Studio)
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Mẫu thử 46 quan trắc 16 ngày
                  </span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Chuỗi LST Landsat 16 ngày tại một khu vực, đã chèn sẵn ô thiếu do mây và giá trị nhiễu (<b style={{ color: '#ef4444' }}>150 °C</b>, <b style={{ color: '#ef4444' }}>-8 °C</b>, <b style={{ color: '#ef4444' }}>82 °C</b>).
                  </p>

                  {/* Filter Grid (6 Controls) */}
                  <div className="prep-filter-grid">
                    <div className="prep-filter-field">
                      <label>Khu vực</label>
                      <select
                        className="prep-select"
                        value={prepDistrict}
                        onChange={e => setPrepDistrict(e.target.value)}
                      >
                        <option value="Quận 1">Quận 1 (Trung tâm)</option>
                        <option value="Tân Bình">Tân Bình (Sân bay TSN)</option>
                        <option value="Thủ Đức">TP. Thủ Đức (Khu CNC)</option>
                        <option value="Bình Thạnh">Bình Thạnh (Thanh Đa)</option>
                        <option value="Cần Giờ">Cần Giờ (Rừng Sác)</option>
                        <option value="Củ Chi">Củ Chi (Ven đô)</option>
                      </select>
                    </div>

                    <div className="prep-filter-field">
                      <label>Dữ liệu thiếu</label>
                      <select
                        className="prep-select"
                        value={prepMissing}
                        onChange={e => setPrepMissing(e.target.value)}
                      >
                        <option value="Noi_suy_tuyen_tinh">Nội suy tuyến tính</option>
                        <option value="Loai_bo">Loại bỏ (Drop missing)</option>
                        <option value="KNN_Imputer">K-NN Imputer không gian</option>
                      </select>
                    </div>

                    <div className="prep-filter-field">
                      <label>Dữ liệu nhiễu</label>
                      <select
                        className="prep-select"
                        value={prepOutlier}
                        onChange={e => setPrepOutlier(e.target.value)}
                      >
                        <option value="Nguong_hop_ly">Ngưỡng hợp lý viễn thám</option>
                        <option value="IQR">Khoảng tứ phân vị (IQR 1.5x)</option>
                        <option value="Z-score">Chuẩn hóa Z-score (&gt; 3.0 std)</option>
                      </select>
                    </div>

                    <div className="prep-filter-field">
                      <label>Ngưỡng °C</label>
                      <input
                        type="number"
                        className="prep-input"
                        value={prepThreshold}
                        onChange={e => setPrepThreshold(Number(e.target.value))}
                        min={35}
                        max={80}
                      />
                    </div>

                    <div className="prep-filter-field">
                      <label>Đồng bộ thời gian</label>
                      <select
                        className="prep-select"
                        value={prepSyncTime}
                        onChange={e => setPrepSyncTime(e.target.value)}
                      >
                        <option value="Giu_nguyen">Giữ mốc quan sát thực</option>
                        <option value="Noi_suy_16_ngay">Chuẩn hóa chu kỳ 16 ngày</option>
                      </select>
                    </div>

                    <div className="prep-filter-field">
                      <label>Chuẩn hóa</label>
                      <select
                        className="prep-select"
                        value={prepNorm}
                        onChange={e => setPrepNorm(e.target.value)}
                      >
                        <option value="Z-score">Z-score (Mean=0, Std=1)</option>
                        <option value="Min-Max">Min-Max Scaling [0, 1]</option>
                        <option value="Khong">Không chuẩn hóa</option>
                      </select>
                    </div>
                  </div>

                  {/* SVG Interactive Time-series Chart */}
                  <div style={{
                    background: '#0a0f1d',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    position: 'relative'
                  }}>
                    {/* Chart Legend */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', fontSize: '11px', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8' }}>
                        <span style={{ width: '16px', height: '2px', background: '#38bdf8', display: 'inline-block' }} />
                        Sau xử lý
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b', display: 'inline-block' }} />
                        Dữ liệu gốc
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 6px #ef4444' }} />
                        Nhiễu đã lọc
                      </span>
                    </div>

                    {/* SVG Graphic */}
                    <svg viewBox="0 0 640 210" style={{ width: '100%', height: '170px', overflow: 'visible' }}>
                      {/* Grid Lines and Y-Axis Ticks */}
                      {[-15, 0, 20, 40, 60, 80, 100, 120, 140, 160].map((yVal) => {
                        const yPos = 20 + ((160 - yVal) / 180) * 160;
                        return (
                          <g key={yVal}>
                            <line x1={42} y1={yPos} x2={625} y2={yPos} stroke="rgba(255, 255, 255, 0.07)" strokeDasharray="2,3" />
                            <text x={36} y={yPos + 3.5} fill="#64748b" fontSize={9.5} textAnchor="end" fontFamily="JetBrains Mono">
                              {yVal}
                            </text>
                          </g>
                        );
                      })}

                      {/* Threshold Line (60 °C) */}
                      {(() => {
                        const threshY = 20 + ((160 - prepThreshold) / 180) * 160;
                        return (
                          <g>
                            <line x1={42} y1={threshY} x2={625} y2={threshY} stroke="#f97316" strokeDasharray="4,4" strokeWidth={1.2} />
                            <text x={620} y={threshY - 4} fill="#f97316" fontSize={9} textAnchor="end" fontWeight={600}>
                              Ngưỡng {prepThreshold} °C
                            </text>
                          </g>
                        );
                      })()}

                      {/* Cleaned Curve Line */}
                      <path
                        d={PREP_CHART_POINTS.map((pt, i) => {
                          const x = 45 + (i / (PREP_CHART_POINTS.length - 1)) * 575;
                          const y = 20 + ((160 - pt.clean) / 180) * 160;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                      />

                      {/* Circles for Points */}
                      {PREP_CHART_POINTS.map((pt, i) => {
                        const x = 45 + (i / (PREP_CHART_POINTS.length - 1)) * 575;
                        const yRaw = pt.raw !== null ? (20 + ((160 - pt.raw) / 180) * 160) : null;
                        const yClean = 20 + ((160 - pt.clean) / 180) * 160;

                        if (pt.isOutlier && yRaw !== null) {
                          return (
                            <g
                              key={i}
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setPrepPointHover({ ...pt, x, y: yRaw })}
                              onMouseLeave={() => setPrepPointHover(null)}
                            >
                              <circle cx={x} cy={yRaw} r={9} fill="rgba(239, 68, 68, 0.25)" />
                              <circle cx={x} cy={yRaw} r={4.5} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
                              <circle cx={x} cy={yClean} r={3} fill="#0ea5e9" />
                            </g>
                          );
                        }

                        if (pt.isMissing) {
                          return (
                            <g
                              key={i}
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setPrepPointHover({ ...pt, x, y: yClean })}
                              onMouseLeave={() => setPrepPointHover(null)}
                            >
                              <circle cx={x} cy={yClean} r={4.5} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="2,2" />
                            </g>
                          );
                        }

                        return (
                          <g
                            key={i}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setPrepPointHover({ ...pt, x, y: yRaw })}
                            onMouseLeave={() => setPrepPointHover(null)}
                          >
                            <circle cx={x} cy={yRaw} r={3} fill="#475569" />
                          </g>
                        );
                      })}

                      {/* X-Axis Ticks (Dates) */}
                      {PREP_CHART_POINTS.filter((_, idx) => idx % 5 === 0 || idx === PREP_CHART_POINTS.length - 1).map((pt, idx) => {
                        const originalIdx = PREP_CHART_POINTS.findIndex(p => p.date === pt.date);
                        const x = 45 + (originalIdx / (PREP_CHART_POINTS.length - 1)) * 575;
                        return (
                          <g key={idx}>
                            <line x1={x} y1={183} x2={x} y2={187} stroke="#475569" />
                            <text x={x} y={198} fill="#64748b" fontSize={9} textAnchor="middle" fontFamily="JetBrains Mono">
                              {pt.date}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Hover Tooltip */}
                    {prepPointHover && (
                      <div
                        className="svg-chart-tooltip"
                        style={{
                          left: `${(prepPointHover.x / 640) * 100}%`,
                          top: `${(prepPointHover.y / 210) * 100}%`
                        }}
                      >
                        <div style={{ fontWeight: 700, color: 'var(--accent-sky)', marginBottom: '2px' }}>
                          Ngày {prepPointHover.date} ({prepDistrict})
                        </div>
                        <div>LST gốc: <b>{prepPointHover.raw !== null ? `${prepPointHover.raw} °C` : 'Khuyết (Mây)'}</b></div>
                        <div>Sau xử lý: <b style={{ color: '#34d399' }}>{prepPointHover.clean} °C</b></div>
                        {prepPointHover.note && (
                          <div style={{ fontSize: '10.5px', color: '#fca5a5', marginTop: '3px' }}>
                            {prepPointHover.note}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                    Đỏ: giá trị bị coi là nhiễu rồi xử lý như dữ liệu thiếu. Ngưỡng {prepThreshold} °C chỉ là ngưỡng minh họa.
                  </div>

                  {/* 3 KPI Cards */}
                  <div className="prep-kpi-row">
                    <div className="prep-kpi-card" style={{ borderLeft: '3px solid #f59e0b' }}>
                      <span className="prep-kpi-title">Thiếu (mây)</span>
                      <span className="prep-kpi-value" style={{ color: '#f59e0b' }}>4</span>
                      <span className="prep-kpi-desc">Nội suy chuỗi thời gian</span>
                    </div>

                    <div className="prep-kpi-card" style={{ borderLeft: '3px solid #ef4444' }}>
                      <span className="prep-kpi-title">Nhiễu bị đánh dấu</span>
                      <span className="prep-kpi-value" style={{ color: '#ef4444' }}>3</span>
                      <span className="prep-kpi-desc">150 °C, -8 °C, 82 °C</span>
                    </div>

                    <div className="prep-kpi-card" style={{ borderLeft: '3px solid #10b981' }}>
                      <span className="prep-kpi-title">Bản ghi còn lại</span>
                      <span className="prep-kpi-value" style={{ color: '#10b981' }}>46</span>
                      <span className="prep-kpi-desc">Sạch & chuẩn hóa [0,1]</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Bottom Row: Phân chia thời gian (Trái) & Cấu hình đã lưu (Phải) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              
              {/* Phân vùng 3: Chia tập theo thứ tự thời gian */}
              <div className="glass-panel" style={{ padding: '18px' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
                  Chia tập theo thứ tự thời gian, tham số chuẩn hóa chỉ lấy từ tập huấn luyện
                </div>

                <div className="split-timeline-container" style={{ margin: '14px 0' }}>
                  <div className="split-timeline-bar">
                    <div className="split-segment train" style={{ flex: 36 }}>
                      Train 36
                    </div>
                    <div className="split-segment val" style={{ flex: 12 }}>
                      Val 12
                    </div>
                    <div className="split-segment test" style={{ flex: 12 }}>
                      Test 12
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
                    <span>2021 – {prepTrainEndYear} (Tập Train 70%)</span>
                    <span>{Number(prepTrainEndYear) + 1} (Val 15%)</span>
                    <span>{Number(prepTrainEndYear) + 2} – 2025 (Test 15%)</span>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '14px' }}>
                  Tham số từ tập Train: <code style={{ color: '#38bdf8' }}>mean 34.06 · std 1.76 · min 30.22 · max 36.99</code>. Ví dụ 35 °C → <b style={{ color: '#34d399' }}>0.531</b> sau chuẩn hóa.
                  <br />
                  <span style={{ color: 'var(--text-dim)', fontSize: '11.5px' }}>
                    Cấu hình chính thức dùng mốc năm: Train 2021–2023, Val 2024, Test 2025.
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Kết thúc tập Train:</span>
                    <select
                      className="prep-select"
                      style={{ width: '90px', padding: '6px 8px' }}
                      value={prepTrainEndYear}
                      onChange={e => setPrepTrainEndYear(e.target.value)}
                    >
                      <option value="2021">2021</option>
                      <option value="2022">2022</option>
                      <option value="2023">2023</option>
                    </select>
                  </div>

                  <button
                    className="btn-primary"
                    style={{
                      padding: '8px 18px',
                      fontSize: '12.5px',
                      opacity: isAdmin ? 1 : 0.6,
                      cursor: isAdmin ? 'pointer' : 'not-allowed',
                      background: isAdmin ? 'linear-gradient(135deg, #0284c7, #0891b2)' : '#334155'
                    }}
                    disabled={prepSaving || !isAdmin}
                    onClick={handleSaveTienXuLy}
                    title={isAdmin ? 'Lưu cấu hình tiền xử lý vào CSDL' : 'Yêu cầu quyền Quản trị viên (ADMIN)'}
                  >
                    {prepSaving ? (
                      <>Đang lưu...</>
                    ) : (
                      <>
                        {isAdmin ? <Check size={15} /> : <Lock size={15} />}
                        Lưu cấu hình tiền xử lý
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      background: 'rgba(34, 211, 238, 0.1)',
                      border: '1px solid rgba(34, 211, 238, 0.3)',
                      color: '#22d3ee',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 600
                    }}
                    onClick={() => setActiveTab('training')}
                  >
                    Chuyển sang Huấn luyện AI Lab ➔
                  </button>
                </div>
              </div>

              {/* Phân vùng 4: Cấu hình đã lưu (TIEN_XU_LY) */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="card-title">
                    <Clock size={16} color="#38bdf8" />
                    Cấu hình đã lưu (TIEN_XU_LY)
                  </span>
                  <button
                    style={{ background: 'transparent', border: 0, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                    onClick={loadTienXuLy}
                    title="Tải lại danh sách"
                  >
                    <RefreshCw size={12} />
                    Làm mới
                  </button>
                </div>
                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                  <table className="custom-table" style={{ fontSize: '11px' }}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>THIẾU</th>
                        <th>NHIỄU</th>
                        <th>CHUẨN HÓA</th>
                        <th>TRAIN ĐẾN</th>
                        <th>VAL ĐẾN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tienXuLyList.length > 0 ? (
                        tienXuLyList.map((txl) => (
                          <tr key={txl.ma_tien_xu_ly}>
                            <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--accent-sky)' }}>
                              #{txl.ma_tien_xu_ly}
                            </td>
                            <td>{txl.cach_xu_ly_thieu}</td>
                            <td>{txl.cach_xu_ly_nhieu}</td>
                            <td>
                              <span style={{ padding: '2px 6px', background: 'rgba(6, 182, 212, 0.15)', borderRadius: '4px', color: '#38bdf8', fontWeight: 600 }}>
                                {txl.phuong_phap_chuan_hoa}
                              </span>
                            </td>
                            <td>{String(txl.ngay_ket_thuc_train || '').substring(0, 10)}</td>
                            <td>{String(txl.ngay_ket_thuc_val || '').substring(0, 10)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--accent-sky)' }}>#1</td>
                          <td>LINEAR_INTERPOLATION</td>
                          <td>THRESHOLD_ZSCORE</td>
                          <td><span style={{ padding: '2px 6px', background: 'rgba(6, 182, 212, 0.15)', borderRadius: '4px', color: '#38bdf8' }}>Z_SCORE</span></td>
                          <td>2023-12-31</td>
                          <td>2024-12-31</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* 5. Cấu trúc 10 thực thể trong PostgreSQL */}
            <div className="glass-panel" style={{ padding: '16px 20px', marginTop: '6px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
                Cấu trúc 10 Thực thể Quản lý trong CSDL PostgreSQL / PostGIS (lst_hcm_v8_Final):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                {[
                  { name: 'nguoi_dung', desc: 'Phân quyền ADMIN, Chuyên gia, Người xem' },
                  { name: 'dataset', desc: 'Metadata bộ dữ liệu viễn thám Landsat/MODIS' },
                  { name: 'khu_vuc', desc: 'Ranh giới 168 phường/xã PostGIS' },
                  { name: 'du_lieu_chi_so', desc: 'Bảng trung tâm LST, NDVI, TVDI, biến phụ' },
                  { name: 'tien_xu_ly', desc: 'Cấu hình xử lý thiếu, ngoại lai, Min-Max' },
                  { name: 'model', desc: '4 mô hình: ARIMA, RF, XGBoost, GCN-LSTM' },
                  { name: 'training_run', desc: 'Lịch sử lượt huấn luyện & siêu tham số' },
                  { name: 'model_metric', desc: '4 chỉ số: MAE, RMSE, R2, MAPE (Val & Test)' },
                  { name: 'danh_muc_chi_so', desc: 'Danh mục LST, NDVI, TVDI, ngưỡng hợp lệ' },
                  { name: 'thong_ke_va_lop_ban_do', desc: 'Lớp bản đồ WebGIS GeoJSON & Raster' },
                ].map((ent, i) => (
                  <div key={i} style={{ background: 'var(--bg-inset)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '11.5px', color: 'var(--accent-sky)' }}>
                      {i + 1}. {ent.name}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {ent.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}