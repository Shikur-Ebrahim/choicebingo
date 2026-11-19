import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  ArrowLeft,
  UserCog,
  ShieldCheck,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  RefreshCw,
  Users,
  ChevronRight,
  X,
  Search,
  ExternalLink
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { supabase } from '../lib/supabase';

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

interface DetailItem {
  id: string;
  telegram_id: string;
  amount?: number;
  main_balance?: number;
  created_at: string;
  method?: string;
  account_name?: string;
  account_number?: string;
  username?: string;
  first_name?: string;
  user?: {
    first_name?: string;
    username?: string;
    telegram_id?: string;
  };
}

export default function AdminWorkers() {
  const { user } = useGameStore();
  // Default to Financial Report section as requested
  const [activeTab, setActiveTab] = useState<'report' | 'workers'>('report');
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Financial Report state
  const [reportStats, setReportStats] = useState<ProfitReportStats | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Detail Modal state (for clicking Deposits, Withdrawals, or Users)
  const [detailType, setDetailType] = useState<'deposits' | 'withdrawals' | 'users' | null>(null);
  const [detailItems, setDetailItems] = useState<DetailItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      // 1. Fetch live active user balances directly from Supabase (failsafe & real-time)
      const { data: uRows } = await supabase.from('users').select('main_balance');
      const liveUserBalance = (uRows || []).reduce((sum, u: any) => sum + Number(u.main_balance || 0), 0);

      // 2. Fetch deposits & withdrawals report from API
      const res = await fetch(`${API_URL}/admin/profit-report`, { headers: getHeaders() });
      if (res.ok) {
        const d = await res.json();
        const totalDep = Number(d.totalDeposits || 0);
        const totalWith = Number(d.totalWithdrawals || 0);
        const finalBal = Number(d.totalUserMainBalance || liveUserBalance);
        const netProf = totalDep - totalWith;
        const netProfAfter = netProf - finalBal;

        setReportStats({
          totalDeposits: totalDep,
          totalWithdrawals: totalWith,
          totalUserMainBalance: finalBal,
          netProfit: netProf,
          netProfitAfterBalances: netProfAfter,
        });
      } else {
        setReportStats(prev => ({
          totalDeposits: prev?.totalDeposits || 0,
          totalWithdrawals: prev?.totalWithdrawals || 0,
          totalUserMainBalance: liveUserBalance,
          netProfit: (prev?.totalDeposits || 0) - (prev?.totalWithdrawals || 0),
          netProfitAfterBalances: (prev?.totalDeposits || 0) - (prev?.totalWithdrawals || 0) - liveUserBalance,
        }));
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to fetch financial report');
    } finally {
      setReportLoading(false);
    }
  }, []);

  const openDetailModal = async (type: 'deposits' | 'withdrawals' | 'users') => {
    setDetailType(type);
    setSearchQuery('');
    setDetailLoading(true);
    try {
      if (type === 'users') {
        // Direct Supabase query: always succeeds instantly without any network or version issues
        const { data: uList, error: uErr } = await supabase
          .from('users')
          .select('id, telegram_id, username, first_name, main_balance, created_at')
          .gt('main_balance', 0)
          .order('main_balance', { ascending: false });

        if (!uErr && uList && uList.length > 0) {
          const items: DetailItem[] = uList.map(u => ({
            id: u.id,
            telegram_id: u.telegram_id,
            username: u.username,
            first_name: u.first_name,
            main_balance: Number(u.main_balance || 0),
            created_at: u.created_at,
          }));
          setDetailItems(items);
          return;
        }
      }

      // Try API endpoint
      const res = await fetch(`${API_URL}/admin/profit-report/details?type=${type}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDetailItems(data.items || []);
        return;
      }

      // Failsafe fallbacks for deposits and withdrawals
      if (type === 'deposits') {
        const depRes = await fetch(`${API_URL}/admin/deposits`, { headers: getHeaders() });
        if (depRes.ok) {
          const allDeps = await depRes.json();
          const approved = (allDeps || []).filter((d: any) => d.status === 'approved');
          const items: DetailItem[] = approved.map((d: any) => ({
            id: d.id,
            telegram_id: d.telegram_id,
            amount: Number(d.amount || 0),
            created_at: d.created_at,
            method: d.deposit_methods?.name || d.deposit_methods?.type || 'Deposit',
            user: d.users || { first_name: 'User', username: d.telegram_id },
          }));
          setDetailItems(items);
          return;
        }
      } else if (type === 'withdrawals') {
        const withRes = await fetch(`${API_URL}/admin/withdrawals`, { headers: getHeaders() });
        if (withRes.ok) {
          const allWiths = await withRes.json();
          const approved = (allWiths || []).filter((w: any) => w.status === 'approved');
          const items: DetailItem[] = approved.map((w: any) => ({
            id: w.id,
            telegram_id: w.telegram_id,
            amount: Number(w.amount || 0),
            account_name: w.account_name,
            account_number: w.account_number,
            created_at: w.created_at,
            method: w.withdrawal_methods?.type || 'Withdrawal',
            user: w.users || { first_name: 'User', username: w.telegram_id },
          }));
          setDetailItems(items);
          return;
        }
      }

      showToast('error', `Failed to load ${type} details`);
    } catch (e) {
      console.error(e);
      showToast('error', `Failed to load ${type} details`);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailType(null);
    setDetailItems([]);
    setSearchQuery('');
  };

  useEffect(() => {
    fetchWorkers();
    fetchReport();
  }, [fetchReport]);

  const togglePermission = async (workerId: string, currentPerms: WorkerPerms, permKey: keyof WorkerPerms) => {
    const updatedPerms = { ...currentPerms, [permKey]: !currentPerms[permKey] };
    setSaving(workerId);
    try {
      const res = await fetch(`${API_URL}/admin/workers/${workerId}/permissions`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ permissions: updatedPerms })
      });
      if (res.ok) {
        setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, permissions: updatedPerms } : w));
        showToast('success', 'Permissions updated');
      } else {
        showToast('error', 'Failed to update permissions');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setSaving(null);
    }
  };

  const removeWorker = async (workerId: string, name: string) => {
    if (!window.confirm(`Revoke worker role for ${name}?`)) return;
    try {
      const res = await fetch(`${API_URL}/admin/workers/${workerId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        setWorkers(prev => prev.filter(w => w.id !== workerId));
        showToast('success', 'Worker removed');
      } else {
        showToast('error', 'Failed to remove worker');
      }
    } catch {
      showToast('error', 'Network error');
    }
  };

  // Filtered detail items by search query
  const filteredDetailItems = useMemo(() => {
    if (!searchQuery.trim()) return detailItems;
    const q = searchQuery.toLowerCase().trim();
    return detailItems.filter(item => {
      const uName = (item.user?.username || item.username || '').toLowerCase();
      const fName = (item.user?.first_name || item.first_name || '').toLowerCase();
      const tid = (item.telegram_id || '').toLowerCase();
      const method = (item.method || '').toLowerCase();
      const accName = (item.account_name || '').toLowerCase();
      const accNum = (item.account_number || '').toLowerCase();
      return uName.includes(q) || fName.includes(q) || tid.includes(q) || method.includes(q) || accName.includes(q) || accNum.includes(q);
    });
  }, [detailItems, searchQuery]);

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Calculated values
  const totalDep = Number(reportStats?.totalDeposits || 0);
  const totalWith = Number(reportStats?.totalWithdrawals || 0);
  const totalBal = Number(reportStats?.totalUserMainBalance || 0);
  const netProf = Number(reportStats?.netProfit ?? (totalDep - totalWith));
  const netProfAfterBal = Number(reportStats?.netProfitAfterBalances ?? (totalDep - totalWith - totalBal));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 text-slate-800">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-xs font-black shadow-lg text-white transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-orange-600 text-white px-4 py-5 rounded-b-[2rem] shadow-md shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Link to="/admin" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-black">Worker & Finance</h1>
              <p className="text-orange-200 text-xs">Financial Overview & Team Control</p>
            </div>
          </div>
          {activeTab === 'report' ? (
            <button
              onClick={fetchReport}
              disabled={reportLoading}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Refresh Report"
            >
              <RefreshCw size={18} className={reportLoading ? 'animate-spin' : ''} />
            </button>
          ) : (
            <div className="p-2 bg-white/20 rounded-full">
              <UserCog size={20} />
            </div>
          )}
        </div>

        {/* Tab Switcher - Finance Report is First and Default */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-black/15 rounded-2xl">
          <button
            onClick={() => setActiveTab('report')}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'report'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <TrendingUp size={15} />
            <span>Financial Report</span>
          </button>
          <button
            onClick={() => setActiveTab('workers')}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'workers'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Users size={15} />
            <span>Workers ({workers.length})</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-4">
        {activeTab === 'report' ? (
          /* FINANCIAL REPORT TAB */
          <div className="space-y-4">
            {reportLoading && !reportStats ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-bold">Calculating all-time platform finances...</p>
              </div>
            ) : reportStats ? (
              <>
                {/* 1. PROFIT SECTION (FIRST) - CLEAN, NO EXPLANATION TEXT */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-orange-500" />
                      <span>Profit Overview</span>
                    </p>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                      All-Time Live
                    </span>
                  </div>

                  {/* Category 1: Net Profit = Total Deposits - Total Withdrawals */}
                  <div
                    className={`rounded-3xl p-5 shadow-sm border transition-all ${
                      netProf >= 0
                        ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-400/30 shadow-emerald-500/10'
                        : 'bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 text-white border-rose-400/30 shadow-rose-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black tracking-wider uppercase text-white/90">
                        Category 1 • Cash Profit
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <TrendingUp size={20} className="text-white" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-white mt-2 tracking-tight">
                      {netProf > 0 ? '+' : ''}{netProf.toLocaleString()} <span className="text-lg font-bold text-white/80">ETB</span>
                    </p>
                  </div>

                  {/* Category 2: Total Net Profit = Total Deposits - Total Withdrawals - Total Users Main Balance */}
                  <div
                    className={`rounded-3xl p-5 shadow-sm border transition-all ${
                      netProfAfterBal >= 0
                        ? 'bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 text-white border-indigo-400/30 shadow-indigo-500/10'
                        : 'bg-gradient-to-br from-amber-600 via-rose-600 to-red-700 text-white border-rose-400/30 shadow-rose-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black tracking-wider uppercase text-white/90">
                        Category 2 • True Net Profit
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <Wallet size={20} className="text-white" />
                      </div>
                    </div>
                    <p className="text-3xl font-black text-white mt-2 tracking-tight">
                      {netProfAfterBal > 0 ? '+' : ''}{netProfAfterBal.toLocaleString()} <span className="text-lg font-bold text-white/80">ETB</span>
                    </p>
                  </div>
                </div>

                {/* 2. BREAKDOWN SECTION (CLICKABLE CARDS) */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet size={14} className="text-slate-400" />
                      <span>Breakdown Details (Tap to View)</span>
                    </p>
                    <span className="text-[10px] font-bold text-slate-400">All Time</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Total Deposits - Clickable */}
                    <button
                      onClick={() => openDetailModal('deposits')}
                      className="w-full text-left bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 hover:border-emerald-300 hover:shadow-sm active:scale-[0.99] transition-all flex items-center space-x-3.5 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                        <ArrowDownToLine size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Deposits</p>
                          <span className="text-[9.5px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Approved
                          </span>
                        </div>
                        <p className="text-xl font-black text-slate-800 mt-0.5">
                          {totalDep.toLocaleString()} <span className="text-xs font-bold text-slate-400 font-sans">ETB</span>
                        </p>
                        <p className="text-[10px] font-bold text-emerald-600 mt-0.5 flex items-center gap-1 group-hover:underline">
                          <span>View all approved deposits</span>
                          <ChevronRight size={12} />
                        </p>
                      </div>
                    </button>

                    {/* Total Withdrawals - Clickable */}
                    <button
                      onClick={() => openDetailModal('withdrawals')}
                      className="w-full text-left bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 hover:border-rose-300 hover:shadow-sm active:scale-[0.99] transition-all flex items-center space-x-3.5 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                        <ArrowUpFromLine size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Withdrawals</p>
                          <span className="text-[9.5px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            Approved
                          </span>
                        </div>
                        <p className="text-xl font-black text-slate-800 mt-0.5">
                          {totalWith.toLocaleString()} <span className="text-xs font-bold text-slate-400 font-sans">ETB</span>
                        </p>
                        <p className="text-[10px] font-bold text-rose-600 mt-0.5 flex items-center gap-1 group-hover:underline">
                          <span>View all approved withdrawals</span>
                          <ChevronRight size={12} />
                        </p>
                      </div>
                    </button>

                    {/* Total Users Main Balance - Clickable */}
                    <button
                      onClick={() => openDetailModal('users')}
                      className="w-full text-left bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 hover:border-blue-300 hover:shadow-sm active:scale-[0.99] transition-all flex items-center space-x-3.5 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                        <Users size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Users Main Balance</p>
                        </div>
                        <p className="text-xl font-black text-slate-800 mt-0.5">
                          {totalBal.toLocaleString()} <span className="text-xs font-bold text-slate-400 font-sans">ETB</span>
                        </p>
                        <p className="text-[10px] font-bold text-blue-600 mt-0.5 flex items-center gap-1 group-hover:underline">
                          <span>View user balance details</span>
                          <ChevronRight size={12} />
                        </p>
                      </div>
                    </button>
                  </div>
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
              <p className="font-bold text-slate-500 text-sm">No Workers Configured</p>
              <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
                To assign a worker, promote a user from the <strong>Manage Users</strong> section.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider px-1">
                Active Staff Members ({workers.length})
              </p>
              {workers.map(worker => (
                <div
                  key={worker.id}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col space-y-4"
                >
                  {/* Worker Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 font-black text-base flex items-center justify-center">
                        {worker.first_name ? worker.first_name[0].toUpperCase() : 'W'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-black text-slate-800 text-sm leading-tight">{worker.first_name}</h3>
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                          @{worker.username || 'no_user'} • ID: {worker.telegram_id}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeWorker(worker.id, worker.first_name)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-xl transition-colors"
                    >
                      Revoke
                    </button>
                  </div>

                  {/* Permissions Grid */}
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">
                      Permissions
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {PERMISSIONS_DEF.map(({ key, label }) => {
                        const hasPerm = !!worker.permissions?.[key as keyof WorkerPerms];
                        const isSavingThis = saving === worker.id;
                        return (
                          <button
                            key={key}
                            onClick={() => togglePermission(worker.id, worker.permissions || {}, key as keyof WorkerPerms)}
                            disabled={isSavingThis}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                              hasPerm
                                ? 'bg-orange-50 border-orange-200 text-orange-800'
                                : 'bg-slate-50 border-slate-100 text-slate-400'
                            }`}
                          >
                            <span className="text-xs font-bold leading-tight">{label}</span>
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center ml-1 shrink-0 ${
                              hasPerm ? 'bg-orange-500 text-white' : 'border border-slate-300'
                            }`}>
                              {hasPerm && <ShieldCheck size={11} strokeWidth={3} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* DETAIL MODAL / DRAWER */}
      {detailType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-[2rem] max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  detailType === 'deposits'
                    ? 'bg-emerald-100 text-emerald-600'
                    : detailType === 'withdrawals'
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {detailType === 'deposits' && <ArrowDownToLine size={20} />}
                  {detailType === 'withdrawals' && <ArrowUpFromLine size={20} />}
                  {detailType === 'users' && <Users size={20} />}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">
                    {detailType === 'deposits' && 'All Approved Deposits'}
                    {detailType === 'withdrawals' && 'All Approved Withdrawals'}
                    {detailType === 'users' && 'Users Main Balance'}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400">
                    {detailItems.length} records total
                  </p>
                </div>
              </div>
              <button
                onClick={closeDetailModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 bg-slate-50 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user, ID, method..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body / Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[300px]">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-bold">Loading records...</p>
                </div>
              ) : filteredDetailItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
                  <p className="text-xs font-bold">No matching records found</p>
                </div>
              ) : (
                filteredDetailItems.map((item, idx) => {
                  const dDate = item.created_at ? new Date(item.created_at).toLocaleString() : '';

                  if (detailType === 'deposits') {
                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-black text-xs text-slate-800 truncate">
                              {item.user?.first_name || 'User'}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              @{item.user?.username || item.telegram_id}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-[9.5px] font-black uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                              {item.method}
                            </span>
                            <span className="text-[10px] text-slate-400">{dDate}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-emerald-600">
                            +{Number(item.amount || 0).toLocaleString()} ETB
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (detailType === 'withdrawals') {
                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-black text-xs text-slate-800 truncate">
                              {item.user?.first_name || item.account_name || 'User'}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              @{item.user?.username || item.telegram_id}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-[9.5px] font-black uppercase text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100">
                              {item.method}
                            </span>
                            {item.account_number && (
                              <span className="text-[10px] font-mono text-slate-600">{item.account_number}</span>
                            )}
                            <span className="text-[10px] text-slate-400">{dDate}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-rose-600">
                            -{Number(item.amount || 0).toLocaleString()} ETB
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // Users with main_balance > 0
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1 pr-3">
                        <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-black text-xs text-slate-800 truncate">
                              {item.first_name || 'User'}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              @{item.username || item.telegram_id}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            ID: {item.telegram_id}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-blue-600">
                          {Number(item.main_balance || 0).toLocaleString()} ETB
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center shrink-0">
              <button
                onClick={closeDetailModal}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-black text-xs active:scale-[0.98] transition-transform"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
