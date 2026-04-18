import React, { useState, useEffect, useRef } from 'react';
import { Map, Camera, Backpack, Swords, Crosshair, Droplets, MapPin, Trophy, Shield, Zap, Search, Sparkles, Users, User, X, Sword } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, getDoc, updateDoc, deleteDoc, query, getDocs, deleteField } from 'firebase/firestore';

// --- Firebase Configuration ---
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

const DEFAULT_LAT = 22.611;
const DEFAULT_LNG = 120.565;
const FACTIONS = {
  owner: { name: '主人幫', color: 'bg-blue-500', text: 'text-blue-500', icon: '🐕' },
  stray: { name: '流浪狗幫', color: 'bg-orange-500', text: 'text-orange-500', icon: '🐺' }
};

const ITEM_TYPES = [
  { id: 'bone', name: '大骨頭', icon: '🦴', power: 5 },
  { id: 'meat', name: '肉塊', icon: '🥩', power: 10 },
  { id: 'herb', name: '療癒草', icon: '🌿', power: 3 },
  { id: 'shoe', name: '破鞋子', icon: '👟', power: 2 }
];

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

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [libsLoaded, setLibsLoaded] = useState(false);

  // 載入 Tailwind 與 Leaflet
  useEffect(() => {
    const loadLibs = async () => {
      // 載入 Tailwind
      if (!document.getElementById('tailwind-script')) {
        const tw = document.createElement('script');
        tw.id = 'tailwind-script';
        tw.src = "https://cdn.tailwindcss.com";
        document.head.appendChild(tw);
      }
      // 載入 Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      // 載入 Leaflet JS
      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => setLibsLoaded(true);
        document.head.appendChild(script);
      } else {
        setLibsLoaded(true);
      }
    };
    loadLibs();
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadProfile = async (uid) => {
    if (!db) return;
    try {
      const profileRef = doc(db, 'artifacts', appId, 'users', uid, 'userData', 'profile');
      const docSnap = await getDoc(profileRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("Profile Error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setAuthError(err.message);
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
    } catch (err) {
      setAuthError(err.message);
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

  if (!libsLoaded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#FBBF24' }}>汪星人佔領計畫</div>
        <div style={{ fontSize: '14px', color: '#9CA3AF' }}>正在定位台灣地圖資訊...</div>
      </div>
    );
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white font-bold animate-pulse text-xl">汪汪載入中...</div>;

  if (!user) {
    return (
      <div className="flex flex-col h-screen bg-gray-900 text-white items-center justify-center p-6 text-center">
        <h1 className="text-5xl font-bold mb-4 text-yellow-400">汪星人佔領計畫</h1>
        <p className="mb-8 text-gray-400">進入真實世界的街道搶奪地盤！</p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button onClick={handleGoogleLogin} className="w-full bg-white text-gray-900 font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 hover:bg-gray-200 transition-all">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google 快速登入
          </button>
          <button onClick={handleAnonymousLogin} className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-full hover:bg-gray-600 transition-all">
            訪客遊玩
          </button>
        </div>
        {authError && <div className="mt-4 text-red-400 text-xs">{authError}</div>}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col h-screen bg-gray-900 text-white items-center justify-center p-6">
        <h1 className="text-4xl font-bold mb-8 text-yellow-400">加入幫派</h1>
        <div className="flex gap-4 w-full max-w-md">
          <button onClick={() => handleSelectFaction('owner')} className="flex-1 bg-blue-600 p-8 rounded-[40px] flex flex-col items-center hover:scale-105 transition-all shadow-xl">
            <span className="text-7xl mb-4">🐕</span>
            <h2 className="text-2xl font-bold">主人幫</h2>
          </button>
          <button onClick={() => handleSelectFaction('stray')} className="flex-1 bg-orange-600 p-8 rounded-[40px] flex flex-col items-center hover:scale-105 transition-all shadow-xl">
            <span className="text-7xl mb-4">🐺</span>
            <h2 className="text-2xl font-bold">流浪狗幫</h2>
          </button>
        </div>
      </div>
    );
  }

  return <GameCore user={user} profile={profile} setProfile={setProfile} />;
}

function GameCore({ user, profile, setProfile }) {
  const [activeTab, setActiveTab] = useState('map');
  const [location, setLocation] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [landmarks, setLandmarks] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [battleOpponent, setBattleOpponent] = useState(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        null, { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'landmarks'), (snapshot) => {
      setLandmarks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'items'), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handlePickup = async (item) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'items', item.id));
      const newInv = [...(profile.inventory || []), { ...item, collectedAt: Date.now() }];
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'profile');
      await updateDoc(profileRef, { inventory: newInv, power: profile.power + (item.power || 5) });
      setProfile(prev => ({ ...prev, inventory: newInv, power: prev.power + (item.power || 5) }));
    } catch (err) { console.error(err); }
    setSelectedTarget(null);
    setActiveTab('map');
  };

  const handleCapture = async (target) => {
    const lmRef = doc(db, 'artifacts', appId, 'public', 'data', 'landmarks', target.id);
    await updateDoc(lmRef, {
      ownerFaction: profile.faction,
      ownerId: user.uid,
      ownerName: user.displayName || '無名勇士',
      captureCount: (target.captureCount || 0) + 1
    });
    const newXp = profile.xp + 100;
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'profile');
    await updateDoc(profileRef, { xp: newXp });
    setProfile(prev => ({ ...prev, xp: newXp }));
    setSelectedTarget(null);
    setActiveTab('map');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white font-sans overflow-hidden">
      {!battleOpponent && (
        <div className={`p-4 ${FACTIONS[profile.faction].color} flex justify-between items-center shadow-2xl z-50`}>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl text-2xl">{FACTIONS[profile.faction].icon}</div>
            <div>
              <div className="text-xs opacity-70">Lv.{profile.level} {FACTIONS[profile.faction].name}</div>
              <div className="font-black text-lg leading-tight">戰力 {profile.power}</div>
            </div>
          </div>
          <div className="bg-black/20 px-4 py-2 rounded-2xl text-right">
            <div className="text-[10px] uppercase tracking-widest opacity-60">GPS 即時連線</div>
            <div className="text-xs font-bold text-green-400 animate-pulse">● TAIWAN LIVE</div>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        {battleOpponent ? (
          <BattleView player={profile} opponent={battleOpponent} onEnd={(win) => {
            if (win) {
              const pref = doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'profile');
              updateDoc(pref, { xp: profile.xp + 200, power: profile.power + 20 });
              setProfile(prev => ({ ...prev, xp: prev.xp + 200, power: prev.power + 20 }));
            }
            setBattleOpponent(null);
          }} />
        ) : (
          <>
            {activeTab === 'map' && (
              <RealMapScreen location={location} landmarks={landmarks} items={items} profile={profile} onSelect={(t) => { setSelectedTarget(t); setActiveTab('ar'); }} />
            )}
            {activeTab === 'ar' && (
              <ARScreen location={location} target={selectedTarget} onCapture={handleCapture} onPickup={handlePickup} onCancel={() => setActiveTab('map')} />
            )}
            {activeTab === 'backpack' && <BackpackScreen profile={profile} />}
            {activeTab === 'arena' && <ArenaScreen user={user} profile={profile} location={location} onBattle={setBattleOpponent} />}
          </>
        )}
      </div>

      {!battleOpponent && (
        <nav className="bg-gray-900/90 backdrop-blur-md border-t border-white/10 flex justify-around p-2 pb-6 z-50">
          <NavBtn icon={<Map />} label="地圖" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          <NavBtn icon={<Camera />} label="相機" active={activeTab === 'ar'} onClick={() => setActiveTab('ar')} />
          <NavBtn icon={<Backpack />} label="背包" active={activeTab === 'backpack'} onClick={() => setActiveTab('backpack')} />
          <NavBtn icon={<Trophy />} label="競技場" active={activeTab === 'arena'} onClick={() => setActiveTab('arena')} />
        </nav>
      )}
    </div>
  );
}

