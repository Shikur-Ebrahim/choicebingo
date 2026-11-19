import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Gift,
  Search,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Send,
  User,
  Trash2,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface LoyaltyReward {
  id: string;
  telegram_id: string;
  recipient_name?: string;
  recipient_username?: string;
  amount: number;
  title: string;
  message: string;
  scheduled_at: string;
  status: 'pending' | 'claimed' | 'cancelled';
  created_at: string;
  claimed_at?: string;
  created_by?: string;
}

interface UserCandidate {
  id: string;
  telegram_id: string;
  username: string;
  first_name: string;
  main_balance: number;
  bonus_balance: number;
  total_wins: number;
  total_games: number;
}

export default function AdminLoyaltyRewards() {
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [selectedUser, setSelectedUser] = useState<UserCandidate | null>(null);
  const [customTelegramId, setCustomTelegramId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<UserCandidate[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Amount states (Default: 50 ETB)
  const [amount, setAmount] = useState<number>(50);
  const quickAmounts = [20, 50, 100, 200, 500, 1000];

  // Schedule states
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Content states
  const [title, setTitle] = useState('Exclusive Loyalty Gift 🎁');
  const [message, setMessage] = useState('Thank you for being our valued loyal player! Here is a special bonus reward just for you.');

  // List filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'claimed' | 'cancelled'>('all');
  const [listSearch, setListSearch] = useState('');

  const getHeaders = useCallback(() => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    const pwaPhone = typeof window !== 'undefined' ? localStorage.getItem('cb_pwa_phone') || '' : '';
    return {
      'Content-Type': 'application/json',
      'x-telegram-init-data': initData,
      'x-pwa-phone': pwaPhone,
    };
  }, []);

  const showToastMsg = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all loyalty rewards
  const fetchRewards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/loyalty-rewards/admin/list`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load rewards');
      const data = await res.json();
      setRewards(data.rewards || []);
    } catch (err: any) {
      showToastMsg('error', err.message || 'Error loading rewards');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  // Search users for autocomplete
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setUserSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingUsers(true);
        const res = await fetch(`${API_URL}/loyalty-rewards/admin/search-users?q=${encodeURIComponent(searchQuery.trim())}`, {
          headers: getHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setUserSuggestions(data.users || []);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, getHeaders]);

  // Handle Create / Submit Reward
  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetTelegramId = selectedUser ? selectedUser.telegram_id : customTelegramId.trim();

    if (!targetTelegramId) {
      showToastMsg('error', 'Please select a customer or enter a valid Telegram ID');
      return;
    }

    if (!amount || amount <= 0) {
      showToastMsg('error', 'Please enter a valid reward amount (e.g. 50 ETB)');
      return;
    }

    let validScheduledAt = new Date().toISOString();
    if (isScheduled) {
      if (!scheduledDateTime) {
        showToastMsg('error', 'Please pick a scheduled date and time');
        return;
      }
      validScheduledAt = new Date(scheduledDateTime).toISOString();
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/loyalty-rewards/admin/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          telegram_id: targetTelegramId,
          amount: Number(amount),
          title: title.trim(),
          message: message.trim(),
          scheduled_at: validScheduledAt,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to grant loyalty reward');
      }

      showToastMsg('success', `Loyalty reward of ${amount} ETB successfully created for ${data.reward.recipient_name || targetTelegramId}!`);

      // Reset form
      setSelectedUser(null);
      setCustomTelegramId('');
      setSearchQuery('');
      setAmount(50);
      setIsScheduled(false);
      setScheduledDateTime('');

      // Refresh list
      fetchRewards();
    } catch (err: any) {
      showToastMsg('error', err.message || 'Error submitting reward');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel / Revoke Reward
  const handleCancelReward = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this pending loyalty reward?')) return;

    try {
      const res = await fetch(`${API_URL}/loyalty-rewards/admin/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to cancel');

      showToastMsg('success', 'Reward cancelled successfully');
      setRewards((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)));
    } catch (err: any) {
      showToastMsg('error', err.message || 'Error cancelling reward');
    }
  };

  // Filtered rewards list
  const filteredRewards = rewards.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (listSearch.trim()) {
      const q = listSearch.toLowerCase();
      const matchName = (r.recipient_name || '').toLowerCase().includes(q);
      const matchUser = (r.recipient_username || '').toLowerCase().includes(q);
      const matchId = (r.telegram_id || '').toLowerCase().includes(q);
      return matchName || matchUser || matchId;
    }
    return true;
  });

  const pendingCount = rewards.filter((r) => r.status === 'pending').length;
  const claimedCount = rewards.filter((r) => r.status === 'claimed').length;
  const cancelledCount = rewards.filter((r) => r.status === 'cancelled').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center space-x-3 text-sm font-semibold transition-all transform animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
          <span className="flex-1">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <Link
            to="/admin"
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-base font-black text-slate-800 flex items-center gap-1.5">
              <span>Loyalty Rewards</span>
              <Sparkles size={16} className="text-amber-500 fill-amber-400" />
            </h1>
            <p className="text-[11px] text-slate-500">Targeted bonus gifts for loyal customers</p>
          </div>
        </div>

        <button
          onClick={fetchRewards}
          disabled={loading}
          className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all"
          title="Refresh"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin text-amber-500' : ''} />
        </button>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-5">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-5 text-white shadow-lg shadow-amber-500/20">
          <div className="absolute -right-4 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wide uppercase">
              <Gift size={13} />
              <span>VIP Loyalty System</span>
            </div>
            <h2 className="text-xl font-black">Reward Loyal Customers</h2>
            <p className="text-xs text-amber-50 leading-relaxed">
              Target any loyal customer with custom bonus balance (default: 50 ETB). When they open the home page, a celebratory popup allows them to claim it instantly!
            </p>
          </div>
        </div>

        {/* ── CREATE FORM CARD ── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Gift size={18} />
            </div>
            <h3 className="font-bold text-sm text-slate-800">Grant New Loyalty Gift</h3>
          </div>

          <form onSubmit={handleCreateReward} className="space-y-4">
            {/* Target Customer Selection */}
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Target Loyal Customer *</span>
                <span className="text-[10px] text-slate-400 font-normal">Search by username, name, or Telegram ID</span>
              </label>

              {/* Selected User Badge */}
              {selectedUser ? (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-black flex items-center justify-center text-sm shadow-sm">
                      {selectedUser.first_name?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        {selectedUser.first_name} {selectedUser.username ? `@${selectedUser.username}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        ID: {selectedUser.telegram_id} • Balance: {selectedUser.main_balance || 0} ETB
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setCustomTelegramId('');
                      setSearchQuery('');
                    }}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search size={16} className="absolute left-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type username or name to search..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCustomTelegramId(e.target.value);
                      }}
                      onFocus={() => userSuggestions.length > 0 && setShowSuggestions(true)}
                      className="w-full pl-9 pr-9 py-2.5 text-xs bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                    {isSearchingUsers && (
                      <RefreshCw size={14} className="absolute right-3.5 text-amber-500 animate-spin" />
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && userSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {userSuggestions.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedUser(u);
                            setCustomTelegramId(u.telegram_id);
                            setShowSuggestions(false);
                          }}
                          className="p-2.5 flex items-center justify-between hover:bg-amber-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                              {u.first_name?.[0] || 'U'}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800">
                                {u.first_name} {u.username ? `@${u.username}` : ''}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                ID: {u.telegram_id}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] font-bold text-emerald-600 block">
                              {u.main_balance || 0} ETB
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              Bonus: {u.bonus_balance || 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <span>Or enter direct Telegram ID:</span>
                    <span className="font-mono">{customTelegramId || 'None'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bonus Amount (Default: 50 ETB) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Reward Amount (ETB Bonus) *</span>
                <span className="text-[10px] font-bold text-amber-600">Default: 50 ETB</span>
              </label>

              {/* Quick Amount Chips */}
              <div className="grid grid-cols-6 gap-1.5">
                {quickAmounts.map((amt) => {
                  const isSelected = amount === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-black transition-all ${
                        isSelected
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {amt}
                    </button>
                  );
                })}
              </div>

              {/* Custom Amount Input */}
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Custom ETB Amount"
                  required
                  className="w-full px-3 py-2.5 text-sm font-bold bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-800"
                />
                <span className="absolute right-3.5 text-xs font-bold text-slate-400 uppercase">
                  ETB Bonus
                </span>
              </div>
            </div>

            {/* Schedule Option */}
            <div className="space-y-2 border border-slate-100 rounded-2xl p-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock size={16} className="text-slate-500" />
                  <span className="text-xs font-bold text-slate-700">Delivery Timing</span>
                </div>
                <div className="flex items-center bg-slate-200 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsScheduled(false)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      !isScheduled ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Immediate (Now)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsScheduled(true)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      isScheduled ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Schedule Time
                  </button>
                </div>
              </div>

              {isScheduled && (
                <div className="pt-2 animate-in fade-in space-y-1.5">
                  <label className="text-[11px] text-slate-500 block font-medium">
                    Pick exact date & time when the reward becomes claimable:
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    required={isScheduled}
                    className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              )}
            </div>

            {/* Title & Message */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Popup Title & Greeting</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Exclusive Loyalty Gift 🎁"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
              />
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Custom message shown to the user on Home page..."
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold text-sm shadow-md shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Creating Reward...</span>
                </>
              ) : (
                <>
                  <Gift size={18} />
                  <span>Grant {amount} ETB Loyalty Reward</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── REWARD HISTORY & STATUS ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span>Rewards History</span>
              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {rewards.length}
              </span>
            </h3>

            {/* Status Filter Pills */}
            <div className="flex items-center space-x-1">
              {(['all', 'pending', 'claimed', 'cancelled'] as const).map((st) => {
                const count = st === 'all' ? rewards.length : st === 'pending' ? pendingCount : st === 'claimed' ? claimedCount : cancelledCount;
                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold capitalize transition-all ${
                      statusFilter === st
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-white text-slate-500 border border-slate-200'
                    }`}
                  >
                    {st} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search filter in list */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search history by name, username, ID..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* List items */}
          {filteredRewards.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
              <Gift size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-500">No loyalty rewards found</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {statusFilter !== 'all' ? `No ${statusFilter} rewards in history.` : 'Create a new reward above to get started!'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRewards.map((r) => {
                const isClaimed = r.status === 'claimed';
                const isPending = r.status === 'pending';
                const isCancelled = r.status === 'cancelled';
                const isDue = new Date(r.scheduled_at).getTime() <= Date.now();

                return (
                  <div
                    key={r.id}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-2.5 transition-all hover:border-slate-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-900">
                            {r.recipient_name || 'Customer'}
                          </span>
                          {r.recipient_username && (
                            <span className="text-[11px] text-amber-600 font-medium">
                              @{r.recipient_username}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Telegram ID: {r.telegram_id}
                        </div>
                      </div>

                      {/* Amount & Status Badge */}
                      <div className="text-right space-y-1">
                        <div className="inline-block px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs shadow-sm">
                          +{r.amount} ETB
                        </div>
                        <div>
                          {isClaimed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              <CheckCircle2 size={11} />
                              <span>Claimed</span>
                            </span>
                          )}
                          {isPending && (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isDue
                                  ? 'text-amber-700 bg-amber-100 animate-pulse'
                                  : 'text-blue-700 bg-blue-100'
                              }`}
                            >
                              <Clock size={11} />
                              <span>{isDue ? 'Available Now' : 'Scheduled'}</span>
                            </span>
                          )}
                          {isCancelled && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              <XCircle size={11} />
                              <span>Cancelled</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Title & Message */}
                    <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] text-slate-600 border border-slate-100">
                      <div className="font-bold text-slate-800">{r.title}</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{r.message}</div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[10px] text-slate-400">
                      <div>
                        {isClaimed && r.claimed_at ? (
                          <span className="text-emerald-600 font-medium">
                            Claimed on {new Date(r.claimed_at).toLocaleDateString()} at{' '}
                            {new Date(r.claimed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : isPending && !isDue ? (
                          <span>
                            Becomes available: {new Date(r.scheduled_at).toLocaleString()}
                          </span>
                        ) : (
                          <span>Created {new Date(r.created_at).toLocaleDateString()}</span>
                        )}
                      </div>

                      {/* Cancel Action for Pending */}
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleCancelReward(r.id)}
                          className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-600 font-bold px-2 py-0.5 rounded-md hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={12} />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
