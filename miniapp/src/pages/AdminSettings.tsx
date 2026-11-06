import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Settings, 
  Save, 
  Gift, 
  Users, 
  Headphones, 
  Megaphone, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Sparkles,
  RefreshCw,
  Percent,
  Coins,
  Share2,
  ExternalLink,
  MessageSquare,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from '../store/gameStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface SettingField {
  key: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  type: 'number' | 'text' | 'textarea';
  unit?: string;
  color: string;
  bg: string;
  btnGradient: string;
  defaultValue: string | number;
}

const BONUS_FIELDS: SettingField[] = [
  { 
    key: 'welcome_bonus_amount', 
    label: 'Welcome / Signup Bonus', 
    description: 'Bonus given upon first Telegram registration',
    icon: <Gift size={18} />, 
    type: 'number', 
    unit: 'ETB', 
    color: 'text-amber-500', 
    bg: 'bg-amber-500/10 border-amber-500/20', 
    btnGradient: 'from-amber-500 to-yellow-600',
    defaultValue: 0 
  },
  { 
    key: 'first_deposit_bonus_pct', 
    label: '1st Deposit Bonus', 
    description: 'Percentage added on user’s first approved deposit',
    icon: <Gift size={18} />, 
    type: 'number', 
    unit: '%', 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-500/10 border-emerald-500/20', 
    btnGradient: 'from-emerald-500 to-teal-600',
    defaultValue: 7 
  },
  { 
    key: 'second_deposit_bonus_pct', 
    label: '2nd Deposit Bonus', 
    description: 'Percentage added on user’s second approved deposit',
    icon: <Gift size={18} />, 
    type: 'number', 
    unit: '%', 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10 border-blue-500/20', 
    btnGradient: 'from-blue-600 to-indigo-600',
    defaultValue: 3 
  },
  { 
    key: 'invitation_reward_pct', 
    label: 'Invite Reward', 
    description: 'Percentage given to inviter on referee’s 1st deposit',
    icon: <Users size={18} />, 
    type: 'number', 
    unit: '%', 
    color: 'text-violet-500', 
    bg: 'bg-violet-500/10 border-violet-500/20', 
    btnGradient: 'from-violet-600 to-purple-600',
    defaultValue: 10 
  },
];

const COMMUNITY_FIELDS: SettingField[] = [
  { 
    key: 'support_username', 
    label: 'Support Team Username', 
    description: 'Telegram account players can reach for help',
    icon: <Headphones size={18} />, 
    type: 'text', 
    color: 'text-orange-500', 
    bg: 'bg-orange-500/10 border-orange-500/20', 
    btnGradient: 'from-orange-500 to-amber-600',
    defaultValue: 'ChoiceBingo_admin' 
  },
  { 
    key: 'channel_link', 
    label: 'Official Telegram Channel', 
    description: 'Public channel link displayed across the app',
    icon: <Megaphone size={18} />, 
    type: 'text', 
    color: 'text-indigo-500', 
    bg: 'bg-indigo-500/10 border-indigo-500/20', 
    btnGradient: 'from-indigo-600 to-blue-600',
    defaultValue: 'https://t.me/ChoiceBingo' 
  },
];

const ANNOUNCEMENT_FIELDS: SettingField[] = [
  { 
    key: 'announcement_message', 
    label: 'Announcement Popup Message', 
    description: 'Message shown to users when entering the app',
    icon: <MessageSquare size={18} />, 
    type: 'textarea', 
    color: 'text-fuchsia-500', 
    bg: 'bg-fuchsia-500/10 border-fuchsia-500/20', 
    btnGradient: 'from-fuchsia-600 to-pink-600',
    defaultValue: '' 
  },
  { 
    key: 'announcement_max_views', 
    label: 'Announcement Max Views', 
    description: 'Times announcement modal displays per user',
    icon: <Eye size={18} />, 
    type: 'number', 
    color: 'text-pink-500', 
    bg: 'bg-pink-500/10 border-pink-500/20', 
    btnGradient: 'from-pink-600 to-rose-600',
    defaultValue: 2 
  },
];

