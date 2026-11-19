import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { ArrowLeft, UserCog, ShieldCheck, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Wallet, RefreshCw, Users } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface WorkerPerms {
  deposits: boolean;
  withdrawals: boolean;
  users: boolean;
  settings: boolean;
  reports: boolean;
  games?: boolean;
}

interface WorkerData {
  id: string;
  telegram_id: string;
  username: string;
  first_name: string;
  status: string;
  permissions: WorkerPerms;
  created_at: string;
}

const PERMISSIONS_DEF = [
  { key: 'deposits', label: 'Verify Deposits' },
  { key: 'withdrawals', label: 'Verify Withdrawals' },
  { key: 'users', label: 'Manage Users' },
  { key: 'reports', label: 'Financial Report' },
  { key: 'settings', label: 'Manage Settings' },
];

interface ProfitReportStats {
  totalDeposits: number;
  totalWithdrawals: number;
  totalUserMainBalance: number;
  netProfit: number;
  netProfitAfterBalances: number;
}

export default function AdminWorkers() {
  const { user } = useGameStore();
  const [activeTab, setActiveTab] = useState<'workers' | 'report'>('workers');
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Financial Report state
  const [reportStats, setReportStats] = useState<ProfitReportStats | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const getHeaders = () => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    return { 'Content-Type': 'application/json', 'x-telegram-init-data': initData };
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchWorkers = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/workers`, { headers: getHeaders() });
      if (res.ok) {
        const d = await res.json();
        setWorkers(d.workers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/profit-report`, { headers: getHeaders() });
      if (res.ok) {
        const d = await res.json();
        setReportStats(d);
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to fetch financial report');
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
    fetchReport();
  }, [fetchReport]);

  const togglePermission = async (telegramId: string, currentPerms: WorkerPerms, key: keyof WorkerPerms) => {
    setSaving(telegramId);
    try {
      const newPerms = { ...currentPerms, [key]: !currentPerms[key] };
      const res = await fetch(`${API_URL}/admin/workers/${telegramId}/permissions`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ permissions: newPerms }),
      });
      const d = await res.json();
      if (res.ok) {
        setWorkers(prev => prev.map(w => w.telegram_id === telegramId ? { ...w, permissions: newPerms } : w));
        showToast('success', 'Permissions updated');
      } else {
        showToast('error', d.error || 'Failed to update');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setSaving(null);
    }
  };

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full shadow-lg font-bold text-[11px] animate-bounce-in ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white px-4 pt-3 pb-2.5 shadow-xs relative z-10 shrink-0 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Link to="/admin" className="p-2 bg-slate-100 rounded-full text-slate-600 active:scale-95 transition-all">
              <ArrowLeft size={18} strokeWidth={2.5} />
            </Link>
            <div>
              <h1 className="font-black text-slate-800 text-lg leading-tight">Worker & Report</h1>
              <p className="text-[10px] text-slate-400 font-medium">Permissions & Financial Profit</p>
            </div>
          </div>
          <button
            onClick={() => { if (activeTab === 'workers') fetchWorkers(); else fetchReport(); }}
            disabled={loading || reportLoading}
            className="p-2 bg-slate-100 rounded-full text-slate-600 active:scale-95 transition-all hover:bg-slate-200"
            title="Refresh"
          >
            <RefreshCw size={15} className={(loading || reportLoading) ? "animate-spin text-orange-500" : ""} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('workers')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'workers'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserCog size={14} />
            <span>Workers ({workers.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('report');
              if (!reportStats) fetchReport();
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'report'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingUp size={14} />
            <span>Financial Report</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {activeTab === 'report' ? (
          <div className="space-y-4">
            {reportLoading && !reportStats ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-bold">Calculating all-time financial report...</p>
              </div>
            ) : reportStats ? (
              <>
                {/* 1. PROFIT SECTION FIRST (as required) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-orange-500" />
                      <span>1. Profit Overview (All-Time)</span>
                    </p>
                    <span className="text-[9.5px] font-black bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">
                      Live
                    </span>
                  </div>

                  {/* Category 1: Net Profit = Total Deposits - Total Withdrawals */}
                  <div
                    className={`rounded-3xl p-4.5 shadow-sm border transition-all ${
                      reportStats.netProfit >= 0
                        ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white border-emerald-400/40 shadow-emerald-500/10'
                        : 'bg-gradient-to-br from-rose-500 via-rose-600 to-red-700 text-white border-rose-400/40 shadow-rose-500/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black mb-1.5">
                          <span>Category 1</span>
                          <span>•</span>
                          <span>Cash Profit</span>
                        </div>
                        <h3 className="text-white/90 text-xs font-bold uppercase tracking-wider">
                          Net Profit (Deposits − Withdrawals)
                        </h3>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                        <TrendingUp size={22} className="text-white" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-white mt-2 tracking-tight">
                      {reportStats.netProfit > 0 ? '+' : ''}{Number(reportStats.netProfit || 0).toLocaleString()} <span className="text-lg font-bold text-white/80">ETB</span>
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between text-[11px] text-white/90 font-medium">
                      <span>Formula:</span>
                      <span className="font-mono font-bold text-white">
                        Deposits ({Number(reportStats.totalDeposits || 0).toLocaleString()}) − Withdrawals ({Number(reportStats.totalWithdrawals || 0).toLocaleString()})
                      </span>
                    </div>
                  </div>

                  {/* Category 2: Total Net Profit = Total Deposits - Total Withdrawals - Total Users Main Balance */}
                  <div
                    className={`rounded-3xl p-4.5 shadow-sm border transition-all ${
                      reportStats.netProfitAfterBalances >= 0
                        ? 'bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 text-white border-indigo-400/40 shadow-indigo-500/10'
                        : 'bg-gradient-to-br from-amber-600 via-rose-600 to-red-700 text-white border-rose-400/40 shadow-rose-500/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black mb-1.5">
                          <span>Category 2</span>
                          <span>•</span>
                          <span>True Net Profit</span>
                        </div>
                        <h3 className="text-white/90 text-xs font-bold uppercase tracking-wider">
                          Net Profit (After All User Balances)
                        </h3>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                        <Wallet size={22} className="text-white" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-white mt-2 tracking-tight">
                      {reportStats.netProfitAfterBalances > 0 ? '+' : ''}{Number(reportStats.netProfitAfterBalances || 0).toLocaleString()} <span className="text-lg font-bold text-white/80">ETB</span>
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between text-[11px] text-white/90 font-medium">
                      <span>Formula:</span>
                      <span className="font-mono font-bold text-white">
                        Cash Profit − User Balances ({Number(reportStats.totalUserMainBalance || 0).toLocaleString()})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. BREAKDOWN SECTION */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet size={14} className="text-slate-400" />
                      <span>2. Breakdown Details</span>
                    </p>
                    <span className="text-[10px] font-bold text-slate-400">All Time</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Total Deposits */}
                    <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60">
                        <ArrowDownToLine size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Deposits</p>
                          <span className="text-[9.5px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">Approved</span>
                        </div>
                        <p className="text-xl font-black text-slate-800 mt-0.5">
                          {Number(reportStats.totalDeposits || 0).toLocaleString()} <span className="text-xs font-bold text-slate-400 font-sans">ETB</span>
                        </p>
                      </div>
                    </div>

                    {/* Total Withdrawals */}
                    <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100/60">
                        <ArrowUpFromLine size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Withdrawals</p>
                          <span className="text-[9.5px] font-black text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-full">Approved</span>
                        </div>
                        <p className="text-xl font-black text-slate-800 mt-0.5">
                          {Number(reportStats.totalWithdrawals || 0).toLocaleString()} <span className="text-xs font-bold text-slate-400 font-sans">ETB</span>
                        </p>
                      </div>
                    </div>

                    {/* Total Users Main Balance */}
                    <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60">
                        <Users size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Users Main Balance</p>
                          <span className="text-[9.5px] font-black text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">All Users</span>
                        </div>
                        <p className="text-xl font-black text-slate-800 mt-0.5">
                          {Number(reportStats.totalUserMainBalance || 0).toLocaleString()} <span className="text-xs font-bold text-slate-400 font-sans">ETB</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div className="bg-slate-100/80 rounded-2xl p-3.5 border border-slate-200/60 text-slate-600 text-xs font-medium space-y-1">
                  <p className="font-black text-slate-700 flex items-center gap-1.5">
                    <span>💡</span> <span>All-Day Summary</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    This report calculates all historical approved deposits and withdrawals, plus total active user balances across the entire platform without date filters.
                  </p>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          /* WORKERS TAB */
          loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-bold">Loading workers...</p>
            </div>
          ) : workers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <UserCog size={48} strokeWidth={1} className="mb-3 opacity-20" />
              <p className="text-sm font-bold text-slate-500 mb-1">No workers found</p>
              <p className="text-xs text-center px-4">Change a user's role to 'worker' in the Users tab first.</p>
            </div>
          ) : (
            workers.map(w => (
              <div key={w.telegram_id} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-black uppercase">
                      {w.first_name[0]}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h2 className="font-black text-sm text-slate-800">{w.first_name}</h2>
                        {w.status === 'inactive' && <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-black">Inactive</span>}
                      </div>
                      <p className="text-[10px] font-medium text-slate-400">@{w.username} • ID: {w.telegram_id}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Permissions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PERMISSIONS_DEF.map(p => {
                      const hasPerm = w.permissions?.[p.key as keyof WorkerPerms];
                      return (
                        <button
                          key={p.key}
                          disabled={saving === w.telegram_id}
                          onClick={() => togglePermission(w.telegram_id, w.permissions || {} as WorkerPerms, p.key as keyof WorkerPerms)}
                          className={`flex items-center justify-between p-2.5 rounded-xl text-left transition-all border ${hasPerm ? 'bg-orange-50 border-orange-200 text-orange-700 font-black' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
                        >
                          <span className="text-[10px] truncate pr-2">{p.label}</span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${hasPerm ? 'bg-orange-500 text-white' : 'bg-slate-200 text-transparent'}`}>
                            <ShieldCheck size={10} strokeWidth={3} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
