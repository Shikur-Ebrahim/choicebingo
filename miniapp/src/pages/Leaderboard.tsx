import { useState, useEffect, useCallback } from 'react';
import { Trophy, Users, Medal, RefreshCw, Crown, UserPlus } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from '../store/gameStore';
import { t } from '../lib/translations';

const API_URL = import.meta.env.VITE_API_URL || '/api';

type Period = 'all' | 'daily' | 'weekly' | 'monthly';
type Tab = 'players' | 'inviters';

interface Player {
  rank: number;
  telegram_id: string;
  first_name: string;
  username: string;
  wins: number;
  games?: number;
  total_prize?: number;
}

interface Inviter {
  rank: number;
  telegram_id: string;
  first_name: string;
  username: string;
  invites: number;
}



const MEDAL_COLORS = [
  'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)',
  'linear-gradient(135deg, #D97706 0%, #92400E 100%)',
];
const PODIUM_BG = [
  'from-yellow-400 via-amber-500 to-amber-600 border-t-2 border-yellow-200 shadow-[0_10px_25px_rgba(245,158,11,0.35)] dark:shadow-[0_10px_25px_rgba(245,158,11,0.2)]',
  'from-slate-300 via-slate-400 to-slate-600 dark:from-slate-500 dark:via-slate-600 dark:to-slate-700 border-t-2 border-slate-200 dark:border-slate-400 shadow-[0_8px_20px_rgba(100,116,139,0.25)]',
  'from-amber-500 via-amber-600 to-amber-800 border-t-2 border-amber-300 shadow-[0_8px_20px_rgba(180,83,9,0.25)]',
];
const PODIUM_HEIGHTS = ['h-28', 'h-20', 'h-14'];
const RANK_PODIUM_ORDER = [1, 0, 2]; // silver left, gold center, bronze right

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(id: string) {
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-rose-500',
    'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-pink-500',
  ];
  let hash = 0;
  for (const c of id) hash = (hash + c.charCodeAt(0)) % colors.length;
  return colors[hash];
}

