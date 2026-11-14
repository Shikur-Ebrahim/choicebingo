import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  Share2, 
  PlusSquare, 
  ArrowRight, 
  Zap, 
  Trophy, 
  Gamepad2, 
  ExternalLink,
  ChevronRight,
  Globe,
  X,
  MoreVertical
} from 'lucide-react';
import { usePwaPrompt, isRealStandalone } from '../components/PwaInstallBanner';
import { useGameStore } from '../store/gameStore';

export default function InstallApp() {
  const navigate = useNavigate();
  const { language, setLanguage } = useGameStore();
  const { canInstall, triggerInstall } = usePwaPrompt();

  const [installing, setInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Detect iOS Safari
  const isIos = typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  // 1. AUTO-OPEN APP IF ALREADY RUNNING IN INSTALLED STANDALONE PWA
  useEffect(() => {
    if (isRealStandalone()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // 2. LISTEN FOR NATIVE "appinstalled" EVENT AND AUTO-OPEN
  useEffect(() => {
    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setInstalling(false);
      try {
        localStorage.setItem('cb_is_installed_pwa', 'true');
      } catch {}
      // Automatically navigate into the game after 1.5 seconds!
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1500);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [navigate]);

  // 3. HANDLE INSTALL BUTTON CLICK
  const handleInstallClick = async () => {
    setInstalling(true);

    try {
      if (canInstall) {
        const ok = await triggerInstall();
        if (ok) {
          setInstalledSuccess(true);
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1500);
          return;
        }
      }

      if (isIos) {
        setInstalling(false);
        const guideEl = document.getElementById('ios-guide-section');
        if (guideEl) {
          guideEl.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }

      // If canInstall is not ready or manual install needed on Android Chrome
      setInstalling(false);
      setShowHelpModal(true);
    } catch (err: any) {
      console.warn('Install error:', err);
      setInstalling(false);
      setShowHelpModal(true);
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
            {/* Success Banner when installed */}
            {installedSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-2xl p-3 flex items-center justify-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-xs animate-fade-in">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span>{language === 'am' ? 'Choice Bingo ተጭኗል! ጨዋታው እየተከፈተ ነው...' : 'Choice Bingo Installed! Opening game...'}</span>
              </div>
            )}

            {/* ALWAYS DISPLAYED: 1-Click Install Application Button */}
            <button
              onClick={handleInstallClick}
              disabled={installing}
              className="w-full py-4 px-5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-base rounded-2xl shadow-[0_6px_0_0_#b45309] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2.5 group relative overflow-hidden disabled:opacity-60"
            >
              <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Download size={22} className="text-slate-950 shrink-0 animate-bounce" />
              <span className="tracking-wide">
                {installing 
                  ? (language === 'am' ? 'እየተጫነ ነው...' : 'Installing...')
                  : (language === 'am' ? '📲 አፑን ጫን (Install App)' : '📲 Install Choice Bingo App')}
              </span>
            </button>

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
                    <span>{language === 'am' ? 'በስክሪኑ ታችኛው ክፍል ያለውን' : 'At the bottom of Safari:'}</span>
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

      {/* ── CHROME / BROWSER MANUAL INSTALL MODAL POPUP ── */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative text-center">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>

            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shadow-inner">
              <Download size={28} />
            </div>

            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {language === 'am' ? 'አፑን በስልክዎ ለመጫን' : 'How to Install Choice Bingo'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'am' 
                  ? 'ከታች ያሉትን 2 ቀላል ቅደም ተከተሎች ይከተሉ:' 
                  : 'Follow these 2 simple steps in your browser:'}
              </p>
            </div>

            <div className="text-left space-y-2.5 text-xs text-slate-700 dark:text-slate-200">
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">1</span>
                <div>
                  <p className="font-bold">
                    {language === 'am' ? 'የ Chrome ሶስት ነጥብ (⋮) ይጫኑ' : 'Tap the Browser Menu (⋮)'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'am' ? 'በስክሪኑ የላይኛው ቀኝ ጥግ ላይ ያለውን ⋮ ምልክት ይጫኑ' : 'Located at the top-right corner of your browser'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">2</span>
                <div>
                  <p className="font-bold">
                    {language === 'am' ? '"Install app" ወይም "Add to Home screen" ይምረጡ' : 'Select "Install app" or "Add to Home screen"'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'am' ? 'Choice Bingo ወዲያውኑ በስልክዎ መነሻ ገጽ ላይ ይጫናል!' : 'Choice Bingo will be added directly to your phone screen!'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black rounded-xl text-xs active:scale-95 transition-all shadow-md"
              >
                {language === 'am' ? 'ተረድቻለሁ (Got it)' : 'Got it!'}
              </button>

              <button
                onClick={() => {
                  setShowHelpModal(false);
                  navigate('/');
                }}
                className="w-full py-2.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold transition-colors"
              >
                {language === 'am' ? 'ወደ ጨዋታው ቀጥታ ሂድ' : 'Continue to Game Directly'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
