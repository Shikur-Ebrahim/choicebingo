import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Sparkles, Trophy, CheckCircle2, Star, PartyPopper } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from '../store/gameStore';
import { LoyaltyReward, checkEligibleLoyaltyReward, claimLoyaltyReward } from '../lib/loyaltyService';

export default function LoyaltyClaimModal() {
  const { user, fetchUser, language } = useGameStore();
  const [reward, setReward] = useState<LoyaltyReward | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimedSuccess, setClaimedSuccess] = useState(false);
  const [creditedAmount, setCreditedAmount] = useState<number>(50);

  // Check if current user has an eligible pending reward (Failsafe & Direct)
  const checkLoyaltyReward = useCallback(async () => {
    if (!user || !user.telegram_id) return;
    try {
      const activeReward = await checkEligibleLoyaltyReward(user.telegram_id);
      if (activeReward) {
        setReward(activeReward);
        setCreditedAmount(activeReward.amount || 50);
        setIsOpen(true);
      }
    } catch (err) {
      console.error('[LoyaltyClaimModal] Check reward failed:', err);
    }
  }, [user]);

  useEffect(() => {
    checkLoyaltyReward();
  }, [checkLoyaltyReward]);

  // Handle claiming the reward
  const handleClaim = async () => {
    if (!reward || !user || !user.telegram_id || claiming) return;

    try {
      setClaiming(true);
      const res = await claimLoyaltyReward(user.telegram_id, reward.id);

      if (!res.success) {
        throw new Error(res.error || 'ስጦታውን መውሰድ አልተቻለም');
      }

      // Trigger celebration state
      setClaimedSuccess(true);
      setCreditedAmount(reward.amount || creditedAmount);

      // Refresh user balance in gameStore
      await fetchUser();

      // Trigger Telegram haptic feedback if available
      try {
        if (WebApp?.HapticFeedback) {
          WebApp.HapticFeedback.notificationOccurred('success');
        }
      } catch {}

      // Auto-dismiss after celebration
      setTimeout(() => {
        setIsOpen(false);
        setReward(null);
      }, 3000);
    } catch (err: any) {
      console.error('[LoyaltyClaimModal] Claim error:', err);
      alert(err.message || 'ስጦታውን መውሰድ አልተቻለም። እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen || !reward) return null;

  const isAmharic = language !== 'en';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      {/* Background Animated Glows & Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/25 rounded-full blur-3xl" />

        {/* Floating Stars */}
        <div className="absolute top-12 left-10 text-amber-300 animate-bounce">
          <Star size={24} className="fill-amber-300" />
        </div>
        <div className="absolute top-20 right-12 text-yellow-300 animate-pulse">
          <Sparkles size={28} className="fill-yellow-300" />
        </div>
        <div className="absolute bottom-24 left-16 text-amber-400 animate-pulse">
          <PartyPopper size={28} />
        </div>
        <div className="absolute bottom-32 right-14 text-yellow-400 animate-bounce">
          <Star size={20} className="fill-yellow-400" />
        </div>
      </div>

      {/* Main Modal Card */}
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.35)] text-center p-6 space-y-5 animate-in zoom-in-95 duration-300">
        {/* Top VIP Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/50 text-[11px] font-black text-amber-300 tracking-wider uppercase shadow-inner">
          <Trophy size={13} className="text-amber-400" />
          <span>{isAmharic ? 'የታማኝ ደንበኛ ልዩ ስጦታ' : 'EXCLUSIVE VIP LOYALTY GIFT'}</span>
          <Sparkles size={13} className="text-amber-400" />
        </div>

        {/* 3D Animated Gift Icon Box */}
        <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
          {/* Animated Glow Rings */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 blur-xl opacity-60 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-purple-600 blur-md opacity-75" />

          {/* Central Gift Emblem */}
          <div className="relative z-10 w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center shadow-2xl border-2 border-amber-200">
            {claimedSuccess ? (
              <CheckCircle2 size={54} className="text-white animate-bounce" />
            ) : (
              <Gift size={52} className="text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)] animate-bounce" />
            )}
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-200 drop-shadow-sm">
            {claimedSuccess
              ? (isAmharic ? 'እንኳን ደስ አለዎት! 🎉' : 'Reward Claimed! 🎉')
              : (reward.title || (isAmharic ? 'የታማኝ ደንበኛ ስጦታ!' : 'Loyalty Reward!'))}
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed px-2 font-medium">
            {claimedSuccess
              ? (isAmharic
                  ? `የ ${creditedAmount} ብር ቦነስ ወደ ሂሳብዎ በተሳካ ሁኔታ ተጨምሯል!`
                  : `Successfully added ${creditedAmount} ETB to your Bonus Balance!`)
              : (reward.message ||
                  (isAmharic
                    ? 'ለ Choice Bingo ላሳዩት ታማኝነት የተዘጋጀ ልዩ ስጦታ! ቦነሱን ተጠቅመው ይጫወቱ እና ያሸንፉ!'
                    : 'As a special thank you for being our loyal player, enjoy this exclusive bonus!'))}
          </p>
        </div>

        {/* Glowing Amount Display Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/30 to-amber-500/20 border border-amber-500/40 p-3.5 shadow-inner">
          <div className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
            {isAmharic ? 'የቦነስ መጠን' : 'REWARD VALUE'}
          </div>
          <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-100 flex items-center justify-center gap-1.5 drop-shadow">
            <span>+{reward.amount || 50}</span>
            <span className="text-sm font-black text-amber-300">ETB</span>
          </div>
          <div className="text-[10px] font-bold text-emerald-400 mt-0.5">
            {isAmharic ? 'ቀጥታ ወደ ቦነስ ሂሳብዎ ይገባል' : 'Credited to your Bonus Balance'}
          </div>
        </div>

        {/* Action Button */}
        <div>
          {claimedSuccess ? (
            <div className="py-3 px-4 rounded-2xl bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 animate-pulse">
              <CheckCircle2 size={20} />
              <span>{isAmharic ? 'ቦነሱ ተጨምሯል!' : 'Bonus Added Successfully!'}</span>
            </div>
          ) : (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="relative w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 overflow-hidden group"
            >
              {/* Light reflection effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <Gift size={20} className="text-slate-950 animate-bounce" />
              <span>{claiming ? (isAmharic ? 'በመጫን ላይ...' : 'Claiming...') : (isAmharic ? 'ስጦታውን አሁኑኑ ውሰድ 🎁' : 'CLAIM REWARD NOW 🎁')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
