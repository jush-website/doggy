import React, { useState, useEffect, useRef } from 'react';
import { Map, Camera, Backpack, Swords, Crosshair, Droplets, MapPin, Trophy, Shield, Zap, Search, Sparkles, Users, User, X, Sword, Bone, Dog } from 'lucide-react';
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
  owner: { name: '主人幫', color: 'bg-blue-500', text: 'text-blue-500', icon: '🐕', marker: '🔵' },
  stray: { name: '流浪狗幫', color: 'bg-orange-500', text: 'text-orange-500', icon: '🐺', marker: '🟠' }
};

// 擴展後的狗狗專屬物品清單
const ITEM_TYPES = [
  { id: 'bone', name: '特級大骨頭', icon: '🦴', power: 15, desc: '啃咬後充滿鬥志' },
  { id: 'can', name: '美味罐罐', icon: '🥫', power: 25, desc: '體力大回復' },
  { id: 'ball', name: '彈跳網球', icon: '🎾', power: 10, desc: '提升追逐敏捷度' },
  { id: 'stick', name: '潔牙棒', icon: '🎋', power: 8, desc: '牙齒白亮更有自信' },
  { id: 'leash', name: '幸運牽繩', icon: '🦮', power: 30, desc: '防禦力大幅提升' },
  { id: 'frisbee', name: '飛盤', icon: '🥏', power: 12, desc: '遠程攻擊力加成' }
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

  useEffect(() => {
    const loadLibs = async () => {
      if (!document.getElementById('tailwind-script')) {
        const tw = document.createElement('script');
        tw.id = 'tailwind-script';
        tw.src = "https://cdn.tailwindcss.com";
        document.head.appendChild(tw);
      }
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
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
        <div style={{ fontSize: '14px', color: '#9CA3AF' }}>正在啟動狗狗 GPS 定位...</div>
      </div>
    );
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white font-bold animate-pulse text-xl">汪汪載入中...</div>;

  if (!user) {
    return (
      <div className="flex flex-col h-screen bg-gray-900 text-white items-center justify-center p-6 text-center">
        <h1 className="text-5xl font-black mb-4 text-yellow-400 italic">DOG TURF WAR</h1>
        <p className="mb-8 text-gray-400">進入真實台灣地圖，開始宣示主權！</p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button onClick={handleGoogleLogin} className="w-full bg-white text-gray-900 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-all shadow-xl">
            使用 Google 登入
          </button>
          <button onClick={handleAnonymousLogin} className="w-full bg-gray-800 text-white font-bold py-4 px-6 rounded-2xl hover:bg-gray-700 transition-all">
            快速遊玩
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col h-screen bg-gray-900 text-white items-center justify-center p-6">
        <h1 className="text-4xl font-black mb-8 text-yellow-400">選擇陣營</h1>
        <div className="flex gap-6 w-full max-w-md">
          <button onClick={() => handleSelectFaction('owner')} className="flex-1 bg-blue-600 p-8 rounded-[40px] flex flex-col items-center hover:scale-110 transition-all shadow-2xl">
            <span className="text-7xl mb-4">🐕</span>
            <h2 className="text-2xl font-bold">主人幫</h2>
            <p className="text-xs text-blue-200 mt-2">守護公園的正義</p>
          </button>
          <button onClick={() => handleSelectFaction('stray')} className="flex-1 bg-orange-600 p-8 rounded-[40px] flex flex-col items-center hover:scale-110 transition-all shadow-2xl">
            <span className="text-7xl mb-4">🐺</span>
            <h2 className="text-2xl font-bold">流浪狗幫</h2>
            <p className="text-xs text-orange-200 mt-2">自由奔放的強大</p>
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
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length === 0) seedInitialLandmarks(location.lat, location.lng);
      setLandmarks(data);
    });
    return () => unsubscribe();
  }, [user, location]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'items'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length === 0) seedInitialItems(location.lat, location.lng);
      setItems(data);
    });
    return () => unsubscribe();
  }, [user, location]);

  const seedInitialLandmarks = async (lat, lng) => {
    const names = ['公園大樹', '黃色消防栓', '街角電線桿', '便利商店門口', '社區噴水池'];
    for (let i = 0; i < names.length; i++) {
      const radius = 0.002;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'landmarks', `lm_${i}`), {
        name: names[i],
        lat: lat + (Math.random() - 0.5) * radius,
        lng: lng + (Math.random() - 0.5) * radius,
        ownerFaction: null,
        ownerName: null,
        captureCount: 0
      });
    }
  };

  const seedInitialItems = async (lat, lng) => {
    for (let i = 0; i < 6; i++) {
      const item = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
      const radius = 0.003;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'items', `item_${Date.now()}_${i}`), {
        ...item,
        lat: lat + (Math.random() - 0.5) * radius,
        lng: lng + (Math.random() - 0.5) * radius
      });
    }
  };

  const handlePickup = async (item) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'items', item.id));
      const newInv = [...(profile.inventory || []), { ...item, collectedAt: Date.now() }];
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'profile');
      await updateDoc(profileRef, { inventory: newInv, power: profile.power + item.power });
      setProfile(prev => ({ ...prev, inventory: newInv, power: prev.power + item.power }));
    } catch (err) { console.error(err); }
    setSelectedTarget(null);
    setActiveTab('map');
  };

  const handleCapture = async (target) => {
    const lmRef = doc(db, 'artifacts', appId, 'public', 'data', 'landmarks', target.id);
    await updateDoc(lmRef, {
      ownerFaction: profile.faction,
      ownerId: user.uid,
      ownerName: user.displayName || '傳奇勇者',
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
            <div className="bg-white/20 p-2 rounded-xl text-3xl">{FACTIONS[profile.faction].icon}</div>
            <div>
              <div className="text-xs font-bold opacity-80 uppercase tracking-tighter">LV.{profile.level} {FACTIONS[profile.faction].name}</div>
              <div className="font-black text-xl leading-none">戰力 {profile.power}</div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-[10px] font-bold opacity-50">EXP {profile.xp}</div>
            <div className="w-20 h-1.5 bg-black/30 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-white" style={{ width: `${(profile.xp % 1000) / 10}%` }}></div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        {battleOpponent ? (
          <BattleView player={profile} opponent={battleOpponent} onEnd={(win) => {
            if (win) {
              const pref = doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'profile');
              updateDoc(pref, { xp: profile.xp + 250, power: profile.power + 15 });
              setProfile(prev => ({ ...prev, xp: prev.xp + 250, power: prev.power + 15 }));
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
        <nav className="bg-gray-900/95 backdrop-blur-xl border-t border-white/5 flex justify-around p-3 pb-8 z-50">
          <NavBtn icon={<Map />} label="尋寶" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          <NavBtn icon={<Camera />} label="宣示" active={activeTab === 'ar'} onClick={() => setActiveTab('ar')} />
          <NavBtn icon={<Backpack />} label="背袋" active={activeTab === 'backpack'} onClick={() => setActiveTab('backpack')} />
          <NavBtn icon={<Trophy />} label="競技" active={activeTab === 'arena'} onClick={() => setActiveTab('arena')} />
        </nav>
      )}
    </div>
  );
}

function RealMapScreen({ location, landmarks, items, profile, onSelect }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!window.L || !mapRef.current) return;
    if (!mapInstance.current) {
      mapInstance.current = window.L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([location.lat, location.lng], 16);
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(mapInstance.current);
    } else {
      mapInstance.current.setView([location.lat, location.lng]);
    }

    const L = window.L;
    if (!markersRef.current['player']) {
      const playerIcon = L.divIcon({
        html: `<div class="flex items-center justify-center w-14 h-14 rounded-full border-4 border-white shadow-2xl ${FACTIONS[profile.faction].color} text-3xl animate-bounce">📍</div>`,
        className: 'custom-icon', iconSize: [56, 56]
      });
      markersRef.current['player'] = L.marker([location.lat, location.lng], { icon: playerIcon }).addTo(mapInstance.current);
    } else {
      markersRef.current['player'].setLatLng([location.lat, location.lng]);
    }

    Object.keys(markersRef.current).forEach(key => { if (key !== 'player') { mapInstance.current.removeLayer(markersRef.current[key]); delete markersRef.current[key]; } });

    landmarks.forEach(lm => {
      const icon = L.divIcon({
        html: `<div class="flex flex-col items-center">
                <div class="text-4xl filter drop-shadow-lg">${lm.ownerFaction ? FACTIONS[lm.ownerFaction].marker : '🏳️'}</div>
                <div class="bg-black/80 text-[10px] text-white px-2 py-0.5 rounded-md mt-1 border border-white/20">${lm.name}</div>
               </div>`,
        className: 'custom-icon', iconSize: [60, 60]
      });
      const marker = L.marker([lm.lat, lm.lng], { icon }).addTo(mapInstance.current);
      marker.on('click', () => onSelect(lm));
      markersRef.current[`lm_${lm.id}`] = marker;
    });

    items.forEach(item => {
      const icon = L.divIcon({
        html: `<div class="text-4xl animate-pulse">${item.icon}</div>`,
        className: 'custom-icon', iconSize: [40, 40]
      });
      const marker = L.marker([item.lat, item.lng], { icon }).addTo(mapInstance.current);
      marker.on('click', () => onSelect(item));
      markersRef.current[`item_${item.id}`] = marker;
    });
  }, [location, landmarks, items, profile, onSelect]);

  return <div ref={mapRef} className="w-full h-full z-10" />;
}

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
        <div className="w-full bg-black/80 backdrop-blur-md p-6 rounded-[32px] border border-white/10 text-center shadow-2xl">
          <h2 className="text-3xl font-black text-yellow-400 mb-1">{target?.name || '搜尋物件中'}</h2>
          <p className="text-sm text-gray-400">{isItem ? '狗狗物資' : '可佔領地標'} ‧ 距離 {Math.round(dist)}m</p>
        </div>
        <div className="text-[12rem] animate-bounce filter drop-shadow-[0_0_50px_rgba(255,255,255,0.8)]">
          {isItem ? target.icon : '🚩'}
        </div>
        <div className="w-full flex justify-between items-center pointer-events-auto">
          <button onClick={onCancel} className="bg-white/10 backdrop-blur p-6 rounded-full text-white font-bold border border-white/20">取消</button>
          {dist < 80 ? (
            <button onClick={() => isItem ? onPickup(target) : onCapture(target)} className="bg-yellow-400 text-black px-14 py-6 rounded-full font-black text-2xl shadow-[0_0_40px_rgba(250,204,21,0.5)] active:scale-90 transition-transform">
              {isItem ? '🍖 撿起物資' : '💦 宣示主權'}
            </button>
          ) : (
            <div className="bg-red-500 px-8 py-4 rounded-full text-sm font-bold animate-pulse">距離過遠，請靠近目標</div>
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
      setOnlinePlayers(snap.docs.map(d => d.data()).filter(p => p.uid !== user.uid && (now - p.lastActive < 40000)));
    });
    return () => unsubscribe();
  }, [user.uid]);

  return (
    <div className="p-8 h-full flex flex-col overflow-y-auto">
      <h2 className="text-4xl font-black mb-8 flex items-center gap-3"><Sword className="text-red-500 w-10 h-10" /> 競技配對</h2>
      <div className="space-y-6 pb-20">
        {onlinePlayers.map(p => (
          <div key={p.uid} className="bg-gray-800/60 p-6 rounded-[35px] flex items-center justify-between border border-white/5 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center text-4xl shadow-lg ${FACTIONS[p.faction].color}`}>{FACTIONS[p.faction].icon}</div>
              <div>
                <div className="font-black text-xl">{p.name}</div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                  <Zap className="w-3 h-3 text-yellow-400" /> 戰力 {p.power} ‧ {Math.round(getDistance(location.lat, location.lng, p.lat, p.lng))}m
                </div>
              </div>
            </div>
            <button onClick={() => onBattle(p)} className="bg-red-600 hover:bg-red-500 px-8 py-4 rounded-[20px] font-black shadow-xl active:scale-95 transition-all">開戰</button>
          </div>
        ))}
        {onlinePlayers.length === 0 && (
          <div className="text-center py-20 flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-3xl animate-pulse">🔍</div>
            <p className="text-gray-600 font-bold">正在搜尋附近的狗狗玩家...</p>
          </div>
        )}
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
        setOppHp(h => Math.max(0, h - (player.power * (0.8 + Math.random() * 0.4))));
        setTurn('opponent');
      } else {
        setPlayerHp(h => Math.max(0, h - (opponent.power * (0.8 + Math.random() * 0.4))));
        setTurn('player');
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [turn, playerHp, oppHp, res, player.power, opponent.power]);

  return (
    <div className="h-full bg-slate-900 flex flex-col p-10 items-center justify-between">
      <div className="text-center w-full">
        <div className={`w-32 h-32 mx-auto rounded-[35px] flex items-center justify-center text-7xl shadow-2xl ${FACTIONS[opponent.faction].color} animate-pulse`}>{FACTIONS[opponent.faction].icon}</div>
        <h3 className="mt-4 font-black text-2xl uppercase tracking-tighter">{opponent.name}</h3>
        <div className="w-full h-5 bg-gray-800 rounded-full mt-6 overflow-hidden border border-white/5 shadow-inner">
          <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${(oppHp/(opponent.power*10))*100}%` }}></div>
        </div>
      </div>
      <div className="text-7xl font-black italic text-red-600 animate-bounce tracking-tighter drop-shadow-2xl">VS</div>
      <div className="text-center w-full">
        <div className="w-full h-5 bg-gray-800 rounded-full mb-6 overflow-hidden border border-white/5 shadow-inner">
          <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${(playerHp/(player.power*10))*100}%` }}></div>
        </div>
        <h3 className="font-black text-2xl mb-4 uppercase tracking-tighter">我方鬥犬</h3>
        <div className={`w-32 h-32 mx-auto rounded-[35px] flex items-center justify-center text-7xl shadow-2xl ${FACTIONS[player.faction].color}`}>{FACTIONS[player.faction].icon}</div>
      </div>
      {res && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-12 z-[200] text-center animate-fadeIn">
          <Trophy className={`w-40 h-40 mb-8 ${res === 'win' ? 'text-yellow-400 drop-shadow-[0_0_50px_rgba(250,204,21,0.5)]' : 'text-gray-700'}`} />
          <h2 className="text-6xl font-black mb-4 italic tracking-tighter">{res === 'win' ? '勝利！！' : '戰敗...'}</h2>
          <p className="text-gray-400 text-lg mb-12">{res === 'win' ? '地盤的守護神！XP與戰力大幅提升！' : '別灰心，去尋找罐罐補補身子吧！'}</p>
          <button onClick={() => onEnd(res === 'win')} className="bg-white text-black px-16 py-6 rounded-full font-black text-2xl shadow-2xl active:scale-90 transition-transform">返回基地</button>
        </div>
      )}
    </div>
  );
}

