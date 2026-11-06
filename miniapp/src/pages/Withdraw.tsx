import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Phone, 
  MessageCircle, 
  Wallet, 
  ShieldCheck,
  Check,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from '../store/gameStore';
import { t } from '../lib/translations';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface WithdrawalMethod {
  id: string;
  type: string;
  logo_url: string;
  min_withdrawal: number;
}

const typeLabels: Record<string, string> = {
  cbe: 'Commercial Bank of Ethiopia',
  boa: 'Bank of Abyssinia',
  telebirr: 'Telebirr',
  mpesa: 'M-Pesa',
  cbebirr: 'CBE Birr',
  ebirr: 'E-Birr',
  awash: 'Awash Bank',
  dashen: 'Dashen Bank',
  amhara: 'Amhara Bank',
  coop: 'Cooperative Bank of Oromia',
  amole: 'Amole Wallet',
  hello_cash: 'HelloCash',
  nib: 'Nib International Bank',
  wegagen: 'Wegagen Bank',
  zemen: 'Zemen Bank',
  oromia: 'Oromia Bank',
  hibret: 'Hibret Bank',
};

const typeColors: Record<string, string> = {
  cbe: 'from-amber-500 to-yellow-600',
  boa: 'from-blue-600 to-cyan-700',
  telebirr: 'from-purple-600 to-indigo-700',
  mpesa: 'from-emerald-500 to-green-700',
  cbebirr: 'from-yellow-500 to-amber-700',
  ebirr: 'from-orange-500 to-amber-700',
  awash: 'from-slate-600 to-slate-800',
  dashen: 'from-blue-600 to-blue-900',
  amhara: 'from-teal-500 to-teal-800',
  coop: 'from-indigo-600 to-indigo-900',
  amole: 'from-rose-500 to-red-700',
  hello_cash: 'from-emerald-400 to-green-600',
  nib: 'from-purple-500 to-indigo-700',
  wegagen: 'from-slate-700 to-slate-900',
  zemen: 'from-amber-500 to-orange-700',
  oromia: 'from-teal-500 to-cyan-700',
  hibret: 'from-yellow-500 to-amber-700',
};

const typeEmoji: Record<string, string> = {
  cbe: '🏦',
  boa: '🏛️',
  telebirr: '📱',
  mpesa: '💚',
  cbebirr: '💳',
  ebirr: '⚡',
  awash: '🏦',
  dashen: '🏛️',
};

type Step = 'list' | 'form' | 'pending_status';

