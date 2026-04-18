import React, { useState, useEffect, useRef } from 'react';
import { Map, Camera, Backpack, Swords, Crosshair, Droplets, MapPin, Trophy, Shield, Zap, Search } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';

// --- Firebase Configuration ---
// 這裡已經換成你的專屬 Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyB4d2roiEbHKXp7kBcDUe6wgxI1G1Lh0HM",
  authDomain: "doggame-dfaa9.firebaseapp.com",
  projectId: "doggame-dfaa9",
  storageBucket: "doggame-dfaa9.firebasestorage.app",
  messagingSenderId: "1052000665342",
  appId: "1:1052000665342:web:9baabaea9bbf0b8769afaf",
  measurementId: "G-EDRM7SG7H4"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'doggo-turf-war';

// --- Constants & Mock Data ---
// 預設經緯度 (屏東內埔)
const DEFAULT_LAT = 22.611;
const DEFAULT_LNG = 120.565;
const FACTIONS = {
  owner: { name: '主人幫', color: 'bg-blue-500', text: 'text-blue-500', icon: '🐕' },
  stray: { name: '流浪狗幫', color: 'bg-orange-500', text: 'text-orange-500', icon: '🐺' }
};

// --- Helper Functions ---
// 計算經緯度距離 (公尺)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// 隨機生成附近座標
const generateRandomOffset = (baseLat, baseLng, radiusInMeters = 200) => {
  const radiusInDegrees = radiusInMeters / 111320;
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t) / Math.cos(baseLat * Math.PI/180);
  const y = w * Math.sin(t);
  return { lat: baseLat + y, lng: baseLng + x };
};

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // 初始化 Firebase Auth
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (!profile) loadProfile(currentUser.uid);
      } else {
        setLoading(false); // 未登入，解除載入狀態顯示登入畫面
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Google 登入失敗:", err);
      setAuthError(err.message);
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      await signInAnonymously(auth);
    } catch (err) {
      console.error("匿名登入失敗:", err);
      setAuthError(err.message);
      setLoading(false);
    }
  };

  const loadProfile = async (uid) => {
    if (!db) return;
    try {
      const profileRef = doc(db, 'artifacts', appId, 'users', uid, 'userData', 'profile');
      const docSnap = await getDoc(profileRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
        setProfile(null); // 需要選擇陣營
      }
    } catch (err) {
      console.error("載入 Profile 失敗", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFaction = async (factionKey) => {
    if (!user || !db) return;
    const newProfile = {
      faction: factionKey,
      level: 1,
      xp: 0,
      power: 100,
      inventory: [],
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'profile'), newProfile);
    setProfile(newProfile);
  };

  if (!app) return <div className="p-8 text-center bg-gray-900 text-white h-screen flex justify-center items-center">正在初始化環境...請稍候。</div>;

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white font-bold text-xl animate-pulse">載入中...</div>;

  // 尚未登入時顯示登入畫面
  if (!user) {
    return (
      <div className="flex flex-col h-screen bg-gray-900 text-white items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-bold mb-8 text-yellow-400">汪星人佔領計畫</h1>
        <p className="mb-8 text-gray-300">請登入以保留您的遊戲進度</p>
        
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white text-gray-900 font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            使用 Google 登入
          </button>

          <button 
            onClick={handleAnonymousLogin}
            className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-full hover:bg-gray-600 transition-colors"
          >
            訪客登入 (不保留進度)
          </button>
        </div>

        {authError && (
          <div className="mt-6 bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-xl text-sm text-left max-w-xs">
            <p className="font-bold mb-1">登入發生錯誤：</p>
            <p className="break-all">{authError}</p>
            <p className="mt-2 text-xs text-red-300">請確保 Firebase Console 中已啟用對應的登入方法，或網域已加入白名單。</p>
          </div>
        )}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col h-screen bg-gray-900 text-white items-center justify-center p-6">
        <h1 className="text-4xl font-bold mb-8 text-yellow-400">汪星人佔領計畫</h1>
        <p className="mb-8 text-gray-300 text-center">歡迎來到狗狗的地盤大戰！<br/>請選擇你的陣營來開始遊戲。</p>
        
        <div className="flex gap-6 w-full max-w-md">
          <button 
            onClick={() => handleSelectFaction('owner')}
            className="flex-1 bg-blue-600 hover:bg-blue-500 p-6 rounded-2xl flex flex-col items-center transition-transform hover:scale-105"
          >
            <span className="text-5xl mb-4">🐕</span>
            <h2 className="text-xl font-bold">主人幫</h2>
            <p className="text-sm text-blue-200 mt-2 text-center">伙食好，裝備精良，保衛家園！</p>
          </button>
          
          <button 
            onClick={() => handleSelectFaction('stray')}
            className="flex-1 bg-orange-600 hover:bg-orange-500 p-6 rounded-2xl flex flex-col items-center transition-transform hover:scale-105"
          >
            <span className="text-5xl mb-4">🐺</span>
            <h2 className="text-xl font-bold">流浪狗幫</h2>
            <p className="text-sm text-orange-200 mt-2 text-center">自由自在，戰鬥經驗豐富，佔領街頭！</p>
          </button>
        </div>
      </div>
    );
  }

  return <GameCore user={user} profile={profile} setProfile={setProfile} />;
}

// ==========================================
// 遊戲核心邏輯與 UI
// ==========================================
function GameCore({ user, profile, setProfile }) {
  const [activeTab, setActiveTab] = useState('map');
  const [location, setLocation] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [landmarks, setLandmarks] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  
  // 取得 GPS 位置
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("GPS error, using default", err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // 監聽公開地標資料 (Firestore)
  useEffect(() => {
    if (!user || !db) return;
    const landmarksRef = collection(db, 'artifacts', appId, 'public', 'data', 'landmarks');
    
    const unsubscribe = onSnapshot(landmarksRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 如果沒有地標，幫忙生成幾個假資料 (僅供原型測試)
      if (data.length === 0) {
        seedInitialLandmarks(location.lat, location.lng);
      } else {
        setLandmarks(data);
      }
    }, (error) => {
      console.error("Fetch landmarks error:", error);
    });

    // 模擬隨機掉落物品 (存在記憶體中，因為 Firestore 不建議快速建立大量短暫文件，正式版應由 Backend 處理)
    const mockItems = Array.from({length: 5}).map((_, i) => ({
      id: `item_${i}`,
      type: ['bone', 'meat', 'herb', 'shoe'][Math.floor(Math.random()*4)],
      ...generateRandomOffset(location.lat, location.lng, 150)
    }));
    setItems(mockItems);

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location.lat, location.lng]);

  const seedInitialLandmarks = async (lat, lng) => {
    if (!db) return;
    const names = ['公園大樹', '消防栓', '電線桿', '廢棄輪胎', '超商門口'];
    for (let i = 0; i < 5; i++) {
      const coords = generateRandomOffset(lat, lng, 300);
      const newLandmark = {
        name: names[i],
        lat: coords.lat,
        lng: coords.lng,
        ownerFaction: null,
        ownerId: null,
        ownerName: null,
        captureCount: 0
      };
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'landmarks', `lm_${i}`), newLandmark);
      } catch(e) {
        console.error("無法建立地標:", e);
      }
    }
  };

  const handleCapture = async (target) => {
    if (!user || !db) return;
    
    try {
      // 更新地標
      const lmRef = doc(db, 'artifacts', appId, 'public', 'data', 'landmarks', target.id);
      await updateDoc(lmRef, {
        ownerFaction: profile.faction,
        ownerId: user.uid,
        ownerName: `${FACTIONS[profile.faction].name}勇士`,
        captureCount: (target.captureCount || 0) + 1
      });

      // 增加玩家經驗與戰力
      const newXp = profile.xp + 50;
      let newLevel = profile.level;
      let newPower = profile.power + 10;
      
      if (newXp >= newLevel * 100) {
        newLevel += 1;
        newPower += 50; // 升級大加成
      }

      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'profile');
      const updatedProfile = { ...profile, xp: newXp, level: newLevel, power: newPower };
      await updateDoc(profileRef, { xp: newXp, level: newLevel, power: newPower });
      setProfile(updatedProfile);
    } catch(err) {
      console.error("佔領更新失敗:", err);
      alert("佔領更新失敗，請檢查 Firestore 權限設定！");
    }
    
    setSelectedTarget(null);
    setActiveTab('map');
  };

  const pickUpItem = async (item) => {
    // 簡單的本機物品拾取
    const updatedItems = items.filter(i => i.id !== item.id);
    setItems(updatedItems);

    try {
      const newInventory = [...(profile.inventory || []), { ...item, collectedAt: Date.now() }];
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'profile');
      await updateDoc(profileRef, { inventory: newInventory, power: profile.power + 5 });
      
      setProfile(prev => ({ ...prev, inventory: newInventory, power: prev.power + 5 }));
    } catch(err) {
      console.error("拾取更新失敗:", err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white font-sans overflow-hidden">
      {/* Header */}
      <div className={`p-4 ${FACTIONS[profile.faction].color} flex justify-between items-center shadow-lg z-10`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{FACTIONS[profile.faction].icon}</span>
          <div>
            <h1 className="font-bold">{FACTIONS[profile.faction].name}</h1>
            <div className="text-xs font-medium bg-black/20 px-2 py-0.5 rounded-full inline-block">
              Lv.{profile.level} | 戰力: {profile.power}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-80">經驗值</div>
          <div className="w-24 h-2 bg-black/30 rounded-full mt-1 overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-500" 
              style={{ width: `${(profile.xp % (profile.level * 100)) / (profile.level * 100) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'map' && (
          <MapScreen 
            location={location} 
            landmarks={landmarks} 
            items={items}
            profile={profile}
            onSelectTarget={(target) => {
              setSelectedTarget(target);
              setActiveTab('ar');
            }}
            onPickUpItem={pickUpItem}
          />
        )}
        {activeTab === 'ar' && (
          <ARScreen 
            target={selectedTarget} 
            onCapture={handleCapture}
            onCancel={() => {
              setSelectedTarget(null);
              setActiveTab('map');
            }}
          />
        )}
        {activeTab === 'backpack' && <BackpackScreen profile={profile} />}
        {activeTab === 'arena' && <ArenaScreen profile={profile} />}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-gray-900 border-t border-gray-800 flex justify-around p-2 pb-safe z-10">
        <NavButton icon={<Map />} label="地圖" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
        <NavButton icon={<Camera />} label="AR佔領" active={activeTab === 'ar'} onClick={() => setActiveTab('ar')} />
        <NavButton icon={<Backpack />} label="背包" active={activeTab === 'backpack'} onClick={() => setActiveTab('backpack')} />
        <NavButton icon={<Swords />} label="競技場" active={activeTab === 'arena'} onClick={() => setActiveTab('arena')} />
      </div>
    </div>
  );
}

// ==========================================
// 地圖雷達畫面
// ==========================================
function MapScreen({ location, landmarks, items, profile, onSelectTarget, onPickUpItem }) {
  const METERS_PER_DEGREE = 111320;

  const calculatePosition = (targetLat, targetLng) => {
    const dy = (targetLat - location.lat) * METERS_PER_DEGREE;
    const dx = (targetLng - location.lng) * METERS_PER_DEGREE * Math.cos(location.lat * Math.PI/180);
    // 將公尺轉換為百分比 (假設雷達寬度 = 600 公尺)
    const percentY = 50 - (dy / 600) * 100;
    const percentX = 50 + (dx / 600) * 100;
    return { top: `${percentY}%`, left: `${percentX}%` };
  };

  return (
    <div className="relative w-full h-full bg-slate-800 overflow-hidden flex items-center justify-center">
      {/* 雷達底圖 */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at center, #10b981 1px, transparent 1px), radial-gradient(circle at center, #10b981 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: '0 0, 20px 20px' }}>
      </div>
      
      {/* 雷達掃描動畫 */}
      <div className="absolute w-full h-full rounded-full border-4 border-emerald-500/20 animate-ping" style={{ maxWidth: '400px', maxHeight: '400px' }}></div>
      <div className="absolute w-[800px] h-[800px] bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full animate-spin pointer-events-none" style={{ animationDuration: '4s' }}></div>

      {/* 中心點 (玩家) */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] flex items-center justify-center text-lg z-10 ${FACTIONS[profile.faction].color}`}>
          {FACTIONS[profile.faction].icon}
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-full absolute animate-pulse"></div>
      </div>

      {/* 地標 */}
      {landmarks.map(lm => {
        const pos = calculatePosition(lm.lat, lm.lng);
        const dist = getDistance(location.lat, location.lng, lm.lat, lm.lng);
        const isCapturable = dist < 50; // 50公尺內可佔領
        const isMine = lm.ownerFaction === profile.faction;

        return (
          <div key={lm.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10" style={pos}>
            <button 
              onClick={() => isCapturable ? onSelectTarget(lm) : alert(`距離太遠！還差 ${Math.round(dist - 50)} 公尺`)}
              className={`group flex flex-col items-center transition-transform ${isCapturable ? 'hover:scale-125' : 'opacity-70'}`}
            >
              <div className="relative">
                <MapPin className={`w-10 h-10 ${lm.ownerFaction ? FACTIONS[lm.ownerFaction].text : 'text-gray-400'} drop-shadow-lg`} fill="currentColor" />
                {isCapturable && !isMine && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-bounce"></div>}
              </div>
              <span className="text-[10px] font-bold bg-black/60 px-2 py-1 rounded whitespace-nowrap mt-1">
                {lm.name} ({Math.round(dist)}m)
              </span>
            </button>
          </div>
        );
      })}

      {/* 物品 */}
      {items.map(item => {
        const pos = calculatePosition(item.lat, item.lng);
        const dist = getDistance(location.lat, location.lng, item.lat, item.lng);
        const isPickable = dist < 30; // 30公尺內可撿起

        const itemIcons = { bone: '🦴', meat: '🥩', herb: '🌿', shoe: '👟' };
        
        return (
          <div key={item.id} className="absolute transform -translate-x-1/2 -translate-y-1/2" style={pos}>
             <button 
              onClick={() => isPickable ? onPickUpItem(item) : null}
              className={`text-2xl drop-shadow-lg transition-transform ${isPickable ? 'animate-bounce hover:scale-125' : 'opacity-50'}`}
            >
              {itemIcons[item.type]}
            </button>
          </div>
        );
      })}
      
      {/* 提示訊息 */}
      <div className="absolute top-4 left-4 right-4 bg-black/60 text-white p-3 rounded-lg flex items-center gap-3 backdrop-blur-sm z-30">
        <Search className="w-5 h-5 text-emerald-400" />
        <span className="text-sm">在地圖上尋找地標，靠近至 50m 內即可進行佔領。地上也會有隨機掉落的物品喔！</span>
      </div>
    </div>
  );
}

// ==========================================
// AR 佔領畫面
// ==========================================
function ARScreen({ target, onCapture, onCancel }) {
  const videoRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [peeing, setPeeing] = useState(false);

  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } // 請求後置鏡頭
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActive(true);
        }
      } catch (err) {
        console.error("Camera access denied or unavailable", err);
      }
    };
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handlePee = () => {
    setPeeing(true);
    // 模擬動畫時間後完成佔領
    setTimeout(() => {
      setPeeing(false);
      onCapture(target);
    }, 2000);
  };

  if (!target) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Crosshair className="w-16 h-16 text-gray-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">未鎖定目標</h2>
        <p className="text-gray-400 mb-6">請先在雷達地圖上點選一個距離夠近的地標。</p>
        <button onClick={onCancel} className="px-6 py-2 bg-gray-700 rounded-full font-bold">返回地圖</button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* 攝影機畫面 */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* 未獲取權限時的遮罩 */}
      {!streamActive && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center p-6 text-center">
          <p className="text-white">正在請求相機權限...<br/>(若無鏡頭將顯示此黑畫面，仍可進行測試)</p>
        </div>
      )}

      {/* AR 準罩與 UI */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 z-10 pointer-events-none">
        <div className="bg-black/50 backdrop-blur text-white p-4 rounded-xl text-center border border-white/20">
          <h2 className="text-xl font-bold text-yellow-400">正在鎖定: {target.name}</h2>
          <p className="text-sm text-gray-300">目前擁有者: {target.ownerName || '無'}</p>
        </div>

        {/* 準心 */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className={`w-48 h-48 border-4 border-dashed rounded-full flex items-center justify-center transition-colors duration-300 ${peeing ? 'border-yellow-400 scale-110' : 'border-white/50'}`}>
            <Crosshair className="w-12 h-12 text-white/50" />
          </div>
          
          {/* 撒尿動畫特效 */}
          {peeing && (
            <div className="absolute bottom-1/2 flex flex-col items-center">
              <Droplets className="w-16 h-16 text-yellow-400 animate-bounce" fill="currentColor" />
              <div className="text-yellow-400 font-bold mt-2 text-xl drop-shadow-md">佔領中...</div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pointer-events-auto">
          <button onClick={onCancel} className="p-4 bg-red-600 rounded-full shadow-lg text-white font-bold">
            取消
          </button>
          
          <button 
            onClick={handlePee}
            disabled={peeing}
            className={`px-8 py-5 rounded-full shadow-lg font-bold text-xl transition-transform ${peeing ? 'bg-gray-500 scale-95' : 'bg-yellow-500 hover:bg-yellow-400 text-black hover:scale-105'}`}
          >
            {peeing ? '宣示主權中...' : '💦 撒尿佔領'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 背包畫面
// ==========================================
function BackpackScreen({ profile }) {
  const items = profile.inventory || [];
  const groupedItems = items.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1;
    return acc;
  }, {});

  const itemInfo = {
    bone: { name: '大骨頭', icon: '🦴', desc: '增加 5 戰力' },
    meat: { name: '肉塊', icon: '🥩', desc: '增加 10 戰力' },
    herb: { name: '療癒草', icon: '🌿', desc: '戰鬥後恢復狀態' },
    shoe: { name: '破鞋子', icon: '👟', desc: '主人幫的最愛玩具' }
  };

  return (
    <div className="p-6 h-full overflow-y-auto pb-24">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Backpack /> 我的背包</h2>
      
      {items.length === 0 ? (
        <div className="text-center text-gray-400 mt-20">
          <div className="text-6xl mb-4">🎒</div>
          <p>背包空空如也，去地圖上尋寶吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(groupedItems).map(([type, count]) => (
            <div key={type} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col items-center relative">
              <span className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                x{count}
              </span>
              <div className="text-5xl mb-2 drop-shadow-md">{itemInfo[type].icon}</div>
              <h3 className="font-bold">{itemInfo[type].name}</h3>
              <p className="text-xs text-gray-400 mt-1 text-center">{itemInfo[type].desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 競技場畫面
// ==========================================
function ArenaScreen({ profile }) {
  return (
    <div className="p-6 h-full overflow-y-auto pb-24 flex flex-col">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Trophy className="text-yellow-400"/> 街頭競技場</h2>
      
      {/* 玩家狀態 */}
      <div className="bg-gray-800 rounded-2xl p-6 mb-6 shadow-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${FACTIONS[profile.faction].color}`}>
              {FACTIONS[profile.faction].icon}
            </div>
            <div>
              <div className="font-bold text-lg">你的戰鬥面板</div>
              <div className={`text-sm ${FACTIONS[profile.faction].text}`}>{FACTIONS[profile.faction].name}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">等級</div>
            <div className="text-2xl font-bold">Lv.{profile.level}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-lg p-3 flex items-center gap-3">
            <Zap className="text-yellow-400 w-5 h-5" />
            <div>
              <div className="text-xs text-gray-400">總戰力</div>
              <div className="font-bold">{profile.power}</div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 flex items-center gap-3">
            <Shield className="text-blue-400 w-5 h-5" />
            <div>
              <div className="text-xs text-gray-400">防禦力</div>
              <div className="font-bold">{Math.floor(profile.power * 0.4)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 尋找對手 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <Swords className="w-20 h-20 text-gray-600 mb-4" />
        <h3 className="text-xl font-bold mb-2">匹配對戰系統 (開發中)</h3>
        <p className="text-gray-400 text-center mb-6">
          提昇戰力、收集裝備！<br/>未來將能與其他幫派的狗狗進行 1v1 決鬥，爭奪街頭霸主的稱號！
        </p>
        <button className="bg-gray-700 text-gray-400 px-8 py-3 rounded-full font-bold cursor-not-allowed">
          尋找對手...
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 底部導航按鈕元件
// ==========================================
function NavButton({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 transition-colors ${active ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
    >
      <div className={`mb-1 transition-transform ${active ? 'scale-110' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
