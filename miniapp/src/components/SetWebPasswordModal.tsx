import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, X, CheckCircle2, ShieldCheck, Copy, Check, Globe } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from '../store/gameStore';

interface SetWebPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SetWebPasswordModal({ isOpen, onClose }: SetWebPasswordModalProps) {
  const { language, user, fetchUser } = useGameStore();
  const isAm = language === 'am';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const telegramId = user?.telegram_id || (typeof WebApp !== 'undefined' ? WebApp.initDataUnsafe?.user?.id?.toString() : '') || '';

  const handleCopyId = () => {
    if (!telegramId) return;
    navigator.clipboard.writeText(telegramId);
    setCopied(true);
    if (typeof WebApp !== 'undefined') {
      try { WebApp.HapticFeedback?.notificationOccurred('success'); } catch (_) {}
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || password.trim().length < 4) {
      setError(isAm ? 'የይለፍ ቃል ቢያንስ 4 ፊደል ወይም ቁጥር መሆን አለበት::' : 'Password must be at least 4 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError(isAm ? 'የይለፍ ቃሎቹ አይመሳሰሉም:: እባክዎ በትክክል ያረጋግጡ::' : 'Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      const API_URL = import.meta.env.VITE_API_URL || '/api';

      const res = await fetch(`${API_URL}/auth/set-web-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || (isAm ? 'የይለፍ ቃል ማስቀመጥ አልተቻለም::' : 'Failed to set password.'));
        return;
      }

      setSuccess(true);
      fetchUser();
      if (typeof WebApp !== 'undefined') {
        try { WebApp.HapticFeedback?.notificationOccurred('success'); } catch (_) {}
      }

      setTimeout(() => {
        setSuccess(false);
        setPassword('');
        setConfirmPassword('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 w-full max-w-sm shadow-2xl border border-slate-200/90 dark:border-slate-800 text-center relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-20"
        >
          <X size={15} />
        </button>

        {/* Header Icon */}
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 border-t border-white/40">
          <KeyRound size={22} />
        </div>

        <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight">
          {isAm ? 'የዌብ / PWA የይለፍ ቃል' : 'Web / PWA Login Password'}
        </h3>
        <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto leading-relaxed">
          {isAm
            ? 'ከቴሌግራም ውጭ በ Chrome ወይም PWA አፕሊኬሽን ላይ ለመግባት የይለፍ ቃልዎን እዚህ ያስቀምጡ::'
            : 'Set your password to login on Chrome browser or PWA app outside Telegram.'}
        </p>

        {/* Account Info Badge */}
        <div className="my-3.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-left">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
              {isAm ? 'የቴሌግራም መለያ ID (Telegram ID)' : 'Your Telegram ID'}
            </span>
            <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-100">
              {telegramId || '—'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyId}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1 active:scale-95 transition-transform shadow-xs"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            <span>{copied ? (isAm ? 'ተቀድቷል' : 'Copied') : (isAm ? 'ቅዳ' : 'Copy')}</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-[10.5px] font-bold text-rose-600 dark:text-rose-300 animate-shake">
            {error}
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5">
            <CheckCircle2 size={16} />
            <span>{isAm ? 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀምጧል!' : 'Password Saved Successfully!'}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          {/* New Password */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              {isAm ? 'አዲስ የይለፍ ቃል (New Password)' : 'New Password'}
            </label>
            <div className="flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden focus-within:border-amber-400">
              <span className="pl-3.5 pr-2 text-slate-400 select-none">
                <Lock size={15} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={isAm ? 'ቢያንስ 4 ፊደል ወይም ቁጥር' : 'Min 4 characters'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent pr-2 py-2.5 text-xs font-black text-slate-800 dark:text-white outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              {isAm ? 'የይለፍ ቃል ያረጋግጡ (Confirm Password)' : 'Confirm Password'}
            </label>
            <div className="flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden focus-within:border-amber-400">
              <span className="pl-3.5 pr-2 text-slate-400 select-none">
                <Lock size={15} />
              </span>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder={isAm ? 'የይለፍ ቃሉን በድጋሚ ያስገቡ' : 'Re-enter your password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-transparent pr-2 py-2.5 text-xs font-black text-slate-800 dark:text-white outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Instructions box */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 leading-normal flex items-start gap-1.5">
            <Globe size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <span>
              {isAm
                ? `አሁን ድህረ-ገጹን (choicebingo.vercel.app) በ Chrome ሲከፍቱ በቴሌግራም IDዎ (${telegramId}) እና በዚህ የይለፍ ቃል መግባት ይችላሉ::`
                : `You can now open choicebingo.vercel.app on Chrome and login using your Telegram ID (${telegramId}) and this password.`}
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3.5 mt-2 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 shadow-md shadow-amber-500/25 border-t border-white/30 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{isAm ? 'የይለፍ ቃል አስቀምጥ' : 'Save Password'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
