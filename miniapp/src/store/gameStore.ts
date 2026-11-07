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
  logoutPwaPhone: () => void;
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

      // Realtime subscription — updates balance and active/inactive status instantly
      subscribeToBalance: () => {
        const telegramId = get().user?.telegram_id || WebApp.initDataUnsafe?.user?.id?.toString();
        if (!telegramId) return () => {};

        const channel = supabase
          .channel(`user-sync-${telegramId}-${Date.now()}`)
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
                  main_balance: updated.main_balance, 
                  bonus_balance: updated.bonus_balance,
                  status: updated.status,
                  role: updated.role,
                } : updated,
              }));
            }
          )
          .subscribe();

        return () => { supabase.removeChannel(channel); };
      },
    }),
    {
      name: 'ChoiceBingo-cache',
    }
  )
);
