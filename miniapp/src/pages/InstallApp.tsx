import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Download, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  Share2, 
  PlusSquare, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  Trophy, 
  Gamepad2, 
  ExternalLink,
  ChevronRight,
  Globe
} from 'lucide-react';
import { usePwaPrompt, isRunningInPwa, isRunningInTelegram } from '../components/PwaInstallBanner';
import { useGameStore } from '../store/gameStore';

export default function InstallApp() {
  const navigate = useNavigate();
  const { language, setLanguage } = useGameStore();
  const { canInstall, isStandalone, triggerInstall } = usePwaPrompt();

  const [installing, setInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  // Detect iOS Safari
  const isIos = typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  // Auto-attempt install prompt once if supported and user came directly from QR
  useEffect(() => {
    // If running in standalone mode already
    if (isStandalone || isRunningInPwa()) {
      setInstalledSuccess(true);
    }
  }, [isStandalone]);

  const handleInstallClick = async () => {
    setInstallError(null);
    setInstalling(true);

    try {
      if (canInstall) {
        const ok = await triggerInstall();
        if (ok) {
          setInstalledSuccess(true);
        } else {
          // User cancelled prompt
          setInstalling(false);
        }
      } else if (isIos) {
        // iOS requires manual Add to Home Screen
        setInstalling(false);
        const guideEl = document.getElementById('ios-guide-section');
        if (guideEl) {
          guideEl.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        // Fallback instructions for Android / other browsers
        setInstalling(false);
        setInstallError(
          language === 'am'
            ? 'አፑን ለመጫን በላይኛው ቀኝ ጥግ ያለውን የ Chrome ሶስት ነጥብ (⋮) ተጭነው "Install app" ወይም "Add to Home screen" ይምረጡ::'
            : 'To install the app, tap the three dots (⋮) in your browser menu and choose "Install app" or "Add to Home screen".'
        );
      }
    } catch (err: any) {
      console.error('Install error:', err);
      setInstallError(err?.message || 'Installation prompt error');
      setInstalling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-500/10 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-[#070b14] dark:to-black text-slate-800 dark:text-slate-100 transition-colors pb-12">
      {/* ── TOP NAV BAR ── */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <img src="/choicebingo-logo.png" alt="Choice Bingo" className="h-8 object-contain" />
          <span className="text-xs font-black tracking-wider text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            PWA APP
          </span>
        </div>

        <button
          onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 active:scale-95 transition-all shadow-xs"
        >
          <Globe size={13} className="text-amber-500" />
          <span>{language === 'en' ? 'አማርኛ' : 'English'}</span>
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">

        {/* ── HERO APP SHOWCASE CARD ── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-[0_12px_36px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)] text-center relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* App Icon */}
          <div className="relative mx-auto w-24 h-24 mb-3.5">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-1 shadow-[0_8px_24px_rgba(245,158,11,0.35)] animate-pulse">
              <img
                src="/icon-192.png"
                alt="Choice Bingo Icon"
                className="w-full h-full object-cover rounded-xl bg-white shadow-inner"
              />
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white p-1 rounded-full shadow-md border-2 border-white dark:border-slate-900">
              <CheckCircle2 size={15} />
            </div>
          </div>

          {/* Title & Category */}
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-1.5">
            <span>Choice Bingo</span>
            <span className="text-[10px] bg-amber-400 text-amber-950 font-black px-1.5 py-0.5 rounded-md uppercase">
              OFFICIAL
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
            {language === 'am' ? 'የኢትዮጵያ የቀጥታ የቢንጎ ጨዋታ • Play & Win Cash' : 'Ethiopian Live Bingo • Play & Win Real Cash'}
          </p>

          {/* App Metrics Badge Grid */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 border border-slate-100 dark:border-slate-800">
              <div className="text-amber-500 font-black text-sm">4.9 ★</div>
              <div className="text-[9.5px] text-slate-400 font-bold uppercase mt-0.5">15K+ Reviews</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 border border-slate-100 dark:border-slate-800">
              <div className="text-indigo-500 font-black text-sm">2 MB</div>
              <div className="text-[9.5px] text-slate-400 font-bold uppercase mt-0.5">Instant PWA</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 border border-slate-100 dark:border-slate-800">
              <div className="text-emerald-500 font-black text-sm">100%</div>
              <div className="text-[9.5px] text-slate-400 font-bold uppercase mt-0.5">Verified Safe</div>
            </div>
          </div>

          {/* ── MAIN ACTION BUTTONS ── */}
          <div className="mt-5 space-y-2.5">
            {installedSuccess ? (
              <div className="space-y-2">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-2xl p-3 flex items-center justify-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-xs">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <span>{language === 'am' ? 'Choice Bingo በተሳካ ሁኔታ ተጭኗል!' : 'Choice Bingo is Installed!'}</span>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-4 px-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-base rounded-2xl shadow-[0_6px_0_0_#065f46] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Gamepad2 size={20} />
                  <span>{language === 'am' ? 'ጨዋታውን ክፈት (Launch Game)' : 'Launch Game Now'}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full py-4 px-5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-base rounded-2xl shadow-[0_6px_0_0_#b45309] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 group relative overflow-hidden disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Download size={22} className="text-slate-950 animate-bounce" />
                <span className="tracking-wide">
                  {installing 
                    ? (language === 'am' ? 'እየተጫነ ነው...' : 'Installing...')
                    : (language === 'am' ? '📲 አፑን ጫን (Install App)' : '📲 Install Choice Bingo App')}
                </span>
              </button>
            )}

            {installError && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold p-3 rounded-xl text-left">
                {installError}
              </div>
            )}

            {/* Direct Play without installation button */}
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Gamepad2 size={15} className="text-amber-500" />
              <span>{language === 'am' ? 'ያለ መጫን በብራውዘር በቀጥታ ተጫወት' : 'Play Directly in Browser (No Install)'}</span>
              <ChevronRight size={14} className="text-slate-400" />
            </button>

            {/* Open in Telegram option */}
            <a
              href="https://t.me/choicebingo_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 text-blue-600 dark:text-blue-400 hover:underline font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
            >
              <span>{language === 'am' ? 'በቴሌግራም ቦት ለመጫወት ይሄን ይጫኑ' : 'Or Open in Telegram Bot (@choicebingo_bot)'}</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* ── STEP-BY-STEP VISUAL GUIDES ── */}
        <div id="ios-guide-section" className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-1.5">
              <Smartphone size={15} className="text-amber-500" />
              <span>{isIos ? (language === 'am' ? 'በ iPhone / iPad ላይ የመጫኛ መመሪያ' : 'iPhone / iPad Install Guide') : (language === 'am' ? 'የ 1-ጠቅታ መጫኛ መመሪያ' : 'Quick Install Guide')}</span>
            </span>
          </div>

          {isIos ? (
            /* iOS Specific Guide */
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">1</div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {language === 'am' ? 'የ Safari ማጋሪያ ቁልፍን ይጫኑ' : 'Tap the Safari Share Button'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    <span>{language === 'am' ? 'በስክሪኑ ታችኛው ክፍል ያለውን' : 'At the bottom of your screen:'}</span>
                    <Share2 size={13} className="text-blue-500 inline" />
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">2</div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {language === 'am' ? '"Add to Home Screen" ይምረጡ' : 'Select "Add to Home Screen"'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    <span>{language === 'am' ? 'ዝቅ ብለው ወደ መነሻ ገጽ አክል የሚለውን ይጫኑ' : 'Scroll down and tap:'}</span>
                    <PlusSquare size={13} className="text-amber-600 inline" />
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">3</div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {language === 'am' ? '"Add" የሚለውን አረጋግጥ' : 'Tap "Add" in Top-Right'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'am' ? 'አፑ ወዲያውኑ በስልክዎ መነሻ ገጽ ላይ ይጨመራል!' : 'Choice Bingo is immediately ready on your home screen!'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Android / Chrome Guide */
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">1</div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {language === 'am' ? 'ከላይ "አፑን ጫን" የሚለውን ይጫኑ' : 'Tap "Install App" Above'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'am' ? 'ብራውዘርዎ የሚያሳየውን የመጫኛ ጥያቄ "Install" ይበሉ' : 'Confirm "Install" on the browser popup'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">2</div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {language === 'am' ? 'ወይም ከ Chrome ምናሌ (⋮) "Install app" ይምረጡ' : 'Or from Chrome Menu (⋮) tap "Install app"'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'am' ? 'በቀላሉ በስልክዎ መነሻ ገጽ ላይ ያለ ምንም ማውረጃ ይጨመራል' : 'Adds instantly to your home screen with zero app store hassle'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── HIGHLIGHTS (WHY INSTALL PWA?) ── */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center mb-1.5">
              <Zap size={16} />
            </div>
            <h4 className="text-xs font-black text-slate-800 dark:text-white">
              {language === 'am' ? 'ፈጣን እና ቀላል' : 'Super Fast & Light'}
            </h4>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {language === 'am' ? 'ከ 2 MB ያነሰ ቦታ የሚጠቀም፣ ፈጣን ጭነት' : 'Under 2 MB, instant loading with no lag'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-1.5">
              <Trophy size={16} />
            </div>
            <h4 className="text-xs font-black text-slate-800 dark:text-white">
              {language === 'am' ? 'ፈጣን ክፍያ በብር' : 'Instant Cash Payouts'}
            </h4>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {language === 'am' ? 'በቴሌብር እና በኢትዮጵያ ንግድ ባንክ' : 'Via Telebirr, CBE & direct bank transfer'}
            </p>
          </div>
        </div>

        {/* ── FOOTER CREDITS ── */}
        <div className="text-center pt-2 pb-6">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
            Choice Bingo © 2026 • Verified PWA Application
          </p>
        </div>

      </div>
    </div>
  );
}
