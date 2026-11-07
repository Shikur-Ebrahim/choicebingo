import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, X, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface PwaResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PwaResetPasswordModal({ isOpen, onClose }: PwaResetPasswordModalProps) {
  const { language, user } = useGameStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const phone = localStorage.getItem('cb_pwa_phone') || user?.telegram_id || '';
    if (!phone) {
      setError(language === 'am' ? 'የተገናኘ ስልክ ቁጥር አልተገኘም::' : 'No phone account found.');
      return;
    }

    if (!currentPassword) {
      setError(language === 'am' ? 'እባክዎ የቀድሞውን የይለፍ ቃል ያስገቡ::' : 'Please enter your current password.');
      return;
    }

    if (!newPassword || newPassword.trim().length < 4) {
      setError(language === 'am' ? 'አዲሱ የይለፍ ቃል ቢያንስ 4 ፊደል ወይም ቁጥር መሆን አለበት::' : 'New password must be at least 4 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(language === 'am' ? 'አዲሶቹ የይለፍ ቃሎች አይመሳሰሉም:: እባክዎ በትክክል ያረጋግጡ::' : 'New passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${API_URL}/auth/pwa-change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pwa-phone': phone,
        },
        body: JSON.stringify({
          phone,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || (language === 'am' ? 'የይለፍ ቃል መቀየር አልተቻለም::' : 'Failed to change password.'));
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3.5 animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 w-full max-w-sm shadow-2xl border border-slate-200/90 dark:border-slate-800 text-center relative animate-scale-up overflow-hidden">
        
        {/* Glow ambient */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-20"
          title="Close"
        >
          <X size={15} />
        </button>

        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/25 mb-2.5 border border-amber-300/40">
          <KeyRound size={22} className="stroke-[2.3]" />
        </div>

        <h3 className="font-black text-slate-800 dark:text-white text-base tracking-tight">
          {language === 'am' ? 'የይለፍ ቃል ቀይር' : 'Reset / Change Password'}
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-3.5 leading-tight">
          {language === 'am'
            ? 'የቀድሞውን እና አዲሱን የይለፍ ቃል ያስገቡ'
            : 'Enter your current password and your new password'}
        </p>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 animate-scale-up">
            <CheckCircle2 size={46} className="animate-bounce mb-2" />
            <p className="font-black text-sm text-center">
              {language === 'am' ? 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል!' : 'Password Changed Successfully!'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-left">
            
            {/* 1. CURRENT / PREVIOUS PASSWORD */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                {language === 'am' ? 'የቀድሞው የይለፍ ቃል (Current Password)' : 'Current Password'}
              </label>
              <div className="flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden focus-within:border-amber-400">
                <span className="pl-3.5 pr-2 text-slate-400 select-none">
                  <Lock size={15} />
                </span>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  placeholder={language === 'am' ? 'የቀድሞውን የይለፍ ቃል ያስገቡ' : 'Enter current password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-transparent pr-2 py-2.5 text-xs font-black text-slate-800 dark:text-white outline-none font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* 2. NEW PASSWORD */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {language === 'am' ? 'አዲስ የይለፍ ቃል (New Password)' : 'New Password'}
                </label>
                <span className="text-[9px] text-slate-400 font-medium">
                  {language === 'am' ? 'ቢያንስ 4 ፊደል/ቁጥር' : 'Min 4 characters'}
                </span>
              </div>
              <div className="flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden focus-within:border-amber-400">
                <span className="pl-3.5 pr-2 text-slate-400 select-none">
                  <KeyRound size={15} />
                </span>
                <input
                  type={showNew ? 'text' : 'password'}
                  placeholder={language === 'am' ? 'አዲስ የይለፍ ቃል ያስገቡ' : 'Enter new password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-transparent pr-2 py-2.5 text-xs font-black text-slate-800 dark:text-white outline-none font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* 3. CONFIRM NEW PASSWORD */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                {language === 'am' ? 'አዲሱን የይለፍ ቃል ያረጋግጡ (Confirm New Password)' : 'Confirm New Password'}
              </label>
              <div className="flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden focus-within:border-amber-400">
                <span className="pl-3.5 pr-2 text-slate-400 select-none">
                  <CheckCircle2 size={15} />
                </span>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder={language === 'am' ? 'አዲሱን የይለፍ ቃል በድጋሚ ያስገቡ' : 'Re-enter new password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent pr-2 py-2.5 text-xs font-black text-slate-800 dark:text-white outline-none font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error box */}
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold text-center animate-shake">
                {error}
              </div>
            )}

            {/* 3D Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl font-black text-xs select-none active:translate-y-1 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
              style={{
                background: 'linear-gradient(180deg, #fef08a 0%, #facc15 35%, #eab308 70%, #ca8a04 100%)',
                boxShadow: '0 3.5px 0 #854d0e, 0 4px 10px rgba(234,179,8,0.25), inset 0 1px 1px rgba(255,255,255,0.9)',
                border: '1px solid #fef08a',
                color: '#451a03',
              }}
            >
              <span>
                {loading
                  ? (language === 'am' ? 'በመቀየር ላይ...' : 'Updating...')
                  : (language === 'am' ? 'የይለፍ ቃል ቀይር (Update Password)' : 'Update Password')}
              </span>
              {!loading && <ArrowRight size={14} className="stroke-[2.5]" />}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[9.5px] text-slate-400 font-medium pt-1">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>{language === 'am' ? 'የይለፍ ቃልዎ ሙሉ በሙሉ የተጠበቀ ነው' : 'Your password is encrypted and secure'}</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
