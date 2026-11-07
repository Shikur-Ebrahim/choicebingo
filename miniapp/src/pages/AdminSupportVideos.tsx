import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Video,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  Eye,
  EyeOff,
  Layers,
  HelpCircle,
  Gamepad2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Share2,
  ArrowRightLeft,
  Copy,
  Check
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface SupportVideo {
  id: string;
  category: 'how_to_use' | 'how_to_play' | 'deposit' | 'withdraw' | 'invite' | 'transfer';
  title: string;
  description: string | null;
  video_url: string;
  video_key: string;
  thumbnail_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES: { id: SupportVideo['category']; label: string; labelAm: string; icon: any; color: string; bg: string }[] = [
  { id: 'how_to_use', label: 'How to Use', labelAm: 'አጠቃቀም', icon: HelpCircle, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' },
  { id: 'how_to_play', label: 'How to Play', labelAm: 'አጨዋወት', icon: Gamepad2, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
  { id: 'deposit', label: 'Deposit', labelAm: 'ገንዘብ ማስገባት', icon: ArrowDownToLine, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' },
  { id: 'withdraw', label: 'Withdraw', labelAm: 'ገንዘብ ማውጣት', icon: ArrowUpFromLine, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200' },
  { id: 'invite', label: 'Invite', labelAm: 'ግብዣ', icon: Share2, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-200' },
  { id: 'transfer', label: 'Transfer', labelAm: 'ማስተላለፍ', icon: ArrowRightLeft, color: 'text-cyan-500', bg: 'bg-cyan-50 border-cyan-200' },
];

export default function AdminSupportVideos() {
  const [videos, setVideos] = useState<SupportVideo[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<SupportVideo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    category: 'how_to_use' as SupportVideo['category'],
    title: '',
    description: '',
    video_url: '',
    video_key: '',
    thumbnail_url: '',
    is_active: true,
    sort_order: 0,
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-telegram-init-data': typeof WebApp !== 'undefined' ? WebApp.initData : '',
  }), []);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/support-videos/admin/all`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos || []);
        setCounts(data.counts || {});
      } else {
        showToast('error', 'Failed to load support videos');
      }
    } catch (err) {
      showToast('error', 'Network error loading videos');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const openCreateModal = () => {
    setEditingVideo(null);
    setForm({
      category: 'how_to_use',
      title: '',
      description: '',
      video_url: '',
      video_key: '',
      thumbnail_url: '',
      is_active: true,
      sort_order: (videos.length || 0) + 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (v: SupportVideo) => {
    setEditingVideo(v);
    setForm({
      category: v.category,
      title: v.title,
      description: v.description || '',
      video_url: v.video_url,
      video_key: v.video_key,
      thumbnail_url: v.thumbnail_url || '',
      is_active: v.is_active,
      sort_order: v.sort_order,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.video_url.trim()) {
      showToast('error', 'Title and Video URL are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingVideo
        ? `${API_URL}/support-videos/admin/${editingVideo.id}`
        : `${API_URL}/support-videos/admin`;
      const method = editingVideo ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('success', editingVideo ? 'Video updated successfully!' : 'Video created successfully!');
        setIsModalOpen(false);
        fetchVideos();
      } else {
        showToast('error', data.error || 'Failed to save video');
      }
    } catch (err: any) {
      showToast('error', 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (v: SupportVideo) => {
    try {
      const res = await fetch(`${API_URL}/support-videos/admin/${v.id}/toggle`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      if (res.ok) {
        setVideos(prev => prev.map(item => item.id === v.id ? { ...item, is_active: !item.is_active } : item));
        showToast('success', `Video ${!v.is_active ? 'activated' : 'deactivated'}`);
      } else {
        showToast('error', 'Toggle failed');
      }
    } catch {
      showToast('error', 'Network error');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete video "${title}"?`);
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`${API_URL}/support-videos/admin/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        showToast('success', 'Video deleted successfully');
        fetchVideos();
      } else {
        showToast('error', 'Delete failed');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard?.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredVideos = videos.filter((v) => {
    const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
    const matchesSearch = !search ||
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.video_key.toLowerCase().includes(search.toLowerCase()) ||
      (v.description && v.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 pb-12 select-none">
      {/* TOAST ALERT */}
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
              <Video size={18} className="text-rose-500" />
              <span>Support Videos</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold">የማስተማሪያ ቪዲዮዎች ማስተዳደሪያ</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLoading(true); fetchVideos(); }}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 active:scale-95 transition-all"
            title="Refresh list"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-rose-500' : ''} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-xs shadow-md shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-1"
          >
            <Plus size={15} />
            <span>Add Video</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Videos</p>
            <p className="text-lg font-black text-slate-800">{counts.all || videos.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-emerald-500 uppercase">Active</p>
            <p className="text-lg font-black text-emerald-600">{counts.active || 0}</p>
          </div>
          <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Categories</p>
            <p className="text-lg font-black text-slate-800">{CATEGORIES.length}</p>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, description or video key..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-rose-400 shadow-sm"
          />
        </div>

        {/* CATEGORY TABS */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
              selectedCategory === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All ({videos.length})
          </button>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = counts[cat.id] || 0;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon size={12} className={isSelected ? 'text-white' : cat.color} />
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* VIDEOS LIST */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-3 shadow-[0_0_15px_rgba(244,63,94,0.3)]" />
              <p className="text-xs font-bold text-slate-400">Loading support videos...</p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm">
              <Video size={40} className="mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-sm text-slate-600">No support videos found</p>
              <p className="text-xs text-slate-400 mt-1">Click "Add Video" to add your first tutorial or help video.</p>
              <button
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Video
              </button>
            </div>
          ) : (
            filteredVideos.map((v) => {
              const catConfig = CATEGORIES.find(c => c.id === v.category) || CATEGORIES[0];
              const CatIcon = catConfig.icon;
              const isDeleting = deletingId === v.id;

              return (
                <div
                  key={v.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                    v.is_active ? 'border-slate-200' : 'border-slate-200/60 opacity-75 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    {/* Category & Order Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1 ${catConfig.bg} ${catConfig.color}`}>
                        <CatIcon size={12} />
                        <span>{catConfig.label} ({catConfig.labelAm})</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        Order #{v.sort_order}
                      </span>
                    </div>

                    {/* Active State Pill */}
                    <button
                      onClick={() => handleToggle(v)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 transition-all ${
                        v.is_active
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                      title="Click to toggle active status"
                    >
                      {v.is_active ? <Eye size={11} /> : <EyeOff size={11} />}
                      <span>{v.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-black text-slate-800 leading-tight mb-1">
                    {v.title}
                  </h3>
                  {v.description && (
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-3 line-clamp-2">
                      {v.description}
                    </p>
                  )}

                  {/* Video Key & URL bar */}
                  <div className="bg-slate-50 rounded-xl p-2.5 mb-3 space-y-1.5 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Video Key:</span>
                      <button
                        onClick={() => handleCopyKey(v.video_key)}
                        className="font-mono font-bold text-slate-700 flex items-center gap-1 hover:text-rose-500"
                        title="Click to copy key"
                      >
                        <span>{v.video_key}</span>
                        {copiedKey === v.video_key ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">URL:</span>
                      <a
                        href={v.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-rose-600 font-bold flex items-center gap-1 truncate max-w-[240px] hover:underline"
                      >
                        <span className="truncate">{v.video_url}</span>
                        <ExternalLink size={11} className="shrink-0" />
                      </a>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <a
                      href={v.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                    >
                      <Play size={13} className="text-rose-500" />
                      <span>Preview Video</span>
                    </a>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(v)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(v.id, v.title)}
                        disabled={isDeleting}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs flex items-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        <span>{isDeleting ? '...' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── MODAL: CREATE / EDIT VIDEO ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-200 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Video size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800">
                    {editingVideo ? 'Edit Support Video' : 'Add Support Video'}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-semibold">የማስተማሪያ ቪዲዮ መረጃ ይሙሉ</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Category Select */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-rose-400"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label} ({cat.labelAm})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Title * (ርዕስ)
                </label>
                <input
                  type="text"
                  placeholder="e.g. How to Buy Cartela & Win Bingo"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-rose-400"
                  required
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Description (ዝርዝር መግለጫ)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of what this video explains..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-rose-400"
                />
              </div>

              {/* Video URL Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Video URL * (YouTube / MP4 / Cloud Link)
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or https://cdn.com/video.mp4"
                  value={form.video_url}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-rose-400"
                  required
                />
              </div>

              {/* Video Key Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Video Key (መለያ ቃል)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty to auto-generate or enter custom key"
                  value={form.video_key}
                  onChange={(e) => setForm({ ...form, video_key: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 text-[11px] focus:outline-none focus:border-rose-400"
                />
              </div>

              {/* Thumbnail URL Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Thumbnail URL (Optional ምስል)
                </label>
                <input
                  type="url"
                  placeholder="https://... image preview thumbnail"
                  value={form.thumbnail_url}
                  onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-rose-400"
                />
              </div>

              {/* Sort Order & Active Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Sort Order (ቅደም ተከተል)
                  </label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-800 focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="text-[10px] font-bold uppercase text-slate-500 mb-1">Visibility</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_active: !form.is_active })}
                    className={`py-2 px-3 rounded-xl font-black text-xs border transition-all ${
                      form.is_active
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                  >
                    {form.is_active ? '✅ Active' : '⏸️ Inactive'}
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black shadow-md shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingVideo ? 'Update Video' : 'Create Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