export default function Withdraw() {
  const { user, language, fetchUser } = useGameStore();
  const userBalance = Number(user?.main_balance || 0);

  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WithdrawalMethod | null>(null);
  const [step, setStep] = useState<Step>('list');
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [supportContact, setSupportContact] = useState<string>('');

  // Form state
  const [amount, setAmount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 🌟 Auto-Disappearing Success Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successAmount, setSuccessAmount] = useState<number>(0);
  const [successCountdown, setSuccessCountdown] = useState(4);
  const [successAccountName, setSuccessAccountName] = useState('');
  const [successAccountNumber, setSuccessAccountNumber] = useState('');
  const [successMethodName, setSuccessMethodName] = useState('');

  // 🌟 Auto-Disappearing Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'warning' | 'info' | 'success'>('info');
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (msg: string, type: 'warning' | 'info' | 'success' = 'info', duration = 3500) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    setToastType(type);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  // Countdown timer for auto-disappearing success modal
  useEffect(() => {
    if (showSuccessModal && successCountdown > 0) {
      const timer = setTimeout(() => setSuccessCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showSuccessModal && successCountdown === 0) {
      setShowSuccessModal(false);
      setStep('list');
    }
  }, [showSuccessModal, successCountdown]);

  const getHeaders = () => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    return { 'Content-Type': 'application/json', 'x-telegram-init-data': initData };
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  // Real-time Supabase status sync
  useEffect(() => {
    if (!user?.telegram_id) return;

    const channel = supabase
      .channel('withdrawals_page_sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'withdrawals',
        },
        (payload) => {
          if (payload.new && String(payload.new.telegram_id) === String(user.telegram_id)) {
            if (payload.new.status === 'completed') {
              setPendingAmount(null);
              fetchUser();
              showToast(
                language === 'am' 
                  ? `የ ${payload.new.amount} ETB ማውጫዎ በተሳካ ሁኔታ ተልኳል!` 
                  : `Your withdrawal of ${payload.new.amount} ETB has been approved and sent!`,
                'success',
                5000
              );
            } else if (payload.new.status === 'rejected') {
              setPendingAmount(null);
              fetchUser();
              showToast(
                language === 'am' 
                  ? `የ ${payload.new.amount} ETB ማውጫ ጥያቄዎ ውድቅ ተደርጓል፤ ገንዘቡ ተመልሷል።` 
                  : `Withdrawal request of ${payload.new.amount} ETB was rejected and refunded.`,
                'warning',
                6000
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.telegram_id, language]);

  const fetchData = async () => {
    try {
      const headers = getHeaders();
      const [methodsRes, historyRes, contactRes] = await Promise.all([
        fetch(`${API_URL}/withdraw/methods`, { headers }),
        fetch(`${API_URL}/withdraw/history`, { headers }),
        fetch(`${API_URL}/player/support-contact`, { headers }),
      ]);

      if (methodsRes.ok) setMethods(await methodsRes.json());

      if (historyRes.ok) {
        const history = await historyRes.json();
        const pending = history.find((w: any) => w.status === 'pending');
        if (pending) {
          setPendingAmount(pending.amount);
        }
      }
      
      if (contactRes.ok) {
        const support = await contactRes.json();
        setSupportContact(support.username || 'ChoiceBingo_admin');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError('');

    const amtNum = parseFloat(amount);
    if (!amount || amount.trim() === '' || isNaN(amtNum) || amtNum <= 0) {
      setError(language === 'am' ? 'እባክዎ ትክክለኛ የማውጣት መጠን ያስገቡ።' : 'Please enter a valid withdrawal amount.');
      return;
    }
    if (amtNum < selected.min_withdrawal) {
      setError(`${language === 'am' ? 'ዝቅተኛው የማውጣት መጠን' : 'Minimum withdrawal is'} ${selected.min_withdrawal.toLocaleString('en-US')} ETB`);
      return;
    }
    if (amtNum > userBalance) {
      setError(`${language === 'am' ? 'በቂ ያልሆነ ሂሳብ። ያለዎት ሂሳብ' : 'Insufficient balance. Your balance is'} ${userBalance.toLocaleString('en-US')} ETB`);
      return;
    }
    if (!accountName.trim()) { 
      setError(language === 'am' ? 'እባክዎ ሙሉ ስምዎን ያስገቡ።' : 'Please enter your full name.'); 
      return; 
    }
    if (!accountNumber.trim()) { 
      setError(language === 'am' ? 'እባክዎ የሂሳብ ወይም የስልክ ቁጥርዎን ያስገቡ።' : 'Please enter your account/phone number.'); 
      return; 
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/withdraw/request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          method_id: selected.id,
          amount: amtNum,
          account_name: accountName.trim(),
          account_number: accountNumber.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) { 
        setError(data.error || (language === 'am' ? 'ማስገባት አልተሳካም። እባክዎ እንደገና ይሞክሩ።' : 'Failed to submit. Please try again.')); 
        return; 
      }

      // Refresh user balance in store
      fetchUser();

      // Set Success Info & Show Auto-Disappearing Modal
      setSuccessAmount(amtNum);
      setSuccessAccountName(accountName.trim());
      setSuccessAccountNumber(accountNumber.trim());
      setSuccessMethodName(typeLabels[selected.type] || selected.type.toUpperCase());
      setSuccessCountdown(4);
      setShowSuccessModal(true);

      // Record pending amount
      setPendingAmount(amtNum);

      // Reset form
      setAmount('');
      setAccountName('');
      setAccountNumber('');
      setStep('list');
    } catch (err: any) {
      setError(err.message || (language === 'am' ? 'የግንኙነት ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።' : 'Network error. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
          <p className="text-slate-400 font-bold text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // ── STEP: PENDING STATUS FULL DETAILS ──
  if (step === 'pending_status') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] flex flex-col items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-900/95 w-full max-w-sm rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.1)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-slate-200/80 dark:border-slate-800 p-8 text-center backdrop-blur-md">
          <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/40 rounded-3xl flex items-center justify-center mx-auto mb-5 border-2 border-amber-200 dark:border-amber-700/60 shadow-lg shadow-amber-500/10">
            <Clock size={40} className="text-amber-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{t[language].withdraw.alreadyPendingTitle}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed text-sm">
            {t[language].withdraw.alreadyPendingDesc.split('{amount}')[0]}
            <span className="font-black text-amber-600 dark:text-amber-400">{pendingAmount?.toLocaleString('en-US')} ETB</span>
            {t[language].withdraw.alreadyPendingDesc.split('{amount}')[1]}
          </p>
          <div className="mt-5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4">
            <p className="text-xs text-blue-700 dark:text-blue-300 font-bold text-center">{t[language].withdraw.waitAdmin}</p>
          </div>
          {supportContact && (
            <a 
              href={`https://t.me/${supportContact.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center space-x-2 text-blue-600 dark:text-blue-400 font-black text-sm bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors py-3.5 rounded-2xl w-full border border-blue-200 dark:border-blue-800/60 shadow-sm"
            >
              <MessageCircle size={18} />
              <span>Need Help? {t[language].withdraw.contactSupport}</span>
            </a>
          )}

          <button 
            onClick={() => setStep('list')}
            className="mt-3 block w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black py-4 rounded-2xl text-center transition-all active:scale-95 border border-slate-200/80 dark:border-slate-700 shadow-sm"
          >
            {language === 'am' ? 'ወደ ማውጫ መንገዶች ተመለስ' : 'Back to Withdrawal Methods'}
          </button>
        </div>
      </div>
    );
  }

  // ── STEP: FORM ──
  if (step === 'form' && selected) {
    const gradient = typeColors[selected.type] || 'from-slate-600 to-slate-800';
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 transition-colors duration-200 pb-12">
        {/* 3D Method Header */}
        <div className={`bg-gradient-to-r ${gradient} px-4 pt-6 pb-8 shadow-lg relative overflow-hidden border-b border-white/10`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center space-x-3 mb-4 relative z-10">
            <button onClick={() => setStep('list')} className="w-10 h-10 rounded-xl bg-black/20 hover:bg-black/30 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 active:scale-90 transition-all">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-black text-white drop-shadow-sm flex items-center gap-2">
              <span>{typeEmoji[selected.type] || '💳'}</span>
              <span>{typeLabels[selected.type] || selected.type.toUpperCase()}</span>
            </h1>
          </div>
          {/* 3D Balance Inset Card */}
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-5 shadow-[0_10px_25px_rgba(0,0,0,0.1)] border border-white/20 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{t[language].withdraw.balance}</p>
                <p className="text-3xl font-black text-slate-800 dark:text-white mt-0.5">
                  {userBalance.toLocaleString('en-US')} <span className="text-lg text-emerald-600 dark:text-emerald-400">ETB</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-500 shadow-inner">
                <Wallet size={24} />
              </div>
            </div>
            <p className="text-slate-400 dark:text-slate-400 text-xs font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>{t[language].withdraw.minWithdrawal} {selected.min_withdrawal.toLocaleString('en-US')} ETB</span>
            </p>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="px-4 -mt-4">
          <div className="bg-white dark:bg-slate-900/95 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.5)] border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 backdrop-blur-md">

            {error && (
              <div className="flex items-start space-x-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl p-3.5">
                <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-600 dark:text-red-400 text-sm font-semibold">{error}</p>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">{t[language].withdraw.amountLabel}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">ETB</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  min={selected.min_withdrawal}
                  max={userBalance}
                  className="w-full pl-14 pr-4 py-3.5 border-2 border-slate-200/80 dark:border-slate-700/80 rounded-2xl focus:border-amber-400 focus:outline-none text-slate-800 dark:text-slate-100 font-black text-xl bg-slate-50 dark:bg-slate-950/80 shadow-inner"
                  required
                />
              </div>
              <div className="flex justify-between items-center mt-1.5 px-1">
                <p className={`text-xs font-bold ${amount && parseFloat(amount) > 0 && parseFloat(amount) < selected.min_withdrawal ? 'text-red-500' : 'text-slate-400 dark:text-slate-400'}`}>
                  {t[language].withdraw.minWithdrawal} {selected.min_withdrawal.toLocaleString('en-US')} ETB
                  {amount && parseFloat(amount) > 0 && parseFloat(amount) < selected.min_withdrawal && ' ⚠️ Too low'}
                </p>
                <button
                  type="button"
                  onClick={() => setAmount(String(userBalance))}
                  className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-lg active:scale-95 transition-all shadow-sm"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">{t[language].withdraw.fullNameLabel}</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder={t[language].withdraw.fullNamePlaceholder}
                  className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-200/80 dark:border-slate-700/80 rounded-2xl focus:border-amber-400 focus:outline-none text-slate-800 dark:text-slate-100 font-bold text-sm bg-slate-50 dark:bg-slate-950/80 shadow-inner"
                  required
                />
              </div>
            </div>

            {/* Account / Phone Number */}
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">
                {selected.type === 'telebirr' || selected.type === 'mpesa' ? t[language].withdraw.phoneLabel : t[language].withdraw.accNumberLabel}
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder={selected.type === 'telebirr' || selected.type === 'mpesa' ? '09XXXXXXXX' : 'Account number'}
                  className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-200/80 dark:border-slate-700/80 rounded-2xl focus:border-amber-400 focus:outline-none text-slate-800 dark:text-slate-100 font-bold text-sm bg-slate-50 dark:bg-slate-950/80 shadow-inner"
                  required
                />
              </div>
            </div>

            {/* Info notice */}
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-3.5 flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold leading-relaxed">
                {t[language].withdraw.infoBox}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 rounded-2xl font-black text-white text-base shadow-[0_8px_25px_rgba(0,0,0,0.2)] border-t border-white/30 active:translate-y-0.5 transition-all ${
                submitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : `bg-gradient-to-r ${gradient}`
              }`}
            >
              {submitting ? t[language].withdraw.submitting : `${t[language].withdraw.title} ${(amount && !isNaN(parseFloat(amount))) ? parseFloat(amount).toLocaleString('en-US') : '0'} ETB`}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── STEP: LIST (MAIN LAYOUT) ──
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 transition-colors duration-200 pb-12 relative">
      
      {/* 🌟 3D AUTO-DISAPPEARING TOAST NOTIFICATION 🌟 */}
      {toastMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 flex justify-center animate-slide-down">
          <div
            className={`px-4 py-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] border flex items-center space-x-2.5 backdrop-blur-md text-xs font-bold max-w-sm ${
              toastType === 'warning'
                ? 'bg-amber-500/95 text-white border-amber-400'
                : toastType === 'success'
                ? 'bg-emerald-500/95 text-white border-emerald-400'
                : 'bg-slate-900/95 text-white border-slate-700'
            }`}
          >
            {toastType === 'warning' && <AlertCircle size={18} className="shrink-0" />}
            {toastType === 'success' && <Check size={18} className="shrink-0" />}
            {toastType === 'info' && <Info size={18} className="shrink-0" />}
            <span className="flex-1 leading-snug">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 🌟 3D AUTO-DISAPPEARING SUCCESS MODAL (COUNTDOWN) 🌟 */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200/80 dark:border-slate-800 text-center relative overflow-hidden animate-scale-up">
            {/* Top Auto-dismiss progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 ease-linear"
                style={{ width: `${(successCountdown / 4) * 100}%` }}
              />
            </div>

            {/* Glowing 3D Badge */}
            <div className="relative w-20 h-20 mx-auto mt-2 mb-4">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                <CheckCircle2 size={44} strokeWidth={2.5} className="animate-scale-up" />
              </div>
            </div>

            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
              {t[language].withdraw.submitted || (language === 'am' ? 'ጥያቄዎ በተሳካ ሁኔታ ቀርቧል!' : 'Request Submitted!')}
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">
              {language === 'am' ? (
                <>የ <span className="font-black text-emerald-600 dark:text-emerald-400">{successAmount.toLocaleString('en-US')} ETB</span> ማውጫ ጥያቄዎ በተሳካ ሁኔታ ቀርቧል::</>
              ) : (
                <>Your withdrawal request of <span className="font-black text-emerald-600 dark:text-emerald-400">{successAmount.toLocaleString('en-US')} ETB</span> has been submitted.</>
              )}
            </p>

            {/* Inset details card */}
            <div className="mt-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1.5 text-left">
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>{language === 'am' ? 'መንገድ' : 'Method'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{successMethodName}</span>
              </div>
              {successAccountNumber && (
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <span>{language === 'am' ? 'አካውንት / ስልክ' : 'Account / Phone'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{successAccountNumber}</span>
                </div>
              )}
              {successAccountName && (
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <span>{language === 'am' ? 'ስም' : 'Name'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{successAccountName}</span>
                </div>
              )}
            </div>

            <div className="mt-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3">
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold text-center">
                {t[language].withdraw.willBeProcessed || (language === 'am' ? 'በጥቂት ደቂቃዎች ውስጥ አስተዳዳሪው መርምሮ ይልካል::' : 'Admin will review and process shortly.')}
              </p>
            </div>

            {/* Countdown Badge */}
            <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-400">
              <Clock size={12} className="text-emerald-500" />
              <span>{language === 'am' ? `ይህ መልእክት በ ${successCountdown} ሰከንድ ውስጥ ይጠፋል...` : `Auto-closing in ${successCountdown}s...`}</span>
            </div>

            <button
              onClick={() => {
                setShowSuccessModal(false);
                setStep('list');
              }}
              className="mt-4 w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-2xl font-black text-xs shadow-md active:scale-95 transition-all"
            >
              {language === 'am' ? 'እሺ (ተመለስ)' : 'OK (Back to Methods)'}
            </button>
          </div>
        </div>
      )}

      {/* 3D Realistic Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 pt-6 pb-8 border-b border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center space-x-3 mb-4 relative z-10">
          <Link to="/" className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 active:scale-90 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-black text-white tracking-tight drop-shadow-sm">{t[language].withdraw.title}</h1>
        </div>

        {/* 3D Vault Balance Card */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-5 shadow-[0_10px_25px_rgba(0,0,0,0.1)] border border-white/20 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{t[language].withdraw.balance}</p>
              <p className="text-3xl font-black text-slate-800 dark:text-white mt-0.5">
                {userBalance.toLocaleString('en-US')} <span className="text-lg text-emerald-600 dark:text-emerald-400">ETB</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-500 shadow-inner">
              <Wallet size={24} />
            </div>
          </div>
          <p className="text-slate-400 dark:text-slate-400 text-xs font-semibold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>{language === 'am' ? 'ዋናው ሂሳብ ብቻ ነው ሊወጣ የሚችለው' : 'Only main balance can be withdrawn'}</span>
          </p>
        </div>
      </div>

      {/* Pending Banner if user has a pending withdrawal */}
      {pendingAmount !== null && (
        <div className="mx-4 mt-3 -mb-1 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between backdrop-blur-sm shadow-sm">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="text-amber-500 animate-pulse" size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-black text-amber-700 dark:text-amber-400 text-xs truncate">
                {t[language].withdraw.alreadyPendingTitle}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
                {pendingAmount.toLocaleString('en-US')} ETB {language === 'am' ? 'በግምገማ ላይ ነው' : 'pending review'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setStep('pending_status')}
            className="text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 px-2.5 py-1.5 rounded-xl transition-all shrink-0 ml-2"
          >
            {language === 'am' ? 'ዝርዝር' : 'Details'}
          </button>
        </div>
      )}

      {/* Methods Card */}
      <div className="px-4 mt-4 pb-8">
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.4)] border border-slate-200/80 dark:border-slate-800 overflow-hidden backdrop-blur-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <h2 className="font-black text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">{t[language].withdraw.methodTitle}</h2>
          </div>

          {methods.length === 0 ? (
            <div className="flex flex-col items-center py-14 px-6 text-slate-400 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3 text-slate-300 dark:text-slate-600 shadow-inner">
                <AlertCircle size={32} />
              </div>
              <p className="font-black text-slate-700 dark:text-slate-200 text-sm">{language === 'am' ? 'ምንም አይነት የማውጫ መንገዶች አልተገኙም' : 'No withdrawal methods available'}</p>
              <p className="text-xs text-slate-400 mt-1">{language === 'am' ? 'እባክዎ ጥቂት ቆይተው እንደገና ይመልከቱ' : 'Please check back later'}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {methods.map(method => {
                const gradient = typeColors[method.type] || 'from-slate-600 to-slate-800';
                const emoji = typeEmoji[method.type] || '💳';
                const label = typeLabels[method.type] || method.type.toUpperCase();

                return (
                  <button
                    key={method.id}
                    onClick={() => {
                      if (pendingAmount !== null) {
                        showToast(
                          language === 'am' 
                            ? 'ቀደም ሲል ያቀረቡት የማውጣት ጥያቄ በመጠባበቅ ላይ ነው!' 
                            : 'You already have a pending withdrawal request under review.',
                          'warning'
                        );
                        return;
                      }
                      setSelected(method);
                      setError('');
                      setStep('form');
                    }}
                    className="w-full flex items-center px-5 py-4 space-x-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-all text-left group"
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl shadow-md border-t border-white/30 shrink-0 group-hover:scale-105 transition-transform`}>
                      {method.logo_url ? (
                        <img src={method.logo_url} alt={label} className="w-8 h-8 object-contain rounded-xl" />
                      ) : (
                        <span>{emoji}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 dark:text-slate-100 text-sm truncate">{label}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-400 font-semibold mt-0.5">Min: {method.min_withdrawal.toLocaleString('en-US')} ETB</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-inner group-hover:text-amber-500 transition-colors">
                      <ChevronRight size={18} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
