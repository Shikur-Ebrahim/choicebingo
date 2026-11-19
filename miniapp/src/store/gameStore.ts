import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import WebApp from '@twa-dev/sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface GameStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  isBlocked: boolean;
  isProfileOpen: boolean;
  isDarkMode: boolean;
  language: 'en' | 'am';
  isPhoneModalOpen: boolean;
  setIsPhoneModalOpen: (open: boolean) => void;
  setLanguage: (lang: 'en' | 'am') => void;
  setProfileOpen: (isOpen: boolean) => void;
  toggleDarkMode: () => void;
  fetchUser: () => Promise<void>;
  loginWithPhone: (phone: string) => Promise<boolean>;
  loginWithPhoneAndPass: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithPhoneAndPass: (phone: string, password: string, firstName: string) => Promise<{ success: boolean; error?: string }>;
  logoutPwaPhone: () => void;
  fetchBalanceFast: () => Promise<void>;
  subscribeToBalance: () => () => void;
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      error: null,
      isBlocked: false,
      isProfileOpen: false,
      isDarkMode: false,
      isPhoneModalOpen: false,
      language: 'am',
      setIsPhoneModalOpen: (isOpen) => set({ isPhoneModalOpen: isOpen }),
      setLanguage: (lang) => set({ language: lang }),
      setProfileOpen: (isOpen: boolean) => set({ isProfileOpen: isOpen }),
      toggleDarkMode: () => set((state) => {
        const newMode = !state.isDarkMode;
        if (newMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        return { isDarkMode: newMode };
      }),

      fetchUser: async () => {
        try {
          // Instantly show UI using Telegram data if no cache exists
          if (!get().user && typeof WebApp !== 'undefined' && WebApp.initDataUnsafe?.user) {
            const tgUser = WebApp.initDataUnsafe.user;
            set({
              user: {
                id: 'temp',
                telegram_id: tgUser.id.toString(),
                username: tgUser.username || '',
                first_name: tgUser.first_name || 'User',
                main_balance: 0,
                bonus_balance: 0,
                role: 'user',
                total_wins: 0
              }
            });
          }

          let initData = '';
          if (typeof WebApp !== 'undefined' && WebApp.initData) {
            initData = WebApp.initData;
          }

          // PWA direct phone fallback if outside Telegram
          const savedPwaPhone = localStorage.getItem('cb_pwa_phone');
          if (!initData && savedPwaPhone) {
            initData = `pwa_phone=${encodeURIComponent(savedPwaPhone)}`;
            if (typeof WebApp !== 'undefined') {
              try {
                Object.defineProperty(WebApp, 'initData', {
                  value: initData,
                  writable: true,
                  configurable: true,
                });
              } catch {}
            }
          }
          
          if (!initData) {
            // Visitor mode without auth yet
            set({ loading: false });
            return;
          }

          // Silently fetch real data in background
          const response = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-telegram-init-data': initData,
              'x-pwa-phone': savedPwaPhone || '',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.user?.status === 'inactive') {
              set({ user: data.user, loading: false, isBlocked: true });
            } else {
              set({ user: data.user, loading: false, isBlocked: false });
            }
          } else if (response.status === 403) {
            set({ loading: false, isBlocked: true });
          } else {
            // Direct Supabase fetch fallback
            const tgId = WebApp.initDataUnsafe?.user?.id?.toString() || savedPwaPhone;
            if (tgId) {
              const { data: dbUser } = await supabase.from('users').select('*').eq('telegram_id', tgId).maybeSingle();
              if (dbUser) {
                if (dbUser.status === 'inactive') {
                  set({ user: dbUser, loading: false, isBlocked: true });
                } else {
                  set({ user: dbUser, loading: false, isBlocked: false });
                }
              }
            }
          }
        } catch (error: any) {
          console.error('Error fetching user:', error);
          const tgId = WebApp.initDataUnsafe?.user?.id?.toString() || localStorage.getItem('cb_pwa_phone');
          if (tgId) {
            try {
              const { data: dbUser } = await supabase.from('users').select('*').eq('telegram_id', tgId).maybeSingle();
              if (dbUser) {
                if (dbUser.status === 'inactive') {
                  set({ user: dbUser, loading: false, isBlocked: true });
                } else {
                  set({ user: dbUser, loading: false, isBlocked: false });
                }
                return;
              }
            } catch (_) {}
          }
          set({ loading: false });
        }
      },

      loginWithPhoneAndPass: async (phone: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
          const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
          const res = await fetch(`${API_URL}/auth/pwa-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone, password })
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return { success: false, error: data.error || 'Login failed' };
          }

          if (data.user) {
            localStorage.setItem('cb_pwa_phone', cleanPhone);
            const initData = `pwa_phone=${encodeURIComponent(cleanPhone)}`;
            if (typeof WebApp !== 'undefined') {
              try {
                Object.defineProperty(WebApp, 'initData', {
                  value: initData,
                  writable: true,
                  configurable: true,
                });
              } catch {}
            }

            set({ user: data.user, loading: false, isBlocked: false });
            get().subscribeToBalance();
            return { success: true };
          }
          return { success: false, error: 'User data not returned' };
        } catch (err: any) {
          return { success: false, error: err?.message || 'Network error' };
        }
      },

      registerWithPhoneAndPass: async (phone: string, password: string, firstName: string): Promise<{ success: boolean; error?: string }> => {
        try {
          const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
          const res = await fetch(`${API_URL}/auth/pwa-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone, password, first_name: firstName })
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return { success: false, error: data.error || 'Registration failed' };
          }

          if (data.user) {
            localStorage.setItem('cb_pwa_phone', cleanPhone);
            const initData = `pwa_phone=${encodeURIComponent(cleanPhone)}`;
            if (typeof WebApp !== 'undefined') {
              try {
                Object.defineProperty(WebApp, 'initData', {
                  value: initData,
                  writable: true,
                  configurable: true,
                });
              } catch {}
            }

            set({ user: data.user, loading: false, isBlocked: false });
            get().subscribeToBalance();
            return { success: true };
          }
          return { success: false, error: 'Registration could not be completed' };
        } catch (err: any) {
          return { success: false, error: err?.message || 'Network error' };
        }
      },

      loginWithPhone: async (phone: string): Promise<boolean> => {
        try {
          const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
          const res = await fetch(`${API_URL}/auth/pwa-phone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone })
          });

          if (!res.ok) {
            return false;
          }

          const data = await res.json();
          if (data.user) {
            localStorage.setItem('cb_pwa_phone', cleanPhone);
            const initData = `pwa_phone=${encodeURIComponent(cleanPhone)}`;
            if (typeof WebApp !== 'undefined') {
              try {
                Object.defineProperty(WebApp, 'initData', {
                  value: initData,
                  writable: true,
                  configurable: true,
                });
              } catch {}
            }

            set({ user: data.user, loading: false, isBlocked: false });
            get().subscribeToBalance();
            return true;
          }
          return false;
        } catch (err) {
          console.error('PWA login with phone failed:', err);
          return false;
        }
      },

      logoutPwaPhone: () => {
        localStorage.removeItem('cb_pwa_phone');
        if (typeof WebApp !== 'undefined' && !WebApp.initDataUnsafe?.user) {
          try {
            Object.defineProperty(WebApp, 'initData', {
              value: '',
              writable: true,
              configurable: true,
            });
          } catch {}
        }
        set({ user: null });
      },

      // Ultra-fast direct balance query: executes in milliseconds directly against Supabase
      fetchBalanceFast: async () => {
        const u = get().user;
        let tgId = u?.telegram_id;
        if (!tgId && typeof WebApp !== 'undefined' && WebApp.initDataUnsafe?.user?.id) {
          tgId = WebApp.initDataUnsafe.user.id.toString();
        }
        if (!tgId && typeof window !== 'undefined') {
          tgId = localStorage.getItem('cb_pwa_phone') || undefined;
        }
        if (!tgId && !u?.id) return;

        try {
          const cleanId = tgId ? tgId.replace(/[^\d]/g, '') : '';
          let q = supabase
            .from('users')
            .select('main_balance, bonus_balance, status, role, total_wins, total_games');

          if (tgId && cleanId && cleanId !== tgId) {
            q = q.or(`telegram_id.eq.${tgId},telegram_id.eq.${cleanId}`);
          } else if (tgId) {
            q = q.eq('telegram_id', tgId);
          } else if (u?.id) {
            q = q.eq('id', u.id);
          }

          const { data, error } = await q.limit(1).maybeSingle();
          if (!error && data) {
            const newMain = Number(data.main_balance || 0);
            const newBonus = Number(data.bonus_balance || 0);
            const isInactive = data.status === 'inactive';

            const cur = get().user;
            if (
              !cur ||
              cur.main_balance !== newMain ||
              cur.bonus_balance !== newBonus ||
              cur.status !== data.status ||
              get().isBlocked !== isInactive
            ) {
              set((state) => ({
                isBlocked: isInactive,
                user: state.user ? {
                  ...state.user,
                  main_balance: newMain,
                  bonus_balance: newBonus,
                  status: data.status,
                  role: data.role || state.user.role,
                  total_wins: data.total_wins ?? state.user.total_wins,
                  total_games: data.total_games ?? state.user.total_games,
                } : null,
              }));
            }
          }
        } catch {
          // silent fallback
        }
      },

      // Realtime subscription + high-speed live sync: instantly catches deposits, transfers, and wins
      subscribeToBalance: () => {
        const getTgId = () => {
          const u = get().user;
          if (u?.telegram_id) return u.telegram_id;
          if (typeof WebApp !== 'undefined' && WebApp.initDataUnsafe?.user?.id) {
            return WebApp.initDataUnsafe.user.id.toString();
          }
          if (typeof window !== 'undefined') {
            return localStorage.getItem('cb_pwa_phone') || null;
          }
          return null;
        };

        const telegramId = getTgId();
        if (!telegramId) return () => {};

        const cleanId = telegramId.replace(/[^\d]/g, '');

        // 1. Initial immediate fast balance check
        get().fetchBalanceFast();

        // 2. High-speed smart polling interval: checks live balance directly every 2 seconds
        const pollInterval = setInterval(() => {
          get().fetchBalanceFast();
        }, 2000);

        // 3. Fast sync when window returns to focus / active screen
        const onVisibilityChange = () => {
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            get().fetchBalanceFast();
          }
        };
        const onFocus = () => {
          get().fetchBalanceFast();
        };

        if (typeof window !== 'undefined') {
          document.addEventListener('visibilitychange', onVisibilityChange);
          window.addEventListener('focus', onFocus);
        }

        // 4. Supabase Realtime WebSocket subscription (instant push when publication is enabled)
        let channel: any = null;
        try {
          channel = supabase
            .channel(`user-sync-${telegramId}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `telegram_id=eq.${telegramId}`,
              },
              (payload) => {
                const updated = payload.new as User;
                const isInactive = updated.status === 'inactive';
                set((state) => ({
                  isBlocked: isInactive,
                  user: state.user ? {
                    ...state.user,
                    main_balance: Number(updated.main_balance || 0),
                    bonus_balance: Number(updated.bonus_balance || 0),
                    status: updated.status,
                    role: updated.role,
                  } : updated,
                }));
              }
            );

          if (cleanId && cleanId !== telegramId) {
            channel.on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `telegram_id=eq.${cleanId}`,
              },
              (payload: any) => {
                const updated = payload.new as User;
                const isInactive = updated.status === 'inactive';
                set((state) => ({
                  isBlocked: isInactive,
                  user: state.user ? {
                    ...state.user,
                    main_balance: Number(updated.main_balance || 0),
                    bonus_balance: Number(updated.bonus_balance || 0),
                    status: updated.status,
                    role: updated.role,
                  } : updated,
                }));
              }
            );
          }

          channel.subscribe();
        } catch (e) {
          console.error('[gameStore] Realtime subscription error:', e);
        }

        return () => {
          clearInterval(pollInterval);
          if (typeof window !== 'undefined') {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('focus', onFocus);
          }
          if (channel) {
            try {
              supabase.removeChannel(channel);
            } catch {}
          }
        };
      },
    }),
    {
      name: 'ChoiceBingo-cache',
    }
  )
);