export default function AdminSettings() {
  const { user } = useGameStore();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-telegram-init-data': typeof WebApp !== 'undefined' ? WebApp.initData : '',
  });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/settings`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, string> = {};
        (data.settings || []).forEach((s: any) => { map[s.key] = s.value; });
        
        [...BONUS_FIELDS, ...COMMUNITY_FIELDS, ...ANNOUNCEMENT_FIELDS].forEach(f => {
          if (!(f.key in map)) map[f.key] = String(f.defaultValue);
        });

        if (!('weekend_bonus_enabled' in map)) map['weekend_bonus_enabled'] = 'false';
        if (!('weekend_bonus_days' in map))    map['weekend_bonus_days']    = '[0,6]';
        if (!('weekend_bonus_pct' in map))     map['weekend_bonus_pct']     = '10';

        setValues(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchSettings(); 
  }, []);

  if (!user || (user.role !== 'admin' && !(user.role === 'worker' && user.permissions?.settings))) {
    return <div className="p-10 text-center font-bold text-slate-600">Access Denied</div>;
  }

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ key, value: values[key] }),
      });
      if (res.ok) {
        showToast('success', 'Setting updated successfully!');
        if (typeof WebApp !== 'undefined') WebApp.HapticFeedback.notificationOccurred('success');
      } else {
        const d = await res.json().catch(() => ({}));
        showToast('error', d.error || `Error ${res.status}`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Network Error');
    } finally {
      setSaving(null);
    }
  };

  const renderFieldCard = (field: SettingField) => {
    const isSaving = saving === field.key;
    const currentVal = values[field.key] ?? String(field.defaultValue);

    return (
      <div 
        key={field.key} 
        className="bg-white rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col space-y-3 transition-all"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${field.bg} ${field.color}`}>
              {field.icon}
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-xs text-slate-800 leading-tight">{field.label}</h3>
              {field.description && (
                <p className="text-[10px] text-slate-400 font-medium leading-snug mt-0.5 truncate">{field.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Input + 3D Save Button */}
        <div className="flex items-center space-x-2 pt-0.5">
          <div className="flex-1 relative">
            {field.type === 'textarea' ? (
              <textarea
                value={currentVal}
                onChange={(e) => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                rows={3}
                placeholder="Enter announcement..."
                className="w-full bg-slate-50 border-2 border-slate-200/80 focus:border-slate-800 focus:bg-white outline-none rounded-xl px-3 py-2 font-bold text-slate-800 text-xs resize-none transition-all shadow-inner"
              />
            ) : (
              <input
                type={field.type}
                value={currentVal}
                onChange={(e) => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                className={`w-full bg-slate-50 border-2 border-slate-200/80 focus:border-slate-800 focus:bg-white outline-none rounded-xl px-3 py-2.5 font-black text-slate-800 transition-all shadow-inner ${
                  field.type === 'number' ? 'text-sm text-center' : 'text-xs'
                }`}
              />
            )}
            {field.unit && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs pointer-events-none">
                {field.unit}
              </span>
            )}
          </div>

          <button
            onClick={() => handleSave(field.key)}
            disabled={isSaving}
            className={`h-10 px-4 rounded-xl font-black text-xs text-white shadow-md active:translate-y-0.5 border-t border-white/25 flex items-center justify-center space-x-1.5 shrink-0 transition-all disabled:opacity-50 bg-gradient-to-r ${field.btnGradient}`}
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={13} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden select-none">
      {/* Toast Overlay */}
      {toast && (
        <div className={`fixed top-3 left-4 right-4 z-50 flex items-center justify-center space-x-2 px-3.5 py-3 rounded-2xl shadow-xl text-xs font-bold animate-slide-down ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* 3D Sleek Header */}
      <div className="bg-white px-4 py-3 shadow-sm border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <Link 
            to="/admin" 
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-all shadow-xs"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-black text-slate-800 leading-tight">Settings</h1>
            <p className="text-[10px] text-slate-400 font-semibold">Bonus & Platform Config</p>
          </div>
        </div>

        <button 
          onClick={fetchSettings}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-xs"
          title="Refresh Settings"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-amber-500' : ''} />
        </button>
      </div>

      {/* Main Settings Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2.5">
            <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-400">Loading platform settings...</p>
          </div>
        ) : (
          <>
            {/* 🌟 1. 3D LUXURY WEEKEND DEPOSIT REWARD CARD 🌟 */}
            <div className="relative bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/70 border-2 border-purple-200/80 rounded-[28px] p-4 shadow-[0_10px_25px_rgba(147,51,234,0.08)] space-y-3.5 backdrop-blur-sm overflow-hidden">
              
              {/* Top ambient glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/10 rounded-full blur-2xl pointer-events-none" />

              {/* Title & 3D Toggle */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-purple-500/25 border-t border-purple-300/40">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-800 text-sm flex items-center gap-1.5 leading-tight">
                      Weekend Deposit Reward
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                        Bonus
                      </span>
                    </h2>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Independent bonus credited to player's bonus balance</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const current = values['weekend_bonus_enabled'] === 'true';
                    const nextVal = current ? 'false' : 'true';
                    setValues(prev => ({ ...prev, weekend_bonus_enabled: nextVal }));
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 border ${
                    values['weekend_bonus_enabled'] === 'true'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400/50 shadow-emerald-500/20'
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${values['weekend_bonus_enabled'] === 'true' ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                  {values['weekend_bonus_enabled'] === 'true' ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* Bonus Percentage & Applies To in 3D insets */}
              <div className="grid grid-cols-2 gap-2.5 pt-0.5 relative z-10">
                <div className="bg-white/95 rounded-2xl p-3 border border-purple-100 shadow-xs">
                  <label className="block text-[10px] font-black text-slate-500 tracking-wider mb-1.5 uppercase">Reward Percent</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={values['weekend_bonus_pct'] ?? '10'}
                      onChange={(e) => setValues(prev => ({ ...prev, weekend_bonus_pct: e.target.value }))}
                      className="w-full bg-purple-50/50 border border-purple-200 focus:border-purple-600 outline-none rounded-xl px-2.5 py-2 font-black text-purple-900 text-base text-center shadow-inner transition-all"
                      placeholder="10"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 font-black text-xs">%</span>
                  </div>
                </div>

                <div className="bg-white/95 rounded-2xl p-3 border border-purple-100 shadow-xs flex flex-col justify-between">
                  <label className="block text-[10px] font-black text-slate-500 tracking-wider mb-1 uppercase">Applies To</label>
                  <div className="text-xs font-black text-purple-700 leading-snug py-1">
                    {(() => {
                      try {
                        const days: number[] = JSON.parse(values['weekend_bonus_days'] || '[0,6]');
                        if (days.length === 0) return 'No days selected';
                        if (days.includes(0) && days.includes(6) && days.length === 2) return 'Sunday & Saturday';
                        const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        return days.map(d => names[d] || d).join(', ');
                      } catch {
                        return 'Sunday & Saturday';
                      }
                    })()}
                  </div>
                  <span className="text-[9px] text-slate-400 font-semibold">1st daily deposit</span>
                </div>
              </div>

              {/* Active Days Selector */}
              <div className="bg-white/95 rounded-2xl p-3.5 border border-purple-100 shadow-xs space-y-2.5 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-600 tracking-wider flex items-center gap-1.5 uppercase">
                    <Calendar size={13} className="text-purple-600" />
                    Select Reward Days
                  </span>
                  
                  {/* Preset Pills */}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setValues(prev => ({ ...prev, weekend_bonus_days: '[0,6]' }))}
                      className="text-[10px] font-black text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-lg active:scale-95 transition-all"
                    >
                      Sat & Sun
                    </button>
                    <button
                      type="button"
                      onClick={() => setValues(prev => ({ ...prev, weekend_bonus_days: '[0]' }))}
                      className="text-[10px] font-black text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-lg active:scale-95 transition-all"
                    >
                      Sun
                    </button>
                    <button
                      type="button"
                      onClick={() => setValues(prev => ({ ...prev, weekend_bonus_days: '[6]' }))}
                      className="text-[10px] font-black text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-lg active:scale-95 transition-all"
                    >
                      Sat
                    </button>
                  </div>
                </div>

                {/* 7-Day 3D Selector */}
                <div className="grid grid-cols-7 gap-1.5">
                  {[
                    { day: 0, label: 'Sun' },
                    { day: 1, label: 'Mon' },
                    { day: 2, label: 'Tue' },
                    { day: 3, label: 'Wed' },
                    { day: 4, label: 'Thu' },
                    { day: 5, label: 'Fri' },
                    { day: 6, label: 'Sat' },
                  ].map(({ day, label }) => {
                    let activeDays: number[] = [0, 6];
                    try {
                      activeDays = JSON.parse(values['weekend_bonus_days'] || '[0,6]');
                    } catch {}
                    const isSelected = activeDays.includes(day);

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          let nextDays: number[];
                          if (isSelected) {
                            nextDays = activeDays.filter(d => d !== day);
                          } else {
                            nextDays = [...activeDays, day].sort();
                          }
                          setValues(prev => ({ ...prev, weekend_bonus_days: JSON.stringify(nextDays) }));
                        }}
                        className={`py-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center active:scale-90 ${
                          isSelected
                            ? 'bg-gradient-to-b from-purple-600 to-indigo-700 text-white shadow-md shadow-purple-500/25 border-t border-purple-300'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-transparent'
                        }`}
                      >
                        <span className="leading-tight">{label}</span>
                        <span className="text-[9px] opacity-75">{day}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3D Save Button for Weekend Bonus */}
              <button
                type="button"
                onClick={async () => {
                  setSaving('weekend_bonus');
                  try {
                    const updates = [
                      { key: 'weekend_bonus_enabled', value: values['weekend_bonus_enabled'] ?? 'false' },
                      { key: 'weekend_bonus_days',    value: values['weekend_bonus_days']    ?? '[0,6]' },
                      { key: 'weekend_bonus_pct',     value: values['weekend_bonus_pct']     ?? '10' },
                    ];
                    for (const u of updates) {
                      await fetch(`${API_URL}/admin/settings`, {
                        method: 'PUT',
                        headers: getHeaders(),
                        body: JSON.stringify(u),
                      });
                    }
                    showToast('success', 'Weekend Bonus Settings Saved!');
                    if (typeof WebApp !== 'undefined') WebApp.HapticFeedback.notificationOccurred('success');
                  } catch (err: any) {
                    showToast('error', err.message || 'Failed to save');
                  } finally {
                    setSaving(null);
                  }
                }}
                disabled={saving === 'weekend_bonus'}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:translate-y-0.5 text-white font-black text-xs rounded-2xl shadow-[0_6px_20px_rgba(147,51,234,0.3)] border-t border-purple-300/40 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {saving === 'weekend_bonus' ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={15} />
                    <span>Save Weekend Reward Settings</span>
                  </>
                )}
              </button>
            </div>

            {/* 🌟 2. DEPOSIT & SIGNUP BONUSES (Welcome 0 ETB, 1st 7%, 2nd 3%) 🌟 */}
            <div className="space-y-2 pt-1">
              <div className="px-1 flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins size={14} className="text-emerald-500" />
                  Deposit & Signup Bonuses
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Active Rules</span>
              </div>
              <div className="space-y-2.5">
                {BONUS_FIELDS.map(f => renderFieldCard(f))}
              </div>
            </div>

            {/* 🌟 3. SUPPORT & COMMUNITY LINKS 🌟 */}
            <div className="space-y-2 pt-2">
              <div className="px-1 flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 size={14} className="text-indigo-500" />
                  Support & Channel Links
                </span>
              </div>
              <div className="space-y-2.5">
                {COMMUNITY_FIELDS.map(f => renderFieldCard(f))}
              </div>
            </div>

            {/* 🌟 4. ANNOUNCEMENTS 🌟 */}
            <div className="space-y-2 pt-2 pb-6">
              <div className="px-1 flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Megaphone size={14} className="text-pink-500" />
                  In-App Announcements
                </span>
              </div>
              <div className="space-y-2.5">
                {ANNOUNCEMENT_FIELDS.map(f => renderFieldCard(f))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
