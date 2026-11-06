import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Trophy, Target, TrendingUp, Coins, Gamepad2, Crown, XCircle, Clock, RefreshCw, ChevronDown, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from '../store/gameStore';
import { t } from '../lib/translations';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface GameRecord {
  id: string;
  game_id?: string;
  game_number: string | null;
  stake: number;
  status: string;
  prize_pool: number;
  cartela_number: number | null;
  created_at: string | null;
  finished_at: string | null;
  start_at: string | null;
  is_winner: boolean;
  winner_name: string | null;
  winner_prize: number;
  total_calls: number;
}

interface Stats {
  total: number;
  wins: number;
  total_wagered: number;
  total_won: number;
  win_rate: number;
}

const STAKE_COLORS: Record<number, string> = {
  10:  'from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700',
  20:  'from-emerald-500 to-green-600 dark:from-emerald-600 dark:to-green-700',
  50:  'from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-700',
  100: 'from-rose-500 to-red-600 dark:from-rose-600 dark:to-red-700',
};

function getStakeGradient(stake: number): string {
  return STAKE_COLORS[stake] || 'from-slate-500 to-slate-700';
}

function timeAgo(dateStr: string | null, lang: 'en' | 'am'): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return t[lang].gamesReport.daysAgo.replace('{d}', d.toString());
  if (h > 0) return t[lang].gamesReport.hoursAgo.replace('{h}', h.toString());
  if (m > 0) return t[lang].gamesReport.minutesAgo.replace('{m}', m.toString());
  return t[lang].gamesReport.justNow;
}

