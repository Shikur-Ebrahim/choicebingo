import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  ChevronRight, 
  CheckCircle2, 
  UploadCloud, 
  X, 
  Clock, 
  AlertCircle, 
  Copy, 
  Check, 
  MessageCircle, 
  Play, 
  Sparkles, 
  FileText, 
  Camera, 
  ShieldCheck, 
  Zap,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from '../store/gameStore';
import { t } from '../lib/translations';
import { uploadImage } from '../lib/upload';
import { supabase } from '../lib/supabase';
import VideoGuideModal, { useAutoVideoGuide } from '../components/VideoGuideModal';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DepositMethod {
  id: string;
  type: string;
  name: string;
  account_number: string;
  logo_url: string;
  min_deposit: number;
}

interface PendingDeposit {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  method?: {
    type?: string;
    name?: string;
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

const methodAccents: Record<string, { bg: string; text: string; glow: string; border: string }> = {
  cbe: { bg: 'from-amber-500/10 to-yellow-500/5', text: 'text-amber-600 dark:text-amber-400', glow: 'rgba(245,158,11,0.15)', border: 'border-amber-200 dark:border-amber-900/40' },
  boa: { bg: 'from-blue-500/10 to-indigo-500/5', text: 'text-blue-600 dark:text-blue-400', glow: 'rgba(59,130,246,0.15)', border: 'border-blue-200 dark:border-blue-900/40' },
  telebirr: { bg: 'from-purple-500/10 to-pink-500/5', text: 'text-purple-600 dark:text-purple-400', glow: 'rgba(168,85,247,0.15)', border: 'border-purple-200 dark:border-purple-900/40' },
  mpesa: { bg: 'from-emerald-500/10 to-teal-500/5', text: 'text-emerald-600 dark:text-emerald-400', glow: 'rgba(16,185,129,0.15)', border: 'border-emerald-200 dark:border-emerald-900/40' },
  cbebirr: { bg: 'from-yellow-500/10 to-amber-500/5', text: 'text-yellow-700 dark:text-yellow-400', glow: 'rgba(234,179,8,0.15)', border: 'border-yellow-200 dark:border-yellow-900/40' },
  ebirr: { bg: 'from-orange-500/10 to-red-500/5', text: 'text-orange-600 dark:text-orange-400', glow: 'rgba(249,115,22,0.15)', border: 'border-orange-200 dark:border-orange-900/40' },
  awash: { bg: 'from-blue-600/10 to-orange-500/5', text: 'text-blue-700 dark:text-blue-400', glow: 'rgba(37,99,235,0.15)', border: 'border-blue-200 dark:border-blue-900/40' },
  dashen: { bg: 'from-blue-700/10 to-sky-500/5', text: 'text-blue-800 dark:text-blue-400', glow: 'rgba(29,78,216,0.15)', border: 'border-blue-200 dark:border-blue-900/40' },
  amhara: { bg: 'from-teal-500/10 to-emerald-500/5', text: 'text-teal-600 dark:text-teal-400', glow: 'rgba(20,184,166,0.15)', border: 'border-teal-200 dark:border-teal-900/40' },
  coop: { bg: 'from-indigo-500/10 to-violet-500/5', text: 'text-indigo-600 dark:text-indigo-400', glow: 'rgba(99,102,241,0.15)', border: 'border-indigo-200 dark:border-indigo-900/40' },
  amole: { bg: 'from-rose-500/10 to-pink-500/5', text: 'text-rose-600 dark:text-rose-400', glow: 'rgba(244,63,94,0.15)', border: 'border-rose-200 dark:border-rose-900/40' },
  hello_cash: { bg: 'from-emerald-600/10 to-green-500/5', text: 'text-emerald-700 dark:text-emerald-400', glow: 'rgba(5,150,105,0.15)', border: 'border-emerald-200 dark:border-emerald-900/40' },
  nib: { bg: 'from-purple-600/10 to-indigo-500/5', text: 'text-purple-700 dark:text-purple-400', glow: 'rgba(147,51,234,0.15)', border: 'border-purple-200 dark:border-purple-900/40' },
  wegagen: { bg: 'from-orange-600/10 to-amber-500/5', text: 'text-orange-700 dark:text-orange-400', glow: 'rgba(234,88,12,0.15)', border: 'border-orange-200 dark:border-orange-900/40' },
  zemen: { bg: 'from-amber-600/10 to-yellow-600/5', text: 'text-amber-700 dark:text-amber-400', glow: 'rgba(217,119,6,0.15)', border: 'border-amber-200 dark:border-amber-900/40' },
  oromia: { bg: 'from-teal-600/10 to-cyan-500/5', text: 'text-teal-700 dark:text-teal-400', glow: 'rgba(13,148,136,0.15)', border: 'border-teal-200 dark:border-teal-900/40' },
  hibret: { bg: 'from-yellow-600/10 to-amber-600/5', text: 'text-yellow-800 dark:text-yellow-400', glow: 'rgba(202,138,4,0.15)', border: 'border-yellow-200 dark:border-yellow-900/40' },
};

type Step = 'list' | 'form';
type ProofType = 'screenshot' | 'sms';

export default function Deposit() {
  const { language, user, fetchUser, setIsPhoneModalOpen } = useGameStore();
  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DepositMethod | null>(null);
  const [step, setStep] = useState<Step>('list');
  const [supportUsername, setSupportUsername] = useState<string | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Auto-open video guide on user's first visit to Deposit
  useAutoVideoGuide('deposit', setIsVideoModalOpen, user?.telegram_id);

  // Pending Deposit State
  const [pendingDeposit, setPendingDeposit] = useState<PendingDeposit | null>(null);

  // Form State
  const [amount, setAmount] = useState('');
  const [proofType, setProofType] = useState<ProofType>('screenshot');
  const [file, setFile] = useState<File | null>(null);
  const [smsText, setSmsText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // 3D Auto-Disappearing Notification Toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'warning' | 'info' | 'success'>('info');
  const toastTimeoutRef = useRef<any>(null);

  // 3D Auto-Disappearing Success Submission Modal
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSmsText(text);
        showToast(language === 'am' ? 'መልእክቱ ተለጥፏል!' : 'Pasted from clipboard!', 'success', 2000);
      }
    } catch {
      showToast(language === 'am' ? 'እባክዎ ጽሑፉን በእጅ ይለጥፉ' : 'Please paste text manually into the box', 'info', 2500);
    }
  };

