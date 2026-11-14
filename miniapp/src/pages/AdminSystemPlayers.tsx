import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bot, Clock, Play, Pause, Save, Sparkles, Plus,
  Search, Edit2, CheckCircle2, AlertCircle, RefreshCw, Trophy,
  Users, Sliders, Check
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
}

export default function AdminSystemPlayers() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'settings' | 'roster'>('settings');

  // Config State
  const [config, setConfig] = useState<SystemPlayersConfig>({
    enabled: false,
    schedule_enabled: false,
    time_start: '03:00',
    time_end: '05:00',
    target_stakes: [10, 20, 50, 100],
    min_players_per_game: 50,
    max_players_per_game: 100,
    min_cartelas_per_player: 1,
    max_cartelas_per_player: 4,
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
        if (data.config) setConfig(data.config);
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
    if (!window.confirm('Seed or top up to 1,000 authentic Ethiopian system players with IDs 10000000+?')) return;
    setSeeding(true);
    try {
      const res = await fetch(`${API_URL}/admin/system-players/seed`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ count: 1000 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Successfully seeded system players!');
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-top-4 ${
          toastMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-slate-800/90 border-b border-slate-700/80 sticky top-0 z-40 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/admin')}
            className="w-9 h-9 rounded-xl bg-slate-700/60 hover:bg-slate-700 flex items-center justify-center text-slate-200 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-extrabold text-base flex items-center gap-2">
              <Bot className="text-violet-400" size={20} />
              <span>System Players</span>
            </h1>
            <p className="text-[11px] text-slate-400">Virtual Ethiopian players & schedule engine</p>
          </div>
        </div>

        {/* Global Active Badge */}
        <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center space-x-1.5 ${
          config.enabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span>{config.enabled ? 'ACTIVE' : 'OFF'}</span>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 flex flex-col items-center text-center">
            <Users size={18} className="text-violet-400 mb-1" />
            <span className="text-lg font-black text-white">{totalCount}</span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Players</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 flex flex-col items-center text-center">
            <CheckCircle2 size={18} className="text-emerald-400 mb-1" />
            <span className="text-lg font-black text-white">{activeCount}</span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 flex flex-col items-center text-center">
            <Trophy size={18} className="text-amber-400 mb-1" />
            <span className="text-lg font-black text-amber-300">{totalWins}</span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Wins</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-800/80 p-1 rounded-xl flex border border-slate-700/60">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'settings'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders size={15} />
            <span>Schedule & Rules</span>
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'roster'
                ? 'bg-violet-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
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
            <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Bot size={16} className="text-violet-400" />
                    System Players Engine
                  </h3>
                  <p className="text-xs text-slate-400">
                    Auto-populate waiting bingo games with virtual players
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                  className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors focus:outline-none ${
                    config.enabled ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      config.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Time Schedule Interval */}
            <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Clock size={16} className="text-amber-400" />
                    Operating Schedule
                  </h3>
                  <p className="text-xs text-slate-400">
                    Restrict bot joining to specific hours (e.g. 03:00 to 05:00)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, schedule_enabled: !config.schedule_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    config.schedule_enabled ? 'bg-amber-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.schedule_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {config.schedule_enabled ? (
                <div className="pt-2 border-t border-slate-700/50 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Start Time (Ethiopian EAT)
                      </label>
                      <input
                        type="time"
                        value={config.time_start}
                        onChange={(e) => setConfig({ ...config, time_start: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        End Time (Ethiopian EAT)
                      </label>
                      <input
                        type="time"
                        value={config.time_end}
                        onChange={(e) => setConfig({ ...config, time_end: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
                    ⏰ System players will only join games between <b>{config.time_start}</b> and <b>{config.time_end}</b> (UTC+3 Ethiopian Time). Outside this window, bot joining is paused.
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 bg-slate-900/60 rounded-xl p-2.5">
                  ✨ <b>24/7 Always Active</b>: Schedule is off, bots join any time the engine switch is enabled.
                </div>
              )}
            </div>

            {/* Target Stakes Selection */}
            <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Trophy size={16} className="text-yellow-400" />
                Active Stakes
              </h3>
              <p className="text-xs text-slate-400">
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
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 border border-violet-400'
                          : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {selected && <Check size={13} strokeWidth={3} />}
                      <span>{stake} ETB</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Players & Cartelas Ranges */}
            <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Sliders size={16} className="text-cyan-400" />
                Player & Cartela Ranges
              </h3>

              {/* Bot Players Per Game */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Players per game (range):</span>
                  <span className="font-bold text-violet-300">
                    {config.min_players_per_game} – {config.max_players_per_game} players
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Min Players</label>
                    <input
                      type="number"
                      min={2}
                      max={90}
                      value={config.min_players_per_game}
                      onChange={(e) => setConfig({ ...config, min_players_per_game: Math.max(1, Number(e.target.value)) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Max Players</label>
                    <input
                      type="number"
                      min={config.min_players_per_game}
                      max={100}
                      value={config.max_players_per_game}
                      onChange={(e) => setConfig({ ...config, max_players_per_game: Math.max(config.min_players_per_game, Number(e.target.value)) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Cartelas Per Player */}
              <div className="space-y-1.5 pt-2 border-t border-slate-700/50">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Cartelas per player (range):</span>
                  <span className="font-bold text-cyan-300">
                    {config.min_cartelas_per_player} – {config.max_cartelas_per_player} cartelas
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Min Cartelas</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={config.min_cartelas_per_player}
                      onChange={(e) => setConfig({ ...config, min_cartelas_per_player: Math.max(1, Math.min(4, Number(e.target.value))) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Max Cartelas</label>
                    <input
                      type="number"
                      min={config.min_cartelas_per_player}
                      max={4}
                      value={config.max_cartelas_per_player}
                      onChange={(e) => setConfig({ ...config, max_cartelas_per_player: Math.max(config.min_cartelas_per_player, Math.min(4, Number(e.target.value))) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-violet-600/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
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
                className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20"
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
                className="py-2.5 px-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-violet-600/20"
              >
                <Plus size={15} />
                <span>Add Player</span>
              </button>
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
                className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Players List Table */}
            <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-3.5 py-2.5 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Player & Telegram ID</span>
                <span>Wins / Status</span>
              </div>

              {loadingPlayers ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
                  <RefreshCw size={24} className="animate-spin text-violet-400" />
                  <span className="text-xs">Loading players...</span>
                </div>
              ) : players.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <Bot size={32} className="mx-auto text-slate-500" />
                  <p className="text-xs">No system players found.</p>
                  <button
                    onClick={handleSeed1000}
                    className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold"
                  >
                    Click to Seed 1,000 Players
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {players.map((p) => (
                    <div
                      key={p.telegram_id}
                      className="px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-750 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-extrabold text-xs">
                          {p.first_name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white flex items-center gap-1.5">
                            <span>{p.first_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">
                              #{p.telegram_id}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Telegram ID: {p.telegram_id}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2.5">
                        <div className="text-right">
                          <div className="text-xs font-black text-amber-300 flex items-center justify-end gap-1">
                            <Trophy size={11} />
                            <span>{p.total_wins} wins</span>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              p.is_active
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {p.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-colors"
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
                <div className="p-3 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between text-xs text-slate-300">
                  <span>
                    Page <b>{page}</b> of <b>{totalPages}</b>
                  </span>
                  <div className="flex space-x-1.5">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => fetchPlayers(page - 1, searchQuery)}
                      className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 font-bold"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => fetchPlayers(page + 1, searchQuery)}
                      className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 font-bold"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Edit2 size={16} className="text-violet-400" />
              <span>Edit System Player #{editingPlayer.telegram_id}</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Total Wins
                </label>
                <input
                  type="number"
                  min={0}
                  value={editWins}
                  onChange={(e) => setEditWins(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-bold"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-300 font-semibold">Active in Games</span>
                <button
                  type="button"
                  onClick={() => setEditActive(!editActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    editActive ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
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
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePlayerEdit}
                disabled={savingEdit}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white flex items-center justify-center space-x-1.5"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Plus size={16} className="text-violet-400" />
              <span>Add Custom System Player</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Ethiopian Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dawit Tadesse"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Initial Wins (Optional)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newWins}
                  onChange={(e) => setNewWins(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-bold"
                />
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl">
                💡 The system will automatically generate the next unique 8-digit Telegram ID (e.g. 10000XXX).
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddPlayer}
                disabled={addingPlayer}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white flex items-center justify-center space-x-1.5"
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