export default function GamesReport() {
  const navigate = useNavigate();
  const { language } = useGameStore();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-telegram-init-data': typeof WebApp !== 'undefined' ? WebApp.initData : '',
  }), []);

  const fetchReport = useCallback(async (p: number, replace = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetch(`${API_URL}/games-report?page=${p}`, { headers: headers() });
      if (!res.ok) return;
      const data = await res.json();
      setGames(prev => replace ? (data.games || []) : [...prev, ...(data.games || [])]);
      setStats(data.stats);
      setHasMore(data.has_more);
      setPage(p);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [headers]);

  useEffect(() => { fetchReport(1, true); }, []);

  const filtered = games.filter(g => {
    if (filter === 'wins') return g.is_winner;
    if (filter === 'losses') return !g.is_winner && g.status === 'finished';
    return true;
  });

  const winsCount = games.filter(g => g.is_winner).length;
  const lossesCount = games.filter(g => !g.is_winner && g.status === 'finished').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 transition-colors duration-200 pb-12">

      {/* ── 3D HEADER ── */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-20 px-4 pt-5 pb-4 border-b border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] transition-colors">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all border border-slate-200/60 dark:border-slate-700 shadow-sm flex items-center justify-center shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-slate-800 dark:text-white leading-tight truncate">{t[language].gamesReport.title}</h1>
            <p className="text-xs text-slate-400 dark:text-slate-400 font-medium truncate">{t[language].gamesReport.subtitle}</p>
          </div>
          <button onClick={() => fetchReport(1, true)}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all border border-slate-200/60 dark:border-slate-700 shadow-sm flex items-center justify-center shrink-0">
            <RefreshCw size={16} className={`text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
          <p className="text-slate-400 dark:text-slate-400 font-bold text-sm">{t[language].gamesReport.loading}</p>
        </div>
      ) : (
        <>
          {/* ── 3D STATS DASHBOARD ── */}
          {stats && (
            <div className="px-4 pt-4 pb-3 space-y-3">

              {/* Big wins + win rate row (3D Gradient Cards) */}
              <div className="flex gap-3">
                <div className="flex-1 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 dark:from-amber-600 dark:via-amber-700 dark:to-orange-800 rounded-3xl p-4.5 shadow-[0_10px_25px_rgba(245,158,11,0.3)] dark:shadow-[0_10px_30px_rgba(245,158,11,0.2)] border-t border-white/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-lg pointer-events-none" />
                  <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 drop-shadow-sm">
                    <Trophy size={12} className="drop-shadow" /> {t[language].gamesReport.totalWins}
                  </p>
                  <p className="text-4xl font-black text-white leading-none drop-shadow-sm">{stats.wins}</p>
                  <p className="text-white/80 text-[10px] font-semibold mt-1.5">{t[language].gamesReport.totalGames.replace('{total}', stats.total.toString())}</p>
                </div>
                <div className="flex-1 bg-gradient-to-br from-purple-500 via-indigo-500 to-indigo-600 dark:from-purple-700 dark:via-indigo-800 dark:to-indigo-900 rounded-3xl p-4.5 shadow-[0_10px_25px_rgba(99,102,241,0.3)] dark:shadow-[0_10px_30px_rgba(99,102,241,0.2)] border-t border-white/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-lg pointer-events-none" />
                  <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 drop-shadow-sm">
                    <TrendingUp size={12} className="drop-shadow" /> {t[language].gamesReport.winRate}
                  </p>
                  <p className="text-4xl font-black text-white leading-none drop-shadow-sm">{stats.win_rate}<span className="text-xl">%</span></p>
                  <p className="text-white/80 text-[10px] font-semibold mt-1.5">{t[language].gamesReport.ofFinished}</p>
                </div>
              </div>

              {/* Bottom row (3D Elevated cards) */}
              <div className="flex gap-3">
                <div className="flex-1 bg-white dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-[0_6px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.4)] backdrop-blur-sm">
                  <p className="text-slate-400 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Coins size={12} className="text-slate-400" /> {t[language].gamesReport.played}
                  </p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white leading-none">{stats.total_wagered.toLocaleString()}</p>
                  <p className="text-slate-400 dark:text-slate-400 text-[10px] font-medium mt-1.5">{t[language].gamesReport.wagered}</p>
                </div>
                <div className="flex-1 bg-white dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-[0_6px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.4)] backdrop-blur-sm">
                  <p className="text-emerald-500 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Target size={12} /> {t[language].gamesReport.won}
                  </p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{stats.total_won.toLocaleString()}</p>
                  <p className="text-slate-400 dark:text-slate-400 text-[10px] font-medium mt-1.5">{t[language].gamesReport.prizeTotal}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── 3D FILTER BUTTONS ── */}
          <div className="px-4 pb-3 flex gap-2">
            <button onClick={() => setFilter('all')}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all ${
                filter === 'all'
                  ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-md border-t border-slate-600'
                  : 'bg-white dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}>
              {t[language].gamesReport.filterAll} ({stats?.total || 0})
            </button>
            <button onClick={() => setFilter('wins')}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all ${
                filter === 'wins'
                  ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-white shadow-[0_4px_12px_rgba(245,158,11,0.35)] border-b-2 border-amber-600'
                  : 'bg-white dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}>
              🏆 {t[language].gamesReport.filterWins} ({winsCount})
            </button>
            <button onClick={() => setFilter('losses')}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all ${
                filter === 'losses'
                  ? 'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-[0_4px_12px_rgba(244,63,94,0.35)] border-b-2 border-rose-700'
                  : 'bg-white dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}>
              ❌ {t[language].gamesReport.filterLoss} ({lossesCount})
            </button>
          </div>

          {/* ── GAME LIST ── */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-4 shadow-inner border border-slate-200/80 dark:border-slate-700">
                <Gamepad2 size={36} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="font-black text-slate-700 dark:text-slate-200 text-base">{t[language].gamesReport.noGames}</p>
              <p className="text-slate-400 dark:text-slate-400 text-sm mt-1">{t[language].gamesReport.joinGame}</p>
            </div>
          ) : (
            <div className="px-4 space-y-3.5">
              {filtered.map(g => {
                const isFinished = g.status === 'finished';
                const isOngoing  = g.status === 'waiting' || g.status === 'calling';
                const grad = getStakeGradient(g.stake);

                return (
                  <div key={g.id}
                    className={`bg-white dark:bg-slate-900/90 rounded-2xl overflow-hidden shadow-[0_6px_18px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.4)] border transition-all backdrop-blur-sm ${
                      g.is_winner
                        ? 'border-amber-300 dark:border-amber-500/50 ring-1 ring-amber-400/20'
                        : isOngoing
                        ? 'border-blue-200 dark:border-blue-500/40'
                        : 'border-slate-200/80 dark:border-slate-800'
                    }`}>

                    {/* 3D Stake Top Banner */}
                    <div className={`bg-gradient-to-r ${grad} px-4 py-3 flex items-center justify-between border-t border-white/20 shadow-sm`}>
                      <div className="flex items-center gap-2">
                        <Gamepad2 size={16} className="text-white drop-shadow-sm" />
                        <span className="text-white font-black text-sm drop-shadow-sm">{g.stake} ETB</span>
                        {(g.game_number || g.id) && (
                          <span className="bg-black/20 text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded-md flex items-center gap-0.5 border border-white/20">
                            <Hash size={9} />{(g.game_number || g.id?.slice(0, 8) || '').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        {g.is_winner && (
                          <span className="bg-amber-300 text-amber-950 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm border border-amber-200">
                            <Crown size={11} className="drop-shadow-sm" /> {t[language].gamesReport.youWon}
                          </span>
                        )}
                        {isFinished && !g.is_winner && (
                          <span className="bg-black/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10">{t[language].gamesReport.finished}</span>
                        )}
                        {isOngoing && (
                          <span className="bg-black/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
                            <Clock size={10} /> {t[language].gamesReport.live}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="px-4 py-3 grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800">
                      <div className="pr-3">
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-1">{t[language].gamesReport.cartela}</p>
                        <p className="font-black text-slate-800 dark:text-slate-100 text-lg leading-none">
                          {g.cartela_number ? `#${g.cartela_number}` : '—'}
                        </p>
                      </div>
                      <div className="px-3">
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-1">{t[language].gamesReport.prizePool}</p>
                        <p className="font-black text-slate-700 dark:text-slate-200 text-lg leading-none">
                          {g.prize_pool.toLocaleString()}
                          <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold"> ETB</span>
                        </p>
                      </div>
                      <div className="pl-3">
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wide mb-1">{t[language].gamesReport.calls}</p>
                        <p className="font-black text-slate-700 dark:text-slate-200 text-lg leading-none">{g.total_calls}</p>
                      </div>
                    </div>

                    {/* 3D Footer */}
                    <div className="px-4 pb-3 flex items-center justify-between gap-2 border-t border-slate-50 dark:border-slate-800/60 pt-2.5">
                      {g.is_winner ? (
                        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/50 rounded-xl px-3 py-1.5 flex-1">
                          <Trophy size={14} className="text-amber-500 shrink-0 drop-shadow-sm" />
                          <span className="text-amber-800 dark:text-amber-300 font-black text-xs">{t[language].gamesReport.wonAmount.replace('{amount}', g.winner_prize.toLocaleString())}</span>
                        </div>
                      ) : isFinished ? (
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 rounded-xl px-3 py-1.5 flex-1">
                          <XCircle size={14} className="text-slate-400 shrink-0" />
                          <span className="text-slate-600 dark:text-slate-300 font-bold text-xs truncate">
                            {t[language].gamesReport.wonBy.replace('{name}', g.winner_name || t[language].gamesReport.anotherPlayer)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-700/50 rounded-xl px-3 py-1.5 flex-1">
                          <Clock size={14} className="text-blue-500 shrink-0" />
                          <span className="text-blue-700 dark:text-blue-300 font-bold text-xs">{t[language].gamesReport.inProgress}</span>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                        {timeAgo(g.finished_at || g.created_at, language)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <button onClick={() => fetchReport(page + 1)} disabled={loadingMore}
                  className="w-full py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                  {loadingMore
                    ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    : <><ChevronDown size={16} /> {t[language].gamesReport.loadMore}</>
                  }
                </button>
              )}
              <div className="h-2" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
