import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, Share, PlusSquare } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

let deferredInstallPrompt: any = null;

// Global listener for beforeinstallprompt
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-prompt-ready'));
  });
}

export function isRealStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.matchMedia?.('(display-mode: fullscreen)')?.matches ||
      window.matchMedia?.('(display-mode: minimal-ui)')?.matches ||
      (window.navigator as any)?.standalone === true ||
      document.referrer?.includes('android-app://')
    );
  } catch {
    return false;
  }
}

export function isRunningInPwa(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isStandaloneMode = isRealStandalone();

    if (isStandaloneMode) {
      try {
        localStorage.setItem('cb_is_installed_pwa', 'true');
        sessionStorage.setItem('cb_is_pwa', 'true');
      } catch {}
      return true;
    } else {
      try {
        localStorage.removeItem('cb_is_installed_pwa');
        sessionStorage.removeItem('cb_is_pwa');
      } catch {}
    }
  } catch {}
  return false;
}

export function isRunningInTelegram(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const twa = (window as any).Telegram?.WebApp;
    const hasTgUser = Boolean(twa?.initDataUnsafe?.user?.id);
    const rawInit = typeof twa?.initData === 'string' ? twa.initData : '';
    const hasTgInit = Boolean(rawInit && rawInit.length > 0 && !rawInit.startsWith('pwa_phone='));
    const hasTgHash = typeof window.location !== 'undefined' && Boolean(
      window.location.hash?.includes('tgWebAppData') ||
      window.location.search?.includes('tgWebAppData') ||
      window.location.hash?.includes('tgWebAppVersion')
    );
    const hasPlatform = Boolean(twa?.platform && twa.platform !== 'unknown' && twa.platform !== '');

    if (hasTgUser || hasTgInit || hasTgHash || (hasPlatform && (hasTgInit || hasTgHash))) {
      try { sessionStorage.setItem('cb_is_telegram', 'true'); } catch {}
      return true;
    }
    return sessionStorage.getItem('cb_is_telegram') === 'true';
  } catch {}
  return false;
}

export function isPwaDismissedSync(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const dismissTime = localStorage.getItem('cb_pwa_dismissed');
    if (dismissTime) {
      const hoursPassed = (Date.now() - parseInt(dismissTime, 10)) / (1000 * 60 * 60);
      if (hoursPassed < 24) {
        return true;
      }
    }
  } catch {}
  return false;
}

export function usePwaPrompt() {
  const [canInstall, setCanInstall] = useState<boolean>(() => Boolean(deferredInstallPrompt));
  const [isStandalone, setIsStandalone] = useState<boolean>(() => isRunningInPwa());

  useEffect(() => {
    // Check if already running as installed standalone PWA
    if (isRunningInPwa()) {
      setIsStandalone(true);
      return;
    }

    if (deferredInstallPrompt) {
      setCanInstall(true);
    }

    const handlePromptReady = () => {
      setCanInstall(true);
    };

    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', () => {
      setCanInstall(false);
      setIsStandalone(true);
      try {
        localStorage.setItem('cb_is_installed_pwa', 'true');
        sessionStorage.setItem('cb_is_pwa', 'true');
      } catch {}
      deferredInstallPrompt = null;
    });

    return () => {
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
    };
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    if (!deferredInstallPrompt) {
      return false;
    }
    try {
      deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        deferredInstallPrompt = null;
        setCanInstall(false);
        try {
          localStorage.setItem('cb_is_installed_pwa', 'true');
          sessionStorage.setItem('cb_is_pwa', 'true');
        } catch {}
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[PWA Install Error]', err);
      return false;
    }
  };

  return { canInstall, isStandalone, triggerInstall };
}

export default function PwaInstallBanner() {
  const { language } = useGameStore();
  const { canInstall, isStandalone, triggerInstall } = usePwaPrompt();
  const [dismissed, setDismissed] = useState<boolean>(() => isPwaDismissedSync());
  const [showIosGuide, setShowIosGuide] = useState(false);

  // Synchronous checks before rendering ANYTHING
  const isInsideTelegram = isRunningInTelegram();
  const isPwa = isStandalone || isRunningInPwa();

  // Detect iOS Safari
  const isIos =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  // Don't show if already running as installed PWA, inside Telegram, or user dismissed
  if (isInsideTelegram || isPwa || dismissed) {
    return null;
  }

  // Show if canInstall (Chrome / Android) OR if on iOS browser or mobile web
  const handleInstallClick = async () => {
    if (canInstall) {
      const installed = await triggerInstall();
      if (installed) {
        setDismissed(true);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      // Direct Chrome / mobile instruction if prompt not captured yet
      alert(
        language === 'am'
          ? 'አፑን ለመጫን በላይኛው ቀኝ ጥግ ያለውን ሶስት ነጥብ (⋮) ተጭነው "Install app" ወይም "Add to Home screen" ይምረጡ::'
          : 'To install the app, tap the three dots (⋮) in your browser menu and choose "Install app" or "Add to Home screen".'
      );
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('cb_pwa_dismissed', String(Date.now()));
    } catch {}
  };

  return (
    <>
      {/* ── 3D PWA INSTALL STICKY BANNER ── */}
      <div className="relative mx-3.5 my-2.5 z-30 animate-slide-down">
        <div className="bg-gradient-to-r from-slate-900 via-[#131b2e] to-slate-900 text-white rounded-2xl p-3 shadow-[0_8px_25px_rgba(0,0,0,0.3)] border border-amber-500/40 relative overflow-hidden flex items-center justify-between gap-2.5">
          {/* Subtle Golden Glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Left: App Logo + Text */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-md shrink-0 border border-amber-400/50 bg-slate-800">
              <img
                src="/choicebingo-logo.png"
                alt="Choice Bingo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-black text-xs text-white tracking-tight truncate">
                  Choice Bingo App
                </span>
                <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase">
                  PWA
                </span>
              </div>
              <p className="text-[10px] text-slate-300 font-medium truncate mt-0.5">
                {language === 'am'
                  ? 'ፈጣን እና ምቹ አጨዋወት በስልክዎ ላይ'
                  : 'Install to your Home Screen for faster play'}
              </p>
            </div>
          </div>

          {/* Right: Install Button & Dismiss */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Download size={13} className="stroke-[2.5]" />
              <span>{language === 'am' ? 'ጫን' : 'Install'}</span>
            </button>

            <button
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition-colors active:scale-90"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── IOS "ADD TO HOME SCREEN" MODAL GUIDE ── */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-end justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 animate-slide-up text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone size={20} className="text-amber-500" />
                <h3 className="font-black text-sm text-slate-800 dark:text-white">
                  {language === 'am' ? 'በ iPhone ላይ አፑን ለመጫን' : 'Install on iPhone / iPad'}
                </h3>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <X size={15} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
                  <Share size={18} />
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  1. {language === 'am' ? 'ከስር ያለውን የ Share (ማጋሪያ) ምልክት ይጫኑ' : 'Tap the Share icon at the bottom of Safari'}
                </p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
                  <PlusSquare size={18} />
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  2. {language === 'am' ? 'ወደ ታች ዝቅ ብለው "Add to Home Screen" የሚለውን ይጫኑ' : 'Scroll down and tap "Add to Home Screen"'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black rounded-2xl text-xs active:scale-95 shadow-md"
            >
              {language === 'am' ? 'ተረድቻለሁ' : 'Got it!'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
