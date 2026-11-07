import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Gift, 
  Trophy, 
  Gamepad2, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  RefreshCw, 
  Clock, 
  Coins, 
  Zap, 
  Flame, 
  X,
  Target,
  Layers,
  Crown,
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from '../store/gameStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Campaign {
  id: string;
  title: string;
  title_am?: string;
  description: string;
  description_am?: string;
  target_value: number;
  reward_type: string;
  reward_value: number;
  max_winners: number;
  current_claims: number;
  is_active: boolean;
  round_number: number;
  user_progress: number;
  potential_reward: number;
  has_claimed: boolean;
  claim_info: any | null;
  is_eligible: boolean;
  is_slots_full: boolean;
  spots_left: number;
  scheduled_at?: string | null;
  is_scheduled?: boolean;
  scheduled_countdown_seconds?: number;
}

interface UserStats {
  total_games: number;
  total_stake: number;
  invited_reward: number;
  bonus_balance: number;
}

interface RecentClaimer {
  campaign_id: string;
  round_number: number;
  first_name: string;
  username: string;
  claim_amount: number;
  claim_order: number;
  claimed_at: string;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

// 🌟 Formats numbers compactly (e.g. 1000 -> 1k, 999570 -> 999.6k, 1000000 -> 1M)
function formatCompact(num: number | string | undefined | null, isCurrency = false): string {
  if (num === undefined || num === null || isNaN(Number(num))) {
    return isCurrency ? '0.00' : '0';
  }
  const n = Number(num);
  const abs = Math.abs(n);

  if (abs >= 1_000_000_000) {
    const val = n / 1_000_000_000;
    const rounded = Math.round(val * 10) / 10;
    return (rounded >= 1000 ? '1T' : `${rounded}B`).replace('.0B', 'B');
  }
  if (abs >= 1_000_000) {
    const val = n / 1_000_000;
    const rounded = Math.round(val * 10) / 10;
    return (rounded >= 1000 ? '1B' : `${rounded}M`).replace('.0M', 'M');
  }
  if (abs >= 1_000) {
    const val = n / 1_000;
    const rounded = Math.round(val * 10) / 10;
    return (rounded >= 1000 ? '1M' : `${rounded}k`).replace('.0k', 'k');
  }
  return isCurrency 
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString('en-US');
}

function formatCountdown(totalSec: number): string {
  if (totalSec <= 0) return '00:00:00';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function Rewards() {
  const navigate = useNavigate();
  const { user, fetchUser, language } = useGameStore();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentClaimers, setRecentClaimers] = useState<RecentClaimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 🌟 Category tab: 'gursha' first by default
  const [activeCategory, setActiveCategory] = useState<'gursha' | 'milestones' | 'all'>('gursha');

  // Success Modal State
  const [successModal, setSuccessModal] = useState<{
    open: boolean;
    title: string;
    amount: number;
    spot: number;
  }>({ open: false, title: '', amount: 0, spot: 0 });

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-telegram-init-data': typeof WebApp !== 'undefined' ? WebApp.initData : '',
  }), []);

  const fetchRewards = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/rewards`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        setUserStats(data.user_stats || null);
        setRecentClaimers(data.recent_claimers || []);
      }
    } catch (err: any) {
      console.error('Fetch rewards error:', err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  // Live countdown ticker for scheduled campaigns (e.g. Gursha 24h timer)
  useEffect(() => {
    const timer = setInterval(() => {
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.is_scheduled && c.scheduled_countdown_seconds !== undefined && c.scheduled_countdown_seconds > 0) {
            const nextSec = c.scheduled_countdown_seconds - 1;
            if (nextSec <= 0) {
              return { ...c, is_scheduled: false, scheduled_countdown_seconds: 0, is_eligible: true };
            }
            return { ...c, scheduled_countdown_seconds: nextSec };
          }
          return c;
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClaim = async (campaign: Campaign) => {
    if (!campaign.is_eligible || claimingId) return;

    if (typeof WebApp !== 'undefined') {
      try { WebApp.HapticFeedback.impactOccurred('medium'); } catch (_) {}
    }

    setClaimingId(campaign.id);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/rewards/claim`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ campaign_id: campaign.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to claim reward. Please try again.');
        return;
      }

      fetchUser();
      await fetchRewards();

      if (typeof WebApp !== 'undefined') {
        try { WebApp.HapticFeedback.notificationOccurred('success'); } catch (_) {}
      }

      setSuccessModal({
        open: true,
        title: language === 'am' && campaign.title_am ? campaign.title_am : campaign.title,
        amount: data.reward_amount || campaign.potential_reward,
        spot: data.claim_order || 1,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while claiming reward.');
    } finally {
      setClaimingId(null);
    }
  };

  const isAmharic = language === 'am';

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(c => {
    if (activeCategory === 'gursha') return c.id === 'gursha';
    if (activeCategory === 'milestones') return c.id === 'total_games' || c.id === 'invitation_reward';
    return true; // 'all'
  });

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 transition-colors duration-200 pb-28 select-none">
      <div className="max-w-md mx-auto">

        {/* ── 3D TOP LUXURY APP BAR ── */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 px-4 pt-4 pb-3 border-b border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center active:scale-90 transition-all shadow-sm hover:bg-slate-100"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-base font-black text-slate-800 dark:text-white leading-tight flex items-center gap-1.5">
                <Gift size={18} className="text-amber-500 shrink-0" />
                <span>{isAmharic ? 'ቦነሶች እና ሽልማቶች' : 'Bonuses & Rewards'}</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold">
                {isAmharic ? 'የተዘጋጁ ልዩ ቦነሶችን ይውሰዱ' : 'Claim your milestone rewards'}
              </p>
            </div>
          </div>

          <button
            onClick={() => { setLoading(true); fetchRewards(); }}
            className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-90 transition-all shadow-sm hover:bg-slate-100"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-amber-500' : ''} />
          </button>
        </div>

        {/* ── ERROR ALERT ── */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-bold animate-shake">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="p-1 hover:text-rose-900">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── 🌟 FULL-WIDTH SLIM COMPACT ORANGE BONUS BANNER (NO SIDE BORDER, COMPACT HEIGHT) ── */}
        <div className="w-full bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 text-white px-4 py-3 shadow-md relative overflow-hidden border-b border-amber-600/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/15 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div>
              <span className="text-amber-100 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={11} className="text-amber-200 animate-pulse" />
                {isAmharic ? 'ያለዎት የቦነስ ሂሳብ' : 'Bonus Balance'}
              </span>
              <p 
                className="text-2xl font-black text-white leading-tight mt-0.5 drop-shadow-sm cursor-pointer"
                title={`${Number(userStats?.bonus_balance ?? user?.bonus_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB`}
              >
                {formatCompact(userStats?.bonus_balance ?? user?.bonus_balance ?? 0, true)}
                <span className="text-xs font-bold text-amber-100 ml-1">ETB</span>
              </p>
            </div>

            {/* 3 Compact metrics in an inline row */}
            <div className="flex items-center gap-1.5">
              <div 
                className="bg-black/15 backdrop-blur-xs rounded-xl px-2.5 py-1 text-center border border-white/10 shadow-xs cursor-pointer"
                title={`${Number(userStats?.total_games ?? user?.total_games ?? 0).toLocaleString()} games`}
              >
                <p className="text-[7.5px] font-bold uppercase text-amber-100 leading-none">{isAmharic ? 'ጨዋታ' : 'Games'}</p>
                <p className="text-[11px] font-black text-white mt-0.5 leading-none">🎮 {formatCompact(userStats?.total_games ?? user?.total_games ?? 0)}</p>
              </div>
              <div 
                className="bg-black/15 backdrop-blur-xs rounded-xl px-2.5 py-1 text-center border border-white/10 shadow-xs cursor-pointer"
                title={`${Number(userStats?.total_stake ?? user?.total_stake ?? 0).toLocaleString()} ETB`}
              >
                <p className="text-[7.5px] font-bold uppercase text-amber-100 leading-none">{isAmharic ? 'ውርርድ' : 'Stake'}</p>
                <p className="text-[11px] font-black text-white mt-0.5 leading-none">{formatCompact(userStats?.total_stake ?? user?.total_stake ?? 0)} <span className="text-[7px]">ETB</span></p>
              </div>
              <div 
                className="bg-black/15 backdrop-blur-xs rounded-xl px-2.5 py-1 text-center border border-white/10 shadow-xs cursor-pointer"
                title={`${Number(userStats?.invited_reward ?? user?.invited_reward ?? 0).toLocaleString()} ETB`}
              >
                <p className="text-[7.5px] font-bold uppercase text-amber-100 leading-none">{isAmharic ? 'ግብዣ' : 'Invite'}</p>
                <p className="text-[11px] font-black text-white mt-0.5 leading-none">{formatCompact(userStats?.invited_reward ?? user?.invited_reward ?? 0)} <span className="text-[7px]">ETB</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 🌟 3D CATEGORY PILLS BAR (GURSHA FIRST AS REQUESTED) ── */}
        <div className="px-4 pt-4 pb-2">
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl flex items-center gap-1.5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            {/* Tab 1: Gursha Bonus (First) */}
            <button
              onClick={() => setActiveCategory('gursha')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                activeCategory === 'gursha'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 border-t border-white/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Zap size={14} className={activeCategory === 'gursha' ? 'text-amber-100' : 'text-amber-500'} />
              <span>{isAmharic ? 'ጉርሻ ቦነስ' : 'Gursha Bonus'}</span>
            </button>

            {/* Tab 2: Milestones */}
            <button
              onClick={() => setActiveCategory('milestones')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                activeCategory === 'milestones'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 border-t border-white/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Trophy size={14} className={activeCategory === 'milestones' ? 'text-amber-100' : 'text-amber-500'} />
              <span>{isAmharic ? 'ማይልስቶኖች' : 'Milestones'}</span>
            </button>

            {/* Tab 3: All */}
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                activeCategory === 'all'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 border-t border-white/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Layers size={14} />
              <span>{isAmharic ? 'ሁሉም' : 'All'}</span>
            </button>
          </div>
        </div>

        {/* ── 🌟 ATTRACTIVE 3D REWARD CARDS ── */}
        <div className="px-4 pt-2 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3 shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
              <p className="text-xs font-bold text-slate-400">{isAmharic ? 'ቦነሶችን በመጫን ላይ...' : 'Loading rewards...'}</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
              <Gift size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-bold text-sm text-slate-600 dark:text-slate-300">{isAmharic ? 'ምንም ቦነሶች የሉም' : 'No rewards currently available.'}</p>
            </div>
          ) : (
            filteredCampaigns.map((camp) => {
              const isClaiming = claimingId === camp.id;
              const titleText = isAmharic && camp.title_am ? camp.title_am : camp.title;
              const descText = isAmharic && camp.description_am ? camp.description_am : camp.description;

              const isGursha = camp.id === 'gursha';
              const isGamesMilestone = camp.id === 'total_games';
              const isInviteMilestone = camp.id === 'invitation_reward';

              const progressPct = camp.target_value > 0 
                ? Math.min(100, Math.round((camp.user_progress / camp.target_value) * 100))
                : 100;

              // Attractive Icon & Themes
              let cardTheme = {
                iconBg: 'bg-gradient-to-tr from-amber-400 to-orange-500 text-white shadow-[0_4px_12px_rgba(245,158,11,0.3)]',
                icon: <Gamepad2 size={22} />,
                badge: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/50',
                barGradient: 'from-amber-400 to-orange-500',
              };

              if (isInviteMilestone) {
                cardTheme = {
                  iconBg: 'bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]',
                  icon: <Users size={22} />,
                  badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/50',
                  barGradient: 'from-emerald-400 to-teal-500',
                };
              } else if (isGursha) {
                cardTheme = {
                  iconBg: 'bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)]',
                  icon: <Zap size={22} />,
                  badge: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700/50',
                  barGradient: 'from-purple-500 to-indigo-500',
                };
              }

              // 🌟 REWARD DISPLAY: Range 100 - 1,000 ETB for 500 Games Milestone!
              const rewardHeading = isGamesMilestone
                ? '100 - 1,000 ETB'
                : `${camp.reward_value.toLocaleString()} ETB`;

              const rewardSub = isGamesMilestone
                ? (isAmharic ? 'የ 10 - 100 ብር መደብ 2% ቦነስ' : '2% of stake from 10 - 100 ETB')
                : isGursha
                ? (isAmharic ? 'የፈጣን ማህበረሰብ ጉርሻ' : 'Instant Community Cash')
                : (isAmharic ? 'ቋሚ የቦነስ ሽልማት' : 'Flat Cash Bonus');

              return (
                <div
                  key={camp.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-[0_8px_25px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] relative overflow-hidden transition-all"
                >
                  {/* Top card header */}
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${cardTheme.iconBg}`}>
                        {cardTheme.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                          {titleText}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                          {descText}
                        </p>
                      </div>
                    </div>

                    {/* Spots Counter Badge */}
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shrink-0 ${cardTheme.badge}`}>
                      {camp.is_slots_full
                        ? (isAmharic ? 'ቦታው ተሞልቷል' : 'Full')
                        : camp.is_scheduled
                        ? (isAmharic ? `⏰ በቅርቡ (${camp.spots_left} ቦታዎች)` : `⏰ Starts soon (${camp.spots_left} spots)`)
                        : `${camp.spots_left} / ${camp.max_winners} ${isAmharic ? 'ቦታዎች' : 'left'}`}
                    </span>
                  </div>

                  {/* 🌟 Big Attractive Reward Value Box */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 my-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {isAmharic ? 'የሽልማት መጠን' : 'Reward Value'}
                      </p>
                      <p className="text-xl font-black text-slate-800 dark:text-white leading-tight mt-0.5">
                        {rewardHeading}
                      </p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                        {rewardSub}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {isAmharic ? 'ሁኔታ' : 'Status'}
                      </p>
                      <div className="mt-0.5">
                        {camp.has_claimed ? (
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                            <CheckCircle2 size={13} /> {isAmharic ? 'ተወስዷል' : 'Claimed'}
                          </span>
                        ) : camp.is_slots_full ? (
                          <span className="text-xs font-black text-rose-500 flex items-center gap-1 justify-end">
                            <Lock size={13} /> {isAmharic ? 'ተዘግቷል' : 'Closed'}
                          </span>
                        ) : camp.is_scheduled ? (
                          <span className="text-xs font-black text-amber-500 flex items-center gap-1 justify-end">
                            <Clock size={13} className="animate-spin" /> {isAmharic ? 'በቅርቡ' : 'Scheduled'}
                          </span>
                        ) : camp.is_eligible ? (
                          <span className="text-xs font-black text-amber-500 flex items-center gap-1 justify-end animate-pulse">
                            <Sparkles size={13} /> {isAmharic ? 'ዝግጁ ነው!' : 'Ready!'}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">
                            {progressPct}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Countdown Banner (If scheduled) */}
                  {camp.is_scheduled && (
                    <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-400/30 dark:border-amber-500/30 rounded-2xl p-3 mb-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-black text-amber-700 dark:text-amber-400 mb-1">
                        <Clock size={14} className="animate-pulse" />
                        <span>{isAmharic ? 'የተያዘለት ሰዓት ሲደርስ ክፍት ይሆናል' : 'Scheduled Launch Countdown'}</span>
                      </div>
                      <p className="font-mono text-2xl font-black text-amber-600 dark:text-amber-400 tracking-wider">
                        {formatCountdown(camp.scheduled_countdown_seconds || 0)}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {camp.scheduled_at && `${new Date(camp.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${new Date(camp.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} (24h)`}
                      </p>
                    </div>
                  )}

                  {/* Progress Bar (Only for milestone targets, NOT Gursha!) */}
                  {!isGursha && camp.target_value > 0 && (
                    <div className="mb-4 px-0.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1.5">
                        <span>{isAmharic ? 'የደረሱበት ደረጃ' : 'Milestone Progress'}</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                          {camp.user_progress.toLocaleString()} / {camp.target_value.toLocaleString()} {isGamesMilestone ? (isAmharic ? 'ጨዋታዎች' : 'games') : 'ETB'}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700 shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${cardTheme.barGradient}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 🌟 3D INTERACTIVE ACTION BUTTON */}
                  {camp.has_claimed ? (
                    <button
                      disabled
                      className="w-full py-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center gap-2 shadow-xs cursor-default"
                    >
                      <CheckCircle2 size={16} />
                      <span>
                        {isAmharic ? 'ቦነስ ተወስዷል (ቦታ #' : 'Bonus Claimed (Spot #'}
                        {camp.claim_info?.claim_order || 1})
                      </span>
                    </button>
                  ) : camp.is_slots_full ? (
                    <button
                      disabled
                      className="w-full py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <Lock size={15} />
                      <span>{isAmharic ? 'ሁሉም ቦታዎች ተሞልተዋል' : 'All Spots Claimed'}</span>
                    </button>
                  ) : camp.is_scheduled ? (
                    <button
                      disabled
                      className="w-full py-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 font-black text-xs flex items-center justify-center gap-2 shadow-xs cursor-not-allowed"
                    >
                      <Clock size={16} className="animate-spin text-amber-500" />
                      <span>
                        {isAmharic 
                          ? `በቅርቡ ይጀምራል · ቀሪ ${formatCountdown(camp.scheduled_countdown_seconds || 0)}` 
                          : `Scheduled · Starts in ${formatCountdown(camp.scheduled_countdown_seconds || 0)}`}
                      </span>
                    </button>
                  ) : camp.is_eligible ? (
                    <button
                      onClick={() => handleClaim(camp)}
                      disabled={isClaiming}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-black text-sm shadow-[0_8px_25px_rgba(245,158,11,0.35)] border-t border-white/40 transition-all flex items-center justify-center gap-2 animate-pulse"
                    >
                      {isClaiming ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Gift size={18} />
                          <span>
                            {isAmharic ? 'ቦነሱን አሁን ይውሰዱ' : 'Claim'} {camp.potential_reward.toLocaleString()} ETB!
                          </span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200/80 dark:border-slate-700"
                    >
                      <Lock size={14} />
                      <span>
                        {isAmharic ? 'ገና አልደረሱም (' : 'In Progress ('}
                        {camp.target_value - camp.user_progress > 0 
                          ? `${(camp.target_value - camp.user_progress).toLocaleString()} ${isGamesMilestone ? 'games' : 'ETB'} left)` 
                          : 'Locked)'}
                      </span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── 🌟 LIVE BONUS WINNERS AUDIT ── */}
        {recentClaimers.length > 0 && (
          <div className="px-4 pt-6 pb-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Trophy size={15} className="text-amber-500" />
              <span>{isAmharic ? 'የቅርብ ጊዜ ቦነስ የወሰዱ' : 'Live Bonus Winners'}</span>
            </h3>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
              {recentClaimers.map((rc, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black text-xs flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                      #{rc.claim_order}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                        {rc.first_name || 'Player'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {rc.campaign_id === 'total_games'
                          ? (isAmharic ? '500 ጨዋታዎች ቦነስ' : '500 Games Milestone')
                          : rc.campaign_id === 'invitation_reward'
                          ? (isAmharic ? 'የግብዣ ቦነስ' : 'Referral Milestone')
                          : (isAmharic ? 'የማህበረሰብ ጉርሻ' : 'Gursha Flash')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      +{Number(rc.claim_amount).toLocaleString()} ETB
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {timeAgo(rc.claimed_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── 3D SUCCESS CLAIM POPUP MODAL ── */}
      {successModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl border border-amber-300 dark:border-amber-600/50 animate-scale-up relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center mx-auto mb-3 shadow-[0_6px_20px_rgba(245,158,11,0.4)]">
              <Gift size={32} className="animate-bounce" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              {isAmharic ? `አሸናፊ ቦታ #${successModal.spot}` : `Winner Spot #${successModal.spot}`}
            </span>

            <h3 className="text-xl font-black text-slate-800 dark:text-white mt-3 mb-1">
              {isAmharic ? 'እንኳን ደስ አለዎት!' : 'Congratulations!'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2">
              {isAmharic ? 'የቦነስ ሽልማትዎ በተሳካ ሁኔታ ተወስዷል!' : 'Your milestone reward has been claimed successfully!'}
            </p>

            <div className="my-4 py-3.5 px-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
              <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">
                {successModal.title}
              </p>
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                +{successModal.amount.toLocaleString()} <span className="text-sm">ETB</span>
              </p>
              <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-semibold mt-1">
                {isAmharic ? 'ወደ ቦነስ ሂሳብዎ ገብቷል' : 'Added to your Bonus Balance'}
              </p>
            </div>

            <button
              onClick={() => setSuccessModal({ open: false, title: '', amount: 0, spot: 0 })}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm shadow-md active:scale-95 transition-all"
            >
              {isAmharic ? 'በጣም ጥሩ! (እሺ)' : 'Awesome, Thank you!'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
