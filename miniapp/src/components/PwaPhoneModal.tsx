import React, { useState } from 'react';
import { Smartphone, ArrowRight, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface PwaPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PwaPhoneModal({ isOpen, onClose, onSuccess }: PwaPhoneModalProps) {
  const { language, loginWithPhone } = useGameStore();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Clean phone number: remove spaces and dashes
    let clean = phoneNumber.trim().replace(/[\s-]/g, '');

    // Allow Ethiopian formats: 09XXXXXXXX, 07XXXXXXXX, or +2519XXXXXXXX
    if (clean.startsWith('+251')) {
      clean = '0' + clean.slice(4);
    } else if (clean.startsWith('251')) {
      clean = '0' + clean.slice(3);
    } else if (clean.length === 9 && (clean.startsWith('9') || clean.startsWith('7'))) {
      clean = '0' + clean;
    }

    if (!clean.match(/^(09|07)\d{8}$/)) {
      setError(
        language === 'am'
          ? 'እባክዎ ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ (ለምሳሌ፡ 0964582376)'
          : 'Please enter a valid Ethiopian phone number (e.g. 0964582376)'
      );
      return;
    }

    setLoading(true);
    try {
      const ok = await loginWithPhone(clean);
      if (ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onSuccess) onSuccess();
        }, 800);
      } else {
        setError(
          language === 'am'
            ? 'መለያዎን መክፈት አልተቻለም:: እባክዎ እንደገና ይሞክሩ::'
            : 'Failed to connect account. Please try again.'
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X size={15} />
        </button>

        {/* Header Icon */}
        <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 mx-auto flex items-center justify-center mb-3 shadow-md shadow-amber-500/20">
          <Smartphone size={24} />
        </div>

        <h3 className="font-black text-slate-800 dark:text-white text-base">
          {language === 'am' ? 'ስልክ ቁጥርዎን ያስገቡ' : 'Enter Your Phone Number'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed max-w-[260px] mx-auto">
          {language === 'am'
            ? 'ገንዘብ ለማስገባት እና ጨዋታ ለመጀመር ስልክ ቁጥርዎን ያስገቡ (እንደ መለያ ያገለግላል):'
            : 'Enter your phone number to access your wallet, deposit and start playing:'}
        </p>

        {success ? (
          <div className="py-6 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={40} className="animate-bounce mb-2" />
            <p className="font-black text-sm">
              {language === 'am' ? 'በተሳካ ሁኔታ ተገናኝቷል!' : 'Connected Successfully!'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-left">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                {language === 'am' ? 'የስልክ ቁጥር (Phone Number)' : 'Mobile Phone Number'}
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-black text-slate-400 select-none">
                  🇪🇹 +251
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="09XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl pl-19 pr-3.5 py-3 text-sm font-black text-slate-800 dark:text-white focus:outline-none focus:border-amber-400 shadow-inner"
                  autoFocus
                  required
                />
              </div>
              <p className="text-[9.5px] text-slate-400 font-medium mt-1">
                {language === 'am' ? 'ምሳሌ፡ 0964582376 ወይም 0712345678' : 'e.g. 0964582376 or 0712345678'}
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-2xl shadow-md shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>{loading ? (language === 'am' ? 'በማረጋገጥ ላይ...' : 'Connecting...') : (language === 'am' ? 'ቀጥል (ጀምር)' : 'Continue to Play')}</span>
              {!loading && <ArrowRight size={14} className="stroke-[2.5]" />}
            </button>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-slate-400 font-medium">
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>{language === 'am' ? 'ደህንነቱ የተጠበቀ መለያ' : 'Secure instant connection'}</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