export default function Leaderboard() {
  const { user, language } = useGameStore();
  const PERIODS: { key: Period; label: string }[] = [
    { key: 'daily', label: t[language].leaderboard.periodDaily },
    { key: 'weekly', label: t[language].leaderboard.periodWeekly },
    { key: 'monthly', label: t[language].leaderboard.periodMonthly },
    { key: 'all', label: t[language].leaderboard.periodAll },
  ];
  const [tab, setTab] = useState<Tab>('players');
  const [period, setPeriod] = useState<Period>('weekly');
  const [players, setPlayers] = useState<Player[]>([]);
  const [inviters, setInviters] = useState<Inviter[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-telegram-init-data': typeof WebApp !== 'undefined' ? WebApp.initData : '',
  }), []);

  const fetchPlayers = useCallback(async (p: Period) => {
    const res = await fetch(`${API_URL}/leaderboard/players?period=${p}`, { headers: headers() });
    if (res.ok) {
      const data = await res.json();
      setPlayers(data.players || []);
      setMyRank(data.my_rank);
    }
  }, [headers]);

  const fetchInviters = useCallback(async () => {
    const res = await fetch(`${API_URL}/leaderboard/inviters`, { headers: headers() });
    if (res.ok) {
      const data = await res.json();
      setInviters(data.inviters || []);
      setMyRank(data.my_rank);
    }
  }, [headers]);

  const load = useCallback(async (t: Tab, p: Period, showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      if (t === 'players') await fetchPlayers(p);
      else await fetchInviters();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchPlayers, fetchInviters]);

  useEffect(() => { load(tab, period); }, [tab, period]);

  const handleTab = (t: Tab) => { setTab(t); setMyRank(null); };
  const handlePeriod = (p: Period) => { setPeriod(p); };
  const handleRefresh = () => load(tab, period, true);

  const list = tab === 'players' ? players : inviters;
  const top3 = list.slice(0, 3);
  const rest = list.slice(3);
  const myTelegramId = user?.telegram_id;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 transition-colors duration-200 pb-28">

      {/* ── 3D HEADER ── */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] sticky top-0 z-30 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-yellow-200 p-[1.5px] shadow-[0_4px_12px_rgba(245,158,11,0.3)] shrink-0">
              <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-inner">
                <Trophy size={20} className="drop-shadow-sm animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">{t[language].leaderboard.title}</h1>
              <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">{t[language].leaderboard.subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all border border-slate-200/60 dark:border-slate-700 shadow-sm flex items-center justify-center"
          >
            <RefreshCw size={17} className={`text-slate-600 dark:text-slate-300 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 3D Tab Toggle */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-1 gap-1.5 border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
          <button
            onClick={() => handleTab('players')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
              tab === 'players'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-[0_3px_10px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-slate-700 scale-[1.01]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Trophy size={14} className={tab === 'players' ? 'text-amber-500' : ''} />
            {t[language].leaderboard.topPlayers}
          </button>
          <button
            onClick={() => handleTab('inviters')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
              tab === 'inviters'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-[0_3px_10px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-slate-700 scale-[1.01]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus size={14} className={tab === 'inviters' ? 'text-purple-500' : ''} />
            {t[language].leaderboard.topInviters}
          </button>
        </div>
      </div>

      {/* ── 3D PERIOD FILTER (players only) ── */}
      {tab === 'players' && (
        <div className="px-4 pt-3 pb-1 flex gap-2">
          {PERIODS.map(p => {
            const isActive = period === p.key;
            return (
              <button
                key={p.key}
                onClick={() => handlePeriod(p.key)}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-black tracking-wide transition-all ${
                  isActive
                    ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-white shadow-[0_4px_10px_rgba(245,158,11,0.35)] border-b-2 border-amber-600 active:translate-y-0.5'
                    : 'bg-white dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/70 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3 shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
          <p className="text-slate-400 dark:text-slate-400 text-sm font-bold">{t[language].leaderboard.loading}</p>
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <Trophy size={32} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="font-black text-slate-700 dark:text-slate-200 text-base">{t[language].leaderboard.noData}</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">{t[language].leaderboard.noDataDesc}</p>
        </div>
      ) : (
        <>
          {/* ── 3D PODIUM TOP 3 ── */}
          {top3.length >= 2 && (
            <div className="px-4 pt-6 pb-2">
              <div className="flex items-end justify-center gap-3">
                {RANK_PODIUM_ORDER.map(ri => {
                  const p = top3[ri];
                  if (!p) return <div key={ri} className="flex-1" />;
                  const isCenter = ri === 0;
                  const isMine = p.telegram_id === myTelegramId;
                  return (
                    <div key={ri} className={`flex-1 flex flex-col items-center ${isCenter ? '-mb-1' : ''}`}>
                      {/* Crown for #1 */}
                      {isCenter && (
                        <div className="relative mb-1">
                          <Crown size={22} className="text-yellow-400 drop-shadow-[0_2px_8px_rgba(250,204,21,0.6)] animate-bounce" style={{ animationDuration: '2.5s' }} />
                        </div>
                      )}
                      {/* Avatar */}
                      <div className={`relative ${isCenter ? 'w-16 h-16' : 'w-13 h-13'} rounded-2xl ${getAvatarColor(p.telegram_id)} flex items-center justify-center mb-1.5 shadow-[0_6px_16px_rgba(0,0,0,0.2)] border-2 ${isCenter ? 'border-yellow-300 ring-4 ring-yellow-400/40' : ri === 1 ? 'border-slate-200 dark:border-slate-500' : 'border-amber-300 dark:border-amber-700'} ${isMine ? 'ring-2 ring-yellow-400' : ''}`}>
                        <span className={`text-white font-black ${isCenter ? 'text-lg' : 'text-sm'} drop-shadow`}>
                          {getInitials(p.first_name)}
                        </span>
                        {/* 3D Medal badge */}
                        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-md border-2 border-white dark:border-slate-900"
                          style={{ background: MEDAL_COLORS[ri] }}>
                          {ri + 1}
                        </div>
                      </div>
                      {/* Name */}
                      <p className={`font-black text-slate-800 dark:text-slate-100 text-center leading-tight ${isCenter ? 'text-xs' : 'text-[11px]'} max-w-[80px] truncate`}>
                        {p.first_name}
                      </p>
                      <p className={`font-bold text-center mt-0.5 ${isCenter ? 'text-amber-600 dark:text-amber-400 text-xs' : 'text-slate-500 dark:text-slate-400 text-[10px]'}`}>
                        {tab === 'players' ? `${(p as Player).wins} ${t[language].leaderboard.wins}` : `${(p as Inviter).invites} ${t[language].leaderboard.invites}`}
                      </p>
                      {/* 3D Podium Pillar with engraved rank number */}
                      <div className={`w-full mt-2.5 ${PODIUM_HEIGHTS[ri]} bg-gradient-to-b ${PODIUM_BG[ri]} rounded-t-2xl flex flex-col items-center justify-start pt-2 shadow-lg relative overflow-hidden`}>
                        {/* Top bevel highlight */}
                        <div className="absolute top-0 inset-x-0 h-1 bg-white/40" />
                        <span className="text-white/90 font-black text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                          {ri + 1}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 3D MY RANK BANNER ── */}
          {myRank && myRank > 3 && (
            <div className="mx-4 mb-3 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-amber-950/40 border border-amber-300 dark:border-amber-600/50 rounded-2xl px-4 py-3 flex items-center justify-between shadow-[0_4px_14px_rgba(245,158,11,0.12)] backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 flex items-center justify-center shadow-md">
                  <span className="text-white font-black text-xs">#{myRank}</span>
                </div>
                <span className="text-amber-800 dark:text-amber-300 font-bold text-sm">{t[language].leaderboard.yourRank}</span>
              </div>
              <span className="text-amber-700 dark:text-amber-400 text-xs font-black">
                {tab === 'players'
                  ? `${players.find(p => p.telegram_id === myTelegramId)?.wins || 0} ${t[language].leaderboard.wins}`
                  : `${inviters.find(p => p.telegram_id === myTelegramId)?.invites || 0} ${t[language].leaderboard.invites}`}
              </span>
            </div>
          )}

          {/* ── 3D FULL LIST TABLE ── */}
          <div className="mx-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_6px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] overflow-hidden backdrop-blur-sm transition-colors">
            {/* Header */}
            <div className="flex items-center px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">
              <span className="w-9">{t[language].leaderboard.rank}</span>
              <span className="flex-1">{t[language].leaderboard.player}</span>
              <span className="text-right">
                {tab === 'players' ? t[language].leaderboard.wins : t[language].leaderboard.invites}
              </span>
            </div>

            {/* Top 3 rows */}
            {top3.map((p, i) => {
              const isMine = p.telegram_id === myTelegramId;
              return (
                <div key={p.telegram_id}
                  className={`flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800/70 transition-colors ${
                    isMine
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-l-4 border-l-amber-500'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="w-9">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-sm border border-white/50"
                      style={{ background: MEDAL_COLORS[i] }}>
                      {i + 1}
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-xl ${getAvatarColor(p.telegram_id)} flex items-center justify-center mr-2.5 shrink-0 shadow-sm`}>
                    <span className="text-white font-black text-xs">{getInitials(p.first_name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${isMine ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {p.first_name} {isMine && <span className="text-[10px] text-amber-500 dark:text-amber-400 font-black">{t[language].leaderboard.you}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-sm ${i === 0 ? 'text-amber-500 dark:text-yellow-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {tab === 'players' ? (p as Player).wins : (p as Inviter).invites}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{tab === 'players' ? t[language].leaderboard.wins : t[language].leaderboard.invites}</p>
                  </div>
                </div>
              );
            })}

            {/* Rest of the list */}
            {rest.map((p) => {
              const isMine = p.telegram_id === myTelegramId;
              return (
                <div key={p.telegram_id}
                  className={`flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800/70 last:border-0 transition-colors ${
                    isMine
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-l-4 border-l-amber-500'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="w-9">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500">#{p.rank}</span>
                  </div>
                  <div className={`w-8 h-8 rounded-xl ${getAvatarColor(p.telegram_id)} flex items-center justify-center mr-2.5 shrink-0 shadow-sm`}>
                    <span className="text-white font-black text-xs">{getInitials(p.first_name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${isMine ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {p.first_name} {isMine && <span className="text-[10px] text-amber-500 dark:text-amber-400 font-black">(You)</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm text-slate-700 dark:text-slate-200">
                      {tab === 'players' ? (p as Player).wins : (p as Inviter).invites}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{tab === 'players' ? 'wins' : 'invites'}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-4" />
        </>
      )}
    </div>
  );
}