function BackpackScreen({ profile }) {
  const inv = profile.inventory || [];
  return (
    <div className="p-8 h-full overflow-y-auto pb-24">
      <h2 className="text-4xl font-black mb-10 flex items-center gap-4"><Backpack className="text-yellow-400 w-10 h-10" /> 狗狗背袋 ({inv.length})</h2>
      <div className="grid grid-cols-2 gap-5">
        {inv.map((it, idx) => (
          <div key={idx} className="bg-gray-800/40 p-6 rounded-[40px] flex flex-col items-center border border-white/5 shadow-2xl backdrop-blur-sm">
            <div className="text-7xl mb-4 drop-shadow-xl">{it.icon}</div>
            <div className="font-black text-xl mb-1">{it.name}</div>
            <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">Power +{it.power}</div>
          </div>
        ))}
        {inv.length === 0 && (
          <div className="col-span-2 py-32 text-center text-gray-700">
            <div className="text-5xl mb-4 opacity-20">🦴</div>
            <p className="font-bold">目前沒有任何物資...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1.5 w-24 transition-all ${active ? 'text-yellow-400 scale-110' : 'text-gray-500 hover:text-gray-300'}`}>
      <div className={`p-3 rounded-[22px] transition-all ${active ? 'bg-yellow-400/10 shadow-[0_0_20px_rgba(250,204,21,0.2)]' : ''}`}>{icon}</div>
      <span className="text-[10px] font-black tracking-[0.2em]">{label}</span>
    </button>
  );
}
