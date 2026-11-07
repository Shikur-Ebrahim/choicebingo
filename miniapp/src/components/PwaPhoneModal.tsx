import React, { useState } from 'react';
import { Smartphone, ArrowRight, X, ShieldCheck, CheckCircle2, Lock, Eye, EyeOff, User, Sparkles } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface PwaPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PwaPhoneModal({ isOpen, onClose, onSuccess }: PwaPhoneModalProps) {
  const { language, loginWithPhoneAndPass, registerWithPhoneAndPass } = useGameStore();

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const cleanPhoneInput = (input: string) => {
    let clean = input.trim().replace(/[^\d]/g, '');
    if (clean.startsWith('251')) clean = clean.slice(3);
    if (clean.startsWith('0')) clean = clean.slice(1);
    if (clean.length > 9) clean = clean.slice(0, 9);
    return clean;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const clean = cleanPhoneInput(phoneNumber);

    if (!clean.match(/^(9|7)\d{8}$/)) {
      setError(
        language === 'am'
          ? 'እባክዎ ባለ 9 አሃዝ ስልክ ቁጥር ያስገቡ (በ 9 ወይም 7 የሚጀምር፣ ለምሳሌ፡ 964582376)'
          : 'Please enter a 9-digit phone number starting with 9 or 7 (e.g. 964582376)'
      );
      return;
    }

    if (!password || password.trim().length < 4) {
      setError(
        language === 'am'
          ? 'የይለፍ ቃል ቢያንስ 4 ፊደል ወይም ቁጥር መሆን አለበት::'
          : 'Password must be at least 4 characters.'
      );
      return;
    }

    const singleFirstName = firstName.trim().split(/\s+/)[0];
    if (mode === 'register' && !singleFirstName) {
      setError(
        language === 'am'
          ? 'እባክዎ የመጀመሪያ ስምዎን ያስገቡ::'
          : 'Please enter your first name.'
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await registerWithPhoneAndPass(clean, password, singleFirstName);
        if (res.success) {
          setSuccessMsg(language === 'am' ? 'አካውንትዎ በተሳካ ሁኔታ ተፈጥሯል!' : 'Account Created Successfully!');
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
            onClose();
            if (onSuccess) onSuccess();
          }, 900);
        } else {
          setError(res.error || (language === 'am' ? 'ምዝገባው አልተሳካም::' : 'Registration failed.'));
        }
      } else {
        const res = await loginWithPhoneAndPass(clean, password);
        if (res.success) {
          setSuccessMsg(language === 'am' ? 'እንኳን ደህና መጡ! በተሳካ ሁኔታ ገብተዋል!' : 'Welcome Back! Logged In Successfully!');
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
            onClose();
            if (onSuccess) onSuccess();
          }, 900);
        } else {
          setError(res.error || (language === 'am' ? 'መግባት አልተቻለም::' : 'Login failed.'));
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3.5 animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] p-5 w-full max-w-sm shadow-2xl border border-slate-200/90 dark:border-slate-800 text-center relative animate-scale-up overflow-hidden">
        
        {/* Top Glow Ambient */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-yellow-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-20"
          title="Close"
        >
          <X size={15} />
        </button>

        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25 mb-2 border border-amber-300/40">
            <Lock size={22} className="stroke-[2.3]" />
          </div>
          <h3 className="font-black text-slate-800 dark:text-white text-base tracking-tight">
            {mode === 'login'
              ? (language === 'am' ? 'ወደ Choice Bingo ይግቡ' : 'Log In to Choice Bingo')
              : (language === 'am' ? 'አዲስ አካውንት ይክፈቱ' : 'Create Choice Bingo Account')}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
            {mode === 'login'
              ? (language === 'am' ? 'የስልክ ቁጥርዎን እና የይለፍ ቃልዎን ያስገቡ' : 'Enter your phone & password to access wallet')
              : (language === 'am' ? 'ስምዎን፣ ስልክዎን እና የይለፍ ቃልዎን ያስገቡ' : 'Enter your name, phone & password to start')}
          </p>
        </div>

        {/* ── 3D SEGMENTED MODE SWITCHER (REGISTER / LOGIN) ── */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl gap-1 mb-4 border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles size={12} className="text-amber-500" />
            <span>{language === 'am' ? 'ተመዝገብ (Register)' : 'Register'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <span>{language === 'am' ? 'ግባ (Log In)' : 'Log In'}</span>
          </button>
        </div>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 animate-scale-up">
            <CheckCircle2 size={46} className="animate-bounce mb-2" />
            <p className="font-black text-sm text-center">
              {successMsg}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-left">
            
            {/* FIRST NAME INPUT (Only in Register mode) */}
            {mode === 'register' && (
              <div className="animate-slide-down">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  {language === 'am' ? 'የመጀመሪያ ስም (First Name)' : 'First Name'}
                </label>
                <div className="flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden focus-within:border-amber-400">
                  <span className="pl-3.5 pr-2 text-slate-400 select-none">
                    <User size={15} />
                  </span>
                  <input
                    type="text"
                    placeholder={language === 'am' ? 'ለምሳሌ፡ ሙራድ' : 'e.g. Murad'}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value.replace(/\s+/g, ''))}
                    className="w-full bg-transparent pr-3.5 py-2.5 text-xs font-black text-slate-800 dark:text-white outline-none"
                    required
                  />
                </div>
                <p className="text-[9px] text-slate-400 font-medium mt-1">
                  {language === 'am' ? 'ያለ ክፍተት የመጀመሪያ ስም ብቻ (ለምሳሌ፡ Murad)' : 'Single first name without spaces (e.g. Murad)'}
                </p>
              </div>
            )}

            {/* PHONE NUMBER INPUT (SEPARATED PREFIX - NO OVERLAPPING) */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                {language === 'am' ? 'የስልክ ቁጥር (Phone Number)' : 'Mobile Phone Number'}
              </label>
              
              <div className="flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden focus-within:border-amber-400">
                {/* Prefix Badge Container */}
                <div className="px-3 py-2.5 bg-slate-100 dark:bg-slate-700/60 border-r border-slate-200 dark:border-slate-700 flex items-center gap-1 select-none shrink-0">
                  <span className="text-sm">🇪🇹</span>
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300 font-mono">+251</span>
                </div>

                {/* Input */}
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="9XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(cleanPhoneInput(e.target.value))}
                  className="w-full bg-transparent px-3 py-2.5 text-xs font-black text-slate-800 dark:text-white outline-none font-mono tracking-wider"
                  required
                />
              </div>
              <p className="text-[9.5px] text-slate-400 font-medium mt-1">
                {language === 'am' ? 'ባለ 9 አሃዝ ስልክ ቁጥር (በ 9 ወይም 7 የሚጀምር፣ ለምሳሌ፡ 964582376)' : '9 digits starting with 9 or 7 (e.g. 964582376)'}
              </p>
            </div>

            {/* PASSWORD INPUT */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {language === 'am' ? 'የይለፍ ቃል (Password)' : 'Password'}
                </label>
                {mode === 'register' && (
                  <span className="text-[9px] text-slate-400 font-medium">
                    {language === 'am' ? 'ቢያንስ 4 ፊደል/ቁጥር' : 'Min 4 characters'}
                  </span>
                )}
              </div>

              <div className="flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden focus-within:border-amber-400">
                <span className="pl-3.5 pr-2 text-slate-400 select-none">
                  <Lock size={15} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'register' ? (language === 'am' ? 'የይለፍ ቃል ፍጠር' : 'Create a password') : (language === 'am' ? 'የይለፍ ቃልህን አስገባ' : 'Enter your password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent pr-2 py-2.5 text-xs font-black text-slate-800 dark:text-white outline-none font-mono tracking-wider"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold text-center animate-shake">
                {error}
              </div>
            )}

            {/* 3D ACTION BUTTON */}
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
                  ? (language === 'am' ? 'በማረጋገጥ ላይ...' : 'Verifying...')
                  : mode === 'login'
                  ? (language === 'am' ? 'ግባ (Log In)' : 'Log In')
                  : (language === 'am' ? 'ተመዝገብና ጀምር (Create Account)' : 'Create Account')}
              </span>
              {!loading && <ArrowRight size={14} className="stroke-[2.5]" />}
            </button>

            {/* Bottom Switcher Link */}
            <div className="text-center pt-1.5 pb-0.5">
              {mode === 'login' ? (
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); }}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-black"
                >
                  {language === 'am' ? 'አዲስ ተጠቃሚ ኖት? እዚህ ይመዝገቡ ➔' : "Don't have an account? Register here ➔"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-black"
                >
                  {language === 'am' ? 'ቀደም ሲል አካውንት አለዎት? ይግቡ ➔' : 'Already have an account? Log In ➔'}
                </button>
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[9.5px] text-slate-400 font-medium">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>{language === 'am' ? 'ደህንነቱ የተጠበቀ መለያ' : 'Secure password-protected connection'}</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
