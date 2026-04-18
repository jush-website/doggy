import React, { useState, useEffect, useRef } from 'react';
import { Map, Camera, Backpack, Swords, Crosshair, Droplets, MapPin, Trophy, Shield, Zap, Search, Sparkles, Users, Sword, Bone, Navigation } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, getDoc, updateDoc, deleteDoc, query, getDocs } from 'firebase/firestore';

// --- Firebase 配置 ---
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
  owner: { name: '主人幫', color: 'bg-blue-600', text: 'text-blue-500', icon: '🐕', marker: '🔵' },
  stray: { name: '流浪狗幫', color: 'bg-orange-600', text: 'text-orange-500', icon: '🐺', marker: '🟠' }
};

const ITEM_TYPES = [
  { id: 'bone', name: '特級大骨頭', icon: '🦴', power: 15 },
  { id: 'can', name: '美味罐罐', icon: '🥫', power: 25 },
  { id: 'ball', name: '彈跳網球', icon: '🎾', power: 10 },
  { id: 'leash', name: '幸運牽繩', icon: '🦮', power: 30 }
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
  const [libsLoaded, setLibsLoaded] = useState(false);

  useEffect(() => {
    const loadAssets = async () => {
      if (!document.getElementById('tw-cdn')) {
        const tw = document.createElement('script');
        tw.id = 'tw-cdn';
        tw.src = "https://cdn.tailwindcss.com";
        document.head.appendChild(tw);
      }
      if (!document.getElementById('lf-css')) {
        const link = document.createElement('link');
        link.id = 'lf-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => setLibsLoaded(true);
        document.head.appendChild(script);
      } else setLibsLoaded(true);
    };
    loadAssets();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (curr) => {
      setUser(curr);
      if (curr) loadProfile(curr.uid);
      else setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadProfile = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'artifacts', appId, 'users', uid, 'userData', 'profile'));
      if (snap.exists()) setProfile(snap.data());
      else setProfile(null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleLogin = async (method) => {
    setLoading(true);
    try {
      if (method === 'google') await signInWithPopup(auth, new GoogleAuthProvider());
      else await signInAnonymously(auth);
    } catch (e) { setLoading(false); }
  };

  const handleSelectFaction = async (faction) => {
    const newProf = { faction, level: 1, xp: 0, power: 100, inventory: [], createdAt: new Date().toISOString() };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'profile'), newProf);
    setProfile(newProf);
  };

  if (!libsLoaded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#fff' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#FBBF24', marginBottom: '8px' }}>汪星人佔領計畫</h2>
        <p style={{ opacity: 0.6, fontSize: '14px' }}>正在分析真實街道路徑...</p>
      </div>
    );
  }

  if (loading) return <div className="h-screen bg-gray-950 flex items-center justify-center text-yellow-400 font-black animate-pulse">連線中...</div>;

  if (!user) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col items-center justify-center p-8 text-center text-white">
        <h1 className="text-5xl font-black text-yellow-400 mb-4 italic">DOG TURF WAR</h1>
        <p className="text-gray-400 mb-10">出發！前往真實街道佔領地盤</p>
        <div className="w-full max-w-xs space-y-4">
          <button onClick={() => handleLogin('google')} className="w-full bg-white text-black py-4 rounded-2xl font-bold shadow-xl">Google 登入</button>
          <button onClick={() => handleLogin('anon')} className="w-full bg-gray-800 text-white py-4 rounded-2xl font-bold">訪客開始</button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col items-center justify-center p-8 text-white">
        <h1 className="text-3xl font-black text-yellow-400 mb-10 italic underline underline-offset-8">SELECT FACTION</h1>
        <div className="flex gap-6 w-full max-w-md">
          <button onClick={() => handleSelectFaction('owner')} className="flex-1 bg-blue-600 p-8 rounded-[40px] shadow-2xl hover:scale-105 transition-all">
            <span className="text-7xl block mb-4">🐕</span>
            <span className="font-bold text-xl tracking-widest">主人幫</span>
          </button>
          <button onClick={() => handleSelectFaction('stray')} className="flex-1 bg-orange-600 p-8 rounded-[40px] shadow-2xl hover:scale-105 transition-all">
            <span className="text-7xl block mb-4">🐺</span>
            <span className="font-bold text-xl tracking-widest">流浪幫</span>
          </button>
        </div>
      </div>
    );
  }

  return <GameCore user={user} profile={profile} setProfile={setProfile} />;
}

