import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Gift, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Gamepad2, 
  Zap, 
  Trophy, 
  RefreshCw, 
  Search, 
  Clock 
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Campaign {
  id: string;
  title: string;
  description: string;
  target_value: number;
  reward_type: string;
  reward_value: number;
  max_winners: number;
  current_claims: number;
  is_active: boolean;
  round_number: number;
  scheduled_at?: string | null;
}

interface ClaimRecord {
  id: string;
  campaign_id: string;
  round_number: number;
  telegram_id: string;
  username: string;
  first_name: string;
  claim_amount: number;
  claim_order: number;
  claimed_at: string;
}

export default function AdminRewards() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form edit states
  const [editForms, setEditForms] = useState<Record<string, {
    target_value: number;
    reward_value: number;
    max_winners: number;
    is_active: boolean;
    scheduled_at?: string | null;
  }>>({});

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-telegram-init-data': typeof WebApp !== 'undefined' ? WebApp.initData : '',
  }), []);

  const fetchAdminData = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/rewards/admin/all`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        setClaims(data.claims || []);

        const forms: Record<string, any> = {};
        for (const c of data.campaigns || []) {
          forms[c.id] = {
            target_value: Number(c.target_value || 0),
            reward_value: Number(c.reward_value || 0),
            max_winners: Number(c.max_winners || 0),
            is_active: Boolean(c.is_active),
            scheduled_at: c.scheduled_at || null,
          };
        }
        setEditForms(forms);
      }
    } catch (err: any) {
      showToast('error', 'Failed to load rewards settings');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleSave = async (id: string) => {
    const form = editForms[id];
    if (!form) return;

    setSavingId(id);
    try {
      const res = await fetch(`${API_URL}/rewards/admin/campaign/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('success', `${id} settings saved successfully!`);
        fetchAdminData();
      } else {
        showToast('error', data.error || 'Save failed');
      }
    } catch (err: any) {
      showToast('error', 'Network error');
    } finally {
      setSavingId(null);
    }
  };

  const handleResetRound = async (id: string) => {
    const confirmed = window.confirm(`Start a new round for ${id}? This will increment the round number and reset claimed winners to 0.`);
    if (!confirmed) return;

    setResettingId(id);
    try {
      const res = await fetch(`${API_URL}/rewards/admin/campaign/${id}/reset`, {
        method: 'POST',
        headers: getHeaders(),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || 'Round reset successfully!');
        fetchAdminData();
      } else {
        showToast('error', data.error || 'Reset failed');
      }
    } catch (err: any) {
      showToast('error', 'Network error');
    } finally {
      setResettingId(null);
    }
  };

  const filteredClaims = claims.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(s) ||
      c.username?.toLowerCase().includes(s) ||
      c.telegram_id?.includes(s) ||
      c.campaign_id?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 pb-12 select-none">

      {/* TOAST */}
      {toast && (
        <div className={`fixed top-4 left-4 right-4 z-50 p-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold text-white ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        } animate-slide-down`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white px-4 py-3.5 shadow-sm border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <Link to="/admin" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-all">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-black text-slate-800 leading-tight flex items-center gap-1.5">
              <Gift size={18} className="text-amber-500" />
              <span>Reward Settings</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold">Manage milestone campaigns & winners limits</p>
          </div>
        </div>
        <button
          onClick={() => { setLoading(true); fetchAdminData(); }}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 active:scale-95 transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-amber-500' : ''} />
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">

        {/* ── CAMPAIGNS CONFIGURATION CARDS ── */}
        <div className="space-y-4">
          {campaigns.map((camp) => {
            const form = editForms[camp.id] || {
              target_value: camp.target_value,
              reward_value: camp.reward_value,
              max_winners: camp.max_winners,
              is_active: camp.is_active,
              scheduled_at: camp.scheduled_at || null,
            };

            const isSaving = savingId === camp.id;
            const isResetting = resettingId === camp.id;

            return (
              <div key={camp.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      {camp.id === 'total_games' ? <Gamepad2 size={18} /> : camp.id === 'invitation_reward' ? <Users size={18} /> : <Zap size={18} />}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">{camp.title}</h3>
                      <p className="text-[10px] text-slate-400 font-semibold">Round #{camp.round_number} · ID: {camp.id}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    camp.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {camp.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                {/* Status Bar */}
                <div className="bg-slate-50 rounded-xl p-2.5 mb-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">
                    Claims in Round #{camp.round_number}:
                  </span>
                  <span className="font-black text-slate-800">
                    {camp.current_claims} / {camp.max_winners} Winners Claimed
                    {camp.current_claims >= camp.max_winners && ' 🔒 (Full)'}
                  </span>
                </div>

                {/* Form Inputs */}
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  {/* Target Value (if applicable) */}
                  {camp.id !== 'gursha' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        {camp.id === 'total_games' ? 'Target Games' : 'Target Referral ETB'}
                      </label>
                      <input
                        type="number"
                        value={form.target_value}
                        onChange={e => setEditForms({
                          ...editForms,
                          [camp.id]: { ...form, target_value: Number(e.target.value) }
                        })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-800 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  )}

                  {/* Reward Value */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      {camp.id === 'total_games' ? 'Reward % of Stake' : 'Reward Amount (ETB)'}
                    </label>
                    <input
                      type="number"
                      step={camp.id === 'total_games' ? '0.5' : '1'}
                      value={form.reward_value}
                      onChange={e => setEditForms({
                        ...editForms,
                        [camp.id]: { ...form, reward_value: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-800 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Max Winners */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Max Winners Limit
                    </label>
                    <input
                      type="number"
                      value={form.max_winners}
                      onChange={e => setEditForms({
                        ...editForms,
                        [camp.id]: { ...form, max_winners: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-800 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Active Toggle */}
                  <div className="flex flex-col justify-end">
                    <label className="text-[10px] font-bold uppercase text-slate-500 mb-1">Status</label>
                    <button
                      type="button"
                      onClick={() => setEditForms({
                        ...editForms,
                        [camp.id]: { ...form, is_active: !form.is_active }
                      })}
                      className={`py-2 px-3 rounded-xl font-black text-xs border transition-all ${
                        form.is_active 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}
                    >
                      {form.is_active ? '✅ Active' : '⏸️ Paused'}
                    </button>
                  </div>
                </div>

                {/* ── ⏰ SCHEDULED LAUNCH (0 - 24 HOURS TIME) ── */}
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-600" />
                      <span>Scheduled Launch (0-24 Hours Time)</span>
                    </span>
                    {form.scheduled_at && new Date(form.scheduled_at).getTime() > Date.now() ? (
                      <span className="text-[10px] font-black bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                        ⏳ Scheduled
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">⚡ Immediate / Live</span>
                    )}
                  </div>

                  {/* 24-Hour Schedule Inputs */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {/* Date */}
                      <div className="col-span-1">
                        <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Date</label>
                        <input
                          type="date"
                          value={form.scheduled_at ? new Date(new Date(form.scheduled_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : ''}
                          onChange={(e) => {
                            const dateStr = e.target.value;
                            if (!dateStr) {
                              setEditForms({
                                ...editForms,
                                [camp.id]: { ...form, scheduled_at: null }
                              });
                              return;
                            }
                            const curr = form.scheduled_at ? new Date(form.scheduled_at) : new Date();
                            const newDate = new Date(`${dateStr}T${curr.toTimeString().slice(0, 5)}:00`);
                            setEditForms({
                              ...editForms,
                              [camp.id]: { ...form, scheduled_at: newDate.toISOString() }
                            });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      {/* Hour (00 - 23) */}
                      <div>
                        <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Hour (0-23h)</label>
                        <select
                          value={form.scheduled_at ? new Date(form.scheduled_at).getHours() : 18}
                          onChange={(e) => {
                            const h = parseInt(e.target.value, 10);
                            const base = form.scheduled_at ? new Date(form.scheduled_at) : new Date();
                            base.setHours(h);
                            setEditForms({
                              ...editForms,
                              [camp.id]: { ...form, scheduled_at: base.toISOString() }
                            });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-amber-400"
                        >
                          {Array.from({ length: 24 }).map((_, i) => (
                            <option key={i} value={i}>
                              {i.toString().padStart(2, '0')}:00
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Minute (00 - 59) */}
                      <div>
                        <label className="block text-[9px] font-bold uppercase text-slate-500 mb-1">Minute</label>
                        <select
                          value={form.scheduled_at ? Math.floor(new Date(form.scheduled_at).getMinutes() / 5) * 5 : 0}
                          onChange={(e) => {
                            const m = parseInt(e.target.value, 10);
                            const base = form.scheduled_at ? new Date(form.scheduled_at) : new Date();
                            base.setMinutes(m);
                            base.setSeconds(0);
                            setEditForms({
                              ...editForms,
                              [camp.id]: { ...form, scheduled_at: base.toISOString() }
                            });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-amber-400"
                        >
                          {Array.from({ length: 12 }).map((_, i) => {
                            const m = i * 5;
                            return (
                              <option key={m} value={m}>
                                :{m.toString().padStart(2, '0')}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const future = new Date(Date.now() + 30 * 60 * 1000);
                          setEditForms({
                            ...editForms,
                            [camp.id]: { ...form, scheduled_at: future.toISOString() }
                          });
                        }}
                        className="flex-1 py-1 px-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[9.5px] rounded-lg border border-slate-200 active:scale-95 text-center"
                      >
                        +30 Mins
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const future = new Date(Date.now() + 60 * 60 * 1000);
                          setEditForms({
                            ...editForms,
                            [camp.id]: { ...form, scheduled_at: future.toISOString() }
                          });
                        }}
                        className="flex-1 py-1 px-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[9.5px] rounded-lg border border-slate-200 active:scale-95 text-center"
                      >
                        +1 Hour
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const future = new Date(Date.now() + 2 * 60 * 60 * 1000);
                          setEditForms({
                            ...editForms,
                            [camp.id]: { ...form, scheduled_at: future.toISOString() }
                          });
                        }}
                        className="flex-1 py-1 px-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[9.5px] rounded-lg border border-slate-200 active:scale-95 text-center"
                      >
                        +2 Hours
                      </button>
                      {form.scheduled_at && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditForms({
                              ...editForms,
                              [camp.id]: { ...form, scheduled_at: null }
                            });
                          }}
                          className="py-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[9.5px] rounded-lg border border-rose-200 active:scale-95"
                        >
                          Clear (Live)
                        </button>
                      )}
                    </div>

                    {/* Live Schedule Info Display */}
                    {form.scheduled_at && (
                      <div className="pt-1.5 border-t border-amber-200/50 text-[10px] text-slate-600 flex items-center justify-between">
                        <span>
                          Target: <strong className="text-slate-800">{new Date(form.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(form.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} (24h)</strong>
                        </span>
                        {new Date(form.scheduled_at).getTime() > Date.now() ? (
                          <span className="text-amber-700 font-black">
                            ⏳ Launches in {Math.max(1, Math.round((new Date(form.scheduled_at).getTime() - Date.now()) / 60000))}m
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-black">⚡ Time reached — Live Now</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleSave(camp.id)}
                    disabled={isSaving}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-xs disabled:opacity-50"
                  >
                    <Save size={14} />
                    <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                  </button>

                  <button
                    onClick={() => handleResetRound(camp.id)}
                    disabled={isResetting}
                    className="py-2 px-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 hover:bg-amber-100"
                    title="Start new round and reset claim count"
                  >
                    <RotateCcw size={14} />
                    <span>{isResetting ? 'Resetting...' : 'New Round'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── RECENT CLAIMS AUDIT TABLE ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Trophy size={15} className="text-amber-500" />
              <span>Claims Audit Ledger ({claims.length})</span>
            </h2>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, ID, or campaign..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-700 outline-none"
            />
          </div>

          {filteredClaims.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 font-medium">No claims found.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {filteredClaims.map((cl) => (
                <div key={cl.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-black text-slate-800 truncate">
                      {cl.first_name || 'Player'} <span className="text-[10px] text-slate-400 font-normal">(@{cl.username || 'unknown'})</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      ID: {cl.telegram_id} · <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">{cl.campaign_id} (R#{cl.round_number})</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-emerald-600 block">
                      +{Number(cl.claim_amount).toLocaleString()} ETB
                    </span>
                    <span className="text-[9px] text-slate-400 flex items-center gap-1 justify-end">
                      <Clock size={10} /> Spot #{cl.claim_order} · {new Date(cl.claimed_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
