import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Gift,
  Search,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  LoyaltyReward,
  UserCandidate,
  getLoyaltyRewards,
  searchUsers,
  createLoyaltyReward,
  cancelLoyaltyReward,
} from '../lib/loyaltyService';

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

  // Default Amharic Title & Congratulatory Message
  const [title, setTitle] = useState('የታማኝ ደንበኛ ልዩ ስጦታ 🎁');
  const [message, setMessage] = useState(
    'ለ Choice Bingo ላሳዩት ታማኝነት የተዘጋጀ ልዩ ስጦታ! ቦነሱን ተጠቅመው ይጫወቱ እና ያሸንፉ!'
  );

  // List filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'claimed' | 'cancelled'>('all');
  const [listSearch, setListSearch] = useState('');

  const showToastMsg = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all loyalty rewards (Failsafe & Direct)
  const fetchRewards = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getLoyaltyRewards();
      setRewards(list);
    } catch (err: any) {
      showToastMsg('error', err.message || 'ስጦታዎችን መጫን አልተቻለም');
    } finally {
      setLoading(false);
    }
  }, []);

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
        const users = await searchUsers(searchQuery);
        setUserSuggestions(users);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Create / Submit Reward
  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetTelegramId = selectedUser ? selectedUser.telegram_id : customTelegramId.trim();

    if (!targetTelegramId) {
      showToastMsg('error', 'እባክዎ ተጠቃሚ ይምረጡ ወይም ትክክለኛ የቴሌግራም መለያ (Telegram ID) ያስገቡ');
      return;
    }

    if (!amount || amount <= 0) {
      showToastMsg('error', 'እባክዎ ትክክለኛ የቦነስ መጠን ያስገቡ (ለምሳሌ 50 ብር)');
      return;
    }

    let validScheduledAt = new Date().toISOString();
    if (isScheduled) {
      if (!scheduledDateTime) {
        showToastMsg('error', 'እባክዎ ስጦታው የሚላክበትን ቀን እና ሰዓት ይምረጡ');
        return;
      }
      validScheduledAt = new Date(scheduledDateTime).toISOString();
    }

    try {
      setSubmitting(true);
      const res = await createLoyaltyReward({
        telegram_id: targetTelegramId,
        amount: Number(amount),
        title: title.trim() || 'የታማኝ ደንበኛ ልዩ ስጦታ 🎁',
        message:
          message.trim() ||
          'ለ Choice Bingo ላሳዩት ታማኝነት የተዘጋጀ ልዩ ስጦታ! ቦነሱን ተጠቅመው ይጫወቱ እና ያሸንፉ!',
        scheduled_at: validScheduledAt,
      });

      if (!res.success || !res.reward) {
        throw new Error(res.error || 'ስጦታውን ማስተላለፍ አልተቻለም');
      }

      showToastMsg(
        'success',
        `የ ${amount} ብር የታማኝ ደንበኛ ስጦታ ለ ${res.reward.recipient_name || targetTelegramId} በተሳካ ሁኔታ ተዘጋጅቷል!`
      );

      // Reset form to defaults
      setSelectedUser(null);
      setCustomTelegramId('');
      setSearchQuery('');
      setAmount(50);
      setIsScheduled(false);
      setScheduledDateTime('');

      // Refresh list
      fetchRewards();
    } catch (err: any) {
      showToastMsg('error', err.message || 'ስጦታውን ማስተላለፍ አልተቻለም');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel / Revoke Reward
  const handleCancelReward = async (id: string) => {
    if (!window.confirm('ይህን በመጠባበቅ ላይ ያለ ስጦታ መሰረዝ እርግጠኛ ነዎት?')) return;

    try {
      const ok = await cancelLoyaltyReward(id);
      if (!ok) throw new Error('ስጦታውን መሰረዝ አልተቻለም');

      showToastMsg('success', 'ስጦታው በተሳካ ሁኔታ ተሰርዟል');
      setRewards((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)));
    } catch (err: any) {
      showToastMsg('error', err.message || 'ስጦታውን መሰረዝ አልተቻለም');
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
          className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center space-x-3 text-xs font-bold transition-all transform animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="shrink-0" />
          ) : (
            <AlertCircle size={18} className="shrink-0" />
          )}
          <span className="flex-1 leading-snug">{toast.message}</span>
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
            <h1 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <span>የታማኝ ደንበኛ ቦነስ</span>
              <Sparkles size={15} className="text-amber-500 fill-amber-400" />
            </h1>
            <p className="text-[10px] text-slate-500">ለተመረጡ ደንበኞች ልዩ የቦነስ ስጦታ መላኪያ</p>
          </div>
        </div>

        <button
          onClick={fetchRewards}
          disabled={loading}
          className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all"
          title="አድስ"
        >
          <RefreshCw size={17} className={loading ? 'animate-spin text-amber-500' : ''} />
        </button>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-4 sm:p-5 text-white shadow-lg shadow-amber-500/20">
          <div className="absolute -right-4 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black tracking-wide uppercase">
              <Gift size={12} />
              <span>ልዩ የታማኝ ደንበኞች ስጦታ</span>
            </div>
            <h2 className="text-lg font-black leading-tight">ለታማኝ ደንበኞች ቦነስ ይላኩ</h2>
            <p className="text-[11px] text-amber-50 leading-relaxed">
              ለተመረጡ ደንበኞች ልዩ የቦነስ ስጦታ (መደበኛ 50 ብር) ይላኩ። ደንበኛው መነሻ ገጽ (Home) ላይ ሲደርስ በሚያምር ፖፕአፕ ወስዶ ቦነሱ ወዲያውኑ ሂሳቡ ላይ ይጨመራል!
            </p>
          </div>
        </div>

        {/* ── CREATE FORM CARD ── */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Gift size={18} />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-800">አዲስ የቦነስ ስጦታ መላኪያ</h3>
              <p className="text-[10px] text-slate-400">ተጠቃሚ ይምረጡ እና የቦነሱን መጠን ያስገቡ</p>
            </div>
          </div>

          <form onSubmit={handleCreateReward} className="space-y-4">
            {/* Target Customer Selection */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-700 block">
                የታማኝ ደንበኛ መለያ (Telegram ID ወይም ስም) <span className="text-rose-500">*</span>
              </label>

              {/* Selected User Badge */}
              {selectedUser ? (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <div className="w-9 h-9 rounded-full bg-amber-500 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-sm">
                      {selectedUser.first_name?.[0] || 'U'}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {selectedUser.first_name} {selectedUser.username ? `@${selectedUser.username}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        ID: {selectedUser.telegram_id} • ሂሳብ: {selectedUser.main_balance || 0} ብር
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
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative flex items-center">
                    <Search size={15} className="absolute left-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="የተጠቃሚውን ስም ወይም Telegram ID ይፈልጉ..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCustomTelegramId(e.target.value);
                      }}
                      onFocus={() => userSuggestions.length > 0 && setShowSuggestions(true)}
                      className="w-full pl-8 pr-8 py-2.5 text-xs bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:bg-white transition-all font-medium"
                    />
                    {isSearchingUsers && (
                      <RefreshCw size={13} className="absolute right-3 text-amber-500 animate-spin" />
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && userSuggestions.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-52 overflow-y-auto divide-y divide-slate-100">
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
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {u.first_name?.[0] || 'U'}
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-slate-800 truncate">
                                {u.first_name} {u.username ? `@${u.username}` : ''}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono">
                                ID: {u.telegram_id}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold text-emerald-600 block">
                              {u.main_balance || 0} ብር
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              ቦነስ: {u.bonus_balance || 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <span>የተመረጠ መለያ (Telegram ID):</span>
                    <span className="font-mono font-bold text-slate-600">
                      {customTelegramId || 'አልተመረጠም'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bonus Amount (Default: 50 ETB) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  የቦነስ መጠን (ብር) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  መደበኛ: 50 ብር
                </span>
              </div>

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
                  placeholder="የቦነስ መጠን በብር"
                  required
                  className="w-full px-3 py-2.5 text-sm font-bold bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-800"
                />
                <span className="absolute right-3.5 text-xs font-bold text-slate-400">
                  ብር ቦነስ
                </span>
              </div>
            </div>

            {/* Delivery Timing */}
            <div className="space-y-2 border border-slate-100 rounded-2xl p-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Clock size={15} className="text-slate-500" />
                  <span className="text-xs font-bold text-slate-700">የሚላክበት ሰዓት</span>
                </div>
                <div className="flex items-center bg-slate-200 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsScheduled(false)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      !isScheduled ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    አሁኑኑ (ወዲያው)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsScheduled(true)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      isScheduled ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    በተወሰነ ሰዓት
                  </button>
                </div>
              </div>

              {isScheduled && (
                <div className="pt-1.5 animate-in fade-in space-y-1">
                  <label className="text-[10px] text-slate-500 block font-medium">
                    ስጦታው ለተጠቃሚው የሚደርስበትን ቀን እና ሰዓት ይምረጡ:
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

            {/* Popup Title & Congratulatory Message (Amharic by default) */}
            <div className="space-y-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  የፖፕአፕ ርዕስ (Title)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="የታማኝ ደንበኛ ልዩ ስጦታ 🎁"
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  የማበረታቻ መልእክት (Message)
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="ለ Choice Bingo ላሳዩት ታማኝነት የተዘጋጀ ልዩ ስጦታ! ቦነሱን ተጠቅመው ይጫወቱ እና ያሸንፉ!"
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-medium resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  <span>ስጦታውን በማዘጋጀት ላይ...</span>
                </>
              ) : (
                <>
                  <Gift size={18} />
                  <span>🎁 የ {amount} ብር ቦነስ ስጦታ ላክ</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── REWARD HISTORY & STATUS ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1.5">
              <span>የተላኩ ስጦታዎች ታሪክ</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {rewards.length}
              </span>
            </h3>

            {/* Status Filter Pills */}
            <div className="flex items-center space-x-1">
              {(
                [
                  { key: 'all', label: 'ሁሉም' },
                  { key: 'pending', label: 'መጠባበቅ' },
                  { key: 'claimed', label: 'የተወሰደ' },
                  { key: 'cancelled', label: 'የተሰረዘ' },
                ] as const
              ).map((st) => {
                const count =
                  st.key === 'all'
                    ? rewards.length
                    : st.key === 'pending'
                    ? pendingCount
                    : st.key === 'claimed'
                    ? claimedCount
                    : cancelledCount;
                return (
                  <button
                    key={st.key}
                    onClick={() => setStatusFilter(st.key)}
                    className={`px-2 py-1 rounded-xl text-[9px] sm:text-[10px] font-bold transition-all ${
                      statusFilter === st.key
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-white text-slate-500 border border-slate-200'
                    }`}
                  >
                    {st.label} ({count})
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
              placeholder="ስም፣ ዩዘርኔም ወይም ID በመጻፍ ይፈልጉ..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* List items */}
          {filteredRewards.length === 0 ? (
            <div className="bg-white rounded-3xl p-6 text-center border border-slate-100">
              <Gift size={28} className="mx-auto text-slate-300 mb-1.5" />
              <p className="text-xs font-bold text-slate-500">ምንም የተመዘገበ ስጦታ አልተገኘም</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {statusFilter !== 'all'
                  ? 'በዚህ ሁኔታ ውስጥ ምንም የተመዘገበ ስጦታ የለም።'
                  : 'ከላይ ያለውን ቅጽ በመጠቀም የመጀመሪያውን የታማኝ ደንበኛ ስጦታ ይላኩ!'}
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
                    className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 space-y-2 transition-all hover:border-slate-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {r.recipient_name || 'ደንበኛ'}
                          </span>
                          {r.recipient_username && (
                            <span className="text-[10px] text-amber-600 font-medium truncate">
                              @{r.recipient_username}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          Telegram ID: {r.telegram_id}
                        </div>
                      </div>

                      {/* Amount & Status Badge */}
                      <div className="text-right shrink-0 space-y-1">
                        <div className="inline-block px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs shadow-sm">
                          +{r.amount} ብር
                        </div>
                        <div>
                          {isClaimed && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                              <CheckCircle2 size={10} />
                              <span>ተወስዷል</span>
                            </span>
                          )}
                          {isPending && (
                            <span
                              className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                isDue
                                  ? 'text-amber-700 bg-amber-100 animate-pulse'
                                  : 'text-blue-700 bg-blue-100'
                              }`}
                            >
                              <Clock size={10} />
                              <span>{isDue ? 'አሁን ይገኛል' : 'የተያዘ'}</span>
                            </span>
                          )}
                          {isCancelled && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              <XCircle size={10} />
                              <span>ተሰርዟል</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Title & Message */}
                    <div className="bg-slate-50 rounded-xl p-2 text-[10px] text-slate-600 border border-slate-100">
                      <div className="font-bold text-slate-800">{r.title}</div>
                      <div className="text-slate-500 text-[9px] mt-0.5 leading-snug">{r.message}</div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-[9px] text-slate-400">
                      <div>
                        {isClaimed && r.claimed_at ? (
                          <span className="text-emerald-600 font-medium">
                            የተወሰደበት ቀን: {new Date(r.claimed_at).toLocaleDateString()} {new Date(r.claimed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : isPending && !isDue ? (
                          <span>
                            የሚደርስበት ቀን: {new Date(r.scheduled_at).toLocaleString()}
                          </span>
                        ) : (
                          <span>የተፈጠረው: {new Date(r.created_at).toLocaleDateString()}</span>
                        )}
                      </div>

                      {/* Cancel Action for Pending */}
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleCancelReward(r.id)}
                          className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-600 font-bold px-2 py-0.5 rounded-md hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={11} />
                          <span>ሰርዝ</span>
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
