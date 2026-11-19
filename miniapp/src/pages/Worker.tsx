import { useState, useEffect, useCallback } from 'react';
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
  ShieldAlert
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      const res = await fetch(`${API_URL}/admin/profit-report`, {
        headers: { 'x-telegram-init-data': initData }
      });
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
      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      const res = await fetch(`${API_URL}/admin/pending-counts`, {
        headers: { 'x-telegram-init-data': initData }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingDeposits(data.pendingDeposits || 0);
        setPendingWithdrawals(data.pendingWithdrawals || 0);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchReport();
    fetchPendingCounts();
  }, [fetchReport, fetchPendingCounts]);

  if (!user || user.role !== 'worker') {
    return <Navigate to="/" replace />;
  }

  const perms = user.permissions || {};

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
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
          loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-bold">Calculating all-time report...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1. PROFIT SECTION (FIRST) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-orange-500" />
                    <span>1. Profit Categories</span>
                  </p>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                    All-Time Active
                  </span>
                </div>

                {/* Category 1: Net Profit = Total Deposits - Total Withdrawals */}
                <div
                  className={`rounded-3xl p-4.5 shadow-sm border transition-all ${
                    stats.netProfit >= 0
                      ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-400/40 shadow-emerald-500/10'
                      : 'bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 text-white border-rose-400/40 shadow-rose-500/10'
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
                    {stats.netProfit > 0 ? '+' : ''}{Number(stats.netProfit || 0).toLocaleString()} <span className="text-lg font-bold text-white/80">ETB</span>
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between text-[11px] text-white/90 font-medium">
                    <span>Formula:</span>
                    <span className="font-mono font-bold text-white">
                      Deposits ({Number(stats.totalDeposits || 0).toLocaleString()}) − Withdrawals ({Number(stats.totalWithdrawals || 0).toLocaleString()})
                    </span>
                  </div>
                </div>

                {/* Category 2: Total Net Profit = Total Deposits - Total Withdrawals - Total Users Main Balance */}
                <div
                  className={`rounded-3xl p-4.5 shadow-sm border transition-all ${
                    stats.netProfitAfterBalances >= 0
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
                    {stats.netProfitAfterBalances > 0 ? '+' : ''}{Number(stats.netProfitAfterBalances || 0).toLocaleString()} <span className="text-lg font-bold text-white/80">ETB</span>
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between text-[11px] text-white/90 font-medium">
                    <span>Formula:</span>
                    <span className="font-mono font-bold text-white">
                      Cash Profit − User Balances ({Number(stats.totalUserMainBalance || 0).toLocaleString()})
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
                  <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-100 flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60">
                      <ArrowDownToLine size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Deposits</p>
                        <span className="text-[9.5px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">Approved</span>
                      </div>
                      <p className="text-xl font-black text-slate-800 mt-0.5">
                        {Number(stats.totalDeposits || 0).toLocaleString()} <span className="text-xs font-bold text-slate-400 font-sans">ETB</span>
                      </p>
                    </div>
                  </div>

                  {/* Total Withdrawals */}
                  <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-100 flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100/60">
                      <ArrowUpFromLine size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Withdrawals</p>
                        <span className="text-[9.5px] font-black text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-full">Approved</span>
                      </div>
                      <p className="text-xl font-black text-slate-800 mt-0.5">
                        {Number(stats.totalWithdrawals || 0).toLocaleString()} <span className="text-xs font-bold text-slate-400 font-sans">ETB</span>
                      </p>
                    </div>
                  </div>

                  {/* Total Users Main Balance */}
                  <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-100 flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/60">
                      <Users size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Users Main Balance</p>
                        <span className="text-[9.5px] font-black text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">All Users</span>
                      </div>
                      <p className="text-xl font-black text-slate-800 mt-0.5">
                        {Number(stats.totalUserMainBalance || 0).toLocaleString()} <span className="text-xs font-bold text-slate-400 font-sans">ETB</span>
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
                  Only approved deposits and withdrawals are included. This calculates total cash profit and true profit after accounting for active user balances across the platform.
                </p>
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
    </div>
  );
}
