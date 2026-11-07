import { useState } from 'react';
import { ArrowLeft, Share2, Copy, Check, Users, Gift, Sparkles, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { t } from '../lib/translations';
import WebApp from '@twa-dev/sdk';
import VideoGuideModal from '../components/VideoGuideModal';

export default function Invite() {
  const { user, setProfileOpen, language } = useGameStore();
  const [copied, setCopied] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const navigate = useNavigate();

  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'ChoiceBingo_bot';
  const inviteLink = `https://t.me/${botUsername}?start=ref_${user?.telegram_id || 'player'}`;

  const handleBack = () => {
    navigate(-1);
    setTimeout(() => setProfileOpen(true), 50);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      if (typeof WebApp !== 'undefined') WebApp.HapticFeedback.impactOccurred('light');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    const shareText = `🎮 Play Choice Bingo with me! Join using my link and let's win together!`;
    if (typeof WebApp !== 'undefined') {
      WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`);
    } else {
      if (navigator.share) {
        navigator.share({
          title: 'Choice Bingo',
          text: shareText,
          url: inviteLink,
        }).catch(console.error);
      } else {
        handleCopy();
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 transition-colors duration-200 flex flex-col pb-24">
      {/* ── VIDEO GUIDE MODAL ── */}
      <VideoGuideModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        category="invite"
      />

      {/* ── 3D HEADER ── */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 pt-6 pb-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between sticky top-0 z-20 transition-colors">
        <div className="flex items-center min-w-0 flex-1">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all border border-slate-200/60 dark:border-slate-700 shadow-sm flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="ml-3.5 flex-1 min-w-0">
            <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight truncate">{t[language].invite.title}</h1>
            <p className="text-xs text-slate-400 dark:text-slate-400 font-medium truncate">{t[language].invite.subtitle}</p>
          </div>
        </div>

        {/* Video Guide Pill Button */}
        <button
          onClick={() => setIsVideoModalOpen(true)}
          className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-md shadow-amber-500/20 flex items-center gap-1 active:scale-95 transition-all shrink-0 ml-2"
        >
          <Play size={11} className="fill-white" />
          <span>Video Guide</span>
        </button>
      </div>

      <div className="px-4 py-3.5 flex flex-col space-y-3.5 flex-1 overflow-hidden">

        {/* ── 3D HERO VIP BANNER ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-900 dark:via-purple-950 dark:to-pink-950 rounded-3xl p-5 shadow-[0_12px_30px_rgba(124,58,237,0.35)] dark:shadow-[0_12px_35px_rgba(124,58,237,0.25)] border-t border-white/30 text-white flex items-center space-x-4 shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl -translate-y-8 translate-x-8 pointer-events-none" />
          <div className="w-14 h-14 bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
            <Gift size={28} className="text-yellow-300 drop-shadow-md animate-bounce" style={{ animationDuration: '3s' }} />
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles size={14} className="text-yellow-300 drop-shadow" />
              <h2 className="text-lg font-black leading-tight drop-shadow-sm">{t[language].invite.heroTitle}</h2>
            </div>
            <p className="text-white/90 text-xs font-medium leading-snug">
              {t[language].invite.heroDesc}
            </p>
          </div>
        </div>

        {/* ── 3D LINK & SHARE SECTION ── */}
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 shadow-[0_8px_25px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-slate-200/80 dark:border-slate-800 shrink-0 backdrop-blur-sm space-y-3.5">
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">{t[language].invite.linkTitle}</label>
            <div className="flex bg-slate-100/90 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden p-1.5 shadow-inner">
              <div className="flex-1 px-3 py-2 overflow-x-auto whitespace-nowrap hide-scrollbar flex items-center">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">{inviteLink}</span>
              </div>
              <button
                onClick={handleCopy}
                className={`shrink-0 px-3.5 h-10 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs transition-all shadow-sm active:scale-95 ${
                  copied
                    ? 'bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.4)]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="w-full bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black text-sm py-3.5 rounded-2xl shadow-[0_6px_20px_rgba(245,158,11,0.35)] border-t border-yellow-200 active:translate-y-0.5 transition-all flex items-center justify-center space-x-2"
          >
            <Share2 size={18} className="drop-shadow-sm text-slate-950" />
            <span className="tracking-wide">{t[language].invite.shareBtn}</span>
          </button>
        </div>

        {/* ── 3D HOW IT WORKS PATHWAY ── */}
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 shadow-[0_8px_25px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-slate-200/80 dark:border-slate-800 flex-1 backdrop-blur-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 mb-4">{t[language].invite.howItWorks}</h3>
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md shadow-blue-500/20 border-t border-white/30">
                1
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight">{t[language].invite.step1Title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-snug">{t[language].invite.step1Desc}</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md shadow-emerald-500/20 border-t border-white/30">
                2
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight">{t[language].invite.step2Title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-snug">{t[language].invite.step2Desc}</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md shadow-purple-500/20 border-t border-white/30">
                3
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight">{t[language].invite.step3Title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-snug">{t[language].invite.step3Desc}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
