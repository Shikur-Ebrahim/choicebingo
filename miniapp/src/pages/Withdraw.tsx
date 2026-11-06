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
  Zap, 
  X, 
  Info,
  Sparkles
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

interface PendingWithdrawal {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  account_name?: string;
  account_number?: string;
  method?: {
    type?: string;
    logo_url?: string;
  };
}

const methodNames: Record<string, string> = {
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

const methodAccents: Record<string, { bg: string; text: string; border: string }> = {
  cbe: { bg: 'from-amber-500/10 to-yellow-500/5', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/40' },
  boa: { bg: 'from-blue-500/10 to-indigo-500/5', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900/40' },
  telebirr: { bg: 'from-purple-500/10 to-pink-500/5', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-900/40' },
  mpesa: { bg: 'from-emerald-500/10 to-teal-500/5', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/40' },
  cbebirr: { bg: 'from-yellow-500/10 to-amber-500/5', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-900/40' },
  ebirr: { bg: 'from-orange-500/10 to-red-500/5', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-900/40' },
  awash: { bg: 'from-blue-600/10 to-orange-500/5', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900/40' },
  dashen: { bg: 'from-blue-700/10 to-sky-500/5', text: 'text-blue-800 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900/40' },
  amhara: { bg: 'from-teal-500/10 to-emerald-500/5', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-900/40' },
  coop: { bg: 'from-indigo-500/10 to-violet-500/5', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-900/40' },
  amole: { bg: 'from-rose-500/10 to-pink-500/5', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-900/40' },
  hello_cash: { bg: 'from-emerald-600/10 to-green-500/5', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/40' },
  nib: { bg: 'from-purple-600/10 to-indigo-500/5', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-900/40' },
  wegagen: { bg: 'from-orange-600/10 to-amber-500/5', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-900/40' },
  zemen: { bg: 'from-amber-600/10 to-yellow-600/5', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/40' },
  oromia: { bg: 'from-teal-600/10 to-cyan-500/5', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-900/40' },
  hibret: { bg: 'from-yellow-600/10 to-amber-600/5', text: 'text-yellow-800 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-900/40' },
};

type Step = 'list' | 'form';

export default function Withdraw() {
  const { user, language, fetchUser } = useGameStore();
  const userBalance = Number(user?.main_balance || 0);

  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WithdrawalMethod | null>(null);
  const [step, setStep] = useState<Step>('list');
  const [supportContact, setSupportContact] = useState<string>('');

  // Pending Withdrawal State
  const [pendingWithdrawal, setPendingWithdrawal] = useState<PendingWithdrawal | null>(null);

  // Form State
  const [amount, setAmount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 3D Auto-Disappearing Toast Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'warning' | 'info' | 'success'>('info');
  const toastTimeoutRef = useRef<any>(null);

  // 3D Auto-Disappearing Success Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successAmount, setSuccessAmount] = useState<number>(0);
  const [successCountdown, setSuccessCountdown] = useState(4);

  const showToast = (msg: string, type: 'warning' | 'info' | 'success' = 'info', duration = 3500) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    setToastType(type);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  const getHeaders = () => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    return { 'Content-Type': 'application/json', 'x-telegram-init-data': initData };
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes on withdrawals for this user
    const tgId = user?.telegram_id || WebApp?.initDataUnsafe?.user?.id?.toString();
    if (tgId) {
      const channel = supabase
        .channel(`user-withdrawals-${tgId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'withdrawals', filter: `telegram_id=eq.${tgId}` },
          (payload: any) => {
            if (payload.eventType === 'UPDATE') {
              if (payload.new.status === 'approved') {
                setPendingWithdrawal(null);
                fetchUser();
                showToast(
                  language === 'am'
                    ? `🎉 የማውጫ ጥያቄዎ ፀድቋል! ${payload.new.amount} ETB ተልኳል::`
                    : `🎉 Withdrawal Approved! ${payload.new.amount} ETB has been processed!`,
                  'success',
                  5000
                );
              } else if (payload.new.status === 'rejected') {
                setPendingWithdrawal(null);
                fetchUser(); // balance was refunded
                showToast(
                  language === 'am'
                    ? `⚠️ የማውጫ ጥያቄዎ ተቀባይነት አላገኘም:: ገንዘቡ ወደ ሂሳብዎ ተመልሷል::`
                    : `⚠️ Withdrawal was rejected. Your balance has been refunded.`,
                  'warning',
                  5000
                );
              }
            } else if (payload.eventType === 'INSERT') {
              setPendingWithdrawal({
                id: payload.new.id,
                amount: payload.new.amount,
                status: payload.new.status,
                created_at: payload.new.created_at,
                account_name: payload.new.account_name,
                account_number: payload.new.account_number,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.telegram_id]);

  // Countdown timer for success submission modal
  useEffect(() => {
    if (showSuccessModal && successCountdown > 0) {
      const timer = setTimeout(() => setSuccessCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showSuccessModal && successCountdown === 0) {
      setShowSuccessModal(false);
      setStep('list');
    }
  }, [showSuccessModal, successCountdown]);

  const fetchData = async () => {
    try {
      const headers = getHeaders();
      const [methodsRes, historyRes, contactRes] = await Promise.all([
        fetch(`${API_URL}/withdraw/methods`, { headers }).catch(() => null),
        fetch(`${API_URL}/withdraw/history`, { headers }).catch(() => null),
        fetch(`${API_URL}/player/support-contact`, { headers }).catch(() => null),
      ]);

      if (methodsRes && methodsRes.ok) {
        setMethods(await methodsRes.json());
      } else {
        // Direct DB fallback
        const { data: dbMethods } = await supabase
          .from('withdrawal_methods')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        if (dbMethods) setMethods(dbMethods);
      }

      if (historyRes && historyRes.ok) {
        const history = await historyRes.json();
        const pending = history.find((w: any) => w.status === 'pending');
        if (pending) {
          setPendingWithdrawal(pending);
        }
      } else {
        const tgId = user?.telegram_id || WebApp?.initDataUnsafe?.user?.id?.toString();
        if (tgId) {
          const { data: pending } = await supabase
            .from('withdrawals')
            .select('*, withdrawal_methods(type, logo_url)')
            .eq('telegram_id', tgId)
            .eq('status', 'pending')
            .maybeSingle();
          if (pending) setPendingWithdrawal(pending);
        }
      }

      if (contactRes && contactRes.ok) {
        const support = await contactRes.json();
        setSupportContact(support.username || 'ChoiceBingo_admin');
      }
    } catch (err) {
      console.error('Error fetching withdrawal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMethod = (method: WithdrawalMethod) => {
    // If user already has a pending withdrawal, show auto-dismissing toast notification
    if (pendingWithdrawal) {
      showToast(
        language === 'am'
          ? `⚠️ የቀደመው የ ${pendingWithdrawal.amount.toLocaleString('en-US')} ETB ማውጫ ጥያቄዎ እስኪረጋገጥ ድረስ እባክዎ ይጠብቁ::`
          : `⚠️ Please wait for your pending withdrawal of ${pendingWithdrawal.amount.toLocaleString('en-US')} ETB to be reviewed.`,
        'warning',
        3500
      );
      return;
    }

    setSelected(method);
    setAmount('');
    setAccountName('');
    setAccountNumber('');
    setError('');
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError('');

    if (pendingWithdrawal) {
      showToast(
        language === 'am'
          ? `⚠️ የቀደመው የ ${pendingWithdrawal.amount.toLocaleString('en-US')} ETB ማውጫ ጥያቄዎ እስኪረጋገጥ ድረስ እባክዎ ይጠብቁ::`
          : `⚠️ Please wait for your pending withdrawal of ${pendingWithdrawal.amount.toLocaleString('en-US')} ETB to be reviewed.`,
        'warning',
        3500
      );
      return;
    }

    const amtNum = parseFloat(amount);
    if (!amount || amount.trim() === '' || isNaN(amtNum) || amtNum <= 0) {
      setError(language === 'am' ? 'እባክዎ ትክክለኛ የገንዘብ መጠን ያስገቡ::' : 'Please enter a valid withdrawal amount.');
      return;
    }
    if (amtNum < selected.min_withdrawal) {
      setError(
        language === 'am'
          ? `ዝቅተኛው የማውጫ መጠን ${selected.min_withdrawal.toLocaleString('en-US')} ETB ነው::`
          : `Minimum withdrawal for this method is ${selected.min_withdrawal.toLocaleString('en-US')} ETB.`
      );
      return;
    }
    if (amtNum > userBalance) {
      setError(
        language === 'am'
          ? `በቂ ሂሳብ የሎትም:: ያሎት ሂሳብ ${userBalance.toLocaleString('en-US')} ETB ነው::`
          : `Insufficient balance. Your balance is ${userBalance.toLocaleString('en-US')} ETB.`
      );
      return;
    }
    if (!accountName.trim()) {
      setError(language === 'am' ? 'እባክዎ በአካውንቱ ላይ ያለውን ሙሉ ስም ያስገቡ::' : 'Please enter your account full name.');
      return;
    }
    if (!accountNumber.trim()) {
      setError(language === 'am' ? 'እባክዎ የአካውንት ወይም ስልክ ቁጥር ያስገቡ::' : 'Please enter your account/phone number.');
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
        setError(data.error || (language === 'am' ? 'ማስገባት አልተሳካም::' : 'Failed to submit request.'));
        return;
      }

      // Update local state & trigger auto-disappearing 3D modal
      setPendingWithdrawal({
        id: data.withdrawal?.id || 'temp-' + Date.now(),
        amount: amtNum,
        status: 'pending',
        created_at: new Date().toISOString(),
        account_name: accountName.trim(),
        account_number: accountNumber.trim(),
        method: {
          type: selected.type,
          logo_url: selected.logo_url
        }
      });

      fetchUser(); // refresh balance immediately
      setSuccessAmount(amtNum);
      setSuccessCountdown(4);
      setShowSuccessModal(true);
      setStep('list');
    } catch (err: any) {
      setError(err.message || (language === 'am' ? 'የኔትወርክ ችግር አጋጥሟል:: እባክዎ እንደገና ይሞክሩ::' : 'Network error. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070b14] text-slate-800 dark:text-slate-100 transition-colors duration-200 pb-28">
      {/* ── 3D AUTO-DISAPPEARING TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 flex justify-center animate-slide-down">
          <div
            className={`w-full max-w-sm px-4 py-3.5 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_35px_rgba(0,0,0,0.6)] border backdrop-blur-md flex items-center gap-3 transition-all ${
              toastType === 'warning'
                ? 'bg-amber-500/95 text-white border-amber-300 ring-2 ring-amber-400/40'
                : toastType === 'success'
                ? 'bg-emerald-600/95 text-white border-emerald-400 ring-2 ring-emerald-400/40'
                : 'bg-slate-900/95 text-white border-slate-700 ring-2 ring-slate-600/40'
            }`}
          >
            {toastType === 'warning' && <AlertCircle size={20} className="shrink-0 animate-bounce" />}
            {toastType === 'success' && <CheckCircle2 size={20} className="shrink-0 animate-pulse" />}
            {toastType === 'info' && <Info size={20} className="shrink-0 text-amber-400" />}
            <p className="text-xs font-black flex-1 leading-snug">{toastMessage}</p>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── 3D AUTO-DISAPPEARING SUCCESS MODAL (COUNTDOWN) ── */}
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

            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              {language === 'am' ? 'ተልኳል!' : 'Submitted!'}
            </h2>

            <div className="my-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 inline-block">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {language === 'am' ? 'የተጠየቀ ማውጫ መጠን:' : 'Requested Amount:'}{' '}
                <span className="text-sm font-black">{successAmount.toLocaleString('en-US')} ETB</span>
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px] mx-auto">
              {language === 'am'
                ? 'የማውጫ ጥያቄዎ በተሳካ ሁኔታ ደርሷል:: አድሚን እንዳረጋገጠው ገንዘቡ በቀጥታ ወደ አካውንትዎ ይተላለፋል::'
                : 'Your withdrawal request has been submitted for review. Funds will be sent as soon as admin approves it.'}
            </p>

            <div className="mt-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3 flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <Clock size={16} className="text-amber-500 shrink-0 animate-spin" />
              <span>{language === 'am' ? `ይህ መልእክት በ ${successCountdown} ሰከንድ ውስጥ ይጠፋል...` : `Auto-closing in ${successCountdown}s...`}</span>
            </div>

            <button
              onClick={() => {
                setShowSuccessModal(false);
                setStep('list');
              }}
              className="mt-4 w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-2xl font-black text-xs shadow-md active:scale-95 transition-all"
            >
              {language === 'am' ? 'እሺ (ገጹን ተመልከት)' : 'OK (View Withdrawal Page)'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 1: FORM VIEW (IF A METHOD IS SELECTED) ── */}
      {step === 'form' && selected ? (
        <div className="animate-fade-in">
          {/* Header */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-3.5 rounded-b-3xl shadow-sm border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30 transition-colors">
            <button
              onClick={() => setStep('list')}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="text-center px-2">
              <h1 className="font-black text-slate-800 dark:text-white text-base tracking-tight">
                {language === 'am' ? 'ገንዘብ ማውጫ' : 'Withdraw Funds'}
              </h1>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                {methodNames[selected.type] || selected.type.toUpperCase()}
              </p>
            </div>
            <div className="w-9" />
          </div>

          <form onSubmit={handleSubmit} className="px-3.5 py-2.5 space-y-2.5 max-w-md mx-auto">
            {/* 3D Method & Balance Inset Card */}
            <div className="relative rounded-2xl p-3 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.3)] overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {language === 'am' ? 'የማውጫ መንገድ' : 'WITHDRAWAL METHOD'}
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                  <ShieldCheck size={11} />
                  <span>Secure</span>
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 min-w-[48px] max-w-[48px] h-[48px] max-h-[48px] rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                  {selected.logo_url ? (
                    <img src={selected.logo_url} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <span className="text-xl">💳</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 dark:text-white text-xs leading-tight truncate">
                    {methodNames[selected.type] || selected.type.toUpperCase()}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] font-bold text-slate-400">
                      {language === 'am' ? 'ዝቅተኛ:' : 'Min:'} <span className="font-black text-amber-600 dark:text-amber-400">{selected.min_withdrawal} ETB</span>
                    </p>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <p className="text-[10px] font-bold text-slate-400">
                      {language === 'am' ? 'ያሎት ሂሳብ:' : 'Balance:'} <span className="font-black text-emerald-600 dark:text-emerald-400">{userBalance.toLocaleString('en-US')} ETB</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-2.5 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-[11px] font-bold animate-shake">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Compact Amount Input with MAX Button */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  {language === 'am' ? 'የሚያወጡት መጠን (ETB)' : 'AMOUNT TO WITHDRAW (ETB)'}
                </label>
                <button
                  type="button"
                  onClick={() => setAmount(String(userBalance))}
                  className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-md active:scale-95 transition-all shadow-sm"
                >
                  MAX
                </button>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min={selected.min_withdrawal}
                  max={userBalance}
                  placeholder={`Min ${selected.min_withdrawal.toLocaleString('en-US')} ETB`}
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(''); }}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base font-black text-slate-800 dark:text-white outline-none focus:border-amber-400 transition-all font-mono"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  ETB
                </span>
              </div>
            </div>

            {/* Compact Account Holder Full Name Input */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1.5">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">
                {language === 'am' ? 'የአካውንት ባለቤት ሙሉ ስም' : 'ACCOUNT HOLDER FULL NAME'}
              </label>

              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === 'am' ? 'በአካውንቱ ላይ ያለ ሙሉ ስም' : 'Full name registered on account'}
                  value={accountName}
                  onChange={(e) => { setAccountName(e.target.value); setError(''); }}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-amber-400 transition-all"
                  required
                />
              </div>
            </div>

            {/* Compact Account / Phone Number Input */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1.5">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">
                {selected.type === 'telebirr' || selected.type === 'mpesa'
                  ? (language === 'am' ? 'የስልክ ቁጥር (09...)' : 'PHONE NUMBER (09...)')
                  : (language === 'am' ? 'የባንክ አካውንት ቁጥር' : 'BANK ACCOUNT NUMBER')}
              </label>

              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={selected.type === 'telebirr' || selected.type === 'mpesa' ? '09XXXXXXXX' : '1000XXXXXXXX'}
                  value={accountNumber}
                  onChange={(e) => { setAccountNumber(e.target.value); setError(''); }}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:border-amber-400 transition-all"
                  required
                />
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-2.5 flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-500 shrink-0" />
              <p className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold leading-tight">
                {language === 'am'
                  ? 'ዋና ሂሳብዎ ወዲያውኑ ተቀናሽ ይሆናል። ገንዘቡ በደቂቃዎች ውስጥ ወደ አካውንትዎ ይተላለፋል።'
                  : 'Main balance is immediately debited. Funds are transferred upon admin approval.'}
              </p>
            </div>

            {/* 3D Compact Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl font-black text-white text-xs bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-[0_6px_18px_rgba(16,185,129,0.3)] active:translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{language === 'am' ? 'በመላክ ላይ...' : 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>
                    {language === 'am'
                      ? `ገንዘብ አውጣ ${(amount && !isNaN(parseFloat(amount))) ? parseFloat(amount).toLocaleString('en-US') : ''} ETB`
                      : `Submit Withdrawal ${(amount && !isNaN(parseFloat(amount))) ? parseFloat(amount).toLocaleString('en-US') : ''} ETB`}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* ── STEP 2: AVAILABLE METHODS LIST VIEW (3D LOGO-ONLY GRID) ── */
        <div>
          {/* Mobile Sticky Header */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-3.5 rounded-b-3xl shadow-sm border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30 transition-colors">
            <Link
              to="/"
              className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
            >
              <ArrowLeft size={18} />
            </Link>

            <div className="text-center px-2 min-w-0">
              <h1 className="font-black text-slate-800 dark:text-white text-base tracking-tight truncate">
                {language === 'am' ? 'ገንዘብ ማውጫ' : 'Withdraw Funds'}
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {language === 'am' ? 'የማውጫ መንገድ ይምረጡ' : 'Select a Withdrawal Method'}
              </p>
            </div>

            <div className="w-9" />
          </div>

          <div className="p-4 space-y-4 max-w-lg mx-auto">
            {/* 3D Vault Balance Card */}
            <div className="relative rounded-3xl p-5 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-200/90 dark:border-slate-800 shadow-[0_10px_25px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)] overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    {language === 'am' ? 'ያሎት ዋና ሂሳብ' : 'AVAILABLE MAIN BALANCE'}
                  </p>
                  <p className="text-3xl font-black text-slate-800 dark:text-white mt-0.5">
                    {userBalance.toLocaleString('en-US')}{' '}
                    <span className="text-lg text-emerald-600 dark:text-emerald-400">ETB</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-500 shadow-inner">
                  <Wallet size={24} />
                </div>
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>{language === 'am' ? 'ከዋና ሂሳብ ብቻ ነው ማውጣት የሚቻለው' : 'Only main balance can be withdrawn'}</span>
              </p>
            </div>

            {/* ── 3D PENDING WITHDRAWAL BANNER (SHOWN IF USER HAS AN ACTIVE PENDING REQUEST) ── */}
            {pendingWithdrawal && (
              <div className="relative rounded-3xl p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 dark:border-amber-500/30 shadow-[0_8px_25px_rgba(245,158,11,0.12)] overflow-hidden animate-slide-down">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      {language === 'am' ? 'በመጠባበቅ ላይ ያለ ማውጫ' : 'PENDING REVIEW'}
                    </span>
                  </div>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
                    {pendingWithdrawal.amount.toLocaleString('en-US')} ETB
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                  {language === 'am'
                    ? `የ ${pendingWithdrawal.amount.toLocaleString('en-US')} ETB ማውጫ ጥያቄዎ በአድሚን እየታየ ነው:: እንደተረጋገጠ ገንዘቡ ወዲያውኑ ወደ አካውንትዎ ይላካል::`
                    : `Your withdrawal request of ${pendingWithdrawal.amount.toLocaleString('en-US')} ETB is currently under review by admin.`}
                </p>

                <div className="mt-3.5 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Clock size={13} className="text-amber-500 animate-spin" />
                    <span>{language === 'am' ? 'እየተረጋገጠ ነው...' : 'Verifying...'}</span>
                  </span>

                  {supportContact && (
                    <a
                      href={`https://t.me/${supportContact.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <MessageCircle size={13} />
                      <span>{language === 'am' ? 'ድጋፍ ሰጪ ያግኙ' : 'Contact Support'}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Section Header: Available Methods Count Badge */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {language === 'am' ? 'ያሉ የማውጫ መንገዶች' : 'AVAILABLE METHODS'}
              </span>
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full">
                {methods.length} {language === 'am' ? 'መንገዶች' : 'Methods'}
              </span>
            </div>

            {/* ── 3D GRID OF WITHDRAWAL METHODS (LOGO ONLY) ── */}
            {loading ? (
              <div className="grid grid-cols-2 gap-3.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-28 rounded-3xl bg-white dark:bg-slate-900 animate-pulse border border-slate-100 dark:border-slate-800 shadow-sm"
                  />
                ))}
              </div>
            ) : methods.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900/90 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <span className="text-3xl mb-2 block">💳</span>
                <h3 className="font-black text-slate-700 dark:text-slate-200 text-sm">
                  {language === 'am' ? 'ምንም አይነት የማውጫ መንገዶች አልተገኙም' : 'No Withdrawal Methods Available'}
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {language === 'am' ? 'እባክዎ ጥቂት ቆይተው እንደገና ይመልከቱ::' : 'Please check back shortly.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5">
                {methods.map((method) => {
                  const style = methodAccents[method.type] || {
                    bg: 'from-slate-500/10 to-slate-500/5',
                    text: 'text-slate-700 dark:text-slate-300',
                    border: 'border-slate-200 dark:border-slate-800',
                  };

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => handleSelectMethod(method)}
                      className="group relative rounded-[28px] p-5 bg-white dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex items-center justify-center text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(0,0,0,0.08)] active:translate-y-1 active:scale-[0.95] overflow-hidden aspect-[4/3] h-28 sm:h-32"
                    >
                      {/* Subtle ambient brand gradient highlight */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${style.bg} opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none`} />

                      {/* 3D Glass / Gloss Reflection */}
                      <div className="absolute -top-12 -right-12 w-28 h-28 bg-white/20 dark:bg-white/5 rounded-full blur-xl pointer-events-none" />

                      {/* Pure Logo Only */}
                      <div className="relative z-10 w-full h-full flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-200">
                        {method.logo_url ? (
                          <img
                            src={method.logo_url}
                            alt="Logo"
                            className="max-h-16 max-w-[130px] w-auto h-auto object-contain drop-shadow-sm"
                          />
                        ) : (
                          <span className="text-3xl">💳</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
