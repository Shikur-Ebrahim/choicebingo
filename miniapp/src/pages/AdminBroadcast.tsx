import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Clock,
  Trash2,
  Plus,
  Image as ImageIcon,
  Edit2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Radio,
  MessageSquare,
  X,
  Video,
  Film,
  AtSign,
  ArrowLeft,
  UploadCloud,
  Check,
  Calendar,
  Sparkles,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || '/api';

type SendTo = 'bot' | 'channel' | 'both';
type PostStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
type MediaType = 'image' | 'video' | null;

interface BroadcastPost {
  id: string;
  title: string;
  body: string;
  media_url: string | null;
  media_key: string | null;
  media_type: MediaType;
  send_to: SendTo;
  channel_id: string | null;
  status: PostStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  failed_count: number;
  error_message: string | null;
  created_at: string;
}

const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';

const STATUS_CONFIG: Record<PostStatus, { label: string; badgeCls: string; dotCls: string }> = {
  draft: {
    label: 'Draft',
    badgeCls: 'bg-slate-700/80 text-slate-300 border-slate-600',
    dotCls: 'bg-slate-400',
  },
  scheduled: {
    label: 'Scheduled',
    badgeCls: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    dotCls: 'bg-blue-400',
  },
  sending: {
    label: 'Sending...',
    badgeCls: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse',
    dotCls: 'bg-amber-400 animate-ping',
  },
  sent: {
    label: 'Sent ✓',
    badgeCls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dotCls: 'bg-emerald-400',
  },
  failed: {
    label: 'Failed',
    badgeCls: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    dotCls: 'bg-rose-400',
  },
};

const SEND_TO_OPTIONS: { value: SendTo; label: string; desc: string; icon: string }[] = [
  { value: 'bot', label: 'Bot Only', desc: 'All active players via Telegram Bot', icon: '🤖' },
  { value: 'channel', label: 'Channel Only', desc: 'Choice Bingo Channel (@ChoiceBingo)', icon: '📢' },
  { value: 'both', label: 'Bot + Channel', desc: 'Reach all players and @ChoiceBingo', icon: '📡' },
];

