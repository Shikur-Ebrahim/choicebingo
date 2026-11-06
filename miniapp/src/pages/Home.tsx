import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { t } from '../lib/translations';
import { Gift, ArrowDownToLine, Share2, PlusCircle, Info, MessageCircle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { supabase } from '../lib/supabase';

export default function Home() {
  const { user, language } = useGameStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [homeGames, setHomeGames] = useState<Record<number, { pool: number; start_at?: string; status: string; players: number }>>({});
  const [homeTimeLeft, setHomeTimeLeft] = useState<Record<number, number>>({});
  const [announcement, setAnnouncement] = useState<{ message: string; maxViews: number } | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const announcementShownRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const API = import.meta.env.VITE_API_URL || '/api';
    
    const fetchPools = async () => {
      try {
        const r = await fetch(`${API}/bingo/pools`, {
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-init-data': WebApp?.initData || '',
          }
        });
        if (r.ok && isMounted) {
          const { pools } = await r.json();
          const p: Record<number, any> = {};
          (pools || []).forEach((g: any) => {
            p[Number(g.stake)] = {
              pool: g.prize_pool,
              start_at: g.start_at,
              status: g.status,
              players: g.unique_players,
            };
          });
          setHomeGames(p);
          return;
        }
      } catch {}

      // Fallback direct supabase query with deduplication
      const { data } = await supabase.from('bingo_games')
        .select('id, stake, prize_pool, start_at, status, created_at')
        .in('status', ['waiting', 'calling'])
        .order('created_at', { ascending: false });

      if (data && isMounted) {
        const p: Record<number, any> = {};
        const seen = new Set<number>();
        data.forEach(g => {
          if (!seen.has(g.stake)) {
            seen.add(g.stake);
            p[g.stake] = { pool: g.prize_pool, start_at: g.start_at, status: g.status, players: 0, _id: g.id };
          }
        });
        setHomeGames(p);
      }
    };

    fetchPools();

    // 2-second heartbeat polling so Home page status NEVER gets stuck!
    const pollTimer = setInterval(() => {
      if (document.visibilityState !== 'hidden') fetchPools();
    }, 2000);

    const ch = supabase.channel('home_pools_root')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bingo_games' }, () => {
        if (isMounted) fetchPools();
      })
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      // Skip updates when the page is hidden â€” prevents callback flood on resume
      if (document.visibilityState === 'hidden') return;
      setHomeTimeLeft(prev => {
        const next: Record<number, number> = {};
        for (const [stake, g] of Object.entries(homeGames)) {
          if (g.status === 'waiting' && g.start_at) {
            next[Number(stake)] = Math.max(0, Math.ceil((new Date(g.start_at).getTime() - Date.now()) / 1000));
          }
        }
        return next;
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [homeGames]);

  const handleInvite = () => {
    navigate('/invite');
  };

    // ---- ANNOUNCEMENT POPUP LOGIC ----
  useEffect(() => {
    if (announcementShownRef.current) return;
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    const API_URL_LOCAL = import.meta.env.VITE_API_URL || '/api';
    fetch(`${API_URL_LOCAL}/player/support-contact`, {
      headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData }
    })
      .then(r => r.json())
      .then(data => {
        const msg = data.announcement_message || '';
        const maxViews = typeof data.announcement_max_views === 'number' ? data.announcement_max_views : 2;
        if (!msg.trim()) return;
        const storageKey = `ann_views_${msg.slice(0, 20)}`;
        const viewCount = parseInt(localStorage.getItem(storageKey) || '0', 10);
        if (viewCount < maxViews) {
          localStorage.setItem(storageKey, String(viewCount + 1));
          setAnnouncement({ message: msg, maxViews });
          setShowAnnouncement(true);
          announcementShownRef.current = true;
        }
      })
      .catch(() => {});
  }, []);
  // ----------------------------------

  const handleHelp = async () => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    try {
      const res = await fetch(`${API_URL}/player/support-contact`, {
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData }
      });
      const data = await res.json();
      const username = data.username || 'ChoiceBingo_admin';
      const url = `https://t.me/${username.replace('@', '')}`;
      if (typeof WebApp !== 'undefined' && WebApp.openTelegramLink) {
        WebApp.openTelegramLink(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const initial = user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'U';

  const formatMoney = (amount: number | undefined) => {
    return (amount || 0).toLocaleString('en-US');
  };

  return (
    <div className="flex flex-col min-h-screen pb-24 space-y-4 select-none bg-slate-50 dark:bg-[#070b14] transition-colors">
      {/* ANNOUNCEMENT POPUP */}
      {showAnnouncement && announcement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAnnouncement(false)}>
          <div
            className="bg-white dark:bg-[#111729] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 rounded-t-2xl" />
            <div className="px-5 pt-4 pb-2 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-md shrink-0">
                <Info size={20} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-fuchsia-600 dark:text-fuchsia-400 uppercase tracking-widest">{t[language].home.announcement}</p>
                <p className="text-sm font-black text-slate-800 dark:text-white">{t[language].home.ChoiceBingo}</p>
              </div>
              <button onClick={() => setShowAnnouncement(false)} className="ml-auto w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 active:bg-slate-200">
                <span className="text-sm font-black">✕</span>
              </button>
            </div>
            <div className="h-px bg-gray-100 dark:bg-white/5 mx-4" />
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold leading-relaxed whitespace-pre-wrap">{announcement.message}</p>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => setShowAnnouncement(false)}
                className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-black text-sm rounded-xl shadow-md active:scale-95 transition-transform"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D WHITE / DARK HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 px-4 py-4 rounded-b-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.4)] border-b border-gray-100 dark:border-slate-800 flex items-center justify-between transition-colors">
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{
              background: 'radial-gradient(circle at 35% 25%, #34d399 0%, #10b981 50%, #047857 100%)',
              boxShadow: '0 3px 0 #064e3b, 0 3px 6px rgba(0,0,0,0.15)',
              border: '1.5px solid #6ee7b7',
            }}
          >
            {initial}
          </div>
          <div>
            <p className="font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200">{user?.first_name || 'USER'}</p>
            {user?.role && user.role !== 'user' && (
              <span className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold">
                {user.role}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4 text-right">
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-1 text-purple-500 dark:text-purple-400 mb-0.5">
              <Gift size={14} />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatMoney(user?.bonus_balance)} ETB</p>
          </div>
          
          <div className="flex flex-col items-end">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t[language].home.wallet}</p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatMoney(user?.main_balance)} ETB</p>
          </div>
        </div>
      </div>

      {/* 3D ACTION BUTTONS ROW (Deposit, Withdraw, Invite) */}
      <div className="px-4 grid grid-cols-3 gap-3">
        {/* Deposit: 3D Yellow Button */}
        <Link
          to="/deposit"
          className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl font-bold text-xs select-none active:translate-y-1 transition-all"
          style={{
            background: 'linear-gradient(180deg, #fef08a 0%, #facc15 35%, #eab308 70%, #ca8a04 100%)',
            boxShadow: '0 3.5px 0 #854d0e, 0 4px 10px rgba(234,179,8,0.25), inset 0 1px 1px rgba(255,255,255,0.9)',
            border: '1px solid #fef08a',
            color: '#451a03',
          }}
        >
          <PlusCircle size={16} />
          <span>{t[language].home.deposit}</span>
        </Link>

        {/* Withdraw: 3D Clean White Button */}
        <Link
          to="/withdraw"
          className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl font-bold text-xs select-none active:translate-y-1 transition-all bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
          style={{
            boxShadow: '0 3px 0 #cbd5e1',
          }}
        >
          <ArrowDownToLine size={16} />
          <span>{t[language].home.withdraw}</span>
        </Link>

        {/* Invite: 3D Clean White Button */}
        <button 
          onClick={handleInvite}
          className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl font-bold text-xs select-none active:translate-y-1 transition-all bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
          style={{
            boxShadow: '0 3px 0 #cbd5e1',
          }}
        >
          <Share2 size={16} />
          <span>{t[language].home.invite}</span>
        </button>
      </div>

      {/* ACTIVE GAMES SECTION */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-500 dark:text-slate-400 tracking-wider text-xs uppercase">{t[language].home.activeGames}</h2>
          <button onClick={handleHelp} className="text-blue-500 flex items-center space-x-1 text-xs font-semibold hover:underline">
            <Info size={14} />
            <span>{t[language].home.help}</span>
          </button>
        </div>
        
        {/* Live Games Marquee Banner */}
        <Link
          to="/bingo/live"
          className="block relative rounded-2xl overflow-hidden shadow-lg h-52 bg-gradient-to-br from-[#1a1a3e] to-[#0d0d1f] flex flex-col items-center justify-center border border-indigo-900/50 select-none cursor-pointer"
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="grid grid-cols-10 gap-2 p-3 h-full">
              {Array.from({length: 40}).map((_, i) => <div key={i} className="bg-white rounded-sm opacity-50" />)}
            </div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center text-center px-4">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
              {t[language].home.liveBingo}
            </span>
            <span className="text-yellow-400 font-black text-3xl mb-1 drop-shadow-[0_2px_8px_rgba(250,204,21,0.4)]">
              {t[language].home.joinNextGame}
            </span>
            <span className="text-white/60 text-xs font-semibold mb-4">
              {t[language].home.pickCartela}
            </span>
            
            {/* 3D CTA Button */}
            <div
              className="px-8 py-2.5 rounded-full font-black text-sm active:translate-y-1 transition-all flex items-center gap-2 select-none"
              style={{
                background: 'linear-gradient(180deg, #fef08a 0%, #facc15 35%, #eab308 70%, #ca8a04 100%)',
                boxShadow: '0 4px 0 #854d0e, 0 6px 15px rgba(234,179,8,0.4), inset 0 1px 1px rgba(255,255,255,0.95)',
                border: '1px solid #fef08a',
                color: '#451a03',
              }}
            >
              <span>{t[language].home.openCartela}</span>
              <span className="text-base leading-none">➔</span>
            </div>
          </div>
        </Link>
      </div>

      {/* MEDEB (STAKES) 2x2 GRID */}
      <div className="px-4 flex-1">
        <h2 className="font-bold text-slate-500 dark:text-slate-400 tracking-wider text-xs mb-2 uppercase">{t[language].home.selectMedeb}</h2>
        
        <div className="grid grid-cols-2 gap-3">
          {[
            { amount: 10, color: 'from-blue-400 to-blue-600' },
            { amount: 20, color: 'from-emerald-400 to-emerald-600' },
            { amount: 50, color: 'from-purple-400 to-purple-600' },
            { amount: 100, color: 'from-rose-400 to-rose-600' }
          ].map((stake) => {
            const hg = homeGames[stake.amount];
            const pool = hg?.pool || 0;
            const players = hg?.players || 0;
            const hasGame = pool > 0;
            const isWaiting = hg?.status === 'waiting';
            const isCalling = hg?.status === 'calling';
            const tl = homeTimeLeft[stake.amount] || 0;
            
            let statusTxt = t[language].home.waiting;
            let statusCls = "text-orange-500";
            if (isWaiting && tl <= 86400 && tl > 0) {
              statusTxt = `${tl}s`;
            } else if (isCalling) {
              statusTxt = t[language].home.active;
              statusCls = "text-emerald-500";
            }

            return (
              <div
                key={stake.amount}
                onClick={() => navigate(`/bingo/live?stake=${stake.amount}`)}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col cursor-pointer active:scale-95 transition-all select-none"
              >
                {/* 3D Colored Header */}
                <div className={`h-16 bg-gradient-to-br ${stake.color} flex items-center justify-center relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]`}>
                  <span className="text-white font-black text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{stake.amount}</span>
                  <span className="absolute top-1.5 right-1.5 bg-white/25 px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider backdrop-blur-sm">
                    {t[language].home.etb}
                  </span>
                </div>
                
                {/* Derash / Players / Status — 3 columns */}
                <div className="w-full bg-slate-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex h-[35px] shrink-0">
                  <div className="flex-1 flex flex-col items-center justify-center border-r border-gray-100 dark:border-slate-800">
                    <span className="text-slate-400 dark:text-slate-500 text-[7px] font-bold uppercase tracking-wider">{t[language].home.derash}</span>
                    <span className={`text-[10px] font-black text-yellow-600 dark:text-yellow-400 ${hasGame ? 'animate-pulse' : ''}`}>{pool} ETB</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center border-r border-gray-100 dark:border-slate-800">
                    <span className="text-slate-400 dark:text-slate-500 text-[7px] font-bold uppercase tracking-wider">{t[language].home.players}</span>
                    <span className="text-[10px] font-black text-emerald-500">{players}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <span className="text-slate-400 dark:text-slate-500 text-[7px] font-bold uppercase tracking-wider">{t[language].home.status}</span>
                    <span className={`text-[10px] font-black ${statusCls}`}>{statusTxt}</span>
                  </div>
                </div>

                {/* 3D Join Button */}
                <div className="p-2 text-center">
                  <div
                    className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-xl text-xs active:translate-y-0.5 transition-all flex items-center justify-center"
                    style={{
                      boxShadow: '0 2px 0 #cbd5e1',
                    }}
                  >
                    {isWaiting ? t[language].home.joinMatch : t[language].home.joinRoom}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
