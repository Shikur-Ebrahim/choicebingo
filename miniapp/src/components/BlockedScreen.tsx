import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  MessageCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Lock, 
  ExternalLink,
  AlertTriangle,
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from '../store/gameStore';

export default function BlockedScreen() {
  const { user, fetchUser, language } = useGameStore();
  const [supportUsername, setSupportUsername] = useState<string>('');
  const [channelLink, setChannelLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkFeedback, setCheckFeedback] = useState<string | null>(null);

  const tgUser = WebApp.initDataUnsafe?.user;
  const displayName = user?.first_name || tgUser?.first_name || 'Player';
  const username = user?.username || tgUser?.username || '';
  const telegramId = user?.telegram_id || tgUser?.id?.toString() || '---';

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/player/support-contact`, {
      headers: { 'x-telegram-init-data': WebApp.initData || '' }
    })
      .then(r => r.json())
      .then(d => {
        if (d.username) setSupportUsername(d.username);
        if (d.channel) setChannelLink(d.channel);
      })
      .catch(e => console.error(e));
  }, []);

  const handleCopyId = () => {
    if (!telegramId || telegramId === '---') return;
    navigator.clipboard.writeText(telegramId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSupport = () => {
    if (supportUsername) {
      const cleanUser = supportUsername.replace('@', '');
      WebApp.openTelegramLink(`https://t.me/${cleanUser}`);
    } else {
      WebApp.openTelegramLink('https://t.me/Choicebingosupport');
    }
  };

  const handleChannel = () => {
    if (channelLink) {
      const clean = channelLink.replace('@', '').replace('https://t.me/', '');
      WebApp.openTelegramLink(`https://t.me/${clean}`);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    setCheckFeedback(null);
    try {
      await fetchUser();
      // If still blocked after fetchUser, give tactile feedback
      setTimeout(() => {
        setChecking(false);
        setCheckFeedback(
          language === 'am' 
            ? 'መለያዎ አሁንም እንደታገደ ነው። እባክዎ ድጋፍ ሰጪን ያነጋግሩ።' 
            : 'Your account is still restricted. Please contact support.'
        );
        setTimeout(() => setCheckFeedback(null), 4000);
      }, 800);
    } catch {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070b14] text-white flex flex-col items-center justify-between p-4 overflow-y-auto select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-rose-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-red-800/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-rose-950/20 to-transparent pointer-events-none" />

      {/* Top Brand Tag */}
      <div className="w-full flex items-center justify-between pt-2 px-2 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Lock size={16} />
          </div>
          <span className="text-xs font-black tracking-wider text-rose-400/90 uppercase">Choice Bingo</span>
        </div>
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          <span>{language === 'am' ? 'የታገደ መለያ' : 'Restricted'}</span>
        </div>
      </div>

      {/* Main 3D Glassmorphic Card */}
      <div className="w-full max-w-sm my-auto py-4 z-10">
        <div className="relative bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-rose-500/25 rounded-[32px] p-6 shadow-[0_20px_60px_rgba(244,63,94,0.18)] backdrop-blur-xl text-center overflow-hidden">
          
          {/* Subtle top sheen */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-400/40 to-transparent" />

          {/* 3D Animated Security Emblem */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 bg-rose-500/25 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-500 via-red-600 to-rose-900 flex items-center justify-center text-white shadow-[0_10px_30px_rgba(225,29,72,0.4)] border-t border-rose-300/40">
              <ShieldAlert size={48} strokeWidth={2.2} className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-950 border-2 border-rose-500 flex items-center justify-center text-rose-400 shadow-md">
              <Lock size={14} />
            </div>
          </div>

          {/* Title & Status */}
          <h1 className="text-xl font-black text-white tracking-tight drop-shadow-sm">
            {language === 'am' ? 'መለያዎ ለጊዜው ታግዷል' : 'Account Deactivated'}
          </h1>
          <p className="text-xs text-rose-400/90 font-bold mt-1 tracking-wide uppercase">
            {language === 'am' ? 'በአስተዳዳሪው የተዘጋ' : 'Suspended by Administration'}
          </p>

          <p className="text-slate-300/80 text-xs font-medium leading-relaxed mt-3 px-1">
            {language === 'am' 
              ? 'መለያዎ በአስተዳዳሪው ለጊዜው ታግዷል። እባክዎ ለበለጠ መረጃ እና መለያዎ እንዲከፈት ከታች ባለው የቴሌግራም አዝራር የደንበኞች አገልግሎታችንን ያነጋግሩ።' 
              : 'Your account has been deactivated by the admin. Please reach out to our official Telegram support team for verification and assistance.'}
          </p>

          {/* User ID & Info Inset Card */}
          <div className="mt-4 bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-left">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-pink-700 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-inner">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-black text-white text-xs truncate">{displayName}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  {username ? `@${username} · ` : ''}ID: <span className="font-mono text-slate-300 font-bold">{telegramId}</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleCopyId}
              className={`p-2 rounded-xl text-xs font-bold transition-all active:scale-90 flex items-center space-x-1 shrink-0 ml-2 ${
                copied 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
              }`}
              title="Copy Telegram ID"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span className="text-[10px]">{copied ? (language === 'am' ? 'ተቀድቷል' : 'Copied') : 'ID'}</span>
            </button>
          </div>

          {/* Check Feedback alert if any */}
          {checkFeedback && (
            <div className="mt-3 bg-rose-500/15 border border-rose-500/30 rounded-xl p-2.5 text-[11px] text-rose-300 font-bold flex items-center justify-center space-x-1.5 animate-slide-down">
              <AlertTriangle size={14} className="shrink-0 text-rose-400" />
              <span>{checkFeedback}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-5 space-y-2.5">
            {/* Primary: Contact Support */}
            <button
              onClick={handleSupport}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-2xl font-black text-xs shadow-[0_8px_25px_rgba(79,70,229,0.35)] border-t border-white/25 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <MessageCircle size={16} />
              <span>
                {language === 'am' ? 'የደንበኞች አገልግሎትን ያነጋግሩ' : 'Contact Support'}
                {supportUsername ? ` (${supportUsername})` : ''}
              </span>
            </button>

            {/* Secondary: Check Status / Refresh */}
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full py-3 px-4 bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw size={14} className={checking ? 'animate-spin text-rose-400' : ''} />
              <span>{checking ? (language === 'am' ? 'በማረጋገጥ ላይ...' : 'Checking...') : (language === 'am' ? 'መለያዬን እንደገና አረጋግጥ' : 'Check Account Status')}</span>
            </button>

            {/* Optional Channel Link */}
            {channelLink && (
              <button
                onClick={handleChannel}
                className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-white rounded-xl font-semibold text-[11px] transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>{language === 'am' ? 'ኦፊሴላዊ የቴሌግራም ቻናል' : 'Official Telegram Channel'}</span>
                <ExternalLink size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Security Note */}
      <div className="w-full text-center pb-2 z-10">
        <p className="text-[10px] text-slate-400 font-medium">
          🔒 Choice Bingo Security Protection &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
