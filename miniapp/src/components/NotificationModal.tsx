import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trophy,
  Gift,
  Megaphone,
  ArrowUpRight,
  Sparkles,
  Wallet,
  Coins
} from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { useGameStore } from '../store/gameStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface NotificationItem {
  id: string;
  type: 'broadcast' | 'deposit' | 'withdrawal' | 'win' | 'reward';
  title: string;
  title_am?: string;
  message: string;
  message_am?: string;
  created_at: string;
  status: 'success' | 'warning' | 'danger' | 'info' | 'gold' | 'purple';
  amount?: number;
  media_url?: string;
  action_url?: string;
  action_text?: string;
}

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  readIds: Set<string>;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  loading?: boolean;
  onRefresh?: () => void;
}

function timeAgo(dateStr: string, isAm: boolean): string {
  if (!dateStr) return isAm ? 'አሁን' : 'just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  if (m < 1) return isAm ? 'አሁን' : 'just now';
  if (m < 60) return isAm ? `ከ ${m} ደቂቃ በፊት` : `${m}m ago`;
  if (h < 24) return isAm ? `ከ ${h} ሰዓት በፊት` : `${h}h ago`;
  if (d === 1) return isAm ? 'ትናንት' : 'yesterday';
  if (d < 30) return isAm ? `ከ ${d} ቀናት በፊት` : `${d}d ago`;
  return isAm ? 'ከረጅም ጊዜ በፊት' : 'earlier';
}

export default function NotificationModal({
  isOpen,
  onClose,
  notifications,
  readIds,
  onMarkAsRead,
  onMarkAllAsRead,
  loading = false,
  onRefresh,
}: NotificationModalProps) {
  const { language } = useGameStore();
  const isAm = language === 'am';
  const [filter, setFilter] = useState<'all' | 'unread' | 'cash' | 'wins' | 'broadcast'>('all');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (typeof WebApp !== 'undefined') {
        try { WebApp.HapticFeedback?.impactOccurred('light'); } catch (_) {}
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readIds.has(n.id)).length;
  }, [notifications, readIds]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const isUnread = !readIds.has(n.id);
      if (filter === 'unread') return isUnread;
      if (filter === 'cash') return n.type === 'deposit' || n.type === 'withdrawal';
      if (filter === 'wins') return n.type === 'win' || n.type === 'reward';
      if (filter === 'broadcast') return n.type === 'broadcast';
      return true;
    });
  }, [notifications, readIds, filter]);

  if (!isOpen) return null;

  const renderIcon = (item: NotificationItem) => {
    switch (item.status) {
      case 'success':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 size={20} />
          </div>
        );
      case 'danger':
        return (
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle size={20} />
          </div>
        );
      case 'warning':
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
            <Clock size={20} />
          </div>
        );
      case 'gold':
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-400 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-md border border-yellow-200">
            <Trophy size={20} />
          </div>
        );
      case 'purple':
        return (
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/70 border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-xs">
            <Gift size={20} />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
            <Megaphone size={20} />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn">
      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Container */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden z-10 transition-transform">
        {/* Drag handle for mobile */}
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* ── HEADER ── */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs">
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white flex items-center justify-center shadow-md">
                <Bell size={18} />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-black text-base text-slate-800 dark:text-slate-100 leading-tight">
                {isAm ? 'ማሳወቂያዎች' : 'Notifications'}
              </h2>
              <p className="text-[11px] font-semibold text-slate-400">
                {unreadCount > 0 
                  ? (isAm ? `${unreadCount} ያልታዩ ማሳወቂያዎች አሉዎት` : `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`)
                  : (isAm ? 'ሁሉም ታይተዋል' : 'All caught up')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 active:scale-95 transition-all flex items-center space-x-1"
                title={isAm ? 'ሁሉንም አንብብ' : 'Mark all as read'}
              >
                <CheckCheck size={14} />
                <span className="hidden sm:inline">{isAm ? 'ሁሉንም አንብብ' : 'Mark all read'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center active:scale-90 transition-transform"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── FILTER TABS ── */}
        <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center space-x-1.5 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'all', label: isAm ? 'ሁሉም' : 'All', count: notifications.length },
            { id: 'unread', label: isAm ? 'ያልታዩ' : 'Unread', count: unreadCount },
            { id: 'cash', label: isAm ? 'ክፍያዎች' : 'Cash', count: notifications.filter(n => n.type === 'deposit' || n.type === 'withdrawal').length },
            { id: 'wins', label: isAm ? 'አሸናፊነት' : 'Wins', count: notifications.filter(n => n.type === 'win' || n.type === 'reward').length },
            { id: 'broadcast', label: isAm ? 'ማስታወቂያ' : 'News', count: notifications.filter(n => n.type === 'broadcast').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                filter === tab.id
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  filter === tab.id ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── NOTIFICATIONS LIST ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                <Bell size={28} className="opacity-40" />
              </div>
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                {isAm ? 'ምንም ማሳወቂያ አልተገኘም' : 'No notifications found'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                {filter === 'unread'
                  ? (isAm ? 'ሁሉንም ማሳወቂያዎች አይተዋል!' : "You've read all your notifications!")
                  : (isAm ? 'አዳዲስ ክስተቶች እና ማሳወቂያዎች እዚህ ይታያሉ።' : 'New updates, deposits, and game wins will appear here.')}
              </p>
            </div>
          ) : (
            filteredNotifications.map(item => {
              const isUnread = !readIds.has(item.id);
              const displayTitle = (isAm && item.title_am) ? item.title_am : item.title;
              const displayMessage = (isAm && item.message_am) ? item.message_am : item.message;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isUnread) onMarkAsRead(item.id);
                  }}
                  className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-3 ${
                    isUnread
                      ? 'bg-amber-500/5 dark:bg-amber-400/5 border-amber-300/60 dark:border-amber-500/30 shadow-xs'
                      : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 opacity-90 hover:opacity-100'
                  }`}
                >
                  {/* Icon */}
                  {renderIcon(item)}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 leading-snug">
                          {displayTitle}
                        </h3>
                        {item.amount && item.amount > 0 && (
                          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                            item.status === 'success' || item.status === 'gold'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {Number(item.amount).toLocaleString('en-US')} ETB
                          </span>
                        )}
                      </div>

                      {/* Unread dot */}
                      {isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs shrink-0 mt-0.5 animate-pulse" />
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                      {displayMessage}
                    </p>

                    {/* Media Thumbnail (if broadcast has image) */}
                    {item.media_url && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-36 bg-slate-900 flex items-center justify-center">
                        <img
                          src={item.media_url}
                          alt="Broadcast attachment"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Action button if provided */}
                    {item.action_url && item.action_text && (
                      <a
                        href={item.action_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center space-x-1 mt-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-transform"
                      >
                        <span>{item.action_text}</span>
                        <ArrowUpRight size={13} />
                      </a>
                    )}

                    {/* Timestamp */}
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{timeAgo(item.created_at, isAm)}</span>
                      {isUnread ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          {isAm ? 'አዲስ' : 'New'}
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-0.5">
                          <CheckCheck size={12} />
                          {isAm ? 'የታየ' : 'Read'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs active:scale-98 transition-transform"
          >
            {isAm ? 'ዝጋ' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
