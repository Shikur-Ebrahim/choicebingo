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
    <div
      className="flex flex-col min-h-screen pb-24 space-y-4 select-none"
      style={{
        background: 'linear-gradient(180deg, #0b1120 0%, #050814 50%, #02040a 100%)',
      }}
    >
      {/* ANNOUNCEMENT POPUP */}
      {showAnnouncement && announcement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/75 backdrop-blur-md" onClick={() => setShowAnnouncement(false)}>
          <div
            className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
              border: '1.5px solid rgba(250, 204, 21, 0.4)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 25px rgba(250,204,21,0.25)',
            }}
          >
            <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-t-2xl" />
            <div className="px-5 pt-4 pb-2 flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(180deg, #fef08a 0%, #facc15 50%, #ca8a04 100%)',
                  boxShadow: '0 2.5px 0 #854d0e',
                }}
              >
                <Info size={20} className="text-[#451a03]" />
              </div>
              <div>
                <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">{t[language].home.announcement}</p>
                <p className="text-sm font-black text-white">{t[language].home.ChoiceBingo}</p>
              </div>
              <button
                onClick={() => setShowAnnouncement(false)}
                className="ml-auto w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                style={{
                  background: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
                  boxShadow: '0 2px 0 #0f172a',
                }}
              >
                <span className="text-xs font-black">✕</span>
              </button>
            </div>
            <div className="h-px bg-white/10 mx-4" />
            <div className="px-5 py-4">
              <p className="text-sm text-slate-200 font-semibold leading-relaxed whitespace-pre-wrap">{announcement.message}</p>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => setShowAnnouncement(false)}
                className="w-full py-2.5 font-black text-sm rounded-xl active:translate-y-0.5 transition-all"
                style={{
                  background: 'linear-gradient(180deg, #fef08a 0%, #facc15 40%, #ca8a04 100%)',
                  boxShadow: '0 3.5px 0 #854d0e, inset 0 1px 1px rgba(255,255,255,0.9)',
                  color: '#451a03',
                }}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D GLASSMORPHIC HEADER */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        style={{
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center space-x-2.5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg"
            style={{
              background: 'radial-gradient(circle at 35% 25%, #34d399 0%, #10b981 50%, #047857 100%)',
              boxShadow: '0 3px 0 #064e3b, 0 3px 8px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.7)',
              border: '1.5px solid #6ee7b7',
            }}
          >
            {initial}
          </div>
          <div>
            <p className="font-black text-sm uppercase tracking-wider text-slate-100 drop-shadow-sm leading-tight">
              {user?.first_name || 'USER'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[8.5px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                ONLINE
              </span>
              {user?.role && user.role !== 'user' && (
                <span className="text-[8.5px] bg-blue-500/20 text-blue-400 border border-blue-500/40 px-1.5 py-0.2 rounded font-bold uppercase">
                  {user.role}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-right">
          {/* Bonus Balance 3D capsule */}
          <div
            className="flex flex-col items-center px-2 py-1 rounded-xl"
            style={{
              background: 'linear-gradient(180deg, #2e1065 0%, #170933 100%)',
              border: '1px solid rgba(192, 132, 252, 0.35)',
              boxShadow: '0 2px 0 #0f0720, inset 0 1px 1px rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex items-center gap-1">
              <Gift size={11} className="text-purple-400" />
              <span className="text-[8px] font-bold text-purple-300 uppercase">BONUS</span>
            </div>
            <p className="text-[11px] font-black text-purple-200 leading-tight">
              {formatMoney(user?.bonus_balance)} ETB
            </p>
          </div>

          {/* Main Balance 3D capsule */}
          <div
            className="flex flex-col items-end px-2.5 py-1 rounded-xl"
            style={{
              background: 'linear-gradient(180deg, #064e3b 0%, #022c22 100%)',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              boxShadow: '0 2px 0 #011a14, inset 0 1px 1px rgba(255,255,255,0.15)',
            }}
          >
            <p className="text-[8px] font-bold text-emerald-300 uppercase leading-none">
              {t[language].home.wallet}
            </p>
            <p className="text-xs font-black text-emerald-300 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)] leading-tight">
              {formatMoney(user?.main_balance)} ETB
            </p>
          </div>
        </div>
      </div>

      {/* 3D ACTION BUTTONS ROW (Deposit, Withdraw, Invite) */}
      <div className="px-4 grid grid-cols-3 gap-2.5">
        <Link
          to="/deposit"
          className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl font-black text-xs active:translate-y-1 transition-all select-none"
          style={{
            background: 'linear-gradient(180deg, #fef08a 0%, #facc15 35%, #eab308 70%, #ca8a04 100%)',
            boxShadow: '0 4px 0 #854d0e, 0 6px 15px rgba(234,179,8,0.4), inset 0 1px 2px rgba(255,255,255,0.9)',
            border: '1px solid #fef08a',
            color: '#451a03',
          }}
        >
          <PlusCircle size={15} className="drop-shadow-sm" />
          <span className="drop-shadow-sm">{t[language].home.deposit}</span>
        </Link>
        <Link
          to="/withdraw"
          className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl font-black text-xs active:translate-y-1 transition-all select-none"
          style={{
            background: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
            boxShadow: '0 4px 0 #0f172a, inset 0 1px 1px rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#f8fafc',
          }}
        >
          <ArrowDownToLine size={15} />
          <span>{t[language].home.withdraw}</span>
        </Link>
        <button 
          onClick={handleInvite}
          className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl font-black text-xs active:translate-y-1 transition-all select-none cursor-pointer"
          style={{
            background: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
            boxShadow: '0 4px 0 #0f172a, inset 0 1px 1px rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#f8fafc',
          }}
        >
          <Share2 size={15} />
          <span>{t[language].home.invite}</span>
        </button>
      </div>

      {/* 3D LIVE GAMES BANNER */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="font-black text-slate-300 tracking-wider text-xs uppercase">{t[language].home.activeGames}</h2>
          </div>
          <button
            onClick={handleHelp}
            className="flex items-center space-x-1 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-500/30 text-blue-400 hover:text-blue-300 transition-colors"
            style={{
              background: 'linear-gradient(180deg, #0e2238 0%, #061320 100%)',
            }}
          >
            <Info size={13} />
            <span>{t[language].home.help}</span>
          </button>
        </div>
        
        <Link
          to="/bingo/live"
          className="block relative rounded-2xl overflow-hidden h-52 flex flex-col items-center justify-center transition-all select-none cursor-pointer group"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #020617 100%)',
            border: '2px solid rgba(250, 204, 21, 0.45)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8), 0 0 25px rgba(250, 204, 21, 0.25), inset 0 2px 6px rgba(255, 255, 255, 0.15)',
          }}
        >
          {/* Subtle background matrix */}
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <div className="grid grid-cols-10 gap-2 p-3 h-full">
              {Array.from({length: 40}).map((_, i) => (
                <div key={i} className="bg-cyan-400 rounded-sm shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
              ))}
            </div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center text-center px-4">
            <span
              className="text-[9.5px] font-black text-emerald-300 uppercase tracking-widest mb-2 px-3 py-0.5 rounded-full flex items-center border border-emerald-500/40"
              style={{
                background: 'linear-gradient(180deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.05) 100%)',
                boxShadow: '0 2px 0 #021a12',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5"></span>
              {t[language].home.liveBingo}
            </span>

            <span className="text-yellow-300 font-black text-3xl mb-1 drop-shadow-[0_2px_8px_rgba(250,204,21,0.5)]">
              {t[language].home.joinNextGame}
            </span>
            <span className="text-slate-300 text-xs font-semibold mb-4 drop-shadow-sm">
              {t[language].home.pickCartela}
            </span>

            <div
              className="px-8 py-2.5 rounded-full font-black text-sm active:translate-y-1 transition-all flex items-center gap-2"
              style={{
                background: 'linear-gradient(180deg, #fef08a 0%, #facc15 35%, #eab308 70%, #ca8a04 100%)',
                boxShadow: '0 4.5px 0 #854d0e, 0 8px 20px rgba(234,179,8,0.5), inset 0 1px 2px rgba(255,255,255,0.95)',
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

      {/* 3D MEDEB / STAKES 2x2 GRID */}
      <div className="px-4 flex-1">
        <h2 className="font-black text-slate-300 tracking-wider text-xs mb-2.5 uppercase">
          {t[language].home.selectMedeb}
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          {[
            { amount: 10, bg: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 60%, #0369a1 100%)', border: 'rgba(56, 189, 248, 0.45)' },
            { amount: 20, bg: 'linear-gradient(180deg, #34d399 0%, #059669 60%, #047857 100%)', border: 'rgba(52, 211, 153, 0.45)' },
            { amount: 50, bg: 'linear-gradient(180deg, #c084fc 0%, #9333ea 60%, #7e22ce 100%)', border: 'rgba(192, 132, 252, 0.45)' },
            { amount: 100, bg: 'linear-gradient(180deg, #fb7185 0%, #e11d48 60%, #be123c 100%)', border: 'rgba(244, 63, 94, 0.45)' }
          ].map((stake) => {
            const hg = homeGames[stake.amount];
            const pool = hg?.pool || 0;
            const players = hg?.players || 0;
            const hasGame = pool > 0;
            const isWaiting = hg?.status === 'waiting';
            const isCalling = hg?.status === 'calling';
            const tl = homeTimeLeft[stake.amount] || 0;
            
            let statusTxt = t[language].home.waiting;
            let statusCls = "text-orange-400";
            if (isWaiting && tl <= 86400 && tl > 0) {
              statusTxt = `${tl}s`;
            } else if (isCalling) {
              statusTxt = t[language].home.active;
              statusCls = "text-emerald-400";
            }

            return (
              <div
                key={stake.amount}
                onClick={() => navigate(`/bingo/live?stake=${stake.amount}`)}
                className="rounded-2xl overflow-hidden flex flex-col cursor-pointer active:scale-95 transition-all select-none"
                style={{
                  background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                  border: `1.5px solid ${stake.border}`,
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
                }}
              >
                {/* 3D Colored Header with Stake */}
                <div
                  className="h-16 flex items-center justify-center relative"
                  style={{
                    background: stake.bg,
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -3px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  <span className="text-white font-black text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                    {stake.amount}
                  </span>
                  <span
                    className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider"
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: '#ffffff',
                    }}
                  >
                    {t[language].home.etb}
                  </span>
                </div>
                
                {/* 3-column 3D Stats Pod (Derash / Players / Status) */}
                <div
                  className="w-full flex h-[36px] shrink-0"
                  style={{
                    background: 'linear-gradient(180deg, #0b1120 0%, #030712 100%)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
                  }}
                >
                  <div className="flex-1 flex flex-col items-center justify-center border-r border-white/5">
                    <span className="text-slate-400 text-[7px] font-bold uppercase tracking-wider">{t[language].home.derash}</span>
                    <span className={`text-[10px] font-black text-yellow-300 drop-shadow-[0_0_4px_rgba(250,204,21,0.5)] ${hasGame ? 'animate-pulse' : ''}`}>{pool} ETB</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center border-r border-white/5">
                    <span className="text-slate-400 text-[7px] font-bold uppercase tracking-wider">{t[language].home.players}</span>
                    <span className="text-[10px] font-black text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]">{players}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <span className="text-slate-400 text-[7px] font-bold uppercase tracking-wider">{t[language].home.status}</span>
                    <span className={`text-[10px] font-black animate-pulse ${statusCls}`}>{statusTxt}</span>
                  </div>
                </div>

                {/* 3D Button */}
                <div className="p-2 text-center">
                  <div
                    className="w-full py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
                      boxShadow: '0 3px 0 #090d18, inset 0 1px 1px rgba(255,255,255,0.18)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#ffffff',
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
