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
  setLanguage: (lang: 'en' | 'am') => void;
  setProfileOpen: (isOpen: boolean) => void;
  toggleDarkMode: () => void;
  fetchUser: () => Promise<void>;
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
      language: 'am',
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
          
          // Silently fetch real data in background
          const response = await fetch(`${API_URL}/auth/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-telegram-init-data': initData,
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
            const tgId = WebApp.initDataUnsafe?.user?.id?.toString();
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
          const tgId = WebApp.initDataUnsafe?.user?.id?.toString();
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
