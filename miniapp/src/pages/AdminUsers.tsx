import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Search, 
  RefreshCw, 
  Users, 
  ChevronRight, 
  X, 
  Wallet, 
  Gift, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Shield, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  Minus, 
  Plus,
  Ban,
  Check,
  Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from '../store/gameStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface User {
  id: string;
  telegram_id: string;
  username: string;
  first_name: string;
  role: string;
  status: string;
  main_balance: number;
  bonus_balance: number;
  total_wins: number;
  total_games?: number;
  total_stake?: number;
  invited_reward?: number;
  totalDeposited: number;
  depositCount: number;
  created_at: string;
}

interface UserDetail extends User {
  deposits: any[];
  withdrawals: any[];
  totalDeposited: number;
  totalWithdrawn: number;
}

type FilterType = 'all' | 'user' | 'worker' | 'admin' | 'inactive';

interface FilterCounts {
  all: number;
  user: number;
  worker: number;
  admin: number;
  inactive: number;
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-rose-100 text-rose-700',
  worker: 'bg-orange-100 text-orange-700',
  user: 'bg-slate-100 text-slate-600',
};

function fmt(n: number) {
  return (n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initial(u: User) {
  return (u.first_name || u.username || '?').charAt(0).toUpperCase();
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Filter category state
  const [filter, setFilter] = useState<FilterType>('all');
  const [counts, setCounts] = useState<FilterCounts>({ all: 0, user: 0, worker: 0, admin: 0, inactive: 0 });

  // Balance adjust state
  const [adjField, setAdjField] = useState<'main_balance' | 'bonus_balance'>('main_balance');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjNote, setAdjNote] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);

  // Role change state
  const [roleSaving, setRoleSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const searchTimer = useRef<any>(null);
  const LIMIT = 20;

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-telegram-init-data': typeof WebApp !== 'undefined' ? WebApp.initData : '',
  });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = async (q = search, p = page, currentFilter = filter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        search: q, 
        page: String(p), 
        limit: String(LIMIT),
        role: currentFilter === 'inactive' ? 'all' : currentFilter,
        status: currentFilter === 'inactive' ? 'inactive' : 'all'
      });
      const res = await fetch(`${API_URL}/admin/users?${params}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(p === 1 ? data.users : prev => [...prev, ...data.users]);
        setTotal(data.total);
        if (data.counts) {
          setCounts(data.counts);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchDetail = async (telegramId: string) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const res = await fetch(`${API_URL}/admin/users/${telegramId}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSelected(data.user ? { 
          ...data.user, 
          deposits: data.deposits, 
          withdrawals: data.withdrawals, 
          totalDeposited: data.totalDeposited, 
          totalWithdrawn: data.totalWithdrawn 
        } : null);
        setAdjField('main_balance');
        setAdjAmount('');
        setAdjNote('');
      }
    } catch (err) { console.error(err); }
    finally { setDetailLoading(false); }
  };

  useEffect(() => { 
    fetchUsers(search, 1, filter); 
  }, []);

  const { user } = useGameStore();
  if (!user || (user.role !== 'admin' && !(user.role === 'worker' && user.permissions?.users))) {
    return <div className="p-10 text-center font-bold text-slate-600">Access Denied</div>;
  }

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      setUsers([]);
      fetchUsers(val, 1, filter);
    }, 400);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setPage(1);
    setUsers([]);
    fetchUsers(search, 1, newFilter);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchUsers(search, nextPage, filter);
  };

  const adjustBalance = async () => {
    if (!selected || !adjAmount || isNaN(Number(adjAmount))) return;
    setAdjSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${selected.telegram_id}/balance`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ field: adjField, amount: Number(adjAmount), note: adjNote }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast('success', 'Balance updated! User notified.');
        setSelected(prev => prev ? { ...prev, [adjField]: d.newValue } : prev);
        setAdjAmount(''); setAdjNote('');
        fetchUsers(search, 1, filter);
      } else {
        showToast('error', d.error || 'Failed');
      }
    } catch { showToast('error', 'Network error'); }
    finally { setAdjSaving(false); }
  };

  const changeRole = async (role: string) => {
    if (!selected) return;
    setRoleSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${selected.telegram_id}/role`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ role }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast('success', `Role changed to ${role}`);
        setSelected(prev => prev ? { ...prev, role } : prev);
        fetchUsers(search, 1, filter);
      } else {
        showToast('error', d.error || 'Failed');
      }
    } catch { showToast('error', 'Network error'); }
    finally { setRoleSaving(false); }
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    setStatusSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${selected.telegram_id}/status`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast('success', `Account ${status === 'active' ? 'activated' : 'deactivated / blocked'}`);
        setSelected(prev => prev ? { ...prev, status } : prev);
        fetchUsers(search, 1, filter);
      } else {
        showToast('error', d.error || 'Failed');
      }
    } catch { showToast('error', 'Network error'); }
    finally { setStatusSaving(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden select-none">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-3 left-3 right-3 z-50 flex items-center space-x-2 px-3.5 py-3 rounded-2xl shadow-xl text-xs font-bold ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'} text-white animate-slide-down`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white px-3.5 py-3 shadow-sm border-b border-gray-100 flex items-center space-x-2.5 shrink-0">
        <Link to="/admin" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black text-slate-800 leading-tight">Users</h1>
          <p className="text-[10px] text-slate-400 font-semibold">{total} total registered</p>
        </div>
        <button 
          onClick={() => { setPage(1); setUsers([]); fetchUsers(search, 1, filter); }} 
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 active:scale-95 transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-amber-500' : ''} />
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="px-3.5 py-2.5 bg-white border-b border-gray-100 shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, username, or Telegram ID..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-2 text-xs font-medium text-slate-700 outline-none focus:border-slate-800 focus:bg-white transition-all"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 🌟 ROLE & STATUS FILTER CATEGORY BAR 🌟 */}
      <div className="px-3.5 py-2 bg-white border-b border-gray-100 flex items-center space-x-1.5 overflow-x-auto no-scrollbar shrink-0 shadow-xs">
        {[
          { key: 'all' as FilterType, label: 'All', icon: null, count: counts.all },
          { key: 'user' as FilterType, label: 'Users', icon: '👤', count: counts.user },
          { key: 'worker' as FilterType, label: 'Workers', icon: '🔧', count: counts.worker },
          { key: 'admin' as FilterType, label: 'Admins', icon: '👑', count: counts.admin },
          { key: 'inactive' as FilterType, label: 'Blocked', icon: '🚫', count: counts.inactive },
        ].map(tab => {
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all shrink-0 active:scale-95 ${
                isActive
                  ? tab.key === 'inactive'
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-500/20'
                    : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md shadow-slate-900/20'
                  : tab.key === 'inactive' && tab.count > 0
                  ? 'bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              {tab.icon && <span className="text-[11px]">{tab.icon}</span>}
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isActive
                  ? 'bg-white/25 text-white'
                  : tab.key === 'inactive' && tab.count > 0
                  ? 'bg-rose-200 text-rose-800'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* USERS LIST */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2">
        {users.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
              <Users size={32} />
            </div>
            <p className="text-xs font-bold text-slate-400">
              {filter === 'inactive' ? 'No blocked users found' : 'No users found'}
            </p>
          </div>
        )}

        {users.map(u => {
          const isInactive = u.status === 'inactive';
          return (
            <button 
              key={u.id} 
              onClick={() => fetchDetail(u.telegram_id)}
              className={`w-full rounded-2xl border px-3.5 py-2.5 flex items-center space-x-3 active:scale-98 transition-all text-left ${
                isInactive 
                  ? 'bg-rose-50/50 border-rose-200/80 shadow-xs shadow-rose-100' 
                  : 'bg-white border-gray-100 shadow-sm'
              }`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm text-white shadow-inner ${
                  isInactive
                    ? 'bg-rose-600'
                    : u.role === 'admin' 
                    ? 'bg-rose-500' 
                    : u.role === 'worker' 
                    ? 'bg-orange-500' 
                    : 'bg-emerald-500'
                }`}>
                  {initial(u)}
                </div>
                {isInactive && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-[8px] font-black text-white">
                    ✕
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5 mb-0.5">
                  <span className={`font-black text-[13px] truncate ${isInactive ? 'text-rose-950 line-through opacity-80' : 'text-slate-800'}`}>
                    {u.first_name}
                  </span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${ROLE_COLORS[u.role] || ROLE_COLORS['user']}`}>
                    {u.role}
                  </span>
                  {isInactive && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-600 text-white shadow-xs animate-pulse">
                      🚫 Blocked
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  @{u.username} · ID <span className="font-mono">{u.telegram_id}</span>
                </p>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-[10px] font-bold text-emerald-600">💰 {fmt(u.main_balance)} ETB</span>
                  <span className="text-[10px] font-bold text-violet-600">🎁 {fmt(u.bonus_balance)} ETB</span>
                </div>
                <div className="flex items-center space-x-2 mt-0.5 text-[9px] font-semibold text-slate-400">
                  <span>🎮 {u.total_games || 0} games</span>
                  <span>·</span>
                  <span>🎯 {fmt(u.total_stake || 0)} ETB</span>
                  <span>·</span>
                  <span>🏆 {u.total_wins || 0} wins</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-300 shrink-0" />
            </button>
          );
        })}

        {/* Load more */}
        {users.length < total && !loading && (
          <button 
            onClick={loadMore} 
            className="w-full py-2.5 text-xs font-bold text-slate-600 bg-white rounded-xl border border-slate-200 active:bg-slate-50 shadow-xs"
          >
            Load more ({users.length}/{total})
          </button>
        )}
        {loading && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* DETAIL SHEET */}
      {(selected || detailLoading) && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex items-end animate-fade-in" 
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div className="w-full bg-white rounded-t-[32px] max-h-[92vh] flex flex-col overflow-hidden animate-slide-up shadow-2xl">
            {/* Sheet Handle & Close */}
            <div className="flex items-center px-4 pt-4 pb-2 shrink-0 relative">
              <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <div className="flex-1" />
              <button 
                onClick={() => setSelected(null)} 
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 active:scale-90 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-2">
                <div className="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-400 font-bold">Loading user profile...</p>
              </div>
            ) : selected ? (
              <div className="overflow-y-auto flex-1 px-4 pb-8">
                
                {/* ⚠️ Prominent Deactivated Banner if Inactive */}
                {selected.status === 'inactive' && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 mb-4 flex items-center space-x-2.5 animate-slide-down">
                    <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Ban size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-rose-900 uppercase tracking-wide">Account Deactivated / Blocked</p>
                      <p className="text-[10px] text-rose-700 font-medium leading-tight">This user is restricted from opening Choice Bingo and playing games.</p>
                    </div>
                  </div>
                )}

                {/* Profile card */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg text-white shrink-0 shadow-inner ${
                    selected.status === 'inactive'
                      ? 'bg-rose-600'
                      : selected.role === 'admin' 
                      ? 'bg-rose-500' 
                      : selected.role === 'worker' 
                      ? 'bg-orange-500' 
                      : 'bg-emerald-500'
                  }`}>
                    {initial(selected)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className={`font-black text-sm ${selected.status === 'inactive' ? 'text-rose-950' : 'text-slate-800'}`}>
                        {selected.first_name}
                      </p>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${ROLE_COLORS[selected.role] || ROLE_COLORS['user']}`}>
                        {selected.role}
                      </span>
                      {selected.status === 'inactive' && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                          🚫 Blocked
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">@{selected.username} · ID <span className="font-mono">{selected.telegram_id}</span></p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Joined {fmtDate(selected.created_at)}</p>
                  </div>
                </div>

                {/* Balance Stats */}
                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  {[
                    { label: 'Main Balance', value: selected.main_balance, icon: <Wallet size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Bonus Balance', value: selected.bonus_balance, icon: <Gift size={14} />, color: 'text-violet-600', bg: 'bg-violet-50' },
                    { label: 'Total Deposited', value: selected.totalDeposited, icon: <ArrowDownCircle size={14} />, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Total Withdrawn', value: selected.totalWithdrawn, icon: <ArrowUpCircle size={14} />, color: 'text-rose-600', bg: 'bg-rose-50' },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-50 rounded-xl p-2.5 flex items-center space-x-2 border border-slate-100">
                      <div className={`w-7 h-7 rounded-lg ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>{s.icon}</div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{s.label}</p>
                        <p className={`text-xs font-black ${s.color}`}>{fmt(s.value)} <span className="text-[9px] font-semibold text-slate-400">ETB</span></p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gaming & Referral Metrics */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-slate-50 rounded-xl p-2.5 flex flex-col items-center justify-center border border-slate-100 text-center">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Total Games</p>
                    <p className="text-xs font-black text-amber-600 mt-0.5">🎮 {selected.total_games || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 flex flex-col items-center justify-center border border-slate-100 text-center">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Total Stake</p>
                    <p className="text-xs font-black text-indigo-600 mt-0.5">{fmt(selected.total_stake || 0)} <span className="text-[8px] font-semibold text-slate-400">ETB</span></p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 flex flex-col items-center justify-center border border-slate-100 text-center">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Invited Reward</p>
                    <p className="text-xs font-black text-emerald-600 mt-0.5">{fmt(selected.invited_reward || 0)} <span className="text-[8px] font-semibold text-slate-400">ETB</span></p>
                  </div>
                </div>

                {/* ─── ACCOUNT STATUS TOGGLE ─── */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 mb-3 shadow-xs">
                  <p className="text-[11px] font-black text-slate-700 mb-2">🔒 Account Status Control</p>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => changeStatus('active')} 
                      disabled={statusSaving || selected.status === 'active' || !selected.status}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50 ${
                        (selected.status === 'active' || !selected.status) 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>✅</span>
                      <span>Active</span>
                    </button>
                    <button 
                      onClick={() => changeStatus('inactive')} 
                      disabled={statusSaving || selected.status === 'inactive'}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50 ${
                        selected.status === 'inactive' 
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>🚫</span>
                      <span>Deactivate / Block</span>
                    </button>
                  </div>
                </div>

                {/* ─── ADJUST BALANCE ─── */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 mb-3 shadow-xs">
                  <p className="text-[11px] font-black text-slate-700 mb-2">⚖️ Adjust Balance</p>

                  {/* Field selector */}
                  <div className="flex space-x-1.5 mb-2">
                    {(['main_balance', 'bonus_balance'] as const).map(f => (
                      <button 
                        key={f} 
                        onClick={() => setAdjField(f)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black border transition-all ${adjField === f ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-500 border-slate-200'}`}
                      >
                        {f === 'main_balance' ? 'Main Balance' : 'Bonus Balance'}
                      </button>
                    ))}
                  </div>

                  {/* Amount row */}
                  <div className="flex items-center space-x-2 mb-2">
                    <button 
                      onClick={() => setAdjAmount(a => a.startsWith('-') ? a.slice(1) : '-' + a)}
                      className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 active:scale-90 transition-all font-bold"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      placeholder="Amount (+ add / - deduct)"
                      value={adjAmount}
                      onChange={e => setAdjAmount(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-800 text-center"
                    />
                    <button 
                      onClick={() => setAdjAmount(a => a.startsWith('-') ? a.slice(1) : a)}
                      className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 active:scale-90 transition-all font-bold"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Note to user (optional)"
                    value={adjNote}
                    onChange={e => setAdjNote(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-slate-800 mb-2"
                  />

                  <button 
                    onClick={adjustBalance} 
                    disabled={adjSaving || !adjAmount}
                    className="w-full py-2.5 bg-slate-900 text-white text-xs font-black rounded-xl flex items-center justify-center space-x-1.5 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {adjSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>Apply Adjustment</span>
                  </button>
                </div>

                {/* ─── CHANGE ROLE ─── */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 mb-3 shadow-xs">
                  <p className="text-[11px] font-black text-slate-700 mb-2">🛡️ Change Role</p>
                  <div className="flex space-x-1.5">
                    {['user', 'worker', 'admin'].map(r => (
                      <button 
                        key={r} 
                        onClick={() => changeRole(r)} 
                        disabled={roleSaving || selected.role === r}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition-all disabled:opacity-50 ${selected.role === r ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-600 border-slate-200 active:scale-95'}`}
                      >
                        {r === 'admin' ? '👑 Admin' : r === 'worker' ? '🔧 Worker' : '👤 User'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ─── RECENT TRANSACTIONS ─── */}
                {(selected.deposits.length > 0 || selected.withdrawals.length > 0) && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
                    <p className="text-[11px] font-black text-slate-700 mb-2">📋 Recent Transactions</p>
                    <div className="space-y-1.5">
                      {[...selected.deposits.slice(0, 5), ...selected.withdrawals.slice(0, 5)]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 8)
                        .map((tx: any, i: number) => {
                          const isDeposit = 'method_id' in tx || tx.telegram_id;
                          return (
                            <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                              <div className="flex items-center space-x-2">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDeposit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {isDeposit ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-700">{isDeposit ? 'Deposit' : 'Withdrawal'}</p>
                                  <p className="text-[9px] text-slate-400">{new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-[11px] font-black ${isDeposit ? 'text-emerald-600' : 'text-rose-600'}`}>{isDeposit ? '+' : '-'}{fmt(tx.amount)} ETB</p>
                                <span className={`text-[9px] font-bold ${tx.status === 'approved' ? 'text-emerald-500' : tx.status === 'pending' ? 'text-amber-500' : 'text-rose-500'}`}>{tx.status}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