// --- 遊戲核心組件 ---
function GameCore({ user, profile, setProfile }) {
  const [activeTab, setActiveTab] = useState('map');
  const [location, setLocation] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [landmarks, setLandmarks] = useState([]);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 定位監控
  useEffect(() => {
    if ("geolocation" in navigator) {
      const id = navigator.geolocation.watchPosition(
        (p) => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        null, { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(id);
    }
  }, []);

  // 監聽數據
  useEffect(() => {
    const unsubL = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'landmarks'), (s) => 
      setLandmarks(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubI = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'items'), (s) => 
      setItems(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubL(); unsubI(); };
  }, []);

  // 關鍵功能：抓取真實道路並在其上生成物品
  const syncItemsOnRoads = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      // 1. 使用 Overpass API 抓取周遭道路資訊
      // [out:json];way(around:500,lat,lng)["highway"];out geom;
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];way(around:500,${location.lat},${location.lng})["highway"];out geom;`;
      const response = await fetch(overpassUrl);
      const data = await response.json();

      const roads = data.elements.filter(el => el.type === 'way' && el.geometry);
      
      if (roads.length > 0) {
        // 2. 清除舊物品 (簡單化處理，實際上可根據時間清除)
        const oldItems = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'items'));
        for (const doc of oldItems.docs) {
           await deleteDoc(doc.ref);
        }

        // 3. 在道路節點上生成 8-10 個新物品
        const newItemsCount = Math.min(roads.length, 12);
        for (let i = 0; i < newItemsCount; i++) {
          const randomRoad = roads[Math.floor(Math.random() * roads.length)];
          const randomNode = randomRoad.geometry[Math.floor(Math.random() * randomRoad.geometry.length)];
          const itemType = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];

          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'items', `road_item_${Date.now()}_${i}`), {
            ...itemType,
            lat: randomNode.lat,
            lng: randomNode.lon,
            roadName: randomRoad.tags.name || '無名小徑'
          });
        }
      }
    } catch (e) {
      console.error("Road fetch failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // 每當位置變化較大時，嘗試同步道路物品
  useEffect(() => {
    if (location.lat !== DEFAULT_LAT) {
      syncItemsOnRoads();
    }
  }, [location.lat, location.lng]);

  const handlePickup = async (item) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'items', item.id));
    const newInv = [...(profile.inventory || []), { ...item, time: Date.now() }];
    const newPower = profile.power + (item.power || 10);
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'profile'), { inventory: newInv, power: newPower });
    setProfile(p => ({ ...p, inventory: newInv, power: newPower }));
    setSelected(null); setActiveTab('map');
  };

  const handleCapture = async (lm) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'landmarks', lm.id), {
      ownerFaction: profile.faction, ownerName: user.displayName || '路過小狗', captureCount: (lm.captureCount || 0) + 1
    });
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'profile'), { xp: profile.xp + 100 });
    setProfile(p => ({ ...p, xp: p.xp + 100 }));
    setSelected(null); setActiveTab('map');
  };

  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden">
      {!opponent && (
        <div className={`p-4 ${FACTIONS[profile.faction].color} flex justify-between items-center shadow-2xl z-50`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl bg-white/20 p-2 rounded-2xl">{FACTIONS[profile.faction].icon}</span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">Street Power</div>
              <div className="text-xl font-black leading-none">{profile.power}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full">
             <Navigation className={`w-3 h-3 ${isSyncing ? 'animate-spin text-yellow-400' : 'text-green-400'}`} />
             <span className="text-[10px] font-bold">{isSyncing ? '掃描道路中' : '道路數據已同步'}</span>
          </div>
        </div>
      )}

      <div className="flex-1 relative">
        {opponent ? (
          <BattleView player={profile} opponent={opponent} onEnd={(win) => {
            if (win) {
              updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'userData', 'profile'), { xp: profile.xp + 200, power: profile.power + 15 });
              setProfile(p => ({ ...p, xp: p.xp + 200, power: p.power + 15 }));
            }
            setOpponent(null);
          }} />
        ) : (
          <>
            {activeTab === 'map' && <RealMap location={location} landmarks={landmarks} items={items} faction={profile.faction} onSelect={(t) => { setSelected(t); setActiveTab('ar'); }} />}
            {activeTab === 'ar' && <ARView target={selected} location={location} onCapture={handleCapture} onPickup={handlePickup} onCancel={() => setActiveTab('map')} />}
            {activeTab === 'backpack' && <BackpackView profile={profile} />}
            {activeTab === 'arena' && <ArenaView user={user} profile={profile} location={location} onBattle={setOpponent} />}
          </>
        )}
      </div>

      {!opponent && (
        <nav className="bg-gray-900/95 backdrop-blur-xl border-t border-white/5 flex justify-around p-4 pb-8 z-50">
          <NavBtn icon={<Map />} label="地圖" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          <NavBtn icon={<Camera />} label="宣示" active={activeTab === 'ar'} onClick={() => setActiveTab('ar')} />
          <NavBtn icon={<Backpack />} label="背袋" active={activeTab === 'backpack'} onClick={() => setActiveTab('backpack')} />
          <NavBtn icon={<Trophy />} label="對戰" active={activeTab === 'arena'} onClick={() => setActiveTab('arena')} />
        </nav>
      )}
    </div>
  );
}

// --- 地圖組件 (Leaflet) ---
function RealMap({ location, landmarks, items, faction, onSelect }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markers = useRef({});

  useEffect(() => {
    if (!window.L || !mapRef.current) return;
    if (!mapObj.current) {
      mapObj.current = window.L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([location.lat, location.lng], 16);
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapObj.current);
    } else mapObj.current.setView([location.lat, location.lng]);

    const L = window.L;
    if (!markers.current['p']) {
      const icon = L.divIcon({ html: `<div class="w-12 h-12 flex items-center justify-center rounded-full border-4 border-white shadow-2xl ${FACTIONS[faction].color} text-2xl animate-bounce">📍</div>`, className: 'c-icon', iconSize: [48, 48] });
      markers.current['p'] = L.marker([location.lat, location.lng], { icon }).addTo(mapObj.current);
    } else markers.current['p'].setLatLng([location.lat, location.lng]);

    Object.keys(markers.current).forEach(k => { if(k!=='p'){ mapObj.current.removeLayer(markers.current[k]); delete markers.current[k]; } });

    landmarks.forEach(lm => {
      const icon = L.divIcon({ html: `<div class="text-4xl filter drop-shadow-md">${lm.ownerFaction ? FACTIONS[lm.ownerFaction].marker : '🏳️'}</div>`, className: 'c-icon', iconSize: [40, 40] });
      const m = L.marker([lm.lat, lm.lng], { icon }).addTo(mapObj.current);
      m.on('click', () => onSelect(lm));
      markers.current[`l_${lm.id}`] = m;
    });

    items.forEach(it => {
      const icon = L.divIcon({ html: `<div class="text-3xl animate-pulse filter drop-shadow-lg">${it.icon}</div>`, className: 'c-icon', iconSize: [40, 40] });
      const m = L.marker([it.lat, it.lng], { icon }).addTo(mapObj.current);
      m.on('click', () => onSelect(it));
      markers.current[`i_${it.id}`] = m;
    });
  }, [location, landmarks, items, faction, onSelect]);

  return <div ref={mapRef} className="w-full h-full z-10" />;
}

// --- AR 視窗 ---
function ARView({ target, location, onCapture, onPickup, onCancel }) {
  const vRef = useRef(null);
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(s => { if(vRef.current) vRef.current.srcObject = s; });
  }, []);
  const dist = target ? getDistance(location.lat, location.lng, target.lat, target.lng) : 999;
  const isItem = target && target.icon && !target.name;

  return (
    <div className="h-full bg-black relative">
      <video ref={vRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-60" />
      <div className="absolute inset-0 flex flex-col items-center justify-between p-10 z-10 pointer-events-none">
        <div className="w-full bg-black/80 p-6 rounded-[32px] text-center border border-white/10 shadow-2xl backdrop-blur-md">
          <h2 className="text-2xl font-black text-yellow-400">{target ? (target.name || target.roadName) : '掃描中'}</h2>
          <p className="text-xs text-gray-400 mt-1">目前距離 {Math.round(dist)}m</p>
        </div>
        <div className="text-[12rem] animate-bounce drop-shadow-[0_0_50px_rgba(255,255,255,0.8)]">{target ? (target.icon || '🚩') : '🔍'}</div>
        <div className="w-full flex justify-between items-center pointer-events-auto">
          <button onClick={onCancel} className="bg-white/10 p-6 rounded-full text-white font-bold border border-white/20">返回</button>
          {target && dist < 100 ? (
            <button onClick={() => isItem ? onPickup(target) : onCapture(target)} className="bg-yellow-400 text-black px-12 py-6 rounded-full font-black text-2xl shadow-2xl">
              {isItem ? '🍖 撿起' : '💦 宣示'}
            </button>
          ) : (
            <div className="bg-red-500 px-6 py-3 rounded-full text-xs font-bold animate-pulse">請靠近一點</div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- 競技場 ---
function ArenaView({ user, profile, location, onBattle }) {
  const [players, setPlayers] = useState([]);
  useEffect(() => {
    const pRef = doc(db, 'artifacts', appId, 'public', 'data', 'presence', user.uid);
    const update = () => setDoc(pRef, { uid: user.uid, name: user.displayName || '狗狗', faction: profile.faction, power: profile.power, lat: location.lat, lng: location.lng, time: Date.now() });
    update(); const int = setInterval(update, 10000); return () => clearInterval(int);
  }, [user, location, profile]);

  useEffect(() => {
    return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'presence'), (s) => {
      const now = Date.now();
      setPlayers(s.docs.map(d => d.data()).filter(p => p.uid !== user.uid && (now - p.time < 30000)));
    });
  }, [user.uid]);

  return (
    <div className="p-8 h-full overflow-y-auto">
      <h2 className="text-3xl font-black mb-8 flex items-center gap-3"><Swords className="text-red-500" /> 附近玩家</h2>
      <div className="space-y-4 pb-20">
        {players.map(p => (
          <div key={p.uid} className="bg-gray-800 p-6 rounded-[32px] flex items-center justify-between border border-white/5 shadow-xl">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${FACTIONS[p.faction].color}`}>{FACTIONS[p.faction].icon}</div>
              <div>
                <div className="font-bold">{p.name}</div>
                <div className="text-[10px] text-gray-500">距離 {Math.round(getDistance(location.lat, location.lng, p.lat, p.lng))}m</div>
              </div>
            </div>
            <button onClick={() => onBattle(p)} className="bg-red-600 px-6 py-3 rounded-2xl font-black shadow-lg">決鬥</button>
          </div>
        ))}
        {players.length === 0 && <div className="text-center py-20 text-gray-600 italic">附近目前靜悄悄的...</div>}
      </div>
    </div>
  );
}