// ==========================================
// 真實台灣地圖組件 (Leaflet)
// ==========================================
function RealMapScreen({ location, landmarks, items, profile, onSelect }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!window.L || !mapRef.current) return;

    // 初始化地圖
    if (!mapInstance.current) {
      mapInstance.current = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([location.lat, location.lng], 16);

      // 使用 CartoDB 的暗色地圖樣式，非常適合遊戲
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapInstance.current);
    } else {
      mapInstance.current.setView([location.lat, location.lng]);
    }

    const L = window.L;

    // 1. 玩家標記 (Player)
    if (!markersRef.current['player']) {
      const playerIcon = L.divIcon({
        html: `<div class="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow-xl ${FACTIONS[profile.faction].color} text-2xl animate-bounce">${FACTIONS[profile.faction].icon}</div>`,
        className: 'custom-div-icon',
        iconSize: [48, 48]
      });
      markersRef.current['player'] = L.marker([location.lat, location.lng], { icon: playerIcon }).addTo(mapInstance.current);
    } else {
      markersRef.current['player'].setLatLng([location.lat, location.lng]);
    }

    // 2. 清除舊的地標與物品標記
    Object.keys(markersRef.current).forEach(key => {
      if (key !== 'player') {
        mapInstance.current.removeLayer(markersRef.current[key]);
        delete markersRef.current[key];
      }
    });

    // 3. 繪製地標 (Landmarks)
    landmarks.forEach(lm => {
      const icon = L.divIcon({
        html: `<div class="flex flex-col items-center">
                <div class="text-3xl filter drop-shadow-md">${lm.ownerFaction ? FACTIONS[lm.ownerFaction].icon : '🚩'}</div>
                <div class="bg-black/70 text-[10px] text-white px-2 py-0.5 rounded-full mt-1 border border-white/20 whitespace-nowrap">${lm.name}</div>
               </div>`,
        className: 'custom-div-icon',
        iconSize: [60, 60]
      });
      const marker = L.marker([lm.lat, lm.lng], { icon }).addTo(mapInstance.current);
      marker.on('click', () => onSelect(lm));
      markersRef.current[`lm_${lm.id}`] = marker;
    });

    // 4. 繪製物品 (Items)
    items.forEach(item => {
      const icon = L.divIcon({
        html: `<div class="text-3xl animate-pulse filter drop-shadow-lg">${item.icon}</div>`,
        className: 'custom-div-icon',
        iconSize: [40, 40]
      });
      const marker = L.marker([item.lat, item.lng], { icon }).addTo(mapInstance.current);
      marker.on('click', () => onSelect(item));
      markersRef.current[`item_${item.id}`] = marker;
    });

  }, [location, landmarks, items, profile, onSelect]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full z-10" />
      {/* 遮罩裝飾 */}
      <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]"></div>
      <div className="absolute bottom-6 left-6 right-6 z-30 bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-white/10 text-xs flex items-center gap-3">
        <Sparkles className="text-yellow-400 w-5 h-5" />
        <span>直接在地圖上點擊「地標」或「物資」即可觸發 AR 互動。</span>
      </div>
    </div>
  );
}