export default function AdminBroadcast() {
  const [posts, setPosts] = useState<BroadcastPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultChannel, setDefaultChannel] = useState('@ChoiceBingo');
  const [showForm, setShowForm] = useState(false);
  const [editPost, setEditPost] = useState<BroadcastPost | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'sent' | 'scheduled' | 'draft' | 'failed'>('all');

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendTo, setSendTo] = useState<SendTo>('both');
  const [channelId, setChannelId] = useState('@ChoiceBingo');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [uploadedMediaKey, setUploadedMediaKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(''), 4500);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 3500);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/broadcast`, { headers: { 'x-telegram-init-data': initData } });
      const d = await r.json();
      setPosts(d.posts || []);
    } catch {
      showNotification('Failed to load posts', true);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultChannel = async () => {
    try {
      const r = await fetch(`${API_URL}/broadcast/channel-default`, { headers: { 'x-telegram-init-data': initData } });
      const d = await r.json();
      if (d.defaultChannel) {
        setDefaultChannel(d.defaultChannel);
        setChannelId(d.defaultChannel);
      }
    } catch {}
  };

  useEffect(() => {
    fetchPosts();
    fetchDefaultChannel();
  }, []);

  // Auto-refresh every 8s if any post is 'sending'
  useEffect(() => {
    const hasLive = posts.some(p => p.status === 'sending');
    if (!hasLive) return;
    const t = setTimeout(() => fetchPosts(), 8_000);
    return () => clearTimeout(t);
  }, [posts]);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setSendTo('both');
    setChannelId(defaultChannel || '@ChoiceBingo');
    setScheduleEnabled(false);
    setScheduledAt('');
    setMediaPreview(null);
    setMediaType(null);
    setUploadedMediaUrl(null);
    setUploadedMediaKey(null);
    setUploadProgress(0);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openCreateForm = () => {
    setEditPost(null);
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (post: BroadcastPost) => {
    setEditPost(post);
    setTitle(post.title || '');
    setBody(post.body);
    setSendTo(post.send_to);
    setChannelId(post.channel_id || defaultChannel || '@ChoiceBingo');
    setScheduleEnabled(!!post.scheduled_at);
    setScheduledAt(post.scheduled_at ? post.scheduled_at.slice(0, 16) : '');
    setMediaPreview(post.media_url || null);
    setMediaType(post.media_type || null);
    setUploadedMediaUrl(post.media_url || null);
    setUploadedMediaKey(post.media_key || null);
    setUploadProgress(0);
    setError('');
    setShowForm(true);
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // High-Reliability Dual Upload: Presigned R2 Direct PUT + Server API Fallback
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      showNotification('Only image or video files are allowed', true);
      return;
    }

    // 1. Instant local preview using ObjectURL (instant video playback & thumbnail)
    const localBlobUrl = URL.createObjectURL(file);
    setMediaPreview(localBlobUrl);
    setMediaType(isVideo ? 'video' : 'image');
    setUploadedMediaUrl(null);
    setUploadedMediaKey(null);
    setUploading(true);
    setUploadProgress(15);
    setError('');

    try {
      let publicUrl = '';
      let mediaKey = '';

      // Method A: Direct Presigned Upload directly to Cloudflare R2 (Bypasses VPS body limits completely)
      try {
        setUploadProgress(30);
        const presignRes = await fetch(`${API_URL}/broadcast/presign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-init-data': initData,
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
          }),
        });

        if (presignRes.ok) {
          const presignData = await presignRes.json();
          if (presignData.uploadUrl && presignData.publicUrl) {
            setUploadProgress(50);
            // PUT directly to Cloudflare R2
            const r2Put = await fetch(presignData.uploadUrl, {
              method: 'PUT',
              body: file,
            });

            if (r2Put.ok) {
              publicUrl = presignData.publicUrl;
              mediaKey = presignData.key;
            }
          }
        }
      } catch (presignErr) {
        console.warn('Presign upload attempt notice:', presignErr);
      }

      // Method B: Server-side upload endpoint (if presigned upload didn't complete)
      if (!publicUrl) {
        setUploadProgress(60);
        const dataUrl = await readFileAsDataUrl(file);
        setUploadProgress(80);

        const res = await fetch(`${API_URL}/broadcast/upload-media`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-init-data': initData,
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
            base64: dataUrl,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.publicUrl) {
          publicUrl = data.publicUrl;
          mediaKey = data.key || null;
        } else {
          throw new Error(data.error || 'Upload to media storage failed');
        }
      }

      if (publicUrl) {
        setUploadedMediaUrl(publicUrl);
        setUploadedMediaKey(mediaKey);
        setUploadProgress(100);
        showNotification(isVideo ? 'Video uploaded to R2 successfully!' : 'Image uploaded successfully!');
        if (typeof WebApp !== 'undefined') {
          WebApp.HapticFeedback?.notificationOccurred('success');
        }
      } else {
        throw new Error('Upload could not be verified');
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      showNotification(`Upload failed: ${err.message || 'File upload error'}. Please choose a file under 50MB.`, true);
      // DO NOT set base64 string to uploadedMediaUrl! That prevents statement timeout!
      setUploadedMediaUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = () => {
    setMediaPreview(null);
    setMediaType(null);
    setUploadedMediaUrl(null);
    setUploadedMediaKey(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!body.trim()) {
      showNotification('Post message is required', true);
      return;
    }
    if (uploading) {
      showNotification('Please wait for media upload to finish', true);
      return;
    }
    if (mediaPreview && !uploadedMediaUrl) {
      showNotification('Please wait for the media file to finish uploading to Cloudflare R2.', true);
      return;
    }
    if (scheduleEnabled && !scheduledAt) {
      showNotification('Please pick a scheduled date/time', true);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const targetChannel =
        sendTo === 'channel' || sendTo === 'both' ? channelId.trim() || defaultChannel || '@ChoiceBingo' : null;

      const payload = {
        title,
        body,
        media_url: uploadedMediaUrl,
        media_key: uploadedMediaKey,
        media_type: mediaType,
        send_to: sendTo,
        channel_id: targetChannel,
        scheduled_at: scheduleEnabled ? new Date(scheduledAt).toISOString() : null,
      };

      const url = editPost ? `${API_URL}/broadcast/${editPost.id}` : `${API_URL}/broadcast`;
      const method = editPost ? 'PUT' : 'POST';

      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData },
        body: JSON.stringify(payload),
      });

      const d = await r.json();
      if (!r.ok) {
        showNotification(d.error || 'Save failed', true);
        return;
      }

      setShowForm(false);
      resetForm();
      fetchPosts();
      showNotification(editPost ? 'Post updated!' : 'Post created successfully!');
      if (typeof WebApp !== 'undefined') {
        WebApp.HapticFeedback?.notificationOccurred('success');
      }
    } catch (err: any) {
      showNotification(err.message || 'Error saving post', true);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (postId: string) => {
    setSending(postId);
    setError('');

    try {
      const r = await fetch(`${API_URL}/broadcast/${postId}/send`, {
        method: 'POST',
        headers: { 'x-telegram-init-data': initData },
      });
      const d = await r.json();
      if (!r.ok) {
        showNotification(d.error || 'Send failed', true);
        return;
      }
      setPosts(prev => prev.map(p => (p.id === postId ? { ...p, status: 'sending' } : p)));
      showNotification('Broadcast sending started!');
      if (typeof WebApp !== 'undefined') {
        WebApp.HapticFeedback?.notificationOccurred('success');
      }
      setTimeout(() => fetchPosts(), 2500);
    } catch (err: any) {
      showNotification(err.message || 'Failed to start broadcast', true);
    } finally {
      setSending(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this broadcast post?')) return;
    try {
      const r = await fetch(`${API_URL}/broadcast/${postId}`, {
        method: 'DELETE',
        headers: { 'x-telegram-init-data': initData },
      });
      if (r.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        showNotification('Post deleted');
      } else {
        showNotification('Failed to delete post', true);
      }
    } catch (err: any) {
      showNotification(err.message || 'Error deleting post', true);
    }
  };

  const fmtDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  const filteredPosts = posts.filter(p => {
    if (filterTab === 'all') return true;
    return p.status === filterTab;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3D CREATE / EDIT MODAL VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (showForm) {
    const isMedia = !!mediaPreview;
    const maxChars = isMedia ? 1024 : 4096;
    const isOverLimit = body.length > maxChars;

    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 pb-16 flex flex-col items-center">
        <div className="w-full max-w-md space-y-4">
          {/* Header Card */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-800 shadow-[0_8px_25px_rgba(0,0,0,0.5)] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                {editPost ? <Edit2 size={20} /> : <Radio size={20} />}
              </div>
              <div>
                <h2 className="text-base font-black text-amber-400">
                  {editPost ? 'Edit Broadcast Post' : 'New Broadcast Post'}
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">Create announcement for Bot & Channel</p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 transition-all active:scale-95"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form Card */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-800 shadow-xl space-y-4">
            {/* Title (Optional header) */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Header Title <span className="text-[10px] text-slate-500 normal-case">(Optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. 🎁 Weekend Deposit Bonus Active!"
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-none shadow-inner transition-all placeholder:text-slate-600"
              />
            </div>

            {/* Media Upload Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Image or Video <span className="text-[10px] text-slate-500 normal-case">(Optional)</span>
                </label>
                {mediaPreview && !uploading && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <RotateCcw size={11} /> Change
                    </button>
                    <button
                      type="button"
                      onClick={removeMedia}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                    >
                      <Trash2 size={11} /> Remove
                    </button>
                  </div>
                )}
              </div>

              {mediaPreview ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-amber-500/40 bg-black shadow-lg">
                  {/* FULLY VISIBLE & PLAYABLE VIDEO / IMAGE */}
                  {mediaType === 'video' ? (
                    <div className="relative w-full bg-black flex items-center justify-center">
                      <video
                        src={mediaPreview}
                        controls
                        playsInline
                        preload="auto"
                        className="w-full max-h-72 object-contain bg-black mx-auto block rounded-xl"
                      />
                    </div>
                  ) : (
                    <div className="relative w-full bg-black flex items-center justify-center">
                      <img
                        src={mediaPreview}
                        alt="preview"
                        className="w-full max-h-72 object-contain bg-black mx-auto block rounded-xl"
                      />
                    </div>
                  )}

                  {/* Upload Progress Overlay */}
                  {uploading && (
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center space-y-2.5 p-4 z-20">
                      <Loader2 size={32} className="text-amber-400 animate-spin" />
                      <span className="text-amber-300 text-xs font-black">
                        Uploading to Cloudflare R2... {uploadProgress}%
                      </span>
                      <div className="w-3/4 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Type Badge */}
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg shadow-md border ${
                        mediaType === 'video'
                          ? 'bg-purple-900/90 text-purple-200 border-purple-500/40'
                          : 'bg-amber-900/90 text-amber-200 border-amber-500/40'
                      }`}
                    >
                      {mediaType === 'video' ? '🎬 Video Clip' : '🖼️ Image Banner'}
                    </span>
                    {uploadedMediaUrl && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-900/90 text-emerald-200 border border-emerald-500/40">
                        ✓ R2 Ready
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-36 rounded-2xl border-2 border-dashed border-slate-700 hover:border-amber-400/80 bg-slate-950/60 flex flex-col items-center justify-center text-slate-400 hover:text-amber-300 cursor-pointer transition-all active:scale-[0.99] group shadow-inner"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 group-hover:border-amber-500/40 flex items-center justify-center text-amber-400 mb-2 shadow-md transition-all group-hover:scale-105">
                    <UploadCloud size={24} />
                  </div>
                  <span className="text-xs font-black text-slate-200 group-hover:text-amber-300">
                    Tap to upload Image or Video
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">MP4, MOV, WebM • JPG, PNG, GIF</span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Message Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Announcement Message <span className="text-amber-400">*</span>
                </label>
                <span className="text-[10px] font-semibold text-slate-500">Supports *bold* _italic_</span>
              </div>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your broadcast announcement here..."
                rows={5}
                className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white font-medium outline-none shadow-inner resize-none transition-all placeholder:text-slate-600 ${
                  isOverLimit ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700/80 focus:border-amber-400'
                }`}
              />
              <div className="flex justify-between items-center text-[10px] mt-1 text-slate-500">
                <span>{isMedia ? '📷 Caption limit: 1024 chars' : '💬 Text message'}</span>
                <span className={isOverLimit ? 'font-black text-rose-400' : 'font-semibold'}>
                  {body.length} / {maxChars}
                </span>
              </div>
            </div>

            {/* Target Audience Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Target Audience
              </label>
              <div className="space-y-2">
                {SEND_TO_OPTIONS.map(opt => {
                  const isSelected = sendTo === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSendTo(opt.value)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-amber-400 shadow-[0_3px_12px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <span className="text-2xl shrink-0">{opt.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-black ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                          {opt.label}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{opt.desc}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-amber-400 border-amber-400 text-slate-950'
                            : 'border-slate-700 bg-slate-900 text-transparent'
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Target Channel Input */}
              {(sendTo === 'channel' || sendTo === 'both') && (
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AtSign size={13} />
                      <span>Telegram Channel Username / Link</span>
                    </label>
                    <a
                      href="https://t.me/ChoiceBingo"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold text-amber-400 underline hover:text-amber-300"
                    >
                      Open @ChoiceBingo
                    </a>
                  </div>
                  <input
                    type="text"
                    value={channelId}
                    onChange={e => setChannelId(e.target.value)}
                    placeholder="@ChoiceBingo"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Make sure <strong>@choicebingo_bot</strong> is an <strong>Administrator</strong> in @ChoiceBingo with
                    permission to post messages.
                  </p>
                </div>
              )}
            </div>

            {/* Schedule Section */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Calendar size={15} className="text-amber-400" />
                  <span className="text-xs font-bold text-slate-300">Schedule Broadcast</span>
                </div>
                <button
                  type="button"
                  onClick={() => setScheduleEnabled(!scheduleEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    scheduleEnabled ? 'bg-amber-500' : 'bg-slate-800 border border-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      scheduleEnabled ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>

              {scheduleEnabled ? (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white outline-none focus:border-amber-400"
                />
              ) : (
                <p className="text-[10px] text-slate-500 font-medium">
                  If unscheduled, you can save as draft and send manually anytime.
                </p>
              )}
            </div>

            {/* Error Overlay */}
            {error && (
              <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-300 text-xs">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form Actions (3D Buttons) */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 active:scale-95 transition-all shadow-[0_3px_0_0_#1e293b] active:translate-y-0.5 active:shadow-none"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || uploading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black text-xs flex items-center justify-center space-x-1.5 shadow-[0_4px_0_0_#b45309] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : scheduleEnabled ? (
                  <Calendar size={15} />
                ) : (
                  <Sparkles size={15} />
                )}
                <span>
                  {saving ? 'Saving...' : scheduleEnabled ? 'Schedule Post' : editPost ? 'Update Post' : 'Save Broadcast'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 3D MAIN BROADCAST LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-20 flex flex-col items-center">
      <div className="w-full max-w-md space-y-4">
        {/* Toast Overlay */}
        {successMsg && (
          <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-black text-xs shadow-xl bg-amber-400 text-slate-950 animate-fade-in border border-amber-300">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-800 shadow-[0_8px_25px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                to="/admin"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-200 active:scale-95 transition-all shadow-[0_2px_0_0_#334155]"
              >
                <ArrowLeft size={18} />
              </Link>
              <div>
                <h1 className="text-base font-black flex items-center gap-1.5 text-amber-400">
                  <Radio size={18} className="animate-pulse text-amber-400" />
                  <span>Broadcast Center</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">Push to players &amp; channel @ChoiceBingo</p>
              </div>
            </div>

            {/* 3D New Post Button */}
            <button
              onClick={openCreateForm}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black text-xs shadow-[0_3px_0_0_#b45309] active:translate-y-0.5 active:shadow-none transition-all"
            >
              <Plus size={16} strokeWidth={3} />
              <span>New Post</span>
            </button>
          </div>

          {/* Quick Filter Tabs */}
          <div className="grid grid-cols-5 gap-1.5 mt-3 pt-3 border-t border-slate-800/80 text-[10px] font-black">
            {[
              { id: 'all', label: 'All', count: posts.length },
              { id: 'sent', label: 'Sent', count: posts.filter(p => p.status === 'sent').length },
              { id: 'scheduled', label: 'Queued', count: posts.filter(p => p.status === 'scheduled').length },
              { id: 'draft', label: 'Draft', count: posts.filter(p => p.status === 'draft').length },
              { id: 'failed', label: 'Failed', count: posts.filter(p => p.status === 'failed').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                  filterTab === tab.id
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className="block text-[9px] opacity-80">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-300 text-xs shadow-md">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Posts List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center pt-20 space-y-3">
            <Loader2 size={36} className="animate-spin text-amber-400" />
            <p className="text-xs text-slate-400 font-bold">Loading broadcasts...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-8 flex flex-col items-center justify-center text-center space-y-3 shadow-inner">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500">
              <MessageSquare size={32} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-300">
                {filterTab === 'all' ? 'No broadcast posts yet' : `No ${filterTab} posts`}
              </p>
              <p className="text-xs text-slate-500 max-w-xs">
                Announce bonuses, jackpots, or game updates directly to all active players.
              </p>
            </div>
            <button
              onClick={openCreateForm}
              className="mt-2 text-xs font-black text-amber-400 hover:text-amber-300 flex items-center gap-1.5 underline"
            >
              <Plus size={14} /> Create your first broadcast post
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPosts.map(post => {
              const statusCfg = STATUS_CONFIG[post.status];
              const isSendable =
                post.status === 'draft' || post.status === 'scheduled' || post.status === 'failed';
              const isEditable =
                post.status === 'draft' || post.status === 'scheduled' || post.status === 'failed';
              const isSending = sending === post.id;
              const targetChannelName = post.channel_id || defaultChannel || '@ChoiceBingo';

              return (
                <div
                  key={post.id}
                  className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-[0_6px_20px_rgba(0,0,0,0.4)] overflow-hidden transition-all hover:border-slate-700"
                >
                  {/* FULLY VISIBLE & PLAYABLE MEDIA BANNER IN CARD */}
                  {post.media_url && post.media_type === 'image' && (
                    <div className="relative w-full bg-black flex items-center justify-center overflow-hidden border-b border-slate-800">
                      <img src={post.media_url} alt="post" className="w-full max-h-60 object-contain bg-black mx-auto block" />
                    </div>
                  )}

                  {post.media_url && post.media_type === 'video' && (
                    <div className="relative w-full bg-black flex items-center justify-center overflow-hidden border-b border-slate-800">
                      <video
                        src={post.media_url}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full max-h-60 object-contain bg-black mx-auto block"
                      />
                      <span className="absolute top-2.5 left-2.5 text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-900/90 text-purple-200 border border-purple-500/40 pointer-events-none shadow z-10">
                        🎬 Video Clip
                      </span>
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {post.title ? (
                          <p className="font-black text-amber-300 text-sm truncate">{post.title}</p>
                        ) : null}
                        <p className="text-slate-300 text-xs line-clamp-3 leading-relaxed mt-0.5 font-medium whitespace-pre-wrap">
                          {post.body}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shrink-0 ${statusCfg.badgeCls}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotCls}`} />
                        <span>{statusCfg.label}</span>
                      </span>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                      <span className="bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                        {post.send_to === 'bot' && '🤖 Bot Only'}
                        {post.send_to === 'channel' && `📢 Channel (${targetChannelName})`}
                        {post.send_to === 'both' && `📡 Bot + Channel (${targetChannelName})`}
                      </span>

                      {post.scheduled_at && post.status === 'scheduled' && (
                        <span className="bg-blue-500/10 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Clock size={11} /> {fmtDate(post.scheduled_at)}
                        </span>
                      )}

                      {!post.scheduled_at && (
                        <span className="text-slate-500 px-1 py-0.5">Created {fmtDate(post.created_at)}</span>
                      )}
                    </div>

                    {/* Delivery Stats */}
                    {post.status === 'sent' && (
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={13} /> Delivered to {post.sent_count} targets
                        </span>
                        <span>{fmtDate(post.sent_at)}</span>
                      </div>
                    )}

                    {post.error_message && (
                      <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-300 font-medium leading-relaxed">
                        ⚠️ {post.error_message}
                      </div>
                    )}

                    {/* 3D Action Buttons */}
                    <div className="flex items-center space-x-2 pt-1 border-t border-slate-800/80">
                      {isSendable && (
                        <button
                          onClick={() => handleSend(post.id)}
                          disabled={isSending}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center space-x-1.5 shadow-[0_3px_0_0_#065f46] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
                        >
                          {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                          <span>{isSending ? 'Sending...' : 'Send Now'}</span>
                        </button>
                      )}

                      {isEditable && (
                        <button
                          onClick={() => openEditForm(post)}
                          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center space-x-1 shadow-[0_3px_0_0_#1e293b] active:translate-y-0.5 active:shadow-none transition-all"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center active:scale-95 transition-all"
                        title="Delete Post"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
