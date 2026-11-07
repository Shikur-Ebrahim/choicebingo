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
  ChevronRight, 
  Clock, 
  Coins, 
  Zap, 
  Flame, 
  Check, 
  X,
  Target,
  Layers
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from '../store/gameStore';
import { t } from '../lib/translations';

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

export default function Rewards() {
  const navigate = useNavigate();
  const { user, fetchUser, language } = useGameStore();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentClaimers, setRecentClaimers] = useState<RecentClaimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 🌟 Category tab: 'gursha' first by default as requested!
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

      // Success! Refresh user balance & rewards list
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

  // Filter campaigns based on the active category tab
  const filteredCampaigns = campaigns.filter(c => {
    if (activeCategory === 'gursha') {
      return c.id === 'gursha';
    }
    if (activeCategory === 'milestones') {
      return c.id === 'total_games' || c.id === 'invitation_reward';
    }
    return true; // 'all'
  });

  // Gursha campaign reference
  const gurshaCamp = campaigns.find(c => c.id === 'gursha');
  const milestoneCamps = campaigns.filter(c => c.id !== 'gursha');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 transition-colors duration-200 pb-24 select-none">
      <div className="max-w-md mx-auto">

        {/* ── 3D INTEGRATED LUXURY ORANGE HEADER & BONUS WALLET (FLUSH TOP, NO AWKWARD TOP CURVE) ── */}
        <div className="bg-gradient-to-b from-amber-500 via-amber-500 to-orange-600 text-white pt-4 pb-6 px-4 shadow-[0_10px_30px_rgba(245,158,11,0.25)] rounded-b-[36px] relative overflow-hidden">
          {/* Subtle ambient light effects */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-amber-300/20 rounded-full blur-xl pointer-events-none" />

          {/* Top navigation row */}
          <div className="flex items-center justify-between relative z-10 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl bg-black/15 hover:bg-black/25 text-white flex items-center justify-center backdrop-blur-md border border-white/20 active:scale-90 transition-all shadow-xs"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="text-center">
              <h1 className="text-base font-black text-white leading-tight flex items-center justify-center gap-1.5 drop-shadow-sm">
                <Gift size={18} className="text-amber-200 shrink-0" />
                <span>{isAmharic ? 'ቦነሶች እና ሽልማቶች' : 'Bonuses & Rewards'}</span>
              </h1>
            </div>

            <button
              onClick={() => { setLoading(true); fetchRewards(); }}
              className="w-9 h-9 rounded-xl bg-black/15 hover:bg-black/25 text-white flex items-center justify-center backdrop-blur-md border border-white/20 active:scale-90 transition-all shadow-xs"
            >
              <RefreshCw size={15} className={`text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Bonus balance display */}
          <div className="text-center relative z-10 my-2">
            <span className="text-white/85 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Sparkles size={13} className="text-amber-200 animate-pulse" />
              {isAmharic ? 'ያለዎት የቦነስ ሂሳብ' : 'Your Bonus Balance'}
            </span>
            <p className="text-3xl font-black text-white leading-tight drop-shadow-md mt-1 tracking-tight">
              {Number(userStats?.bonus_balance ?? user?.bonus_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm font-bold text-amber-200 ml-1.5">ETB</span>
            </p>
          </div>

          {/* 3 Translucent Frosted Glass Metric Capsules */}
          <div className="grid grid-cols-3 gap-2 mt-4 relative z-10 text-center">
            <div className="bg-black/15 backdrop-blur-md rounded-2xl p-2 border border-white/15 shadow-inner">
              <p className="text-[8px] font-bold uppercase tracking-wider text-white/80">{isAmharic ? 'ጨዋታዎች' : 'Games'}</p>
              <p className="text-xs font-black text-white mt-0.5">🎮 {userStats?.total_games ?? user?.total_games ?? 0}</p>
            </div>
            <div className="bg-black/15 backdrop-blur-md rounded-2xl p-2 border border-white/15 shadow-inner">
              <p className="text-[8px] font-bold uppercase tracking-wider text-white/80">{isAmharic ? 'ውርርድ' : 'Stake'}</p>
              <p className="text-xs font-black text-white mt-0.5">{Number(userStats?.total_stake ?? user?.total_stake ?? 0).toLocaleString()} <span className="text-[7.5px]">ETB</span></p>
            </div>
            <div className="bg-black/15 backdrop-blur-md rounded-2xl p-2 border border-white/15 shadow-inner">
              <p className="text-[8px] font-bold uppercase tracking-wider text-white/80">{isAmharic ? 'ግብዣ' : 'Referral'}</p>
              <p className="text-xs font-black text-white mt-0.5">{Number(userStats?.invited_reward ?? user?.invited_reward ?? 0).toLocaleString()} <span className="text-[7.5px]">ETB</span></p>
            </div>
          </div>
        </div>

        {/* ── ERROR ALERT ── */}
        {errorMsg && (
          <div className="mx-3.5 mt-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-bold animate-shake">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="p-1 hover:text-rose-900">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── 🌟 3 CATEGORY TABS (GURSHA FIRST AS REQUESTED) ── */}
        <div className="px-3.5 pt-4 pb-2">
          <div className="bg-slate-100 dark:bg-slate-900/80 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/80 dark:border-slate-800 shadow-inner">
            {/* Tab 1: Gursha Bonus (First Tab) */}
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

        {/* ── CAMPAIGN CARDS LIST ── */}
        <div className="px-3.5 pt-2 space-y-3.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3 shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
              <p className="text-xs font-bold text-slate-400">{isAmharic ? 'ቦነሶችን በመጫን ላይ...' : 'Loading rewards...'}</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
              <Gift size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-bold text-sm text-slate-600 dark:text-slate-300">{isAmharic ? 'ምንም ቦነሶች የሉም' : 'No rewards currently available.'}</p>
            </div>
          ) : (
            filteredCampaigns.map((camp) => {
              const isClaiming = claimingId === camp.id;
              const titleText = isAmharic && camp.title_am ? camp.title_am : camp.title;
              const descText = isAmharic && camp.description_am ? camp.description_am : camp.description;
              
              // Progress percentage
              const progressPct = camp.target_value > 0 
                ? Math.min(100, Math.round((camp.user_progress / camp.target_value) * 100))
                : 100;

              // Card styling themes
              let theme = {
                badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-700/50',
                border: 'border-slate-200/90 dark:border-slate-800',
                glow: 'shadow-[0_6px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_6px_25px_rgba(0,0,0,0.4)]',
                icon: <Gamepad2 size={18} className="text-amber-500" />,
                barColor: 'bg-gradient-to-r from-amber-400 to-orange-500',
              };

              if (camp.id === 'invitation_reward') {
                theme = {
                  badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50',
                  border: 'border-slate-200/90 dark:border-slate-800',
                  glow: 'shadow-[0_6px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_6px_25px_rgba(0,0,0,0.4)]',
                  icon: <Users size={18} className="text-emerald-500" />,
                  barColor: 'bg-gradient-to-r from-emerald-400 to-teal-500',
                };
              } else if (camp.id === 'gursha') {
                theme = {
                  badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-700/50',
                  border: 'border-slate-200/90 dark:border-slate-800',
                  glow: 'shadow-[0_6px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_6px_25px_rgba(0,0,0,0.4)]',
                  icon: <Zap size={18} className="text-purple-500" />,
                  barColor: 'bg-gradient-to-r from-purple-500 to-indigo-500',
                };
              }

              // 🌟 Reward Display Text: For 500 Games Milestone, show range '100 - 1,000 ETB' instead of '2% of stake'!
              const rewardDisplayText = camp.id === 'total_games'
                ? '100 - 1,000 ETB'
                : `${camp.reward_value.toLocaleString()} ETB`;

              const rewardSubText = camp.id === 'total_games'
                ? (isAmharic ? '(ከ 10 - 100 ብር መደብ 2% ቦነስ)' : '(2% of stake from 10 - 100 ETB)')
                : (isAmharic ? 'የቦነስ ሂሳብ' : 'Bonus Balance');

              return (
                <div
                  key={camp.id}
                  className={`bg-white dark:bg-slate-900/90 rounded-3xl p-4 border ${theme.border} ${theme.glow} transition-all relative overflow-hidden backdrop-blur-sm ${
                    camp.has_claimed ? 'opacity-90' : ''
                  }`}
                >
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2.5 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700 shadow-inner">
                        {theme.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                          {titleText}
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium line-clamp-1 mt-0.5">
                          {descText}
                        </p>
                      </div>
                    </div>

                    {/* Spots Counter Badge */}
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full border shrink-0 ${theme.badgeBg}`}>
                      {camp.is_slots_full
                        ? (isAmharic ? 'ቦታው ተሞልቷል' : 'Full')
                        : `${camp.spots_left} / ${camp.max_winners} ${isAmharic ? 'ቦታዎች' : 'spots'}`}
                    </span>
                  </div>

                  {/* 🌟 Reward Amount Display (Range 100 - 1,000 ETB for 500 Games) */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 my-2.5 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                        {isAmharic ? 'ሽልማት' : 'Reward Value'}
                      </p>
                      <p className="text-lg font-black text-slate-800 dark:text-white leading-tight mt-0.5">
                        {rewardDisplayText}
                      </p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-400 font-semibold mt-0.5">
                        {rewardSubText}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                        {isAmharic ? 'የእድል ሁኔታ' : 'Eligibility'}
                      </p>
                      <p className="text-xs font-black mt-0.5">
                        {camp.has_claimed ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                            <CheckCircle2 size={12} /> {isAmharic ? 'ተወስዷል' : 'Claimed'}
                          </span>
                        ) : camp.is_slots_full ? (
                          <span className="text-rose-500 flex items-center gap-1 justify-end">
                            <Lock size={12} /> {isAmharic ? 'ተዘግቷል' : 'Completed'}
                          </span>
                        ) : camp.is_eligible ? (
                          <span className="text-amber-500 flex items-center gap-1 justify-end animate-pulse">
                            <Sparkles size={12} /> {isAmharic ? 'ለመውሰድ ዝግጁ!' : 'Ready to Claim!'}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-400">
                            {camp.target_value > 0 ? `${progressPct}%` : 'Locked'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar (if milestone has target) */}
                  {camp.target_value > 0 && (
                    <div className="mb-3 px-0.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-400 mb-1">
                        <span>{isAmharic ? 'የደረሱበት' : 'Progress'}</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">
                          {camp.user_progress.toLocaleString()} / {camp.target_value.toLocaleString()} {camp.id === 'total_games' ? (isAmharic ? 'ጨዋታዎች' : 'games') : 'ETB'}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/60 shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${theme.barColor}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* ACTION CLAIM BUTTON */}
                  {camp.has_claimed ? (
                    <button
                      disabled
                      className="w-full py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center gap-1.5 shadow-xs"
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
                      className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <Lock size={15} />
                      <span>{isAmharic ? 'ሁሉም ቦታዎች ተሞልተዋል' : 'All Spots Claimed'}</span>
                    </button>
                  ) : camp.is_eligible ? (
                    <button
                      onClick={() => handleClaim(camp)}
                      disabled={isClaiming}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-black text-xs shadow-[0_6px_20px_rgba(245,158,11,0.35)] border-t border-white/30 transition-all flex items-center justify-center gap-2 animate-pulse"
                    >
                      {isClaiming ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Gift size={16} />
                          <span>
                            {isAmharic ? 'ቦነሱን ይውሰዱ' : 'Claim'} {camp.potential_reward.toLocaleString()} ETB {isAmharic ? 'አሁን!' : 'Now!'}
                          </span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-200/60 dark:border-slate-700"
                    >
                      <Lock size={14} />
                      <span>
                        {isAmharic ? 'ገና አልደረሱም (' : 'In Progress ('}
                        {camp.target_value - camp.user_progress > 0 
                          ? `${(camp.target_value - camp.user_progress).toLocaleString()} ${camp.id === 'total_games' ? 'games' : 'ETB'} left)` 
                          : 'Locked)'}
                      </span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── RECENT BONUS CLAIMERS (SOCIAL PROOF) ── */}
        {recentClaimers.length > 0 && (
          <div className="px-3.5 pt-5 pb-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Trophy size={14} className="text-amber-500" />
              <span>{isAmharic ? 'የቅርብ ጊዜ ቦነስ የወሰዱ' : 'Recent Bonus Claimers'}</span>
            </h3>

            <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
              {recentClaimers.map((rc, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                      #{rc.claim_order}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                        {rc.first_name || 'Player'}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        {rc.campaign_id === 'total_games'
                          ? (isAmharic ? '500 ጨዋታዎች ቦነስ' : '500 Games Bonus')
                          : rc.campaign_id === 'invitation_reward'
                          ? (isAmharic ? 'የግብዣ ቦነስ' : 'Referral Milestone')
                          : (isAmharic ? 'የማህበረሰብ ጉርሻ' : 'Gursha Reward')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      +{Number(rc.claim_amount).toLocaleString()} ETB
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500">
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

            <div className="my-4 py-3 px-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
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
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm shadow-md active:scale-95 transition-all"
            >
              {isAmharic ? 'በጣም ጥሩ! (እሺ)' : 'Awesome, Thank you!'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