// ==========================================
// AR 相機與競技場 (其餘組件保持原邏輯)
// ==========================================
function ARScreen({ target, onCapture, onPickup, onCancel, location }) {
  const videoRef = useRef(null);
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => { if(videoRef.current) videoRef.current.srcObject = s; })
      .catch(console.error);
  }, []);
  const isItem = target && target.icon;
  const dist = target ? getDistance(location.lat, location.lng, target.lat, target.lng) : 999;
  return (
    <div className="w-full h-full bg-black relative">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-60" />
      <div className="absolute inset-0 flex flex-col items-center justify-between p-10 z-10 pointer-events-none">
        <div className="w-full bg-black/60 backdrop-blur p-5 rounded-3xl border border-white/20 text-center">
          <h2 className="text-2xl font-black text-yellow-400">{target?.name || '掃描地標中'}</h2>
          <p className="text-sm text-gray-400">距離: {Math.round(dist)} 公尺</p>
        </div>
        <div className="text-9xl animate-bounce filter drop-shadow-[0_0_30px_white]">{target?.icon || '🚩'}</div>
        <div className="w-full flex justify-between items-center pointer-events-auto">
          <button onClick={onCancel} className="bg-gray-800 p-6 rounded-full text-white font-bold">離開</button>
          {dist < 60 ? (
            <button onClick={() => isItem ? onPickup(target) : onCapture(target)} className="bg-yellow-500 text-black px-12 py-6 rounded-full font-black text-2xl shadow-2xl">
              {isItem ? '撿起物資' : '宣示領地'}
            </button>
          ) : (
            <div className="bg-red-600 px-6 py-3 rounded-full text-sm font-bold animate-pulse">距離地標太遠了</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ArenaScreen({ user, profile, location, onBattle }) {
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  useEffect(() => {
    const presenceRef = doc(db, 'artifacts', appId, 'public', 'data', 'onlinePlayers', user.uid);
    const update = () => setDoc(presenceRef, { uid: user.uid, name: user.displayName || '狗狗', faction: profile.faction, power: profile.power, lat: location.lat, lng: location.lng, lastActive: Date.now() });
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [user, location, profile]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'onlinePlayers'), (snap) => {
      const now = Date.now();
      setOnlinePlayers(snap.docs.map(d => d.data()).filter(p => p.uid !== user.uid && (now - p.lastActive < 30000)));
    });
    return () => unsubscribe();
  }, [user.uid]);

  return (
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-3xl font-black mb-6 flex items-center gap-2"><Sword className="text-red-500" /> 即時挑戰</h2>
      <div className="space-y-4">
        {onlinePlayers.map(p => (
          <div key={p.uid} className="bg-gray-800 p-5 rounded-3xl flex items-center justify-between border border-white/5 shadow-xl">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${FACTIONS[p.faction].color}`}>{FACTIONS[p.faction].icon}</div>
              <div>
                <div className="font-bold text-lg">{p.name}</div>
                <div className="text-xs text-gray-500">距離: {Math.round(getDistance(location.lat, location.lng, p.lat, p.lng))}m | 戰力: {p.power}</div>
              </div>
            </div>
            <button onClick={() => onBattle(p)} className="bg-red-600 hover:bg-red-500 px-6 py-3 rounded-2xl font-black shadow-lg">決鬥</button>
          </div>
        ))}
        {onlinePlayers.length === 0 && <div className="text-center py-20 text-gray-600 italic">附近沒有其他在線狗狗...</div>}
      </div>
    </div>
  );
}

function BattleView({ player, opponent, onEnd }) {
  const [playerHp, setPlayerHp] = useState(player.power * 10);
  const [oppHp, setOppHp] = useState(opponent.power * 10);
  const [turn, setTurn] = useState('player');
  const [res, setRes] = useState(null);

  useEffect(() => {
    if(res) return;
    if(playerHp <= 0) return setRes('lose');
    if(oppHp <= 0) return setRes('win');
    const timer = setTimeout(() => {
      if(turn === 'player') {
        setOppHp(h => Math.max(0, h - player.power));
        setTurn('opponent');
      } else {
        setPlayerHp(h => Math.max(0, h - opponent.power));
        setTurn('player');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [turn, playerHp, oppHp, res]);

  return (
    <div className="h-full bg-slate-900 flex flex-col p-10 items-center justify-between">
      <div className="text-center w-full">
        <div className={`w-28 h-28 mx-auto rounded-3xl flex items-center justify-center text-6xl shadow-2xl ${FACTIONS[opponent.faction].color}`}>{FACTIONS[opponent.faction].icon}</div>
        <h3 className="mt-4 font-bold text-xl">{opponent.name}</h3>
        <div className="w-full h-4 bg-gray-800 rounded-full mt-4 overflow-hidden border border-white/10">
          <div className="h-full bg-red-500 transition-all" style={{ width: `${(oppHp/(opponent.power*10))*100}%` }}></div>
        </div>
      </div>
      <div className="text-6xl font-black italic text-red-600 animate-bounce">VS</div>
      <div className="text-center w-full">
        <div className="w-full h-4 bg-gray-800 rounded-full mb-4 overflow-hidden border border-white/10">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${(playerHp/(player.power*10))*100}%` }}></div>
        </div>
        <h3 className="font-bold text-xl mb-4">我方勇士</h3>
        <div className={`w-28 h-28 mx-auto rounded-3xl flex items-center justify-center text-6xl shadow-2xl ${FACTIONS[player.faction].color}`}>{FACTIONS[player.faction].icon}</div>
      </div>
      {res && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-10 z-[100] text-center">
          <Trophy className={`w-32 h-32 mb-6 ${res === 'win' ? 'text-yellow-400' : 'text-gray-600'}`} />
          <h2 className="text-5xl font-black mb-4">{res === 'win' ? '你贏了！' : '戰敗...'}</h2>
          <button onClick={() => onEnd(res === 'win')} className="bg-white text-black px-12 py-5 rounded-full font-black text-xl mt-10 shadow-2xl">返回</button>
        </div>
      )}
    </div>
  );
}

function BackpackScreen({ profile }) {
  const inv = profile.inventory || [];
  return (
    <div className="p-6 h-full overflow-y-auto pb-24">
      <h2 className="text-3xl font-black mb-8 flex items-center gap-3"><Backpack className="text-yellow-400" /> 背包項目 ({inv.length})</h2>
      <div className="grid grid-cols-2 gap-4">
        {inv.map((it, idx) => (
          <div key={idx} className="bg-gray-800 p-6 rounded-[32px] flex flex-col items-center border border-white/5 shadow-lg">
            <div className="text-6xl mb-4">{it.icon}</div>
            <div className="font-bold text-lg">{it.name}</div>
            <div className="text-xs text-yellow-500 mt-2">戰力加成 +{it.power}</div>
          </div>
        ))}
        {inv.length === 0 && <div className="col-span-2 py-20 text-center text-gray-600 italic">背包空空如也...</div>}
      </div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 w-20 transition-all ${active ? 'text-yellow-400 scale-110' : 'text-gray-500 hover:text-gray-400'}`}>
      <div className={`${active ? 'bg-yellow-400/10 p-2.5 rounded-2xl' : 'p-2.5'}`}>{icon}</div>
      <span className="text-[10px] font-bold tracking-widest">{label}</span>
    </button>
  );
}