  useEffect(() => {
    fetchInitialData();

    // Subscribe to realtime deposit changes for instant auto-approval notifications
    const tgId = user?.telegram_id || WebApp?.initDataUnsafe?.user?.id?.toString();
    if (tgId) {
      const channel = supabase
        .channel(`user-deposits-${tgId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'deposits', filter: `telegram_id=eq.${tgId}` },
          (payload: any) => {
            if (payload.eventType === 'UPDATE') {
              if (payload.new.status === 'approved') {
                setPendingDeposit(null);
                fetchUser();
                showToast(
                  language === 'am'
                    ? `🎉 ተቀማጭዎ ፀድቋል! ${payload.new.amount} ETB ወደ ሂሳብዎ ገብቷል::`
                    : `🎉 Deposit Approved! ${payload.new.amount} ETB added to balance!`,
                  'success',
                  5000
                );
              } else if (payload.new.status === 'rejected') {
                setPendingDeposit(null);
                showToast(
                  language === 'am'
                    ? `⚠️ ተቀማጭዎ ተቀባይነት አላገኘም:: እባክዎ እንደገና ይሞክሩ::`
                    : `⚠️ Your deposit was rejected. Please verify and try again.`,
                  'warning',
                  5000
                );
              }
            } else if (payload.eventType === 'INSERT') {
              setPendingDeposit({
                id: payload.new.id,
                amount: payload.new.amount,
                status: payload.new.status,
                created_at: payload.new.created_at,
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

  const fetchInitialData = async () => {
    try {
      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      const pwaPhone = typeof window !== 'undefined' ? localStorage.getItem('cb_pwa_phone') || '' : '';
      const authHeaders = {
        'x-telegram-init-data': initData,
        'x-pwa-phone': pwaPhone,
      };
      const [methodsRes, historyRes, supportRes] = await Promise.all([
        fetch(`${API_URL}/deposit/methods`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_URL}/deposit/history`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_URL}/player/support-contact`, { headers: authHeaders }).catch(() => null)
      ]);

      if (methodsRes && methodsRes.ok) {
        setMethods(await methodsRes.json());
      } else {
        // Direct DB fallback
        const { data: dbMethods } = await supabase
          .from('deposit_methods')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true });
        if (dbMethods) setMethods(dbMethods);
      }

      if (historyRes && historyRes.ok) {
        const history = await historyRes.json();
        const pending = history.find((d: any) => d.status === 'pending');
        if (pending) {
          setPendingDeposit(pending);
        }
      } else {
        const tgId = user?.telegram_id || WebApp?.initDataUnsafe?.user?.id?.toString();
        if (tgId) {
          const { data: pending } = await supabase
            .from('deposits')
            .select('*, deposit_methods(type, name, logo_url)')
            .eq('telegram_id', tgId)
            .eq('status', 'pending')
            .maybeSingle();
          if (pending) setPendingDeposit(pending);
        }
      }

      if (supportRes && supportRes.ok) {
        const support = await supportRes.json();
        if (support.username) setSupportUsername(support.username);
      }
    } catch (err) {
      console.error('Error loading deposit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMethod = (method: DepositMethod) => {
    const isTelegramUser = typeof WebApp !== 'undefined' && Boolean(WebApp.initDataUnsafe?.user?.id);
    const hasPwaPhone = typeof window !== 'undefined' && Boolean(localStorage.getItem('cb_pwa_phone'));
    if (!isTelegramUser && !hasPwaPhone) {
      setIsPhoneModalOpen(true);
      return;
    }

    // If user already has a pending deposit, show auto-dismissing toast notification
    if (pendingDeposit) {
      showToast(
        language === 'am'
          ? `⚠️ የቀደመው የ ${pendingDeposit.amount} ETB ተቀማጭ ጥያቄዎ እስኪረጋገጥ ድረስ እባክዎ ይጠብቁ::`
          : `⚠️ Please wait for your pending deposit of ${pendingDeposit.amount} ETB to be reviewed.`,
        'warning',
        3500
      );
      return;
    }

    setSelected(method);
    setAmount('');
    setProofType('screenshot');
    setFile(null);
    setSmsText('');
    setError('');
    setStep('form');
  };

  const handleSubmit = async () => {
    if (!selected) return;

    // Check if another deposit is pending
    if (pendingDeposit) {
      showToast(
        language === 'am'
          ? `⚠️ የቀደመው የ ${pendingDeposit.amount} ETB ተቀማጭ ጥያቄዎ እስኪረጋገጥ ድረስ እባክዎ ይጠብቁ::`
          : `⚠️ Please wait for your pending deposit of ${pendingDeposit.amount} ETB to be reviewed.`,
        'warning',
        3500
      );
      return;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError(language === 'am' ? 'እባክዎ ትክክለኛ የገንዘብ መጠን ያስገቡ::' : 'Please enter a valid amount.');
      return;
    }

    if (selected.min_deposit && numAmount < selected.min_deposit) {
      setError(
        language === 'am'
          ? `ዝቅተኛው ተቀማጭ መጠን ${selected.min_deposit} ETB ነው::`
          : `Minimum deposit for this method is ${selected.min_deposit} ETB.`
      );
      return;
    }

    // Validate Proof (Screenshot or SMS)
    if (proofType === 'screenshot' && !file) {
      setError(language === 'am' ? 'እባክዎ የክፍያ ማረጋገጫ ስክሪንሾት ይጫኑ::' : 'Please upload your payment screenshot.');
      return;
    }

    if (proofType === 'sms' && !smsText.trim()) {
      setError(
        language === 'am'
          ? 'እባክዎ የቴሌብር/ባንክ ማረጋገጫ መልእክት ወይም የግብይት ቁጥር (Txn ID) ያስገቡ::'
          : 'Please enter transaction confirmation SMS or reference ID.'
      );
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      let finalScreenshotUrl = '';

      if (proofType === 'screenshot' && file) {
        finalScreenshotUrl = await uploadImage(file);
      }

      const payload = {
        method_id: selected.id,
        amount: numAmount,
        screenshot_url: finalScreenshotUrl,
        sms_message: proofType === 'sms' ? smsText.trim() : undefined,
      };

      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      let success = false;

      try {
        const res = await fetch(`${API_URL}/deposit/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          success = true;
        } else {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to submit request');
        }
      } catch (apiErr: any) {
        console.warn('API submission failed, attempting direct Supabase fallback:', apiErr);
        const tgId = user?.telegram_id || WebApp?.initDataUnsafe?.user?.id?.toString();
        if (tgId) {
          const finalProof = finalScreenshotUrl || (smsText ? `SMS: ${smsText.trim()}` : '');
          const { error: insertErr } = await supabase.from('deposits').insert([{
            telegram_id: tgId,
            method_id: selected.id,
            amount: numAmount,
            screenshot_url: finalProof,
            status: 'pending'
          }]);
          if (!insertErr) success = true;
          else throw insertErr;
        } else {
          throw apiErr;
        }
      }

      if (success) {
        setPendingDeposit({
          id: 'temp-' + Date.now(),
          amount: numAmount,
          status: 'pending',
          created_at: new Date().toISOString(),
          method: {
            type: selected.type,
            name: selected.name,
            logo_url: selected.logo_url
          }
        });

        // Trigger Auto-Disappearing 3D Success Modal
        setSuccessAmount(numAmount);
        setSuccessCountdown(4);
        setShowSuccessModal(true);
        setStep('list');
      }
    } catch (err: any) {
      setError(err.message || (language === 'am' ? 'ማስገባት አልተሳካም:: እባክዎ እንደገና ይሞክሩ::' : 'Failed to submit. Please try again.'));
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
                {language === 'am' ? 'የተጠየቀ መጠን:' : 'Requested Amount:'}{' '}
                <span className="text-sm font-black">{successAmount.toLocaleString('en-US')} ETB</span>
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px] mx-auto">
              {language === 'am'
                ? 'የማስገቢያ ጥያቄዎ በተሳካ ሁኔታ ደርሷል:: አድሚን ክፍያውን ሲያረጋግጥ በራስ-ሰር ሂሳብዎ ላይ ገቢ ይደረጋል::'
                : 'Your deposit request has been sent for review. Your balance will be credited as soon as admin approves it.'}
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
              {language === 'am' ? 'እሺ (ገጹን ተመልከት)' : 'OK (View Deposit Page)'}
            </button>
          </div>
        </div>
      )}

      {/* ── VIDEO GUIDE MODAL ── */}
      <VideoGuideModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        category="deposit"
      />

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
                {language === 'am' ? 'ገንዘብ አስገባ' : 'Deposit Funds'}
              </h1>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                {methodNames[selected.type] || selected.type.toUpperCase()}
              </p>
            </div>
            <button
              onClick={() => setIsVideoModalOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-[11px] font-black px-2.5 py-1.5 rounded-full shadow-md shadow-amber-500/20 flex items-center gap-1 active:scale-95 transition-all shrink-0"
              title="Watch video guide"
            >
              <Play size={10} className="fill-white" />
              <span>Video</span>
            </button>
          </div>

          <div className="px-3.5 py-2.5 space-y-2.5 max-w-md mx-auto">
            {/* 3D Compact Banking Account Card */}
            <div className="relative rounded-2xl p-3 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-slate-200/90 dark:border-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.3)] overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {language === 'am' ? 'ገንዘብ የሚላክበት አካውንት' : 'OFFICIAL RECEIVING ACCOUNT'}
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                  <ShieldCheck size={11} />
                  <span>Verified</span>
                </span>
              </div>

              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-12 h-12 min-w-[48px] max-w-[48px] h-[48px] max-h-[48px] rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                  {selected.logo_url ? (
                    <img src={selected.logo_url} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <span className="text-xl">🏦</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 dark:text-white text-xs leading-tight truncate">{selected.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">
                    {methodNames[selected.type] || selected.type.toUpperCase()}
                  </p>
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    {language === 'am' ? 'ዝቅተኛ:' : 'Min:'} <span className="font-black">{selected.min_deposit} ETB</span>
                  </p>
                </div>
              </div>

              {/* Compact Monospace Copy Pill */}
              <div className="bg-slate-100/90 dark:bg-slate-800/90 rounded-xl px-2.5 py-1.5 flex items-center justify-between border border-slate-200/80 dark:border-slate-700/80">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-mono font-black text-slate-800 dark:text-white text-sm tracking-wider truncate">
                    {selected.account_number}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(selected.account_number)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all active:scale-95 shadow-sm ${
                    copied
                      ? 'bg-emerald-500 text-white shadow-emerald-500/25'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-500/25'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={12} strokeWidth={3} />
                      <span>{language === 'am' ? 'ተቀድቷል!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>{language === 'am' ? 'ቅዳ' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Compact Amount Input */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1.5">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">
                {language === 'am' ? 'የላኩት የገንዘብ መጠን (ETB)' : 'AMOUNT YOU TRANSFERRED (ETB)'}
              </label>

              <div className="relative">
                <input
                  type="number"
                  min={selected.min_deposit || 1}
                  placeholder={`Min ${selected.min_deposit || 10} ETB`}
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(''); }}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base font-black text-slate-800 dark:text-white outline-none focus:border-amber-400 transition-all font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  ETB
                </span>
              </div>
            </div>

            {/* ── DUAL PAYMENT PROOF SECTION (COMPACT 3D) ── */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  {language === 'am' ? 'የክፍያ ማረጋገጫ (አማራጭ ይምረጡ)' : 'PAYMENT PROOF (CHOOSE OPTION)'}
                </label>
                <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded-md">
                  Required
                </span>
              </div>

              {/* 3D Compact Segmented Switch */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl gap-1 border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
                <button
                  type="button"
                  onClick={() => { setProofType('screenshot'); setError(''); }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 transition-all ${
                    proofType === 'screenshot'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/25 active:scale-95'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 active:scale-95'
                  }`}
                >
                  <Camera size={13} />
                  <span>{language === 'am' ? 'ስክሪንሾት' : 'Screenshot'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setProofType('sms'); setError(''); }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 transition-all ${
                    proofType === 'sms'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/25 active:scale-95'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 active:scale-95'
                  }`}
                >
                  <FileText size={13} />
                  <span>{language === 'am' ? 'SMS / መልእክት' : 'SMS / Text'}</span>
                </button>
              </div>

              {/* OPTION 1: SCREENSHOT UPLOAD (COMPACT) */}
              {proofType === 'screenshot' && (
                <div>
                  {file ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-1.5">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Receipt"
                        className="w-full max-h-28 object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="absolute top-2 right-2 bg-rose-500 text-white p-1 rounded-full shadow-md hover:bg-rose-600 active:scale-95 transition-all"
                        title="Remove image"
                      >
                        <X size={12} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-amber-400 rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/40 hover:bg-amber-50/30">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1 shadow-inner">
                        <UploadCloud size={16} />
                      </div>
                      <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 text-center">
                        {language === 'am' ? 'ስክሪንሾት ለመጫን ይንኩ' : 'Tap to upload screenshot'}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          setFile(e.target.files?.[0] || null);
                          setError('');
                        }}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* OPTION 2: SMS / TRANSACTION TEXT (COMPACT) */}
              {proofType === 'sms' && (
                <div className="space-y-1">
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={smsText}
                      onChange={(e) => { setSmsText(e.target.value); setError(''); }}
                      placeholder={
                        language === 'am'
                          ? 'የቴሌብር/ባንክ ማረጋገጫ መልእክት (SMS) ወይም የግብይት ቁጥር (Txn Ref) እዚህ ይለጥፉ...'
                          : 'Paste Telebirr/bank confirmation SMS or Txn Ref ID here...'
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-2.5 pr-14 text-xs font-mono font-medium text-slate-800 dark:text-white outline-none focus:border-amber-400 resize-none transition-all placeholder:font-sans placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={pasteFromClipboard}
                      className="absolute right-2 bottom-2 px-2 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-md text-[9px] font-black shadow-sm active:scale-95 transition-all flex items-center gap-0.5"
                    >
                      <Copy size={10} />
                      <span>{language === 'am' ? 'ለጥፍ' : 'Paste'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message Display */}
            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-2.5 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-[11px] font-bold animate-shake">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 3D Compact Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-2xl font-black text-white text-xs bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-[0_6px_18px_rgba(245,158,11,0.28)] active:translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{language === 'am' ? 'በመላክ ላይ...' : 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>{language === 'am' ? 'ማስገቢያ ጥያቄውን ላክ' : 'Submit Deposit Request'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ── STEP 2: AVAILABLE METHODS LIST VIEW (FANTASTIC 3D GRID) ── */
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
                {language === 'am' ? 'ገንዘብ አስገባ' : 'Deposit Funds'}
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {language === 'am' ? 'የመክፈያ መንገድ ይምረጡ' : 'Select a Deposit Method'}
              </p>
            </div>

            {/* Video Guide Pill Button */}
            <button
              onClick={() => setIsVideoModalOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-md shadow-amber-500/20 flex items-center gap-1 active:scale-95 transition-all shrink-0"
            >
              <Play size={11} className="fill-white" />
              <span>Video Guide</span>
            </button>
          </div>

          <div className="p-4 space-y-4 max-w-lg mx-auto">
            {/* ── 3D PENDING DEPOSIT BANNER (SHOWN IF USER HAS AN ACTIVE PENDING REQUEST) ── */}
            {pendingDeposit && (
              <div className="relative rounded-3xl p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 dark:border-amber-500/30 shadow-[0_8px_25px_rgba(245,158,11,0.12)] overflow-hidden animate-slide-down">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      {language === 'am' ? 'በመጠባበቅ ላይ ያለ ተቀማጭ' : 'PENDING REVIEW'}
                    </span>
                  </div>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800/60">
                    {pendingDeposit.amount.toLocaleString('en-US')} ETB
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                  {language === 'am'
                    ? `የ ${pendingDeposit.amount.toLocaleString('en-US')} ETB ማስገቢያ ጥያቄዎ በአድሚን እየታየ ነው:: ክፍያው እንደተረጋገጠ በራስ-ሰር ሂሳብዎ ላይ ገቢ ይደረጋል::`
                    : `Your deposit request of ${pendingDeposit.amount.toLocaleString('en-US')} ETB is currently under review by admin.`}
                </p>

                <div className="mt-3.5 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Clock size={13} className="text-amber-500 animate-spin" />
                    <span>{language === 'am' ? 'እየተረጋገጠ ነው...' : 'Verifying...'}</span>
                  </span>

                  {supportUsername && (
                    <a
                      href={`https://t.me/${supportUsername.replace('@', '')}`}
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
                {language === 'am' ? 'ያሉ የክፍያ መንገዶች' : 'AVAILABLE METHODS'}
              </span>
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full">
                {methods.length} {language === 'am' ? 'መንገዶች' : 'Methods'}
              </span>
            </div>

            {/* ── 3D GRID OF DEPOSIT METHODS ── */}
            {loading ? (
              <div className="grid grid-cols-2 gap-3.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-36 rounded-3xl bg-white dark:bg-slate-900 animate-pulse border border-slate-100 dark:border-slate-800 shadow-sm"
                  />
                ))}
              </div>
            ) : methods.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900/90 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <span className="text-3xl mb-2 block">🏦</span>
                <h3 className="font-black text-slate-700 dark:text-slate-200 text-sm">
                  {language === 'am' ? 'ምንም አይነት የማስገቢያ መንገዶች አልተገኙም' : 'No Deposit Methods Available'}
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
                    glow: 'rgba(100,116,139,0.1)',
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
