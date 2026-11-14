import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bot, Clock, Save, Sparkles, Plus,
  Search, Edit2, CheckCircle2, AlertCircle, RefreshCw, Trophy,
  Users, Sliders, Check, Layers, RotateCcw
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface SystemPlayer {
  id?: number;
  telegram_id: string;
  first_name: string;
  total_wins: number;
  is_active: boolean;
}

interface StakePlayerRange {
  min: number;
  max: number;
}

interface SystemPlayersConfig {
  enabled: boolean;
  schedule_enabled: boolean;
  time_start: string;
  time_end: string;
  target_stakes: number[];
  min_players_per_game: number;
  max_players_per_game: number;
  min_cartelas_per_player: number;
  max_cartelas_per_player: number;
  stake_player_ranges: Record<string, StakePlayerRange>;
}

const DEFAULT_STAKE_RANGES: Record<string, StakePlayerRange> = {
  "10":  { min: 10, max: 31 },
  "20":  { min: 9,  max: 15 },
  "50":  { min: 5,  max: 11 },
  "100": { min: 3,  max: 6  },
};

export default function AdminSystemPlayers() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'settings' | 'roster'>('settings');

  // Config State
  const [config, setConfig] = useState<SystemPlayersConfig>({
    enabled: false,
    schedule_enabled: false,
    time_start: '01:00',
    time_end: '24:00',
    target_stakes: [10, 20, 50, 100],
    min_players_per_game: 10,
    max_players_per_game: 31,
    min_cartelas_per_player: 1,
    max_cartelas_per_player: 4,
    stake_player_ranges: DEFAULT_STAKE_RANGES,
  });

  const [savingConfig, setSavingConfig] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Roster State
  const [players, setPlayers] = useState<SystemPlayer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Modals
  const [editingPlayer, setEditingPlayer] = useState<SystemPlayer | null>(null);
  const [editName, setEditName] = useState('');
  const [editWins, setEditWins] = useState(0);
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWins, setNewWins] = useState(0);
  const [addingPlayer, setAddingPlayer] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getHeaders = () => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    return {
      'Content-Type': 'application/json',
      'x-telegram-init-data': initData,
    };
  };

  // Fetch Config
  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/system-players/config`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig({
            ...data.config,
            stake_player_ranges: data.config.stake_player_ranges || DEFAULT_STAKE_RANGES,
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch config:', e);
    }
  };

  // Save Config
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch(`${API_URL}/admin/system-players/config`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Settings saved successfully!');
      } else {
        showToast(data.error || 'Failed to save settings', 'error');
      }
    } catch {
      showToast('Error saving settings', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Fetch Players Roster
  const fetchPlayers = async (pageNum = page, query = searchQuery) => {
    setLoadingPlayers(true);
    try {
      const q = encodeURIComponent(query);
      const res = await fetch(
        `${API_URL}/admin/system-players/players?page=${pageNum}&limit=25&q=${q}`,
        { headers: getHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players || []);
        setTotalCount(data.total || 0);
        setActiveCount(data.activeCount || 0);
        setTotalWins(data.totalWins || 0);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || 1);
      }
    } catch (e) {
      console.error('Failed to load players:', e);
    } finally {
      setLoadingPlayers(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchPlayers(1, '');
  }, []);

  // Handle Seed 1000 Players
  const handleSeed1000 = async () => {
    if (!window.confirm('Seed or update 1,000 authentic Ethiopian regional system players (Amhara, Oromo, Tigray, Southern, Muslim)?')) return;
    setSeeding(true);
    try {
      const res = await fetch(`${API_URL}/admin/system-players/seed`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ count: 1000 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Successfully seeded 1,000 Ethiopian players!');
        fetchPlayers(1, searchQuery);
      } else {
        showToast(data.error || 'Failed to seed players', 'error');
      }
    } catch {
      showToast('Error seeding system players', 'error');
    } finally {
      setSeeding(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (p: SystemPlayer) => {
    setEditingPlayer(p);
    setEditName(p.first_name);
    setEditWins(p.total_wins);
    setEditActive(p.is_active);
  };

  // Save Player Edit
  const handleSavePlayerEdit = async () => {
    if (!editingPlayer) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${API_URL}/admin/system-players/players/${editingPlayer.telegram_id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          first_name: editName,
          total_wins: editWins,
          is_active: editActive,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Player updated!');
        setEditingPlayer(null);
        fetchPlayers(page, searchQuery);
      } else {
        showToast(data.error || 'Failed to update player', 'error');
      }
    } catch {
      showToast('Error updating player', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Add New Player
  const handleAddPlayer = async () => {
    if (!newName.trim()) {
      showToast('Please enter a name', 'error');
      return;
    }
    setAddingPlayer(true);
    try {
      const res = await fetch(`${API_URL}/admin/system-players/players`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          first_name: newName.trim(),
          total_wins: Number(newWins) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Player added with ID #${data.player.telegram_id}!`);
        setIsAddModalOpen(false);
        setNewName('');
        setNewWins(0);
        fetchPlayers(1, '');
      } else {
        showToast(data.error || 'Failed to add player', 'error');
      }
    } catch {
      showToast('Error adding player', 'error');
    } finally {
      setAddingPlayer(false);
    }
  };

  // Toggle Stake Helper
  const toggleStake = (stake: number) => {
    const current = config.target_stakes || [];
    if (current.includes(stake)) {
      if (current.length === 1) return; // keep at least 1
      setConfig({ ...config, target_stakes: current.filter(s => s !== stake) });
    } else {
      setConfig({ ...config, target_stakes: [...current, stake].sort((a, b) => a - b) });
    }
  };

  // Update Stake-Specific Player Range
  const updateStakeRange = (stake: string, field: 'min' | 'max', value: number) => {
    const currentRanges = config.stake_player_ranges || DEFAULT_STAKE_RANGES;
    const currentStake = currentRanges[stake] || { min: 10, max: 50 };
    const updated = {
      ...currentRanges,
      [stake]: {
        ...currentStake,
        [field]: Math.max(1, value),
      },
    };
    setConfig({ ...config, stake_player_ranges: updated });
  };

  // Toggle Master Engine Switch (instantly saves to server so it never reverts on back)
  const handleToggleEnabled = async () => {
    const nextState = !config.enabled;
    setConfig(prev => ({ ...prev, enabled: nextState }));
    try {
      const res = await fetch(`${API_URL}/admin/system-players/config`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ...config, enabled: nextState }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(nextState ? 'System players engine turned ON!' : 'System players engine turned OFF!');
      } else {
        setConfig(prev => ({ ...prev, enabled: !nextState }));
        showToast('Failed to toggle engine state', 'error');
      }
    } catch {
      setConfig(prev => ({ ...prev, enabled: !nextState }));
      showToast('Error toggling engine state', 'error');
    }
  };

  // Toggle Schedule Switch (instantly saves)
  const handleToggleSchedule = async () => {
    const nextState = !config.schedule_enabled;
    setConfig(prev => ({ ...prev, schedule_enabled: nextState }));
    try {
      await fetch(`${API_URL}/admin/system-players/config`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ...config, schedule_enabled: nextState }),
      });
      showToast(nextState ? 'Schedule mode enabled (custom hours)' : 'Schedule mode disabled (24/7 all day)');
    } catch {}
  };

  const resetStakeRangesToDefault = () => {
    setConfig({ ...config, stake_player_ranges: { ...DEFAULT_STAKE_RANGES } });
    showToast('Reset stake ranges to default: 10 ETB (10-31), 20 ETB (9-15), 50 ETB (5-11), 100 ETB (3-6)');
  };


  // Hours for 1-24 Hour Selectors
  const hours24 = Array.from({ length: 24 }, (_, i) => {
    const hour = i + 1;
    const pad = hour < 10 ? `0${hour}` : `${hour}`;
    return `${pad}:00`;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-top-4 ${
          toastMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header - Clean White */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/admin')}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Bot className="text-violet-600" size={20} />
              <span>System Players</span>
            </h1>
            <p className="text-[11px] text-slate-500">Virtual Ethiopian players & schedule engine</p>
          </div>
        </div>

        {/* Global Active Badge */}
        <div className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center space-x-1.5 shadow-sm ${
          config.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          <span>{config.enabled ? 'ACTIVE' : 'OFF'}</span>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex flex-col items-center text-center shadow-sm">
            <Users size={18} className="text-violet-600 mb-1" />
            <span className="text-xl font-black text-slate-900">{totalCount}</span>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Players</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex flex-col items-center text-center shadow-sm">
            <CheckCircle2 size={18} className="text-emerald-600 mb-1" />
            <span className="text-xl font-black text-slate-900">{activeCount}</span>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active</span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex flex-col items-center text-center shadow-sm">
            <Trophy size={18} className="text-amber-500 mb-1" />
            <span className="text-xl font-black text-amber-600">{totalWins}</span>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Wins</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-200/70 p-1 rounded-xl flex border border-slate-300/60 shadow-inner">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'settings'
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders size={15} />
            <span>Schedule & Stakes</span>
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'roster'
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={15} />
            <span>Players Roster ({totalCount})</span>
          </button>
        </div>

        {/* TAB 1: SETTINGS & SCHEDULE */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Master Engine Switch */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Bot size={16} className="text-violet-600" />
                    System Players Engine
                  </h3>
                  <p className="text-xs text-slate-500">
                    Auto-populate waiting bingo games with authentic virtual Ethiopian players
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleEnabled}
                  className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors focus:outline-none ${
                    config.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                      config.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 1 - 24 Hour Schedule Setup */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" />
                    1–24 Hour Schedule Setup
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set active hours from 1:00 up to 24:00 (Ethiopian EAT / UTC+3)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSchedule}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    config.schedule_enabled ? 'bg-amber-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                      config.schedule_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {config.schedule_enabled ? (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  {/* Quick Preset Buttons */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Quick Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, time_start: '01:00', time_end: '24:00' })}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 rounded-lg"
                      >
                        24 Hours (All Day 01:00–24:00)
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, time_start: '06:00', time_end: '18:00' })}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg"
                      >
                        Daytime (06:00–18:00)
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, time_start: '18:00', time_end: '24:00' })}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg"
                      >
                        Evening (18:00–24:00)
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, time_start: '03:00', time_end: '05:00' })}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg"
                      >
                        Interval (03:00–05:00)
                      </button>
                    </div>
                  </div>

                  {/* 1 - 24 Hour Selectors */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Start Hour (1–24)
                      </label>
                      <select
                        value={config.time_start}
                        onChange={(e) => setConfig({ ...config, time_start: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-bold focus:outline-none focus:border-violet-500 focus:bg-white"
                      >
                        {hours24.map((h, i) => (
                          <option key={h} value={h}>
                            Hour {i + 1} ({h})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        End Hour (1–24)
                      </label>
                      <select
                        value={config.time_end}
                        onChange={(e) => setConfig({ ...config, time_end: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-bold focus:outline-none focus:border-violet-500 focus:bg-white"
                      >
                        {hours24.map((h, i) => (
                          <option key={h} value={h}>
                            Hour {i + 1} ({h})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                    ⏰ Virtual players will only join games between <b>{config.time_start}</b> and <b>{config.time_end}</b> (Ethiopian Standard Time UTC+3). Outside this window, bots pause.
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-600 bg-slate-100 rounded-xl p-2.5 border border-slate-200">
                  ✨ <b>24/7 Full-Day Active</b>: Schedule is off, system players operate across all 24 hours whenever the engine switch is enabled.
                </div>
              )}
            </div>

            {/* Stake-Specific Player Ranges (10, 20, 50, 100 ETB) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Layers size={16} className="text-violet-600" />
                    Players Per Stake (Auto Range)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Custom player count range automatically applied per stake:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetStakeRangesToDefault}
                  className="px-2 py-1 text-[10px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg flex items-center gap-1"
                  title="Reset to default ranges"
                >
                  <RotateCcw size={11} />
                  <span>Defaults</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* 10 ETB: 10-31 players */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xs text-violet-700 bg-violet-100 px-2 py-0.5 rounded-md">
                      10 ETB Stake
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      Default: 10–31
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Min Bots</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={config.stake_player_ranges?.['10']?.min ?? 10}
                        onChange={(e) => updateStakeRange('10', 'min', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 text-center focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Max Bots</label>
                      <input
                        type="number"
                        min={config.stake_player_ranges?.['10']?.min ?? 10}
                        max={100}
                        value={config.stake_player_ranges?.['10']?.max ?? 31}
                        onChange={(e) => updateStakeRange('10', 'max', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 text-center focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 20 ETB: 9-15 players */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                      20 ETB Stake
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      Default: 9–15
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Min Bots</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={config.stake_player_ranges?.['20']?.min ?? 9}
                        onChange={(e) => updateStakeRange('20', 'min', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Max Bots</label>
                      <input
                        type="number"
                        min={config.stake_player_ranges?.['20']?.min ?? 9}
                        max={100}
                        value={config.stake_player_ranges?.['20']?.max ?? 15}
                        onChange={(e) => updateStakeRange('20', 'max', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 50 ETB: 5-11 players */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                      50 ETB Stake
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      Default: 5–11
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Min Bots</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={config.stake_player_ranges?.['50']?.min ?? 5}
                        onChange={(e) => updateStakeRange('50', 'min', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 text-center focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Max Bots</label>
                      <input
                        type="number"
                        min={config.stake_player_ranges?.['50']?.min ?? 5}
                        max={100}
                        value={config.stake_player_ranges?.['50']?.max ?? 11}
                        onChange={(e) => updateStakeRange('50', 'max', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 text-center focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 100 ETB: 3-6 players */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      100 ETB Stake
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      Default: 3–6
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Min Bots</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={config.stake_player_ranges?.['100']?.min ?? 3}
                        onChange={(e) => updateStakeRange('100', 'min', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Max Bots</label>
                      <input
                        type="number"
                        min={config.stake_player_ranges?.['100']?.min ?? 3}
                        max={100}
                        value={config.stake_player_ranges?.['100']?.max ?? 6}
                        onChange={(e) => updateStakeRange('100', 'max', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Stakes Selection */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                Enabled Stakes
              </h3>
              <p className="text-xs text-slate-500">
                Choose which stake games bots will participate in:
              </p>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[10, 20, 50, 100].map((stake) => {
                  const selected = config.target_stakes.includes(stake);
                  return (
                    <button
                      key={stake}
                      type="button"
                      onClick={() => toggleStake(stake)}
                      className={`py-2.5 rounded-xl text-xs font-black flex items-center justify-center space-x-1 transition-all ${
                        selected
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20 border border-violet-600'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {selected && <Check size={13} strokeWidth={3} />}
                      <span>{stake} ETB</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cartelas Range Per Bot */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 font-bold">Cartelas per player (range):</span>
                <span className="font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">
                  {config.min_cartelas_per_player} – {config.max_cartelas_per_player} cartelas
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Min Cartelas</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={config.min_cartelas_per_player}
                    onChange={(e) => setConfig({ ...config, min_cartelas_per_player: Math.max(1, Math.min(4, Number(e.target.value))) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Max Cartelas</label>
                  <input
                    type="number"
                    min={config.min_cartelas_per_player}
                    max={4}
                    value={config.max_cartelas_per_player}
                    onChange={(e) => setConfig({ ...config, max_cartelas_per_player: Math.max(config.min_cartelas_per_player, Math.min(4, Number(e.target.value))) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-500 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-violet-600/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
            >
              {savingConfig ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save System Player Settings</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 2: PLAYERS ROSTER */}
        {activeTab === 'roster' && (
          <div className="space-y-3">
            {/* Action Bar */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSeed1000}
                disabled={seeding}
                className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20"
              >
                {seeding ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Seeding Names...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Seed 1,000 Ethiopian Names</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="py-2.5 px-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-violet-600/20"
              >
                <Plus size={15} />
                <span>Add Player</span>
              </button>
            </div>

            {/* Regional diversity notice */}
            <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm">
              🇪🇹 <b>Regional Ethiopian Pool</b>: Includes authentic names from <b>Amhara, Oromia, Tigray, Southern (Gurage, Sidama, Wolayta)</b>, and <b>Muslim/Harari/Somali</b> regions.
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Ethiopian name or 8-digit ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchPlayers(1, e.target.value);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-500 shadow-sm"
              />
            </div>

            {/* Players List Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <span>Player & Telegram ID</span>
                <span>Wins / Status</span>
              </div>

              {loadingPlayers ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
                  <RefreshCw size={24} className="animate-spin text-violet-600" />
                  <span className="text-xs">Loading players...</span>
                </div>
              ) : players.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-3">
                  <Bot size={32} className="mx-auto text-slate-400" />
                  <p className="text-xs">No system players found.</p>
                  <button
                    onClick={handleSeed1000}
                    className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold"
                  >
                    Click to Seed 1,000 Ethiopian Players
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {players.map((p) => (
                    <div
                      key={p.telegram_id}
                      className="px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700 font-extrabold text-xs">
                          {p.first_name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <span>{p.first_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">
                              #{p.telegram_id}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            ID: {p.telegram_id}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2.5">
                        <div className="text-right">
                          <div className="text-xs font-black text-amber-600 flex items-center justify-end gap-1">
                            <Trophy size={11} />
                            <span>{p.total_wins} wins</span>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              p.is_active
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {p.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                          title="Edit Name & Wins"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Page <b>{page}</b> of <b>{totalPages}</b>
                  </span>
                  <div className="flex space-x-1.5">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => fetchPlayers(page - 1, searchQuery)}
                      className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => fetchPlayers(page + 1, searchQuery)}
                      className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* EDIT PLAYER MODAL */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Edit2 size={16} className="text-violet-600" />
              <span>Edit System Player #{editingPlayer.telegram_id}</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-500 font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Total Wins
                </label>
                <input
                  type="number"
                  min={0}
                  value={editWins}
                  onChange={(e) => setEditWins(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-500 font-bold"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-700 font-semibold">Active in Games</span>
                <button
                  type="button"
                  onClick={() => setEditActive(!editActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    editActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                      editActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePlayerEdit}
                disabled={savingEdit}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-bold text-white flex items-center justify-center space-x-1.5"
              >
                {savingEdit ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW PLAYER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Plus size={16} className="text-violet-600" />
              <span>Add Custom System Player</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Ethiopian Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chala Tolesa, Dawit Kebede..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-500 font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Initial Wins (Optional)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newWins}
                  onChange={(e) => setNewWins(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-violet-500 font-bold"
                />
              </div>

              <div className="text-[11px] text-slate-600 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                💡 The system will automatically allocate the next unique 8-digit ID (starting from 10000000+).
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddPlayer}
                disabled={addingPlayer}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-xs font-bold text-white flex items-center justify-center space-x-1.5"
              >
                {addingPlayer ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>Add Player</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
