import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { t } from '../lib/translations';
import { 
  Wallet, Gift, PlusCircle, ArrowDownToLine, Share2, 
  ArrowRightLeft, History, Users, Globe, Headphones, Megaphone,
  ChevronRight, X, Moon, Copy, Check, BookOpen, Download, Smartphone, KeyRound
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { usePwaPrompt, isRunningInPwa, isRunningInTelegram } from '../components/PwaInstallBanner';
import PwaResetPasswordModal from '../components/PwaResetPasswordModal';
import SetWebPasswordModal from '../components/SetWebPasswordModal';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Profile() {
  const { user, isProfileOpen, setProfileOpen, isDarkMode, toggleDarkMode, language, setLanguage } = useGameStore();
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [supportUsername, setSupportUsername] = useState('Choicebingosupport');
  const [channelLink, setChannelLink] = useState('https://t.me/choicebingo');
  const [copied, setCopied] = useState(false);
  const { isStandalone, triggerInstall } = usePwaPrompt();
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showSetWebPasswordModal, setShowSetWebPasswordModal] = useState(false);
  const navigate = useNavigate();

  const isInsideTelegram = typeof window !== 'undefined' && 
    Boolean(WebApp?.initData && WebApp.initData.length > 0 && !WebApp.initData.startsWith('pwa_phone='));

  useEffect(() => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    fetch(`${API_URL}/player/support-contact`, {
      headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData }
    })
      .then(r => r.json())
      .then(data => {
        if (data.username) setSupportUsername(data.username);
        if (data.channel) setChannelLink(data.channel);
      })
      .catch(console.error);
  }, []);

  const formatMoney = (amount: number | undefined) => (amount || 0).toLocaleString('en-US');

  const handleSupport = () => {
    const url = `https://t.me/${supportUsername.replace('@', '')}`;
    if (typeof WebApp !== 'undefined' && WebApp.openTelegramLink) {
      WebApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleChannel = () => {
    if (typeof WebApp !== 'undefined' && WebApp.openTelegramLink) {
      WebApp.openTelegramLink(channelLink);
    } else {
      window.open(channelLink, '_blank');
    }
  };

  const navigateTo = (path: string) => {
    setProfileOpen(false);
    navigate(path);
  };

  // Shared class for every list row matching reference layout
  const row = "w-full flex items-center px-2.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors active:bg-slate-100 dark:active:bg-slate-800 text-left";
  const icon = (color: string) => `w-7 h-7 rounded-full ${color} flex items-center justify-center mr-2.5 shrink-0 shadow-xs`;

  return (
    <>
      {/* OVERLAY */}
      {isProfileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setProfileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed top-0 left-0 h-full w-[80%] max-w-[325px] bg-slate-50 dark:bg-slate-900 border-r dark:border-slate-800 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col overflow-hidden ${
          isProfileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* ── HEADER ── */}
        <div className="bg-slate-900 rounded-br-[1.5rem] px-4 pt-4 pb-4 shadow-md relative shrink-0">
          <button
            onClick={() => setProfileOpen(false)}
            className="absolute top-3 right-3 text-white/50 hover:text-white p-1"
          >
            <X size={16} />
          </button>

          <div className="flex items-center space-x-3 mb-3 mt-0.5">
            <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-white/20 flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
              {user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-white font-black text-sm truncate leading-tight">{user?.first_name || 'Player'}</p>
              <div className="flex items-center space-x-1 mt-0.5">
                <span className="text-white/60 text-[9.5px] font-mono font-bold truncate">
                  ID: {user?.telegram_id && user.telegram_id !== 'temp' ? user.telegram_id : (language === 'am' ? 'እንግዳ (Guest)' : 'Guest')}
                </span>
                {user?.telegram_id && user.telegram_id !== 'temp' && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(user.telegram_id).then(() => {
                        setCopied(true);
                        if (typeof WebApp !== 'undefined') WebApp.HapticFeedback?.impactOccurred('light');
                        setTimeout(() => setCopied(false), 2000);
                      });
                    }}
                    className="shrink-0 text-white/50 hover:text-white transition-colors ml-0.5"
                    title="Copy ID"
                  >
                    {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/10 flex flex-col">
              <div className="flex items-center space-x-1 text-white/70 mb-0.5">
                <Wallet size={11} />
                <p className="text-[8.5px] font-bold uppercase tracking-wider">{t[language].profile.mainBalance}</p>
              </div>
              <p className="text-base font-black text-white">{formatMoney(user?.main_balance)} <span className="text-[9px]">ETB</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/10 flex flex-col">
              <div className="flex items-center space-x-1 text-purple-300 mb-0.5">
                <Gift size={11} />
                <p className="text-[8.5px] font-bold uppercase tracking-wider">{t[language].profile.bonusBalance}</p>
              </div>
              <p className="text-base font-black text-white">{formatMoney(user?.bonus_balance)} <span className="text-[9px]">ETB</span></p>
            </div>
          </div>
        </div>

        {/* ── CONTENT CONTAINER ── */}
        <div className="px-3 pt-3 pb-5 flex flex-col gap-2.5 flex-1 overflow-y-auto overscroll-contain">

          {/* Action buttons 2×2 */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <button onClick={() => navigateTo('/deposit')} className="bg-yellow-400 active:bg-yellow-500 transition-colors text-yellow-950 rounded-xl py-2 flex flex-col items-center justify-center shadow-xs">
              <PlusCircle size={18} className="mb-0.5" />
              <span className="font-bold text-[10px]">{t[language].profile.deposit}</span>
            </button>
            <button onClick={() => navigateTo('/withdraw')} className="bg-white dark:bg-slate-800 active:bg-gray-100 dark:active:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200 rounded-xl py-2 flex flex-col items-center justify-center shadow-xs border border-gray-100 dark:border-slate-700">
              <ArrowDownToLine size={18} className="mb-0.5" />
              <span className="font-bold text-[10px]">{t[language].profile.withdraw}</span>
            </button>
            <button onClick={() => navigateTo('/invite')} className="bg-white dark:bg-slate-800 active:bg-gray-100 dark:active:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200 rounded-xl py-2 flex flex-col items-center justify-center shadow-xs border border-gray-100 dark:border-slate-700">
              <Share2 size={18} className="mb-0.5 text-blue-500" />
              <span className="font-bold text-[10px]">{t[language].profile.invite}</span>
            </button>
            <button onClick={() => navigateTo('/transfer')} className="bg-white dark:bg-slate-800 active:bg-gray-100 dark:active:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200 rounded-xl py-2 flex flex-col items-center justify-center shadow-xs border border-gray-100 dark:border-slate-700">
              <ArrowRightLeft size={18} className="mb-0.5 text-emerald-500" />
              <span className="font-bold text-[10px]">{t[language].profile.transfer}</span>
            </button>
          </div>

          {/* List items */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl px-2 py-1.5 shadow-xs border border-gray-100 dark:border-slate-700 flex flex-col space-y-1">

            <button onClick={() => navigateTo('/deposit-history')} className={row}>
              <div className={icon('bg-blue-50 text-blue-500 dark:bg-blue-950/60 dark:text-blue-400')}><History size={14} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-xs">{t[language].profile.depositHistory}</span>
              <ChevronRight size={13} className="text-slate-300 dark:text-slate-600" />
            </button>

            <button onClick={() => navigateTo('/withdraw-history')} className={row}>
              <div className={icon('bg-rose-50 text-rose-500 dark:bg-rose-950/60 dark:text-rose-400')}><History size={14} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-xs">{t[language].profile.withdrawHistory}</span>
              <ChevronRight size={13} className="text-slate-300 dark:text-slate-600" />
            </button>

            <button onClick={() => navigateTo('/invited')} className={row}>
              <div className={icon('bg-emerald-50 text-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-400')}><Users size={14} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-xs">{t[language].profile.invitePerson}</span>
              <ChevronRight size={13} className="text-slate-300 dark:text-slate-600" />
            </button>

            <button onClick={() => navigateTo('/rules')} className={row}>
              <div className={icon('bg-yellow-50 text-yellow-500 dark:bg-yellow-950/60 dark:text-yellow-400')}><BookOpen size={14} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-xs">{t[language].profile.rules}</span>
              <ChevronRight size={13} className="text-slate-300 dark:text-slate-600" />
            </button>

            {/* Language Selector */}
            <div className="relative">
              <button onClick={() => setShowLangDropdown(!showLangDropdown)} className={row}>
                <div className={icon('bg-purple-50 text-purple-500 dark:bg-purple-950/60 dark:text-purple-400')}><Globe size={14} /></div>
                <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-xs">{t[language].profile.language}</span>
                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 mr-1.5 uppercase bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md transition-all">{language.toUpperCase()}</span>
                <ChevronRight size={13} className={`text-slate-300 dark:text-slate-600 transition-transform ${showLangDropdown ? 'rotate-90' : ''}`} />
              </button>
              
              {showLangDropdown && (
                <div className="absolute top-[100%] right-2 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                  <button 
                    onClick={() => { setLanguage('en'); setShowLangDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between ${language === 'en' ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    English
                    {language === 'en' && <Check size={12} />}
                  </button>
                  <button 
                    onClick={() => { setLanguage('am'); setShowLangDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between border-t border-slate-100 dark:border-slate-700 ${language === 'am' ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    አማርኛ
                    {language === 'am' && <Check size={12} />}
                  </button>
                </div>
              )}
              {showLangDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />}
            </div>

            <button onClick={toggleDarkMode} className={row}>
              <div className={icon('bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300')}><Moon size={14} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-xs">{t[language].profile.darkMode}</span>
              <div className={`w-8 h-4 rounded-full relative mr-1 transition-colors ${isDarkMode ? 'bg-violet-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[1px] shadow-sm transition-all duration-300 ${isDarkMode ? 'left-[17px]' : 'left-[1px]'}`} />
              </div>
            </button>

            {/* Install PWA Button — ONLY shown outside Telegram in regular browsers */}
            {!isStandalone && !isRunningInPwa() && !isRunningInTelegram() && !isInsideTelegram && (
              <button
                onClick={async () => {
                  const ok = await triggerInstall();
                  if (!ok) {
                    alert(
                      language === 'am'
                        ? 'አፑን ለመጫን በላይኛው ቀኝ ጥግ ያለውን የ Chrome ሶስት ነጥብ (⋮) ተጭነው "Install app" ወይም "Add to Home screen" ይምረጡ::'
                        : 'To install the app, tap the three dots (⋮) in your Chrome browser menu and choose "Install app" or "Add to Home screen".'
                    );
                  }
                }}
                className={`${row} bg-amber-500/10 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40`}
              >
                <div className={icon('bg-amber-500 text-slate-950')}>
                  <Download size={14} className="stroke-[2.5]" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-black text-amber-700 dark:text-amber-400 text-xs block">
                    {language === 'am' ? 'Choice Bingo አፕ ጫን (PWA)' : 'Install Choice Bingo App (PWA)'}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-medium">
                    {language === 'am' ? 'በስልክዎ ላይ በቀጥታ ይጫኑ' : 'Add to home screen as PWA'}
                  </span>
                </div>
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-lg shadow-xs">
                  {language === 'am' ? 'ጫን' : 'Install'}
                </span>
              </button>
            )}

            {/* Support Team */}
            <button onClick={handleSupport} className={row}>
              <div className={icon('bg-orange-50 text-orange-500 dark:bg-orange-950/60 dark:text-orange-400')}><Headphones size={14} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-xs">{t[language].profile.support}</span>
              <ChevronRight size={13} className="text-slate-300 dark:text-slate-600" />
            </button>

            {/* Official Group */}
            <button onClick={handleChannel} className={row}>
              <div className={icon('bg-indigo-50 text-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-400')}><Users size={14} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-xs">{t[language].profile.channel}</span>
              <ChevronRight size={13} className="text-slate-300 dark:text-slate-600" />
            </button>

            {/* ── BELOW CHANNEL: TELEGRAM MINI APP: Mobile Application Password ── */}
            {isInsideTelegram && (
              <button
                onClick={() => setShowSetWebPasswordModal(true)}
                className={row}
              >
                <div className={icon('bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400')}>
                  <KeyRound size={14} />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-bold text-slate-700 dark:text-slate-200 text-xs block">
                    {language === 'am' ? 'የሞባይል አፕሊኬሽን የይለፍ ቃል' : 'Mobile Application Password'}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono">
                    {language === 'am' ? `በሞባይል አፕሊኬሽን ለመግባት (ID: ${user?.telegram_id || ''})` : `Login on Mobile Application with ID: ${user?.telegram_id || ''}`}
                  </span>
                </div>
                <ChevronRight size={13} className="text-slate-300 dark:text-slate-600" />
              </button>
            )}

            {/* ── BELOW CHANNEL: PWA: 1) Reset Password ── */}
            {typeof window !== 'undefined' && !WebApp.initDataUnsafe?.user?.id && localStorage.getItem('cb_pwa_phone') && (
              <button
                onClick={() => {
                  setShowResetPasswordModal(true);
                }}
                className={row}
              >
                <div className={icon('bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400')}>
                  <KeyRound size={14} />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-bold text-slate-700 dark:text-slate-200 text-xs block">
                    {language === 'am' ? 'የይለፍ ቃል ቀይር (Reset Password)' : 'Reset Password'}
                  </span>
                  <span className="text-[9px] text-slate-400 block">
                    {language === 'am' ? 'የአካውንትዎን የይለፍ ቃል ይቀይሩ' : 'Change your account password'}
                  </span>
                </div>
                <ChevronRight size={13} className="text-slate-300 dark:text-slate-600" />
              </button>
            )}

            {/* ── BELOW CHANNEL: PWA: 2) Phone Account (LAST item) ── */}
            {typeof window !== 'undefined' && !WebApp.initDataUnsafe?.user?.id && (
              <button
                onClick={() => {
                  setProfileOpen(false);
                  useGameStore.getState().setIsPhoneModalOpen(true);
                }}
                className={row}
              >
                <div className={icon('bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400')}>
                  <Smartphone size={14} />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-bold text-slate-700 dark:text-slate-200 text-xs block">
                    {language === 'am' ? 'የስልክ ቁጥር መለያ' : 'Phone Account'}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono">
                    {localStorage.getItem('cb_pwa_phone') || (language === 'am' ? 'ያልተገናኘ' : 'Not Connected')}
                  </span>
                </div>
                <ChevronRight size={13} className="text-slate-300 dark:text-slate-600" />
              </button>
            )}

          </div>
        </div>
      </div>
      <PwaResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
      />
      <SetWebPasswordModal
        isOpen={showSetWebPasswordModal}
        onClose={() => setShowSetWebPasswordModal(false)}
      />
    </>
  );
}