// --- 戰鬥畫面 ---
function BattleView({ player, opponent, onEnd }) {
  const [pHp, setPHp] = useState(player.power * 10);
  const [oHp, setOHp] = useState(opponent.power * 10);
  const [res, setRes] = useState(null);
  const [turn, setTurn] = useState('p');

  useEffect(() => {
    if(res) return;
    if(pHp <= 0) return setRes('lose');
    if(oHp <= 0) return setRes('win');
    const t = setTimeout(() => {
      if(turn === 'p') { setOHp(h => Math.max(0, h - player.power)); setTurn('o'); }
      else { setPHp(h => Math.max(0, h - opponent.power)); setTurn('p'); }
    }, 1000); return () => clearTimeout(t);
  }, [turn, pHp, oHp, res, player.power, opponent.power]);

  return (
    <div className="h-full bg-slate-900 flex flex-col p-10 items-center justify-between relative">
      <div className="text-center w-full">
        <div className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center text-5xl shadow-2xl ${FACTIONS[opponent.faction].color}`}>{FACTIONS[opponent.faction].icon}</div>
        <div className="w-full h-3 bg-gray-800 rounded-full mt-6 overflow-hidden"><div className="h-full bg-red-500 transition-all" style={{ width: `${(oHp/(opponent.power*10))*100}%` }}></div></div>
      </div>
      <div className="text-6xl font-black text-red-600 italic animate-bounce">VS</div>
      <div className="text-center w-full">
        <div className="w-full h-3 bg-gray-800 rounded-full mb-6 overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{ width: `${(pHp/(player.power*10))*100}%` }}></div></div>
        <div className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center text-5xl shadow-2xl ${FACTIONS[player.faction].color}`}>{FACTIONS[player.faction].icon}</div>
      </div>
      {res && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-10 z-[100] text-center">
          <Trophy className={`w-32 h-32 mb-6 ${res === 'win' ? 'text-yellow-400' : 'text-gray-600'}`} />
          <h2 className="text-5xl font-black mb-4">{res === 'win' ? '地頭蛇獲勝！' : '戰敗...'}</h2>
          <button onClick={() => onEnd(res === 'win')} className="bg-white text-black px-12 py-5 rounded-full font-black text-xl mt-10 shadow-2xl">返回</button>
        </div>
      )}
    </div>
  );
}

// --- 背包 ---
function BackpackView({ profile }) {
  const inv = profile.inventory || [];
  return (
    <div className="p-8 h-full overflow-y-auto pb-24">
      <h2 className="text-3xl font-black mb-8 flex items-center gap-3"><Backpack className="text-yellow-400" /> 狗狗背袋 ({inv.length})</h2>
      <div className="grid grid-cols-2 gap-4">
        {inv.map((it, idx) => (
          <div key={idx} className="bg-gray-800 p-6 rounded-[32px] flex flex-col items-center border border-white/5">
            <div className="text-6xl mb-4">{it.icon}</div>
            <div className="font-bold text-lg">{it.name}</div>
            <div className="text-[10px] text-yellow-500 mt-2">Power +{it.power}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- 共用組件 ---
function NavBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 w-20 transition-all ${active ? 'text-yellow-400 scale-110' : 'text-gray-500'}`}>
      <div className={`p-2.5 rounded-2xl ${active ? 'bg-yellow-400/10 shadow-lg' : ''}`}>{icon}</div>
      <span className="text-[10px] font-bold tracking-widest">{label}</span>
    </button>
  );
}
