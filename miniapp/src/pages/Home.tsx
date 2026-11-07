import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { t } from '../lib/translations';
import { Gift, ArrowDownToLine, Share2, PlusCircle, Info, MessageCircle, Zap, Trophy, Clock, X, Sparkles, Play, Gamepad2, Bell } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { supabase } from '../lib/supabase';
import VideoGuideModal, { useAutoVideoGuide } from '../components/VideoGuideModal';
import PwaInstallBanner, { isRunningInPwa, isRunningInTelegram } from '../components/PwaInstallBanner';
import NotificationModal, { NotificationItem } from '../components/NotificationModal';

export default function Home() {
  const { user, language, setIsPhoneModalOpen, setProfileOpen } = useGameStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isTelegramUser = typeof WebApp !== 'undefined' && Boolean(WebApp.initDataUnsafe?.user?.id);
  const hasPwaPhone = typeof window !== 'undefined' && Boolean(localStorage.getItem('cb_pwa_phone'));
  const isPwaGuest = !isTelegramUser && !hasPwaPhone;

  // Auto-prompt phone login once on first load in PWA / browser mode
  useEffect(() => {
    const isTg = typeof WebApp !== 'undefined' && Boolean(WebApp.initDataUnsafe?.user?.id);
    const pwaPhone = localStorage.getItem('cb_pwa_phone');
    const alreadyPrompted = sessionStorage.getItem('cb_pwa_prompted');
    if (!isTg && !pwaPhone && !alreadyPrompted) {
      sessionStorage.setItem('cb_pwa_prompted', 'true');
      const timer = setTimeout(() => {
        setIsPhoneModalOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [setIsPhoneModalOpen]);

  const [homeGames, setHomeGames] = useState<Record<number, { pool: number; start_at?: string; status: string; players: number }>>({});
  const [homeTimeLeft, setHomeTimeLeft] = useState<Record<number, number>>({});
  const [announcement, setAnnouncement] = useState<{ message: string; maxViews: number } | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const announcementShownRef = useRef(false);

  // 🌟 Video Guides State (How to Use & How to Play)
  const [activeVideoCategory, setActiveVideoCategory] = useState<'how_to_use' | 'how_to_play' | null>(null);

  // Auto-open "How to Use" video guide on user's first time opening the MiniApp
  useAutoVideoGuide('how_to_use', (open) => {
    if (open) setActiveVideoCategory('how_to_use');
  }, user?.telegram_id);

  // 🌟 Active Rewards Alert Banner State
  const [rewardAlert, setRewardAlert] = useState<{
    type: 'gursha_live' | 'gursha_scheduled' | 'milestone_ready';
    title: string;
    subtitle: string;
    actionText: string;
    badge: string;
    campaignId: string;
  } | null>(null);
  const [dismissedRewardAlert, setDismissedRewardAlert] = useState(false);

  // ── NOTIFICATIONS STATE & LOGIC ──
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(() => {
    try {
      const userKey = user?.telegram_id || 'guest';
      const saved = localStorage.getItem(`cb_read_notifs_${userKey}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Re-sync read IDs when user switches or logs in
  useEffect(() => {
    try {
      const userKey = user?.telegram_id || 'guest';
      const saved = localStorage.getItem(`cb_read_notifs_${userKey}`);
      setReadNotifIds(saved ? new Set(JSON.parse(saved)) : new Set());
    } catch {
      setReadNotifIds(new Set());
    }
  }, [user?.telegram_id]);

  const fetchNotifications = useCallback(async () => {
    try {
      const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
      const pwaPhone = typeof window !== 'undefined' ? localStorage.getItem('cb_pwa_phone') || '' : '';
      const API = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${API}/notifications`, {
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
          'x-pwa-phone': pwaPhone,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const pollInterval = setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        fetchNotifications();
      }
    }, 12000);

    const ch = supabase.channel('home_notifications_tracker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcast_posts' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => fetchNotifications())
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(ch);
    };
  }, [fetchNotifications]);

  const handleMarkAsRead = useCallback((id: string) => {
    setReadNotifIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        const userKey = user?.telegram_id || 'guest';
        localStorage.setItem(`cb_read_notifs_${userKey}`, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, [user?.telegram_id]);

  const handleMarkAllAsRead = useCallback(() => {
    setReadNotifIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      try {
        const userKey = user?.telegram_id || 'guest';
        localStorage.setItem(`cb_read_notifs_${userKey}`, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    if (typeof WebApp !== 'undefined') {
      try { WebApp.HapticFeedback?.notificationOccurred('success'); } catch (_) {}
    }
  }, [notifications, user?.telegram_id]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readNotifIds.has(n.id)).length;
  }, [notifications, readNotifIds]);

  // Check for active or upcoming rewards to notify the user
  useEffect(() => {
    let isMounted = true;
    const API = import.meta.env.VITE_API_URL || '/api';
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';

    const checkRewardsAlert = async () => {
      try {
        const res = await fetch(`${API}/rewards`, {
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-init-data': initData,
          },
        });
        if (!res.ok || !isMounted) return;
        const data = await res.json();
        const campaigns: any[] = data.campaigns || [];

        // Check 1: User has an eligible Gursha flash reward ready to claim!
        const eligibleGursha = campaigns.find(c => c.id === 'gursha' && c.is_eligible);
        if (eligibleGursha) {
          setRewardAlert({
            type: 'gursha_live',
            title: language === 'am' ? '⚡ የማህበረሰብ ጉርሻ ክፍት ነው!' : '⚡ Community Gursha is LIVE!',
            subtitle: language === 'am'
              ? `የመጀመሪያዎቹ 100 ተጠቃሚዎች 10 ብር ፈጣን ቦነስ ይውሰዱ (${eligibleGursha.spots_left} ቦታዎች ቀርተዋል)!`
              : `First 100 players claim 10 ETB instant bonus (${eligibleGursha.spots_left} spots left)!`,
            badge: language === 'am' ? '🔥 አሁን ክፍት ነው' : '🔥 LIVE NOW',
            actionText: language === 'am' ? 'ቦነስ ውሰድ 🎁' : 'Claim 10 ETB 🎁',
            campaignId: 'gursha',
          });
          return;
        }

        // Check 2: User has an unlocked milestone ready to claim!
        const eligibleMilestone = campaigns.find(c => (c.id === 'total_games' || c.id === 'invitation_reward') && c.is_eligible);
        if (eligibleMilestone) {
          const name = language === 'am' && eligibleMilestone.title_am ? eligibleMilestone.title_am : eligibleMilestone.title;
          setRewardAlert({
            type: 'milestone_ready',
            title: language === 'am' ? '🏆 የቦነስ ማይልስቶን ደርሰዋል!' : '🏆 Milestone Reward Unlocked!',
            subtitle: language === 'am'
              ? `${name} ቦነስዎን ለመውሰድ ዝግጁ ነው! አሁኑኑ ይውሰዱ።`
              : `Your ${eligibleMilestone.title} reward is unlocked and waiting to be claimed!`,
            badge: language === 'am' ? '🎉 ዝግጁ' : '🎉 READY',
            actionText: language === 'am' ? 'ሽልማት ውሰድ 🎁' : 'Claim Reward 🎁',
            campaignId: eligibleMilestone.id,
          });
          return;
        }

        // Check 3: Gursha is scheduled to start soon!
        const scheduledGursha = campaigns.find(c => c.id === 'gursha' && c.is_scheduled);
        if (scheduledGursha) {
          const timeStr = scheduledGursha.scheduled_at
            ? new Date(scheduledGursha.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : '';
          setRewardAlert({
            type: 'gursha_scheduled',
            title: language === 'am' ? '⏰ የማህበረሰብ ጉርሻ በቅርቡ!' : '⏰ Upcoming Gursha Flash!',
            subtitle: language === 'am'
              ? `ዛሬ በ ${timeStr} (24h) ይጀምራል — ፈጣን ቦነስዎን ለመውሰድ ይዘጋጁ!`
              : `Starts today at ${timeStr} (24h) — Get ready to claim your instant cash!`,
            badge: language === 'am' ? '⏳ በቅርቡ' : '⏳ UPCOMING',
            actionText: language === 'am' ? 'ይመልከቱ 🎁' : 'View Rewards 🎁',
            campaignId: 'gursha',
          });
          return;
        }

        setRewardAlert(null);
      } catch (err) {
        // Non-blocking
      }
    };

    checkRewardsAlert();

    return () => { isMounted = false; };
  }, [language]);

  useEffect(() => {
    let isMounted = true;
    const API = import.meta.env.VITE_API_URL || '/api';
    
    const fetchPools = async () => {
      try {
        const r = await fetch(`${API}/bingo/pools`, {
          headers: {
            'Content-Type': 'application/json',
            'x-telegram-init-data': WebApp?.initData || '',
          }
        });
        if (r.ok && isMounted) {
          const { pools } = await r.json();
          const p: Record<number, any> = {};
          (pools || []).forEach((g: any) => {
            p[Number(g.stake)] = {
              pool: g.prize_pool,
              start_at: g.start_at,
              status: g.status,
              players: g.unique_players,
            };
          });
          setHomeGames(p);
          return;
        }
      } catch {}

      // Fallback direct supabase query with deduplication
      const { data } = await supabase.from('bingo_games')
        .select('id, stake, prize_pool, start_at, status, created_at')
        .in('status', ['waiting', 'calling'])
        .order('created_at', { ascending: false });

      if (data && isMounted) {
        const p: Record<number, any> = {};
        const seen = new Set<number>();
        data.forEach(g => {
          if (!seen.has(g.stake)) {
            seen.add(g.stake);
            p[g.stake] = { pool: g.prize_pool, start_at: g.start_at, status: g.status, players: 0, _id: g.id };
          }
        });
        setHomeGames(p);
      }
    };

    fetchPools();

    // 2-second heartbeat polling so Home page status NEVER gets stuck!
    const pollTimer = setInterval(() => {
      if (document.visibilityState !== 'hidden') fetchPools();
    }, 2000);

    const ch = supabase.channel('home_pools_root')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bingo_games' }, () => {
        if (isMounted) fetchPools();
      })
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      // Skip updates when the page is hidden â€” prevents callback flood on resume
      if (document.visibilityState === 'hidden') return;
      setHomeTimeLeft(prev => {
        const next: Record<number, number> = {};
        for (const [stake, g] of Object.entries(homeGames)) {
          if (g.status === 'waiting' && g.start_at) {
            next[Number(stake)] = Math.max(0, Math.ceil((new Date(g.start_at).getTime() - Date.now()) / 1000));
          }
        }
        return next;
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [homeGames]);

  const handleInvite = () => {
    navigate('/invite');
  };

    // ---- ANNOUNCEMENT POPUP LOGIC ----
  useEffect(() => {
    if (announcementShownRef.current) return;
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    const API_URL_LOCAL = import.meta.env.VITE_API_URL || '/api';
    fetch(`${API_URL_LOCAL}/player/support-contact`, {
      headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData }
    })
      .then(r => r.json())
      .then(data => {
        const msg = data.announcement_message || '';
        const maxViews = typeof data.announcement_max_views === 'number' ? data.announcement_max_views : 2;
        if (!msg.trim()) return;
        const storageKey = `ann_views_${msg.slice(0, 20)}`;
        const viewCount = parseInt(localStorage.getItem(storageKey) || '0', 10);
        if (viewCount < maxViews) {
          localStorage.setItem(storageKey, String(viewCount + 1));
          setAnnouncement({ message: msg, maxViews });
          setShowAnnouncement(true);
          announcementShownRef.current = true;
        }
      })
      .catch(() => {});
  }, []);
  // ----------------------------------

  const handleHelp = async () => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    try {
      const res = await fetch(`${API_URL}/player/support-contact`, {
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData }
      });
      const data = await res.json();
      const username = data.username || 'ChoiceBingo_admin';
      const url = `https://t.me/${username.replace('@', '')}`;
      if (typeof WebApp !== 'undefined' && WebApp.openTelegramLink) {
        WebApp.openTelegramLink(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const initial = user?.first_name ? user.first_name.charAt(0).toUpperCase() : 'U';

  const formatMoney = (amount: number | undefined) => {
    return (amount || 0).toLocaleString('en-US');
  };

  return (
    <div className="flex flex-col min-h-screen pb-24 space-y-3 select-none bg-slate-50 dark:bg-[#070b14] transition-colors">
      {/* ── VIDEO GUIDE MODAL (HOW TO PLAY / HOW TO USE) ── */}
      {activeVideoCategory && (
        <VideoGuideModal
          isOpen={true}
          onClose={() => setActiveVideoCategory(null)}
          category={activeVideoCategory}
        />
      )}

      {/* ANNOUNCEMENT POPUP */}
      {showAnnouncement && announcement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAnnouncement(false)}>
          <div
            className="bg-white dark:bg-[#111729] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 rounded-t-2xl" />
            <div className="px-5 pt-4 pb-2 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-md shrink-0">
                <Info size={20} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-fuchsia-600 dark:text-fuchsia-400 uppercase tracking-widest">{t[language].home.announcement}</p>
                <p className="text-sm font-black text-slate-800 dark:text-white">{t[language].home.ChoiceBingo}</p>
              </div>
              <button onClick={() => setShowAnnouncement(false)} className="ml-auto w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/60 active:bg-slate-200">
                <span className="text-sm font-black">✕</span>
              </button>
            </div>
            <div className="h-px bg-gray-100 dark:bg-white/5 mx-4" />
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold leading-relaxed whitespace-pre-wrap">{announcement.message}</p>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => setShowAnnouncement(false)}
                className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-black text-sm rounded-xl shadow-md active:scale-95 transition-transform"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D WHITE / DARK HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 px-4 py-4 rounded-b-2xl shadow-[0_4px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.4)] border-b border-gray-100 dark:border-slate-800 flex items-center justify-between transition-colors">
        <div
          onClick={() => {
            try { WebApp.HapticFeedback?.impactOccurred('light'); } catch (_) {}
            setProfileOpen(true);
          }}
          className="flex items-center space-x-3 cursor-pointer select-none active:scale-95 transition-transform group"
          title={language === 'am' ? 'መገለጫ' : 'Profile'}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg select-none group-hover:opacity-95 transition-opacity"
            style={{
              background: 'radial-gradient(circle at 35% 25%, #34d399 0%, #10b981 50%, #047857 100%)',
              boxShadow: '0 3px 0 #064e3b, 0 3px 6px rgba(0,0,0,0.15)',
              border: '1.5px solid #6ee7b7',
            }}
          >
            {initial}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-200 group-hover:text-amber-500 transition-colors">
                {user?.first_name || 'USER'}
              </p>
              {isPwaGuest && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPhoneModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded-full active:scale-95 transition-all shadow-xs"
                >
                  <span>📱 {language === 'am' ? 'ስልክ ቁጥር ያስገቡ' : 'Enter Phone'}</span>
                </button>
              )}
            </div>
            {user?.role && user.role !== 'user' && (
              <span className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold">
                {user.role}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 text-right">
          {/* ── NOTIFICATION BELL (Top Header) ── */}
          <button
            type="button"
            onClick={() => setIsNotificationOpen(true)}
            className="relative w-9 h-9 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-90 transition-transform shadow-xs hover:bg-slate-100"
            title={language === 'am' ? 'ማሳወቂያዎች' : 'Notifications'}
          >
            <Bell size={18} className={unreadCount > 0 ? "text-amber-500 animate-bounce" : ""} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-1 text-purple-500 dark:text-purple-400 mb-0.5">
              <Gift size={14} />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatMoney(user?.bonus_balance)} ETB</p>
          </div>
          
          <div className="flex flex-col items-end">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t[language].home.wallet}</p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatMoney(user?.main_balance)} ETB</p>
          </div>
        </div>
      </div>

      {/* ── PWA INSTALL BANNER (Shown ONLY in regular Mobile Browsers outside Telegram & PWA) ── */}
      {!isTelegramUser && !isRunningInTelegram() && !isRunningInPwa() && (
        <PwaInstallBanner />
      )}

      {/* 3D ACTION BUTTONS ROW (Deposit, Withdraw, Invite) */}
      <div className="px-4 grid grid-cols-3 gap-3">
        {/* Deposit: 3D Yellow Button */}
        <button
          type="button"
          onClick={() => {
            navigate('/deposit');
          }}
          className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl font-bold text-xs select-none active:translate-y-1 transition-all"
          style={{
            background: 'linear-gradient(180deg, #fef08a 0%, #facc15 35%, #eab308 70%, #ca8a04 100%)',
            boxShadow: '0 3.5px 0 #854d0e, 0 4px 10px rgba(234,179,8,0.25), inset 0 1px 1px rgba(255,255,255,0.9)',
            border: '1px solid #fef08a',
            color: '#451a03',
          }}
        >
          <PlusCircle size={16} />
          <span>{t[language].home.deposit}</span>
        </button>

        {/* Withdraw: 3D Clean White Button */}
        <button
          type="button"
          onClick={() => {
            if (isPwaGuest) {
              setIsPhoneModalOpen(true);
            } else {
              navigate('/withdraw');
            }
          }}
          className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl font-bold text-xs select-none active:translate-y-1 transition-all bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
          style={{
            boxShadow: '0 3px 0 #cbd5e1',
          }}
        >
          <ArrowDownToLine size={16} />
          <span>{t[language].home.withdraw}</span>
        </button>

        {/* Invite: 3D Clean White Button */}
        <button 
          onClick={handleInvite}
          className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl font-bold text-xs select-none active:translate-y-1 transition-all bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
          style={{
            boxShadow: '0 3px 0 #cbd5e1',
          }}
        >
          <Share2 size={16} />
          <span>{t[language].home.invite}</span>
        </button>
      </div>

      {/* ── 🌟 ATTRACTIVE ACTIVE REWARD NOTIFICATION BANNER ── */}
      {rewardAlert && !dismissedRewardAlert && (
        <div className="px-4 animate-slide-down">
          <div
            onClick={() => {
              if (typeof WebApp !== 'undefined') {
                try { WebApp.HapticFeedback.impactOccurred('medium'); } catch (_) {}
              }
              navigate('/rewards');
            }}
            className={`relative overflow-hidden rounded-2xl p-3.5 text-white shadow-lg cursor-pointer active:scale-[0.98] transition-all border ${
              rewardAlert.type === 'gursha_live'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-[0_8px_25px_rgba(245,158,11,0.35)] border-amber-300/40'
                : rewardAlert.type === 'milestone_ready'
                ? 'bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 shadow-[0_8px_25px_rgba(16,185,129,0.35)] border-emerald-300/40'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-600 shadow-[0_8px_25px_rgba(99,102,241,0.35)] border-indigo-300/40'
            }`}
          >
            {/* Shimmer overlay */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10">
              {/* Pulsing Icon */}
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                {rewardAlert.type === 'gursha_live' ? (
                  <Zap size={22} className="text-yellow-200 animate-bounce" />
                ) : rewardAlert.type === 'milestone_ready' ? (
                  <Trophy size={22} className="text-yellow-200 animate-pulse" />
                ) : (
                  <Clock size={22} className="text-yellow-200 animate-pulse" />
                )}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[9px] font-black uppercase tracking-wider bg-black/25 px-2 py-0.5 rounded-full border border-white/20 text-yellow-200">
                    {rewardAlert.badge}
                  </span>
                </div>
                <h3 className="text-xs font-black text-white leading-tight truncate">
                  {rewardAlert.title}
                </h3>
                <p className="text-[10px] text-white/90 font-semibold leading-tight line-clamp-1 mt-0.5">
                  {rewardAlert.subtitle}
                </p>
              </div>

              {/* Action Button & Dismiss */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  className="px-2.5 py-1.5 rounded-xl bg-white text-slate-900 font-black text-[11px] shadow-sm flex items-center gap-1 active:scale-95"
                >
                  <span>{rewardAlert.actionText}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDismissedRewardAlert(true);
                  }}
                  className="w-6 h-6 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white/80 active:scale-90"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE GAMES SECTION */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
          <h2 className="font-bold text-slate-500 dark:text-slate-400 tracking-wider text-xs uppercase">{t[language].home.activeGames}</h2>
          <div className="flex items-center gap-1.5">
            {/* 🎮 How to Play Video Guide (Directly in the circled red spot!) */}
            <button
              onClick={() => setActiveVideoCategory('how_to_play')}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-[10.5px] font-black px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1 active:scale-95 transition-all"
              title="How to Play Tutorial"
            >
              <Gamepad2 size={11} className="text-yellow-300" />
              <span>{language === 'am' ? 'አጨዋወት' : 'How to Play'}</span>
            </button>

            {/* ▶ How to Use Video Guide */}
            <button
              onClick={() => setActiveVideoCategory('how_to_use')}
              className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-[10.5px] font-black px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1 active:scale-95 transition-all"
              title="How to Use Tutorial"
            >
              <Play size={10} className="fill-white" />
              <span>{language === 'am' ? 'አጠቃቀም' : 'How to Use'}</span>
            </button>

            {/* ⓘ Help */}
            <button onClick={handleHelp} className="text-blue-500 flex items-center space-x-1 text-xs font-semibold hover:underline ml-0.5">
              <Info size={13} />
              <span>{t[language].home.help}</span>
            </button>
          </div>
        </div>
        
        {/* Live Games Marquee Banner */}
        <Link
          to="/bingo/live"
          className="block relative rounded-2xl overflow-hidden shadow-md h-44 bg-gradient-to-br from-[#1a1a3e] to-[#0d0d1f] flex flex-col items-center justify-center border border-indigo-900/50 select-none cursor-pointer"
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="grid grid-cols-10 gap-2 p-2.5 h-full">
              {Array.from({length: 40}).map((_, i) => <div key={i} className="bg-white rounded-sm opacity-50" />)}
            </div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center text-center px-4">
            <div className="text-yellow-400 font-black text-2xl leading-tight mb-3 drop-shadow-[0_2px_8px_rgba(250,204,21,0.4)]">
              {language === 'am' ? (
                <>
                  <div>የሚቀጥለውን ጨዋታ</div>
                  <div>ይቀላቀሉ</div>
                </>
              ) : (
                <div>{t[language].home.joinNextGame}</div>
              )}
            </div>
            
            {/* 3D Pencil Color (Graphite) CTA Button with "ካርቴላዎን አሁን ይምረጡ!" */}
            <div
              className="px-7 py-2.5 rounded-full font-black text-xs active:translate-y-1 transition-all flex items-center gap-1.5 select-none"
              style={{
                background: 'linear-gradient(180deg, #94a3b8 0%, #64748b 45%, #475569 100%)',
                boxShadow: '0 3.5px 0 #1e293b, 0 4px 10px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.4)',
                border: '1px solid #94a3b8',
                color: '#ffffff',
              }}
            >
              <span>{t[language].home.pickCartela}</span>
              <span className="text-sm leading-none">➔</span>
            </div>
          </div>
        </Link>
      </div>

      {/* MEDEB (STAKES) 2x2 GRID */}
      <div className="px-4 flex-1">
        <h2 className="font-bold text-slate-500 dark:text-slate-400 tracking-wider text-xs mb-2 uppercase">{t[language].home.selectMedeb}</h2>
        
        <div className="grid grid-cols-2 gap-3">
          {[
            { amount: 10, color: 'from-blue-400 to-blue-600' },
            { amount: 20, color: 'from-emerald-400 to-emerald-600' },
            { amount: 50, color: 'from-purple-400 to-purple-600' },
            { amount: 100, color: 'from-rose-400 to-rose-600' }
          ].map((stake) => {
            const hg = homeGames[stake.amount];
            const pool = hg?.pool || 0;
            const players = hg?.players || 0;
            const hasGame = pool > 0;
            const isWaiting = hg?.status === 'waiting';
            const isCalling = hg?.status === 'calling';
            const tl = homeTimeLeft[stake.amount] || 0;
            
            let statusTxt = t[language].home.waiting;
            let statusCls = "text-orange-500";
            if (isWaiting && tl <= 86400 && tl > 0) {
              statusTxt = `${tl}s`;
            } else if (isCalling) {
              statusTxt = t[language].home.active;
              statusCls = "text-emerald-500";
            }

            return (
              <div
                key={stake.amount}
                onClick={() => navigate(`/bingo/live?stake=${stake.amount}`)}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col cursor-pointer active:scale-95 transition-all select-none"
              >
                {/* 3D Colored Header */}
                <div className={`h-16 bg-gradient-to-br ${stake.color} flex items-center justify-center relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]`}>
                  <span className="text-white font-black text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{stake.amount}</span>
                  <span className="absolute top-1.5 right-1.5 bg-white/25 px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider backdrop-blur-sm">
                    {t[language].home.etb}
                  </span>
                </div>
                
                {/* Derash / Players / Status — 3 columns */}
                <div className="w-full bg-slate-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 flex h-[35px] shrink-0">
                  <div className="flex-1 flex flex-col items-center justify-center border-r border-gray-100 dark:border-slate-800">
                    <span className="text-slate-400 dark:text-slate-500 text-[7px] font-bold uppercase tracking-wider">{t[language].home.derash}</span>
                    <span className={`text-[10px] font-black text-yellow-600 dark:text-yellow-400 ${hasGame ? 'animate-pulse' : ''}`}>{pool} ETB</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center border-r border-gray-100 dark:border-slate-800">
                    <span className="text-slate-400 dark:text-slate-500 text-[7px] font-bold uppercase tracking-wider">{t[language].home.players}</span>
                    <span className="text-[10px] font-black text-emerald-500">{players}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <span className="text-slate-400 dark:text-slate-500 text-[7px] font-bold uppercase tracking-wider">{t[language].home.status}</span>
                    <span className={`text-[10px] font-black ${statusCls}`}>{statusTxt}</span>
                  </div>
                </div>

                {/* 3D Join Button */}
                <div className="p-2 text-center">
                  <div
                    className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-xl text-xs active:translate-y-0.5 transition-all flex items-center justify-center"
                    style={{
                      boxShadow: '0 2px 0 #cbd5e1',
                    }}
                  >
                    {isWaiting ? t[language].home.joinMatch : t[language].home.joinRoom}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── NOTIFICATION MODAL / DRAWER ── */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        readIds={readNotifIds}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </div>
  );
}
