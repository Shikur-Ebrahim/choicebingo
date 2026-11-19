import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { Navigate, Link } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  RefreshCw,
  LogOut,
  Wallet,
  Users,
  ShieldAlert,
  ChevronRight,
  X,
  Search
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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

export default function Worker() {
  const { user } = useGameStore();
  const [stats, setStats] = useState<{
    totalDeposits: number;
    totalWithdrawals: number;
    totalUserMainBalance: number;
    netProfit: number;
    netProfitAfterBalances: number;
  }>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalUserMainBalance: 0,
    netProfit: 0,
    netProfitAfterBalances: 0
  });
  const [loading, setLoading] = useState(true);
  const [pendingDeposits, setPendingDeposits] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);

  // Detail Modal state
  const [detailType, setDetailType] = useState<'deposits' | 'withdrawals' | 'users' | null>(null);
  const [detailItems, setDetailItems] = useState<DetailItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getHeaders = () => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    return { 'Content-Type': 'application/json', 'x-telegram-init-data': initData };
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/profit-report`, { headers: getHeaders() });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingCounts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/pending-counts`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPendingDeposits(data.pendingDeposits || 0);
        setPendingWithdrawals(data.pendingWithdrawals || 0);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const openDetailModal = async (type: 'deposits' | 'withdrawals' | 'users') => {
    setDetailType(type);
    setSearchQuery('');
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/profit-report/details?type=${type}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDetailItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
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
    fetchReport();
    fetchPendingCounts();
  }, [fetchReport, fetchPendingCounts]);

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

  if (!user || user.role !== 'worker') {
    return <Navigate to="/" replace />;
  }

  const perms = user.permissions || {};
  const totalDep = Number(stats.totalDeposits || 0);
  const totalWith = Number(stats.totalWithdrawals || 0);
  const totalBal = Number(stats.totalUserMainBalance || 0);
  const netProf = Number(stats.netProfit ?? (totalDep - totalWith));
  const netProfAfterBal = Number(stats.netProfitAfterBalances ?? (totalDep - totalWith - totalBal));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 text-slate-800">
      {/* Header */}
      <div className="bg-orange-600 text-white px-4 py-6 rounded-b-[2rem] shadow-md relative z-10 shrink-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black">Worker Profile</h1>
            <p className="text-orange-200 text-sm font-medium mt-1">
              Welcome back, {user.first_name}
            </p>
          </div>
          <Link to="/" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <LogOut size={20} />
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Link
            to="/admin/deposits"
            className={`flex items-center p-3 rounded-2xl transition-all shadow-sm ${
              perms.deposits ? 'bg-white text-emerald-700 active:scale-95' : 'bg-white/20 text-white/50 pointer-events-none'
            }`}
          >
            <div className={`p-2 rounded-xl mr-3 ${perms.deposits ? 'bg-emerald-100' : 'bg-white/10'}`}>
              <ArrowDownToLine size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm leading-tight">Verify</p>
              <p className={`text-[11px] ${perms.deposits ? 'text-emerald-600/70' : 'text-white/40'}`}>Deposits</p>
            </div>
            {pendingDeposits > 0 && (
              <span className="ml-auto bg-rose-500 text-white text-[10px] font-black rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                {pendingDeposits}
              </span>
            )}
          </Link>

          <Link
            to="/admin/withdrawals"
            className={`flex items-center p-3 rounded-2xl transition-all shadow-sm ${
              perms.withdrawals ? 'bg-white text-rose-700 active:scale-95' : 'bg-white/20 text-white/50 pointer-events-none'
            }`}
          >
            <div className={`p-2 rounded-xl mr-3 ${perms.withdrawals ? 'bg-rose-100' : 'bg-white/10'}`}>
              <ArrowUpFromLine size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm leading-tight">Verify</p>
              <p className={`text-[11px] ${perms.withdrawals ? 'text-rose-600/70' : 'text-white/40'}`}>Withdrawals</p>
            </div>
            {pendingWithdrawals > 0 && (
              <span className="ml-auto bg-rose-500 text-white text-[10px] font-black rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                {pendingWithdrawals}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="flex-1 p-4 -mt-2 relative z-0">
        {/* Report Header */}
        <div className="flex items-center justify-between mb-4 mt-2">
          <h2 className="font-black text-slate-800 text-lg flex items-center space-x-2">
            <TrendingUp size={20} className="text-orange-500" />
            <span>Financial Report</span>
          </h2>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-orange-500' : 'text-slate-400'} />
            <span>Refresh</span>
          </button>
        </div>

        {perms.reports ? (
          loading && !stats.totalDeposits ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-bold">Calculating all-time report...</p>
            </div>
          ) : (
            <div className="space-y-4">
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
                    className="w-full text-left bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 hover:border-emerald-300 hover:shadow-sm active:scale-[0.99] transition-all flex items-center space-x-3.5 group"
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
                    className="w-full text-left bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 hover:border-rose-300 hover:shadow-sm active:scale-[0.99] transition-all flex items-center space-x-3.5 group"
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
                    className="w-full text-left bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 hover:border-blue-300 hover:shadow-sm active:scale-[0.99] transition-all flex items-center space-x-3.5 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                      <Users size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Users Main Balance</p>
                        <span className="text-[9.5px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          Balance &gt; 0
                        </span>
                      </div>
                      <p className="text-xl font-black text-slate-800 mt-0.5">
                        {totalBal.toLocaleString()} <span className="text-xs font-bold text-slate-400 font-sans">ETB</span>
                      </p>
                      <p className="text-[10px] font-bold text-blue-600 mt-0.5 flex items-center gap-1 group-hover:underline">
                        <span>View users with active balance</span>
                        <ChevronRight size={12} />
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs text-center space-y-3 my-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
              <ShieldAlert size={24} />
            </div>
            <h3 className="font-black text-slate-800 text-sm">Permission Required</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              You do not currently have permission to view Financial Reports. Contact an administrator to grant you access.
            </p>
          </div>
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
                    {detailType === 'users' && 'Users With Balance > 0'}
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
