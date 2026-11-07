import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Video,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  X,
  Eye,
  EyeOff,
  HelpCircle,
  Gamepad2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Share2,
  ArrowRightLeft,
  UploadCloud,
  ChevronDown,
  Film,
  Link as LinkIcon
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
  { id: 'how_to_use', label: 'How to Use', labelAm: 'አጠቃቀም', icon: HelpCircle, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'how_to_play', label: 'How to Play', labelAm: 'አጨዋወት', icon: Gamepad2, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200 text-amber-700' },
  { id: 'deposit', label: 'Deposit', labelAm: 'ገንዘብ ማስገባት', icon: ArrowDownToLine, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { id: 'withdraw', label: 'Withdraw', labelAm: 'ገንዘብ ማውጣት', icon: ArrowUpFromLine, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200 text-rose-700' },
  { id: 'invite', label: 'Invite', labelAm: 'ግብዣ', icon: Share2, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-200 text-purple-700' },
  { id: 'transfer', label: 'Transfer', labelAm: 'ማስተላለፍ', icon: ArrowRightLeft, color: 'text-cyan-500', bg: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
];

export default function AdminSupportVideos() {
  const [videos, setVideos] = useState<SupportVideo[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Simplified Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form: ONLY Category + Title + Video File from Gallery
  const [formCategory, setFormCategory] = useState<SupportVideo['category']>('how_to_use');
  const [formTitle, setFormTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [useManualUrl, setUseManualUrl] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
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
    } catch {
      showToast('error', 'Network error loading videos');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const openCreateModal = () => {
    setFormCategory('how_to_use');
    setFormTitle('');
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setUseManualUrl(false);
    setManualUrl('');
    setUploadProgress(0);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const blobUrl = URL.createObjectURL(file);
    setFilePreviewUrl(blobUrl);

    // Auto-fill title if empty
    if (!formTitle.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      setFormTitle(cleanName);
    }
  };

  // Upload video file directly from gallery to cloud
  const uploadVideoFile = async (file: File): Promise<string> => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';

    // Step 1: Request presigned upload URL
    try {
      const presignRes = await fetch(`${API_URL}/support-videos/admin/presign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'video/mp4',
        }),
      });

      if (presignRes.ok) {
        const data = await presignRes.json();
        if (data.uploadUrl && data.publicUrl) {
          // Direct PUT to Cloudflare R2 with progress
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', data.uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
            xhr.upload.onprogress = (evt) => {
              if (evt.lengthComputable) {
                const pct = Math.round((evt.loaded / evt.total) * 100);
                setUploadProgress(pct);
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error('Network error during video upload'));
            xhr.send(file);
          });

          return data.publicUrl;
        }
      }
    } catch (e) {
      console.warn('Presigned upload failed, falling back to direct upload:', e);
    }

    // Step 2: Direct upload fallback for files under 45MB
    if (file.size <= 45 * 1024 * 1024) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const directRes = await fetch(`${API_URL}/support-videos/admin/upload-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'video/mp4',
          base64,
        }),
      });

      if (directRes.ok) {
        const data = await directRes.json();
        if (data.publicUrl) return data.publicUrl;
      }
    }

    throw new Error('Video upload failed. Please try a shorter video or check connection.');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('error', 'Please enter a video title');
      return;
    }

    if (!useManualUrl && !selectedFile) {
      showToast('error', 'Please select a video from your gallery');
      return;
    }

    if (useManualUrl && !manualUrl.trim()) {
      showToast('error', 'Please enter a valid video URL');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let finalVideoUrl = manualUrl.trim();

      if (!useManualUrl && selectedFile) {
        finalVideoUrl = await uploadVideoFile(selectedFile);
      }

      const res = await fetch(`${API_URL}/support-videos/admin`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          category: formCategory,
          title: formTitle.trim(),
          video_url: finalVideoUrl,
          is_active: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Video uploaded & saved successfully!');
        setIsModalOpen(false);
        fetchVideos();
      } else {
        showToast('error', data.error || 'Failed to save video');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error uploading video');
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

  const filteredVideos = videos.filter((v) => {
    const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
    const matchesSearch = !search ||
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 pb-12 select-none">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed top-4 left-4 right-4 z-50 p-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold text-white ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        } animate-slide-down`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP APP BAR */}
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
            <p className="text-[10px] text-slate-400 font-semibold">የማስተማሪያ ቪዲዮዎች</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLoading(true); fetchVideos(); }}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 active:scale-95 transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-rose-500' : ''} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-xs shadow-md shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-1"
          >
            <Plus size={15} />
            <span>Upload Video</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3.5 max-w-md mx-auto w-full">

        {/* ── 🌟 MOBILE SCREEN FIRST: CATEGORY DROPDOWN FILTER & SEARCH ── */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200/90 space-y-2.5">
          {/* Category Dropdown Select */}
          <div>
            <label className="block text-[9.5px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
              <span>Filter by Category (ምድብ ይምረጡ)</span>
              <span className="text-rose-500 font-bold">{filteredVideos.length} videos</span>
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-black text-xs text-slate-800 focus:outline-none focus:border-rose-400 pr-10 shadow-xs"
              >
                <option value="all">
                  📂 All Categories (ሁሉም ምድቦች) — ({counts.all || videos.length})
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({c.labelAm}) — ({counts[c.id] || 0})
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by video title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-rose-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* VIDEOS LIST */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-3 shadow-[0_0_15px_rgba(244,63,94,0.3)]" />
              <p className="text-xs font-bold text-slate-400">Loading videos...</p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm">
              <Film size={40} className="mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-sm text-slate-700">No videos found</p>
              <p className="text-xs text-slate-400 mt-1">Upload a video directly from your phone gallery!</p>
              <button
                onClick={openCreateModal}
                className="mt-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-rose-500/20 active:scale-95"
              >
                <UploadCloud size={15} /> Upload from Gallery
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
                  className={`bg-white rounded-2xl p-3.5 shadow-sm border transition-all ${
                    v.is_active ? 'border-slate-200' : 'border-slate-200/60 opacity-80 bg-slate-50/60'
                  }`}
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border flex items-center gap-1 ${catConfig.bg}`}>
                      <CatIcon size={11} />
                      <span>{catConfig.label} ({catConfig.labelAm})</span>
                    </span>

                    <button
                      onClick={() => handleToggle(v)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 transition-all ${
                        v.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {v.is_active ? <Eye size={11} /> : <EyeOff size={11} />}
                      <span>{v.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-black text-slate-800 leading-tight mb-2">
                    {v.title}
                  </h3>

                  {/* Video Player */}
                  <div className="rounded-xl overflow-hidden bg-black mb-2.5 border border-slate-200/80 shadow-inner">
                    <video
                      src={v.video_url}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-48 object-contain"
                    />
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold">
                      {new Date(v.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>

                    <button
                      onClick={() => handleDelete(v.id, v.title)}
                      disabled={isDeleting}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] flex items-center gap-1 active:scale-95 disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 🌟 SIMPLIFIED "UPLOAD FROM GALLERY" MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl border border-slate-200 animate-scale-up max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Film size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800">
                    Upload Support Video
                  </h2>
                  <p className="text-[10px] text-slate-400 font-semibold">ቪዲዮ ከጋለሪ ይጫኑ</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              {/* 1. Category Dropdown */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  1. Select Category * (ምድብ)
                </label>
                <div className="relative">
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-rose-400 pr-8"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label} ({cat.labelAm})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* 2. Title Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  2. Video Title * (ርዕስ)
                </label>
                <input
                  type="text"
                  placeholder="e.g. How to Play Bingo & Win"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-rose-400"
                  required
                />
              </div>

              {/* 3. Upload from Gallery Zone */}
              {!useManualUrl ? (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    3. Select Video from Gallery * (ቪዲዮ ምረጡ)
                  </label>

                  {selectedFile && filePreviewUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-black p-1">
                      <video
                        src={filePreviewUrl}
                        controls
                        playsInline
                        className="w-full max-h-36 rounded-xl object-contain"
                      />
                      <div className="p-2 bg-slate-900 text-white flex items-center justify-between text-[11px] rounded-b-xl">
                        <span className="truncate max-w-[200px] font-bold">{selectedFile.name}</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreviewUrl(null);
                        }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md active:scale-90"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-rose-200 hover:border-rose-400 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-rose-50/40 hover:bg-rose-50/70 active:scale-[0.99]">
                      <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-1.5 shadow-sm">
                        <UploadCloud size={24} />
                      </div>
                      <p className="text-xs font-black text-slate-800 text-center">
                        Tap to choose video from Gallery
                      </p>
                      <p className="text-[10px] text-slate-400 text-center mt-0.5">
                        MP4, WebM, MOV from your phone
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>
              ) : (
                /* Manual URL fallback */
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    3. Video URL * (YouTube / MP4 / Cloud Link)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-rose-400"
                    required
                  />
                </div>
              )}

              {/* Toggle: Gallery vs Link */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => setUseManualUrl(!useManualUrl)}
                  className="text-[10.5px] font-bold text-rose-600 hover:underline flex items-center gap-1"
                >
                  {useManualUrl ? <UploadCloud size={11} /> : <LinkIcon size={11} />}
                  <span>{useManualUrl ? 'Switch to Upload from Gallery' : 'Or paste a video link manually'}</span>
                </button>
              </div>

              {/* Upload Progress Bar */}
              {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-1">
                    <span>Uploading video to cloud...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-pink-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black shadow-md shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <UploadCloud size={14} className={isSubmitting ? 'animate-bounce' : ''} />
                  <span>{isSubmitting ? 'Uploading...' : 'Save Video'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
