import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { t } from '../lib/translations';
import { 
  Wallet, Gift, PlusCircle, ArrowDownToLine, Share2, 
  ArrowRightLeft, History, Users, Globe, Headphones, Megaphone,
  ChevronRight, X, Moon, BarChart2, Copy, Check, BookOpen, Download, Smartphone, KeyRound
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { usePwaPrompt } from '../components/PwaInstallBanner';
import PwaResetPasswordModal from '../components/PwaResetPasswordModal';
import SetWebPasswordModal from '../components/SetWebPasswordModal';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Profile() {
  const { user, isProfileOpen, setProfileOpen, isDarkMode, toggleDarkMode, language, setLanguage } = useGameStore();
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [supportUsername, setSupportUsername] = useState('ChoiceBingo_admin');
  const [channelLink, setChannelLink] = useState('https://t.me/ChoiceBingo');
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

  // Shared class for every list row - ultra-compact to fit 100% on screen without scrolling
  const row = "w-full flex items-center px-2 py-[2.5px] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors active:bg-slate-100 text-left";
  const icon = (color: string) => `w-4.5 h-4.5 rounded-md ${color} flex items-center justify-center mr-1.5 shrink-0`;

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
        className={`fixed top-0 left-0 h-[100dvh] max-h-screen w-[80%] max-w-[320px] bg-slate-50 dark:bg-slate-900 border-r dark:border-slate-800 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col overflow-hidden ${
          isProfileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* ── HEADER ── */}
        <div className="bg-slate-900 rounded-br-[1.25rem] px-3 pt-3 pb-2.5 shadow-md relative shrink-0">
          <button
            onClick={() => setProfileOpen(false)}
            className="absolute top-2.5 right-2.5 text-white/50 hover:text-white p-1"
          >
            <X size={15} />
          </button>

          <div className="flex items-center space-x-2.5 mb-2 mt-0">
            <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white/20 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
              {user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-white font-black text-xs truncate leading-tight">{user?.first_name || 'Player'}</p>
              <div className="flex items-center space-x-1 mt-0.5">
                <span className="text-white/60 text-[8.5px] font-mono font-bold truncate">
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
                    {copied ? <Check size={9} className="text-emerald-400" /> : <Copy size={9} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-1.5 border border-white/10 flex flex-col justify-center">
              <div className="flex items-center space-x-1 text-white/70">
                <Wallet size={9} />
                <p className="text-[7.5px] font-bold uppercase tracking-wider">{t[language].profile.mainBalance}</p>
              </div>
              <p className="text-xs font-black text-white mt-0.5 leading-tight">{formatMoney(user?.main_balance)} <span className="text-[7.5px] font-normal">ETB</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-1.5 border border-white/10 flex flex-col justify-center">
              <div className="flex items-center space-x-1 text-purple-300">
                <Gift size={9} />
                <p className="text-[7.5px] font-bold uppercase tracking-wider">{t[language].profile.bonusBalance}</p>
              </div>
              <p className="text-xs font-black text-white mt-0.5 leading-tight">{formatMoney(user?.bonus_balance)} <span className="text-[7.5px] font-normal">ETB</span></p>
            </div>
          </div>

          {/* User Activity Stats */}
          <div className="grid grid-cols-3 gap-1 mt-1.5">
            <div className="bg-black/20 backdrop-blur-md rounded-lg p-1 border border-white/10 flex flex-col items-center justify-center text-center">
              <p className="text-[6.5px] font-bold uppercase tracking-wider text-amber-300/90 leading-tight">{t[language].profile.totalGames}</p>
              <p className="text-[10px] font-black text-white mt-0.5 leading-tight">🎮 {user?.total_games || 0}</p>
            </div>
            <div className="bg-black/20 backdrop-blur-md rounded-lg p-1 border border-white/10 flex flex-col items-center justify-center text-center">
              <p className="text-[6.5px] font-bold uppercase tracking-wider text-cyan-300/90 leading-tight">{t[language].profile.totalStake}</p>
              <p className="text-[10px] font-black text-white mt-0.5 leading-tight">{formatMoney(user?.total_stake)} <span className="text-[6.5px] font-normal">ETB</span></p>
            </div>
            <div className="bg-black/20 backdrop-blur-md rounded-lg p-1 border border-white/10 flex flex-col items-center justify-center text-center">
              <p className="text-[6.5px] font-bold uppercase tracking-wider text-emerald-300/90 leading-tight">{t[language].profile.invitedReward}</p>
              <p className="text-[10px] font-black text-white mt-0.5 leading-tight">{formatMoney(user?.invited_reward)} <span className="text-[6.5px] font-normal">ETB</span></p>
            </div>
          </div>
        </div>

        {/* ── COMPACT FIT-TO-SCREEN CONTENT (NO SCROLLING) ── */}
        <div className="px-2 pt-1.5 pb-2 flex flex-col gap-1.5 flex-1 overflow-hidden justify-between">

          {/* Action buttons 1×4 */}
          <div className="grid grid-cols-4 gap-1 shrink-0">
            <button onClick={() => navigateTo('/deposit')} className="bg-yellow-400 active:bg-yellow-500 transition-colors text-yellow-950 rounded-lg py-1.5 flex flex-col items-center justify-center shadow-xs">
              <PlusCircle size={14} className="mb-0.5" />
              <span className="font-bold text-[8px] leading-none">{t[language].profile.deposit}</span>
            </button>
            <button onClick={() => navigateTo('/withdraw')} className="bg-white dark:bg-slate-800 active:bg-gray-100 transition-colors text-slate-700 dark:text-slate-200 rounded-lg py-1.5 flex flex-col items-center justify-center shadow-xs border border-gray-100 dark:border-slate-700">
              <ArrowDownToLine size={14} className="mb-0.5" />
              <span className="font-bold text-[8px] leading-none">{t[language].profile.withdraw}</span>
            </button>
            <button onClick={() => navigateTo('/invite')} className="bg-white dark:bg-slate-800 active:bg-gray-100 transition-colors text-slate-700 dark:text-slate-200 rounded-lg py-1.5 flex flex-col items-center justify-center shadow-xs border border-gray-100 dark:border-slate-700">
              <Share2 size={14} className="mb-0.5 text-blue-500" />
              <span className="font-bold text-[8px] leading-none">{t[language].profile.invite}</span>
            </button>
            <button onClick={() => navigateTo('/transfer')} className="bg-white dark:bg-slate-800 active:bg-gray-100 transition-colors text-slate-700 dark:text-slate-200 rounded-lg py-1.5 flex flex-col items-center justify-center shadow-xs border border-gray-100 dark:border-slate-700">
              <ArrowRightLeft size={14} className="mb-0.5 text-emerald-500" />
              <span className="font-bold text-[8px] leading-none">{t[language].profile.transfer}</span>
            </button>
          </div>

          {/* List items — flex-1 fills remaining height, justify-between spreads all rows with zero overflow */}
          <div className="bg-white dark:bg-slate-800 rounded-xl px-1 py-1 shadow-xs border border-gray-100 dark:border-slate-700 flex flex-col justify-between flex-1 overflow-hidden">

            <button onClick={() => navigateTo('/deposit-history')} className={row}>
              <div className={icon('bg-blue-50 text-blue-500')}><History size={10} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-[9.5px]">{t[language].profile.depositHistory}</span>
              <ChevronRight size={9} className="text-slate-300" />
            </button>

            <button onClick={() => navigateTo('/withdraw-history')} className={row}>
              <div className={icon('bg-rose-50 text-rose-500')}><History size={10} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-[9.5px]">{t[language].profile.withdrawHistory}</span>
              <ChevronRight size={9} className="text-slate-300" />
            </button>

            <button onClick={() => navigateTo('/games-report')} className={row}>
              <div className={icon('bg-teal-50 text-teal-500')}><BarChart2 size={10} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-[9.5px]">{t[language].profile.gamesReport}</span>
              <ChevronRight size={9} className="text-slate-300" />
            </button>

            <button onClick={() => navigateTo('/audit')} className={row}>
              <div className={icon('bg-indigo-50 text-indigo-500')}><History size={10} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-[9.5px]">{t[language].profile.fullAudit}</span>
              <ChevronRight size={9} className="text-slate-300" />
            </button>

            <button onClick={() => navigateTo('/invited')} className={row}>
              <div className={icon('bg-emerald-50 text-emerald-500')}><Users size={10} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-[9.5px]">{t[language].profile.invitePerson}</span>
              <ChevronRight size={9} className="text-slate-300" />
            </button>

            <button onClick={() => navigateTo('/rules')} className={row}>
              <div className={icon('bg-yellow-50 text-yellow-500')}><BookOpen size={10} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-[9.5px]">{t[language].profile.rules}</span>
              <ChevronRight size={9} className="text-slate-300" />
            </button>

            {/* Language Selector */}
            <div className="relative">
              <button onClick={() => setShowLangDropdown(!showLangDropdown)} className={row}>
                <div className={icon('bg-purple-50 text-purple-500')}><Globe size={10} /></div>
                <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-[9.5px]">{t[language].profile.language}</span>
                <span className="text-[7.5px] font-black text-slate-400 mr-1 uppercase bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded transition-all">{language.toUpperCase()}</span>
                <ChevronRight size={9} className={`text-slate-300 transition-transform ${showLangDropdown ? 'rotate-90' : ''}`} />
              </button>
              
              {showLangDropdown && (
                <div className="absolute top-[100%] right-2 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                  <button 
                    onClick={() => { setLanguage('en'); setShowLangDropdown(false); }}
                    className={`w-full text-left px-3 py-1.5 text-[9.5px] font-bold flex items-center justify-between ${language === 'en' ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    English
                    {language === 'en' && <Check size={10} />}
                  </button>
                  <button 
                    onClick={() => { setLanguage('am'); setShowLangDropdown(false); }}
                    className={`w-full text-left px-3 py-1.5 text-[9.5px] font-bold flex items-center justify-between border-t border-slate-100 dark:border-slate-700 ${language === 'am' ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    አማርኛ
                    {language === 'am' && <Check size={10} />}
                  </button>
                </div>
              )}
              {showLangDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />}
            </div>

            <button onClick={toggleDarkMode} className={row}>
              <div className={icon('bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300')}><Moon size={10} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-[9.5px]">{t[language].profile.darkMode}</span>
              <div className={`w-6 h-3 rounded-full relative mr-1 transition-colors ${isDarkMode ? 'bg-violet-500' : 'bg-slate-200'}`}>
                <div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-[1px] shadow-xs transition-all duration-300 ${isDarkMode ? 'left-[13px]' : 'left-[1px]'}`} />
              </div>
            </button>

            {/* Install PWA Button — ONLY shown outside Telegram in regular browsers */}
            {!isStandalone && !isInsideTelegram && (
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
                className={`${row} bg-amber-500/10 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40`}
              >
                <div className={icon('bg-amber-500 text-slate-950')}>
                  <Download size={10} className="stroke-[2.5]" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="font-black text-amber-700 dark:text-amber-400 text-[9px] block truncate">
                    {language === 'am' ? 'Choice Bingo አፕ ጫን (PWA)' : 'Install Choice Bingo App (PWA)'}
                  </span>
                </div>
                <span className="bg-amber-500 text-slate-950 font-black text-[8px] px-1.5 py-0.5 rounded shadow-xs shrink-0">
                  {language === 'am' ? 'ጫን' : 'Install'}
                </span>
              </button>
            )}

            {/* Set / Manage Web Password for Telegram Account */}
            {isInsideTelegram && (
              <button
                onClick={() => setShowSetWebPasswordModal(true)}
                className={row}
              >
                <div className={icon('bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400')}>
                  <KeyRound size={10} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="font-bold text-slate-700 dark:text-slate-200 text-[9.5px] block truncate">
                    {language === 'am' ? 'የዌብ / PWA የይለፍ ቃል' : 'Web / PWA Password'}
                  </span>
                  <span className="text-[7.5px] text-slate-400 block font-mono truncate">
                    {language === 'am' ? `በ Chrome ለመግባት (ID: ${user?.telegram_id || ''})` : `Login on Chrome (ID: ${user?.telegram_id || ''})`}
                  </span>
                </div>
                <ChevronRight size={9} className="text-slate-300 shrink-0" />
              </button>
            )}

            {/* PWA Phone Account Connect / Switch */}
            {typeof window !== 'undefined' && !WebApp.initDataUnsafe?.user?.id && (
              <button
                onClick={() => {
                  setProfileOpen(false);
                  useGameStore.getState().setIsPhoneModalOpen(true);
                }}
                className={row}
              >
                <div className={icon('bg-emerald-50 text-emerald-600')}>
                  <Smartphone size={10} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="font-bold text-slate-700 dark:text-slate-200 text-[9.5px] block truncate">
                    {language === 'am' ? 'የስልክ ቁጥር መለያ' : 'Phone Account'}
                  </span>
                  <span className="text-[7.5px] text-slate-400 block font-mono truncate">
                    {localStorage.getItem('cb_pwa_phone') || (language === 'am' ? 'ያልተገናኘ' : 'Not Connected')}
                  </span>
                </div>
                <ChevronRight size={9} className="text-slate-300 shrink-0" />
              </button>
            )}

            {/* PWA Reset / Change Password Button (Visible only in PWA for connected phone users) */}
            {typeof window !== 'undefined' && !WebApp.initDataUnsafe?.user?.id && localStorage.getItem('cb_pwa_phone') && (
              <button
                onClick={() => {
                  setShowResetPasswordModal(true);
                }}
                className={row}
              >
                <div className={icon('bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400')}>
                  <KeyRound size={10} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="font-bold text-slate-700 dark:text-slate-200 text-[9.5px] block truncate">
                    {language === 'am' ? 'የይለፍ ቃል ቀይር' : 'Reset Password'}
                  </span>
                  <span className="text-[7.5px] text-slate-400 block truncate">
                    {language === 'am' ? 'የአካውንት የይለፍ ቃል ይቀይሩ' : 'Change account password'}
                  </span>
                </div>
                <ChevronRight size={9} className="text-slate-300 shrink-0" />
              </button>
            )}

            <button onClick={handleSupport} className={row}>
              <div className={icon('bg-orange-50 text-orange-500')}><Headphones size={10} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-[9.5px]">{t[language].profile.support}</span>
              <ChevronRight size={9} className="text-slate-300" />
            </button>

            <button onClick={handleChannel} className={row}>
              <div className={icon('bg-indigo-50 text-indigo-500')}><Megaphone size={10} /></div>
              <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 text-[9.5px]">{t[language].profile.channel}</span>
              <ChevronRight size={9} className="text-slate-300" />
            </button>

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
