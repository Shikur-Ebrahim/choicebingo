import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Gift, RefreshCw, Users, Clock, Trophy, Volume2, VolumeX, RotateCcw, LayoutGrid, Wand2, Hand, Play } from "lucide-react";
import WebApp from "@twa-dev/sdk";
import { supabase } from "../lib/supabase";
import { useGameStore } from "../store/gameStore";
import { t } from '../lib/translations';
import VideoGuideModal from "../components/VideoGuideModal";

const API = import.meta.env.VITE_API_URL || "/api";

interface BGame {
  id: string; game_id: string; stake: number; prize_pool: number;
  status: "waiting" | "calling" | "finished";
  called_numbers: number[];
  winner_cartela: number | null; winner_telegram_id: string | null;
  winner_first_name: string | null; winner_prize: number | null;
  start_at: string; finished_at: string | null;
}
interface MyCard { cartela_number: number; card_matrix: number[][]; }
interface Celebration { winner_name: string; winner_cartela: number; winner_prize: number; winner_matrix: number[][] | null; iWon: boolean; called: number[]; winners_list?: {first_name: string, cartela_number: number, card_matrix: number[][]}[] }

const hdrs = () => {
  const initData = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp?.initData || '' : '';
  const pwaPhone = typeof window !== 'undefined' ? localStorage.getItem('cb_pwa_phone') || '' : '';
  return {
    "Content-Type": "application/json",
    "x-telegram-init-data": initData || (pwaPhone ? `pwa_phone=${encodeURIComponent(pwaPhone)}` : ''),
    "x-pwa-phone": pwaPhone,
  };
};

const ROW_COLORS = [
  "from-blue-500 to-blue-700","from-purple-500 to-purple-700","from-cyan-500 to-cyan-700",
  "from-red-500 to-red-700","from-orange-400 to-orange-600","from-yellow-400 to-yellow-600",
  "from-green-500 to-green-700","from-teal-500 to-teal-700","from-indigo-400 to-indigo-600",
  "from-pink-400 to-pink-600","from-violet-500 to-violet-700","from-blue-400 to-blue-600",
  "from-fuchsia-500 to-fuchsia-700","from-emerald-500 to-emerald-700","from-purple-400 to-purple-600",
];

const STAKE_OPTIONS = [
  { value: 10, label: "10 ETB", color: "from-blue-500 to-blue-700" },
  { value: 20, label: "20 ETB", color: "from-teal-500 to-teal-700" },
  { value: 50, label: "50 ETB", color: "from-purple-500 to-purple-700" },
  { value: 100, label: "100 ETB", color: "from-rose-500 to-rose-700" },
];

const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'];

const LETTER_COLOR: Record<string, string> = {
  B: '#f59e0b', I: '#3b82f6', N: '#ec4899', G: '#22c55e', O: '#a855f7',
};
const LETTER_BG: Record<string, string> = {
  B: '#3b82f6', I: '#8b5cf6', N: '#ec4899', G: '#22c55e', O: '#3b82f6',
};

// Full Amharic number words for display under the call
const AMHARIC_NUM: Record<number, string> = {
  1:'አንድ', 2:'ሁለት', 3:'ሶስት', 4:'አራት', 5:'አምስት',
  6:'ስድስት', 7:'ሰባት', 8:'ስምንት', 9:'ዘጠኝ', 10:'አስር',
  11:'አስራ አንድ', 12:'አስራ ሁለት', 13:'አስራ ሶስት', 14:'አስራ አራት', 15:'አስራ አምስት',
  16:'አስራ ስድስት', 17:'አስራ ሰባት', 18:'አስራ ስምንት', 19:'አስራ ዘጠኝ', 20:'ሃያ',
  21:'ሃያ አንድ', 22:'ሃያ ሁለት', 23:'ሃያ ሶስት', 24:'ሃያ አራት', 25:'ሃያ አምስት',
  26:'ሃያ ስድስት', 27:'ሃያ ሰባት', 28:'ሃያ ስምንት', 29:'ሃያ ዘጠኝ', 30:'ሠላሳ',
  31:'ሠላሳ አንድ', 32:'ሠላሳ ሁለት', 33:'ሠላሳ ሶስት', 34:'ሠላሳ አራት', 35:'ሠላሳ አምስት',
  36:'ሠላሳ ስድስት', 37:'ሠላሳ ሰባት', 38:'ሠላሳ ስምንት', 39:'ሠላሳ ዘጠኝ', 40:'አርባ',
  41:'አርባ አንድ', 42:'አርባ ሁለት', 43:'አርባ ሶስት', 44:'አርባ አራት', 45:'አርባ አምስት',
  46:'አርባ ስድስት', 47:'አርባ ሰባት', 48:'አርባ ስምንት', 49:'አርባ ዘጠኝ', 50:'ሃምሳ',
  51:'ሃምሳ አንድ', 52:'ሃምሳ ሁለት', 53:'ሃምሳ ሶስት', 54:'ሃምሳ አራት', 55:'ሃምሳ አምስት',
  56:'ሃምሳ ስድስት', 57:'ሃምሳ ሰባት', 58:'ሃምሳ ስምንት', 59:'ሃምሳ ዘጠኝ', 60:'ስልሳ',
  61:'ስልሳ አንድ', 62:'ስልሳ ሁለት', 63:'ስልሳ ሶስት', 64:'ስልሳ አራት', 65:'ስልሳ አምስት',
  66:'ስልሳ ስድስት', 67:'ስልሳ ሰባት', 68:'ስልሳ ስምንት', 69:'ስልሳ ዘጠኝ', 70:'ሰባ',
  71:'ሰባ አንድ', 72:'ሰባ ሁለት', 73:'ሰባ ሶስት', 74:'ሰባ አራት', 75:'ሰባ አምስት',
};

const AUDIO_VERSION = 'v3';
const getLetter = (num: number) => BINGO_LETTERS[Math.floor((num - 1) / 15)];
const getAudioSrc = (num: number) => {
  return `/audio/bingo/bingo_${String(num).padStart(2, '0')}.mp3?v=${AUDIO_VERSION}`;
};

// Pre-generated static Amharic MP3 files in /audio/bingo/

const getWinningCells = (matrix: number[][], called: number[]) => {
  const winCells = new Set<string>();
  if (!matrix || !called) return winCells;

  const calledSet = new Set((called || []).map(Number));
  const m = (r: number, c: number) => {
    const val = Number(matrix[r]?.[c] ?? -1);
    return val === 0 || calledSet.has(val);
  };

  // Rows
  for (let r = 0; r < 5; r++) {
    if ([0, 1, 2, 3, 4].every(c => m(r, c))) {
      for (let c = 0; c < 5; c++) winCells.add(`${r}-${c}`);
    }
  }

  // Columns
  for (let c = 0; c < 5; c++) {
    if ([0, 1, 2, 3, 4].every(r => m(r, c))) {
      for (let r = 0; r < 5; r++) winCells.add(`${r}-${c}`);
    }
  }

  // Diagonals
  if ([0, 1, 2, 3, 4].every(i => m(i, i))) {
    for (let i = 0; i < 5; i++) winCells.add(`${i}-${i}`);
  }
  if ([0, 1, 2, 3, 4].every(i => m(i, 4 - i))) {
    for (let i = 0; i < 5; i++) winCells.add(`${i}-${4 - i}`);
  }

  // Outer 4 corners (4 corner rule)
  if (m(0, 0) && m(0, 4) && m(4, 0) && m(4, 4)) {
    winCells.add('0-0'); winCells.add('0-4'); winCells.add('4-0'); winCells.add('4-4');
  }

  return winCells;
};

const getWinningPatternTitle = (matrix: number[][], called: number[]): string => {
  if (!matrix || !called) return 'BINGO!';
  const calledSet = new Set((called || []).map(Number));
  const m = (r: number, c: number) => {
    const val = Number(matrix[r]?.[c] ?? -1);
    return val === 0 || calledSet.has(val);
  };

  const isOuterCorners = m(0, 0) && m(0, 4) && m(4, 0) && m(4, 4);
  const isRow = [0, 1, 2, 3, 4].some(r => [0, 1, 2, 3, 4].every(c => m(r, c)));
  const isCol = [0, 1, 2, 3, 4].some(c => [0, 1, 2, 3, 4].every(r => m(r, c)));
  const isDiag = [0, 1, 2, 3, 4].every(i => m(i, i)) || [0, 1, 2, 3, 4].every(i => m(i, 4 - i));

  if (isOuterCorners && !isRow && !isCol && !isDiag) return '🎯 4 CORNERS BINGO!';
  if (isOuterCorners) return '🎯 CORNER BINGO!';
  return 'BINGO!';
};

export default function BingoGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, fetchUser: refreshUser, subscribeToBalance, language, setProfileOpen } = useGameStore();

  const urlStake = searchParams.get("stake");
  const [selectedStake, setSelectedStake] = useState<number | null>(urlStake ? Number(urlStake) : null);
  const [showStakeDropdown, setShowStakeDropdown] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState<number>(200);
  const [maxCartelasPerUser, setMaxCartelasPerUser] = useState<number>(4);
  const [myCartelas, setMyCartelas] = useState<Array<{
    cartela_number: number;
    card_matrix: number[][];
    bonus_used?: number;
    main_used?: number;
  }>>([]);
  const myCartelasRef = useRef(myCartelas);
  useEffect(() => { myCartelasRef.current = myCartelas; }, [myCartelas]);
  const [activeCartelaIdx, setActiveCartelaIdx] = useState(0);
  const [uniquePlayers, setUniquePlayers] = useState<number>(0);
  const [previewCartela, setPreviewCartela] = useState<{ seat: number; matrix: number[][] } | null>(null);
  const [homeGames, setHomeGames] = useState<Record<number, { pool: number; start_at?: string; status: string; players: number }>>({});
  const [homeTimeLeft, setHomeTimeLeft] = useState<Record<number, number>>({});
  const [soundEnabled, setSoundEnabled] = useState(() => {
    // v2: default is ALWAYS ON. Wipe any old stored 'false' so every user hears calls.
    localStorage.setItem('bingo_sound_enabled', 'true');
    return true;
  });
  const [volume, setVolume] = useState(1.0);
  const [autoMark, setAutoMark] = useState(true); // default: auto-mark called numbers
  const [manuallyMarked, setManuallyMarked] = useState<Set<number>>(new Set());
  const [claimLockSeconds, setClaimLockSeconds] = useState(0);
  const [claimErrMsg, setClaimErrMsg] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [celebrationSecondsLeft, setCelebrationSecondsLeft] = useState(5);
  const [showVideoGuide, setShowVideoGuide] = useState(false);

  // False claim penalty cooldown timer
  useEffect(() => {
    if (claimLockSeconds <= 0) return;
    const t = setInterval(() => {
      setClaimLockSeconds(s => {
        if (s <= 1) {
          clearInterval(t);
          setClaimErrMsg("");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [claimLockSeconds]);

  // Fetch and listen for active derash & status on stake selection screen
  useEffect(() => {
    if (selectedStake) return;
    let isMounted = true;

    const fetchPools = async () => {
      // Use backend API — service key bypasses RLS so unique player count is always accurate
      const r = await fetch(`${API}/bingo/pools`, { headers: hdrs() });
      if (!r.ok || !isMounted) return;
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
      if (isMounted) setHomeGames(p);
    };
    fetchPools();

    const pollTimer = setInterval(() => {
      if (document.visibilityState !== 'hidden') fetchPools();
    }, 2000);

    // Listen to table changes so home page updates in real-time
    const ch = supabase.channel('home_pools')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bingo_games' }, () => {
        if (isMounted) fetchPools();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bingo_players' }, () => {
        if (isMounted) fetchPools();
      })
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      supabase.removeChannel(ch);
    };
  }, [selectedStake]);

  // Tick timer for home screen
  useEffect(() => {
    if (selectedStake) return;
    const update = () => {
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
  }, [selectedStake, homeGames]);
  const [lastCallNum, setLastCallNum] = useState<number | null>(null);
  const [callAnim, setCallAnim] = useState(false);
  const callAudioRef = useRef<HTMLAudioElement | null>(null);
  const specialAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferCache = useRef<Map<string, AudioBuffer>>(new Map());

  // Keep AudioContext resumed and mobile media pipeline unlocked on any touch
  const unlockAudio = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (AC) audioCtxRef.current = new AC();
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch(e) {}

    try {
      const dummy = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
      dummy.volume = 0.01;
      dummy.play().catch(() => {});
    } catch(e) {}
  }, []);

  const initWebAudio = unlockAudio;

  // Listen continuously on window touch/click so audio never gets suspended during game
  useEffect(() => {
    const handleGesture = () => unlockAudio();
    window.addEventListener('touchstart', handleGesture, { passive: true });
    window.addEventListener('touchend', handleGesture, { passive: true });
    window.addEventListener('click', handleGesture, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleGesture);
      window.removeEventListener('touchend', handleGesture);
      window.removeEventListener('click', handleGesture);
    };
  }, [unlockAudio]);

  // ── RAW ARRAYBUFFER CACHE: fetched at startup, no AudioContext needed yet ──────────────────
  const rawBufferCache = useRef<Map<string, ArrayBuffer>>(new Map());

  // Pre-fetch ALL 75 call files + bingo_win as raw ArrayBuffers immediately on mount.
  // We do NOT need AudioContext for fetching. Decoding happens on-demand when we need to play.
  useEffect(() => {
    let cancel = false;
    const preload = async () => {
      const allSrcs = [
        ...Array.from({ length: 75 }, (_, i) => getAudioSrc(i + 1)),
        `/audio/bingo/game_start.mp3?v=${AUDIO_VERSION}`,
        `/audio/bingo/bingo_win.mp3?v=${AUDIO_VERSION}`,
        `/audio/bingo/stop.mp3?v=${AUDIO_VERSION}`,
      ];
      // Stagger: 3 files concurrently, small gap between batches
      for (let i = 0; i < allSrcs.length; i += 3) {
        if (cancel) break;
        await Promise.all(
          allSrcs.slice(i, i + 3).map(async (src) => {
            if (rawBufferCache.current.has(src)) return;
            try {
              const res = await fetch(src);
              if (res.ok) rawBufferCache.current.set(src, await res.arrayBuffer());
            } catch {}
          })
        );
        await new Promise(r => setTimeout(r, 50));
      }
    };
    preload();
    return () => { cancel = true; };
  }, []);

  // ── CORE WEBAUDIO PLAYER: decodes from raw cache or fetches fresh ────────────────────────
  const playViaWebAudio = useCallback(async (src: string, customGain?: number) => {
    try {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (AC) audioCtxRef.current = new AC();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') await ctx.resume();

      // Use pre-decoded AudioBuffer if cached
      let audioBuf = audioBufferCache.current.get(src);
      if (!audioBuf) {
        // Use raw bytes from preload cache (already fetched at startup)
        let raw = rawBufferCache.current.get(src);
        if (!raw) {
          const res = await fetch(src);
          if (!res.ok) return;
          raw = await res.arrayBuffer();
          rawBufferCache.current.set(src, raw);
        }
        // Must clone (.slice) the ArrayBuffer — decodeAudioData detaches the original
        audioBuf = await ctx.decodeAudioData(raw.slice(0));
        audioBufferCache.current.set(src, audioBuf);
      }

      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      gainNode.gain.value = customGain !== undefined ? customGain : Math.min(2.0, volume * 1.5);
      source.buffer = audioBuf;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
    } catch(e) {
      console.warn('WebAudio error:', e);
    }
  }, [volume]);

  const lastPlayedBallRef = useRef<number | null>(null);

  // ── EXCLUSIVE AUDIO PLAYER: Guarantees single playback, zero double-sound/echo ──────────────
  const playAudioExclusive = useCallback((src: string, vol: number = 1.0, onEnded?: () => void) => {
    // 1. Immediately pause and destroy any previous audio
    if (callAudioRef.current) {
      try {
        callAudioRef.current.onended = null;
        callAudioRef.current.onerror = null;
        callAudioRef.current.pause();
        callAudioRef.current.src = '';
      } catch {}
      callAudioRef.current = null;
    }

    let webAudioFired = false;
    const audio = new Audio(src);
    callAudioRef.current = audio;
    audio.volume = Math.min(1.0, Math.max(0.0, vol));

    if (onEnded) {
      audio.onended = () => {
        if (!webAudioFired) onEnded();
      };
    }

    const fallbackToWebAudio = () => {
      if (webAudioFired) return;
      webAudioFired = true;
      try {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.src = '';
      } catch {}
      if (callAudioRef.current === audio) {
        callAudioRef.current = null;
      }
      playViaWebAudio(src, vol);
      if (onEnded) {
        setTimeout(onEnded, 3000);
      }
    };

    audio.onerror = fallbackToWebAudio;

    const p = audio.play();
    if (p !== undefined) {
      p.catch(() => {
        fallbackToWebAudio();
      });
    }
  }, [playViaWebAudio]);

  // ── CALLER SOUND ─────────────────────────────────────────────────────────────────────────
  const playCallAudio = useCallback((num: number) => {
    if (!soundEnabled) return;
    const cleanNum = Number(num);
    if (!cleanNum || isNaN(cleanNum) || cleanNum < 1 || cleanNum > 75) return;

    // STRICT DEDUP GUARD: Never play the exact same ball number twice!
    if (lastPlayedBallRef.current === cleanNum) return;
    lastPlayedBallRef.current = cleanNum;

    setLastCallNum(cleanNum);
    setCallAnim(false);
    setTimeout(() => setCallAnim(true), 20);

    const src = getAudioSrc(cleanNum);
    unlockAudio();
    playAudioExclusive(src, volume);
  }, [soundEnabled, volume, unlockAudio, playAudioExclusive]);

  // ── CELEBRATION ──────────────────────────────────────────────────────────────────────────
  // Plays stop.mp3 upon BINGO / game finish.
  // Plays at full volume with guaranteed dual playback on mobile.
  const playSpecial = useCallback((name: string = 'stop') => {
    const src = `/audio/bingo/${name}.mp3?v=${AUDIO_VERSION}`;
    unlockAudio();

    // Stop caller voice and intro immediately
    if (introTimeoutRef.current) {
      clearTimeout(introTimeoutRef.current);
      introTimeoutRef.current = null;
    }
    introPlayingRef.current = false;
    pendingCallRef.current = null;

    if (startAudioElRef.current) {
      try {
        startAudioElRef.current.onended = null;
        startAudioElRef.current.onerror = null;
        startAudioElRef.current.pause();
        startAudioElRef.current.src = '';
      } catch {}
      startAudioElRef.current = null;
    }

    playAudioExclusive(src, 1.0);
  }, [unlockAudio, playAudioExclusive]);

  // ── GAME START INTRO ─────────────────────────────────────────────────────────────────────
  // Plays /audio/bingo/game_start.mp3 once when the game begins.
  // Sequential queuing: while game_start is playing, any ball call is held in pendingCallRef.
  const introPlayingRef = useRef(false);
  const introTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCallRef = useRef<number | null>(null);
  const hasStartedAudioGameIdRef = useRef<string | null>(null);
  const prevGameStatusRef = useRef<string | null>(null);
  const startAudioElRef = useRef<HTMLAudioElement | null>(null);

  const playGameStart = useCallback(() => {
    if (!soundEnabled) {
      introPlayingRef.current = false;
      return;
    }
    const src = `/audio/bingo/game_start.mp3?v=${AUDIO_VERSION}`;
    unlockAudio();
    introPlayingRef.current = true;

    if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);

    const onIntroEnd = () => {
      if (introTimeoutRef.current) {
        clearTimeout(introTimeoutRef.current);
        introTimeoutRef.current = null;
      }
      introPlayingRef.current = false;
      if (pendingCallRef.current !== null) {
        const queuedNum = pendingCallRef.current;
        pendingCallRef.current = null;
        playCallAudio(queuedNum);
      }
    };

    // HARD SAFETY: Game start intro is ~3.0s. Force unlock after 3200ms no matter what browser does!
    introTimeoutRef.current = setTimeout(onIntroEnd, 3200);

    playAudioExclusive(src, volume, onIntroEnd);
  }, [soundEnabled, volume, unlockAudio, playAudioExclusive, playCallAudio]);



  useEffect(() => {
    if (!user?.telegram_id) return;
    const unsub = subscribeToBalance();
    return () => unsub();
  }, [subscribeToBalance, user?.telegram_id]);

  const [game, setGame] = useState<BGame | null>(null);
  const [taken, setTaken] = useState<number[]>([]);
  const [myCard, setMyCard] = useState<MyCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState<number | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const prevCalledLenRef = useRef(0);
  const hadCartelasRef = useRef(false);
  const hasCelebratedRef = useRef<string | null>(null);
  const hasCelebratedSoundRef = useRef<string | null>(null);
  const isCelebratingRef = useRef(false);

  // Sync Auto/Manual play mode with backend BingoEngine
  useEffect(() => {
    if (game?.id && game.status === 'calling') {
      fetch(`${API}/bingo/mode`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({ game_id: game.id, is_auto: autoMark }),
      }).catch(() => {});
    }
  }, [game?.id, game?.status, autoMark]);

  // Clear any leftover state when changing stakes or unmounting so no old game data is stored
  useEffect(() => {
    setGame(null);
    setTaken([]);
    setMyCard(null);
    setMyCartelas([]);
    setCelebration(null);
    gameIdRef.current = null;
    prevCalledLenRef.current = 0;
    hasCelebratedRef.current = null;
    hasCelebratedSoundRef.current = null;
    isCelebratingRef.current = false;
    hasStartedAudioGameIdRef.current = null;
    lastPlayedBallRef.current = null;
    prevGameStatusRef.current = null;
    if (introTimeoutRef.current) clearTimeout(introTimeoutRef.current);
    introPlayingRef.current = false;
    pendingCallRef.current = null;
    try {
      if (startAudioElRef.current) {
        startAudioElRef.current.pause();
        startAudioElRef.current.currentTime = 0;
      }
    } catch {}
    setManuallyMarked(new Set());
    setClaimLockSeconds(0);
    setClaimErrMsg("");
    setIsClaiming(false);
    setActiveCartelaIdx(0);
    setPreviewCartela(null);
    return () => {
      setGame(null);
      setCelebration(null);
      setMyCard(null);
      setMyCartelas([]);
      setClaimLockSeconds(0);
      setClaimErrMsg("");
      setIsClaiming(false);
      hasCelebratedRef.current = null;
      hasCelebratedSoundRef.current = null;
      isCelebratingRef.current = false;
      hasStartedAudioGameIdRef.current = null;
      lastPlayedBallRef.current = null;
      prevGameStatusRef.current = null;
      introPlayingRef.current = false;
      pendingCallRef.current = null;
      gameIdRef.current = null;
    };
  }, [selectedStake]);

  const fetchState = useCallback(async () => {
    if (!selectedStake) return;
    if (isCelebratingRef.current) return;
    if (!game) setLoading(true);
    try {
      const excludeParam = hasCelebratedRef.current ? `&exclude_id=${hasCelebratedRef.current}` : '';
      const r = await fetch(`${API}/bingo/current?stake=${selectedStake}${excludeParam}`, { headers: hdrs() });
      if (r.ok) {
        const d = await r.json();
        // If server returns finished game that we already celebrated, ignore it
        if (d.game && d.game.status === 'finished') {
          if (hasCelebratedRef.current === d.game.id) {
            return;
          }
          isCelebratingRef.current = true;
        }
        if (d.max_players) setMaxPlayers(Math.min(500, Number(d.max_players)));
        if (d.max_cartelas_per_user) setMaxCartelasPerUser(Number(d.max_cartelas_per_user));
        
        // Merge server cartelas with any pending local optimistic cartelas (avoids flicker!)
        if (d.my_cartelas && Array.isArray(d.my_cartelas)) {
          setMyCartelas(prev => {
            const serverNums = new Set(d.my_cartelas.map((c: any) => c.cartela_number));
            const pendingOptimistic = prev.filter(c => !serverNums.has(c.cartela_number));
            return [...d.my_cartelas, ...pendingOptimistic];
          });
        }
        if (d.unique_players !== undefined) setUniquePlayers(Number(d.unique_players));

        // Preserve optimistic cartela numbers in taken list
        const mergeTaken = (serverTaken: number[] = []) => {
          const combined = new Set([...serverTaken, ...myCartelasRef.current.map(c => c.cartela_number)]);
          return Array.from(combined);
        };

        if (d.game && d.game.id !== gameIdRef.current) {
          setGame(d.game);
          setTaken(mergeTaken(d.taken_cartelas ?? []));
          if (d.my_card) setMyCard(d.my_card);
          gameIdRef.current = d.game.id;
          prevCalledLenRef.current = d.game.called_numbers?.length || 0;
          setManuallyMarked(new Set()); // Reset manual marks on new game
          if (d.game.status !== 'finished') {
            hasCelebratedRef.current = null;
          }
        } else if (d.game) {
          setGame(d.game);
          setTaken(mergeTaken(d.taken_cartelas ?? []));
          if (d.my_card && !myCard) setMyCard(d.my_card);
        }
      } else {
        // Direct Supabase fallback if API returns non-ok
        const { data: dbGame } = await supabase
          .from('bingo_games')
          .select('*')
          .eq('stake', selectedStake)
          .in('status', ['waiting', 'calling'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dbGame) {
          setGame(dbGame as BGame);
          if (dbGame.id !== gameIdRef.current) {
            gameIdRef.current = dbGame.id;
            prevCalledLenRef.current = dbGame.called_numbers?.length || 0;
            setManuallyMarked(new Set());
          }
          const { data: pRows } = await supabase
            .from('bingo_players')
            .select('cartela_number, telegram_id, card_matrix, bonus_used, main_used')
            .eq('game_id', dbGame.id);

          const takenNums = (pRows || []).map((p: any) => Number(p.cartela_number));
          setTaken(takenNums);
          const myTgId = user?.telegram_id || WebApp?.initDataUnsafe?.user?.id?.toString() || localStorage.getItem('cb_pwa_phone');
          if (myTgId) {
            const myRows = (pRows || []).filter((p: any) => p.telegram_id === myTgId);
            const myCart = myRows.map((p: any) => ({
              cartela_number: p.cartela_number,
              card_matrix: p.card_matrix,
              bonus_used: Number(p.bonus_used || 0),
              main_used: Number(p.main_used || 0),
            }));
            setMyCartelas(prev => {
              const serverNums = new Set(myCart.map((c: any) => c.cartela_number));
              const pendingOptimistic = prev.filter(c => !serverNums.has(c.cartela_number));
              return [...myCart, ...pendingOptimistic];
            });
            if (myCart.length > 0) setMyCard(myCart[0]);
          }
        }
      }
    } catch {
      // Direct Supabase fallback on network exception
      try {
        const { data: dbGame } = await supabase
          .from('bingo_games')
          .select('*')
          .eq('stake', selectedStake)
          .in('status', ['waiting', 'calling'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dbGame) {
          setGame(dbGame as BGame);
          if (dbGame.id !== gameIdRef.current) {
            gameIdRef.current = dbGame.id;
            prevCalledLenRef.current = dbGame.called_numbers?.length || 0;
            setManuallyMarked(new Set());
          }
        }
      } catch {}
    } finally { setLoading(false); }
  }, [selectedStake]);

  useEffect(() => { if (selectedStake) fetchState(); }, [selectedStake, fetchState]);

  // Active game polling heartbeat — guarantees game NEVER gets stuck, even if WebSockets disconnect
  useEffect(() => {
    if (!selectedStake) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      fetchState();
    }, 1500);
    return () => clearInterval(interval);
  }, [selectedStake, fetchState]);

  useEffect(() => {
    if (!selectedStake) return;
    const ch = supabase.channel(`bingo-rt-${selectedStake}-${Date.now()}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bingo_games" }, ({ new: g }) => {
        if (Number(g.stake) === selectedStake) {
          if (isCelebratingRef.current && g.id !== gameIdRef.current) return;
          if (g.status === 'finished') {
            isCelebratingRef.current = true;
          }
          setGame(g as BGame);
          if (g.id !== gameIdRef.current) {
            gameIdRef.current = g.id;
            prevCalledLenRef.current = 0;
            setManuallyMarked(new Set());
            fetchState();
          }
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bingo_games" }, () => {
        if (isCelebratingRef.current) return;
        fetchState();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bingo_players" }, ({ new: p }) => {
        const np = p as { game_id: string; cartela_number: number; telegram_id: string };
        if (np.game_id === gameIdRef.current) {
          setTaken(prev => prev.includes(np.cartela_number) ? prev : [...prev, np.cartela_number]);
          // Don't trigger premature fetchState if this insert came from the current player
          const myTg = String(user?.telegram_id || WebApp?.initDataUnsafe?.user?.id || localStorage.getItem('cb_pwa_phone') || '');
          if (np.telegram_id !== myTg) {
            fetchState();
          }
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedStake, fetchState]);

  useEffect(() => {
    if (!game || game.status !== "waiting") return;
    const update = () => {
      if (document.visibilityState === 'hidden') return;
      const rem = Math.max(0, Math.ceil((new Date(game.start_at).getTime() - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem === 0) {
        // Countdown reached 0 — fetch state immediately so calling starts with 0 delay
        fetchState();
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [game?.status, game?.start_at, fetchState]);

  const called = game?.called_numbers ?? [];
  const lastNum = called.length > 0 ? Number(called[called.length - 1]) : null;

  useEffect(() => {
    if (!game) return;

    if (game.status === 'calling') {
      const isNewGame = hasStartedAudioGameIdRef.current !== game.id;
      const transitionedFromWaiting = prevGameStatusRef.current === 'waiting';

      if (isNewGame) {
        hasStartedAudioGameIdRef.current = game.id;
        lastPlayedBallRef.current = null;
        // Only play game_start if the game is fresh (0 balls called or just transitioned from waiting)
        if (called.length === 0 || transitionedFromWaiting) {
          playGameStart();
        }
      }

      if (called.length > prevCalledLenRef.current) {
        if (lastNum) {
          if (introPlayingRef.current && called.length <= 1) {
            // Only the very first ball (#1) can be queued behind game_start intro
            pendingCallRef.current = lastNum;
          } else {
            introPlayingRef.current = false;
            playCallAudio(lastNum);
          }
        }
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.impactOccurred('medium');
      }
    }

    prevGameStatusRef.current = game.status;
    prevCalledLenRef.current = called.length;
  }, [called.length, game?.status, game?.id, lastNum, playCallAudio, playGameStart]);

  // Fire celebration when game finishes — play stop sound + display 3D celebration card by any means
  useEffect(() => {
    if (game?.status !== 'finished') return;
    if (hasCelebratedRef.current === game.id) return;

    // Suppress only if game finished more than 30s ago (stale game history)
    const finishTime = game.finished_at ? new Date(game.finished_at).getTime() : 0;
    if (finishTime > 0 && Date.now() - finishTime > 30_000) {
      hasCelebratedRef.current = game.id;
      fetchState();
      return;
    }

    hasCelebratedRef.current = game.id;
    isCelebratingRef.current = true;

    // 1. ── REMATCH: 3+ way tie ──
    if (game.winner_first_name === 'REMATCH') {
      setCelebration({
        winner_name: 'REMATCH',
        winner_cartela: 0,
        winner_prize: 0,
        winner_matrix: null,
        iWon: false,
        called: [...(game.called_numbers || [])],
      });
      return;
    }

    // 4. ── Normal Win or 2-way tie ──
    const iWon = game.winner_telegram_id === String(user?.telegram_id);
    let isMounted = true;

    if (game.winner_first_name && game.winner_first_name.includes(' & ')) {
      // Show celebration card immediately with zero delay
      setCelebration({
        winner_name: game.winner_first_name || 'Players',
        winner_cartela: 0,
        winner_prize: game.winner_prize || 0,
        winner_matrix: null,
        winners_list: [],
        iWon,
        called: [...(game.called_numbers || [])],
      });

      fetch(`${API}/bingo/winners?game_id=${game.id}`, { headers: hdrs() })
        .then(r => r.json())
        .then(data => {
          if (!isMounted) return;
          setCelebration(prev => (prev ? { ...prev, winners_list: data.winners } : null));
        })
        .catch(() => {});
    } else {
      const localCard = myCartelas.find(c => c.cartela_number === game.winner_cartela)?.card_matrix;
      if (localCard) {
        setCelebration({
          winner_name: game.winner_first_name || 'Player',
          winner_cartela: game.winner_cartela || 0,
          winner_prize: game.winner_prize || 0,
          winner_matrix: localCard,
          iWon,
          called: [...(game.called_numbers || [])],
        });
      } else if (game.winner_cartela) {
        // Immediately show celebration card so user sees it with zero delay!
        setCelebration({
          winner_name: game.winner_first_name || 'Player',
          winner_cartela: game.winner_cartela,
          winner_prize: game.winner_prize || 0,
          winner_matrix: null,
          iWon,
          called: [...(game.called_numbers || [])],
        });

        fetch(`${API}/bingo/card?game_id=${game.id}&cartela=${game.winner_cartela}`, { headers: hdrs() })
          .then(r => r.json())
          .then(data => {
            if (!isMounted) return;
            setCelebration(prev => (prev ? { ...prev, winner_matrix: data.matrix || null } : null));
          })
          .catch(() => {});
      } else {
        // Fallback for any other game finish: by any means show celebration card!
        setCelebration({
          winner_name: game.winner_first_name || 'Bingo Winner',
          winner_cartela: 0,
          winner_prize: game.winner_prize || 0,
          winner_matrix: null,
          iWon,
          called: [...(game.called_numbers || [])],
        });
      }
    }

    return () => { isMounted = false; };
  }, [game?.status, game?.id, game?.winner_cartela, game?.winner_first_name, game?.winner_prize, game?.finished_at]);

  // Auto-dismiss celebration after exactly 5 seconds with live countdown
  useEffect(() => {
    if (!celebration) {
      setCelebrationSecondsLeft(5);
      return;
    }

    // Play stop.mp3 sound & trigger haptics EXACTLY when celebration card appears on screen!
    if (hasCelebratedSoundRef.current !== game?.id) {
      hasCelebratedSoundRef.current = game?.id || 'sound';
      playSpecial('stop');
      if (WebApp?.HapticFeedback) {
        WebApp.HapticFeedback.notificationOccurred('success');
      }
    }

    setCelebrationSecondsLeft(5);
    const interval = setInterval(() => {
      setCelebrationSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    // After 2 seconds: automatically prepare and fetch the new waiting game in background
    const bgLoadTimer = setTimeout(() => {
      isCelebratingRef.current = false;
      setMyCard(null);
      setMyCartelas([]);
      setActiveCartelaIdx(0);
      setTaken([]);
      fetchState();
    }, 2000);

    // After 5 seconds: dismiss celebration card so user immediately sees the already-loaded new game!
    const dismissTimer = setTimeout(() => {
      isCelebratingRef.current = false;
      setCelebration(null);
      setMyCard(null);
      setMyCartelas([]);
      setActiveCartelaIdx(0);
      setTaken([]);
      setGame(prev => prev && prev.status === 'finished' ? { ...prev, status: 'waiting', called_numbers: [] } : prev);
      fetchState();
      refreshUser();
    }, 5000);

    return () => {
      clearTimeout(bgLoadTimer);
      clearTimeout(dismissTimer);
      clearInterval(interval);
    };
  }, [celebration]);

  // Generate matrix client-side for preview
  const generateBingoCard = () => {
    const zones: [number, number][] = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
    const card: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    for (let col = 0; col < 5; col++) {
      const [lo, hi] = zones[col];
      const chosen = new Set<number>();
      while (chosen.size < 5) chosen.add(Math.floor(Math.random() * (hi - lo + 1)) + lo);
      const nums = Array.from(chosen);
      for (let row = 0; row < 5; row++) card[row][col] = nums[row];
    }
    card[2][2] = 0;
    return card;
  };

  const [releasing, setReleasing] = useState<number | null>(null);
  const lastSeatClickTimeRef = useRef<{ [seat: number]: number }>({});
  const pendingSeatsRef = useRef<Set<number>>(new Set());

  const releaseCartela = async (seat: number) => {
    if (!game || game.status !== 'waiting' || releasing !== null) return;
    initWebAudio();

    const stakeAmt = Number(game.stake || selectedStake || 10);
    setReleasing(seat);
    setErrMsg("");

    // Optimistic remove
    const prevMyCartelas = myCartelas;
    const prevTaken = taken;
    const prevUser = user;
    const newCartelas = myCartelas.filter(c => c.cartela_number !== seat);
    setMyCartelas(newCartelas);
    myCartelasRef.current = newCartelas;
    setTaken(prev => prev.filter(n => n !== seat));
    if (newCartelas.length > 0) {
      setMyCard(newCartelas[0]);
    } else {
      setMyCard(null);
    }

    // Optimistic refund back to the exact balance(s) it was purchased with (bonus first if paid with bonus)
    const targetCard = prevMyCartelas.find(c => c.cartela_number === seat);
    const bonusToRefund = targetCard?.bonus_used !== undefined ? Number(targetCard.bonus_used) : 0;
    const mainToRefund = targetCard?.main_used !== undefined ? Number(targetCard.main_used) : (stakeAmt - bonusToRefund);

    useGameStore.setState(s => ({
      user: s.user ? {
        ...s.user,
        main_balance: Number(s.user.main_balance || 0) + mainToRefund,
        bonus_balance: Number(s.user.bonus_balance || 0) + bonusToRefund,
      } : s.user
    }));

    try {
      const res = await fetch(`${API}/bingo/release`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ cartela_number: seat, game_id: game.id })
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        if (WebApp?.HapticFeedback) {
          WebApp.HapticFeedback.notificationOccurred("success");
        }
        if (data.main_balance !== undefined && data.bonus_balance !== undefined) {
          useGameStore.setState(s => ({
            user: s.user ? {
              ...s.user,
              main_balance: Number(data.main_balance),
              bonus_balance: Number(data.bonus_balance),
            } : s.user
          }));
        }
        if (data.unique_players !== undefined) setUniquePlayers(Number(data.unique_players));
        if (data.total_cartelas !== undefined) {
          const rawPool = data.total_cartelas * stakeAmt;
          setGame(prev => prev ? { ...prev, prize_pool: data.prize_pool || (data.unique_players < 3 ? rawPool : Math.floor(rawPool * 0.8)) } : prev);
        }
        refreshUser();
        fetchState();
      } else {
        // Rollback on failure
        setMyCartelas(prevMyCartelas);
        myCartelasRef.current = prevMyCartelas;
        setTaken(prevTaken);
        useGameStore.setState({ user: prevUser });
        setErrMsg(data?.error || "Could not release cartela");
        fetchState();
      }
    } catch (err: any) {
      setMyCartelas(prevMyCartelas);
      myCartelasRef.current = prevMyCartelas;
      setTaken(prevTaken);
      useGameStore.setState({ user: prevUser });
      setErrMsg("Network error while releasing cartela");
    } finally {
      setReleasing(null);
    }
  };

  const handleSeatClick = (seat: number) => {
    const isMine = myCartelas.some(c => c.cartela_number === seat);
    if (isMine) {
      // Check double click / tap within 450ms
      const now = Date.now();
      const lastClick = lastSeatClickTimeRef.current[seat] || 0;
      if (now - lastClick < 450) {
        releaseCartela(seat);
        lastSeatClickTimeRef.current[seat] = 0;
      } else {
        lastSeatClickTimeRef.current[seat] = now;
        if (WebApp?.HapticFeedback) {
          WebApp.HapticFeedback.impactOccurred("light");
        }
      }
      return;
    }

    if (taken.includes(seat) || pendingSeatsRef.current.has(seat) || buying !== null) return;

    if (myCartelas.length >= maxCartelasPerUser) {
      setErrMsg(language === 'am' ? `ቢበዛ ${maxCartelasPerUser} ካርቴላ መምረጥ ይችላሉ` : `Max ${maxCartelasPerUser} cartelas allowed`);
      return;
    }

    // Direct buy without preview popup!
    const matrix = generateBingoCard();
    joinGame(seat, matrix);
  };

  const openPreview = (seat: number) => {
    handleSeatClick(seat);
  };

  const joinGame = async (seat: number, matrix: number[][]) => {
    if (pendingSeatsRef.current.has(seat)) return;
    pendingSeatsRef.current.add(seat);

    setPreviewCartela(null);
    initWebAudio();

    const isTelegramUser = typeof WebApp !== 'undefined' && Boolean(WebApp.initDataUnsafe?.user?.id);
    const hasPwaPhone = typeof window !== 'undefined' && Boolean(localStorage.getItem('cb_pwa_phone'));
    if (!isTelegramUser && !hasPwaPhone) {
      pendingSeatsRef.current.delete(seat);
      useGameStore.getState().setIsPhoneModalOpen(true);
      return;
    }

    if (!game || game.status !== "waiting") {
      pendingSeatsRef.current.delete(seat);
      return;
    }
    if (myCartelas.length >= maxCartelasPerUser) {
      pendingSeatsRef.current.delete(seat);
      setErrMsg(`Max ${maxCartelasPerUser} cartela${maxCartelasPerUser > 1 ? 's' : ''} per game`);
      return;
    }
    if (taken.includes(seat)) {
      pendingSeatsRef.current.delete(seat);
      setErrMsg("Taken! Pick another.");
      return;
    }
    const bonusBal = Number(user?.bonus_balance || 0), mainBal = Number(user?.main_balance || 0);
    if (!user || bonusBal + mainBal < game.stake) {
      pendingSeatsRef.current.delete(seat);
      setErrMsg(`Need ${game.stake} ETB`);
      return;
    }

    // Instant haptic feedback for super-snappy response
    try { WebApp?.HapticFeedback?.impactOccurred("medium"); } catch {}

    // Optimistic balance update: Deduct from BONUS BALANCE first, remainder from MAIN BALANCE
    const stakeAmt = Number(game.stake);
    let optBonusUsed = 0;
    let optMainUsed = 0;
    let nb = bonusBal;
    let nm = mainBal;

    if (nb >= stakeAmt) {
      optBonusUsed = stakeAmt;
      nb -= stakeAmt;
    } else {
      optBonusUsed = nb;
      const remainder = stakeAmt - nb;
      nb = 0;
      optMainUsed = remainder;
      nm -= remainder;
    }

    // OPTIMISTIC SELECTION: Immediately add cartela and mark seat green with zero lag!
    const optimisticCard = {
      cartela_number: seat,
      card_matrix: matrix,
      bonus_used: optBonusUsed,
      main_used: optMainUsed,
    };
    const prevMyCartelas = myCartelas;
    const prevTaken = taken;
    const prevUser = user;

    setMyCartelas(prev => [...prev, optimisticCard]);
    myCartelasRef.current = [...myCartelasRef.current, optimisticCard];
    setMyCard(optimisticCard);
    setTaken(prev => [...prev, seat]);
    setErrMsg("");

    useGameStore.setState(s => ({ user: s.user ? { ...s.user, main_balance: nm, bonus_balance: nb } : s.user }));

    // Optimistic prize pool update
    const isFirstCartela = prevMyCartelas.length === 0;
    const newUniquePlayers = isFirstCartela ? uniquePlayers + 1 : uniquePlayers;
    const newTotalCartelas = prevTaken.length + 1;
    const rawPool = newTotalCartelas * stakeAmt;
    setGame(prev => prev ? { ...prev, prize_pool: newUniquePlayers < 3 ? rawPool : Math.floor(rawPool * 0.8) } : prev);

    try {
      const r = await fetch(`${API}/bingo/join`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({ cartela_number: seat, stake: selectedStake, game_id: game.id, card_matrix: matrix })
      });
      let d: any = null;
      try { d = await r.json(); } catch {}
      if (r.ok && d) {
        try { WebApp?.HapticFeedback?.notificationOccurred("success"); } catch {}
        if (d.card_matrix || d.bonus_used !== undefined) {
          setMyCartelas(prev => prev.map(c => c.cartela_number === seat ? {
            ...c,
            ...(d.card_matrix ? { card_matrix: d.card_matrix } : {}),
            bonus_used: d.bonus_used !== undefined ? Number(d.bonus_used) : c.bonus_used,
            main_used: d.main_used !== undefined ? Number(d.main_used) : c.main_used,
          } : c));
        }
        if (d.main_balance !== undefined && d.bonus_balance !== undefined) {
          useGameStore.setState(s => ({
            user: s.user ? {
              ...s.user,
              main_balance: Number(d.main_balance),
              bonus_balance: Number(d.bonus_balance),
            } : s.user
          }));
        }
        if (d.unique_players !== undefined) setUniquePlayers(Number(d.unique_players));
        refreshUser();
      } else {
        // Rollback on server error
        setMyCartelas(prevMyCartelas);
        myCartelasRef.current = prevMyCartelas;
        setTaken(prevTaken);
        useGameStore.setState({ user: prevUser });
        const errMsg = d?.error || d?.message || (r.status === 401 ? "Session expired, please restart" : (r.status === 400 ? "Cartela unavailable, please pick another" : "Could not join."));
        setErrMsg(errMsg);
        fetchState();
      }
    } catch (err: any) { 
      // Rollback on network failure
      setMyCartelas(prevMyCartelas);
      myCartelasRef.current = prevMyCartelas;
      setTaken(prevTaken);
      useGameStore.setState({ user: prevUser });
      setErrMsg("Network error, please retry.");
    } finally {
      pendingSeatsRef.current.delete(seat);
    }
  };

  const handleClaimBingo = async () => {
    if (claimLockSeconds > 0 || isClaiming || !game || game.status !== 'calling') return;

    // Check if any of the player's cartelas has a winning pattern with called numbers
    let winningCartela: { cartela_number: number; card_matrix: number[][] } | null = null;

    for (const c of myCartelas) {
      const winCells = getWinningCells(c.card_matrix, called);
      if (winCells.size > 0) {
        winningCartela = c;
        break;
      }
    }

    if (!winningCartela) {
      // FALSE BINGO! Penalty lock activates for 10 seconds
      if (WebApp?.HapticFeedback) {
        WebApp.HapticFeedback.notificationOccurred("error");
      }
      setClaimLockSeconds(10);
      setClaimErrMsg(t[language].bingo.falseBingoLocked.replace('{s}', '10'));
      return;
    }

    // VALID BINGO! Send claim to server
    setIsClaiming(true);
    if (WebApp?.HapticFeedback) {
      WebApp.HapticFeedback.notificationOccurred("success");
    }

    try {
      const res = await fetch(`${API}/bingo/claim`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({
          game_id: game.id,
          cartela_number: winningCartela.cartela_number,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error && (data.error.includes('False') || data.error.includes('No winning') || data.error.includes('pattern'))) {
          setClaimLockSeconds(10);
          setClaimErrMsg(t[language].bingo.falseBingoLocked.replace('{s}', '10'));
          if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred("error");
        } else {
          setClaimErrMsg(data.error || "Claim failed");
        }
      } else {
        // Win confirmed by server — celebration effect handles sound and 3D card
      }
    } catch (err: any) {
      console.error('Claim bingo error:', err);
      setClaimErrMsg("Network error, please try again");
    } finally {
      setIsClaiming(false);
    }
  };

  const fm = (a: number | undefined) => (a || 0).toLocaleString("en-US");
  const initial = user?.first_name ? user.first_name.charAt(0).toUpperCase() : "U";
  let statusTxt = "Finished", statusCls = "text-slate-400";
  if (game?.status === "waiting") { statusTxt = timeLeft > 86400 ? "Waiting..." : `${timeLeft}s`; statusCls = "text-orange-400"; }
  else if (game?.status === "calling") { statusTxt = "Active"; statusCls = "text-emerald-400"; }

  const Header = () => (
    <div
      className="px-3.5 py-2.5 border-b flex items-center justify-between shrink-0"
      style={{
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.12)',
      }}
    >
      <div
        onClick={() => {
          try { WebApp.HapticFeedback?.impactOccurred('light'); } catch (_) {}
          setProfileOpen(true);
        }}
        className="flex items-center space-x-2.5 cursor-pointer active:scale-95 transition-transform group"
        title={language === 'am' ? 'መገለጫ' : 'Profile'}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg group-hover:opacity-95 transition-opacity"
          style={{
            background: 'radial-gradient(circle at 35% 25%, #34d399 0%, #10b981 50%, #047857 100%)',
            boxShadow: '0 3px 0 #064e3b, 0 3px 8px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.7)',
            border: '1.5px solid #6ee7b7',
          }}
        >
          {initial}
        </div>
        <div>
          <p className="font-black text-sm uppercase tracking-wider text-slate-100 drop-shadow-sm leading-tight group-hover:text-amber-400 transition-colors">
            {user?.first_name || "USER"}
          </p>
          <span className="text-[8.5px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
            ONLINE
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-2 text-right">
        {/* Bonus Balance 3D capsule */}
        <div
          className="flex flex-col items-center px-2 py-1 rounded-xl"
          style={{
            background: 'linear-gradient(180deg, #2e1065 0%, #170933 100%)',
            border: '1px solid rgba(192, 132, 252, 0.35)',
            boxShadow: '0 2px 0 #0f0720, inset 0 1px 1px rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-center gap-1">
            <Gift size={11} className="text-purple-400" />
            <span className="text-[8px] font-bold text-purple-300 uppercase">BONUS</span>
          </div>
          <p className="text-[11px] font-black text-purple-200 leading-tight">
            {fm(user?.bonus_balance)} ETB
          </p>
        </div>

        {/* Main Balance 3D capsule */}
        <div
          className="flex flex-col items-end px-2.5 py-1 rounded-xl"
          style={{
            background: 'linear-gradient(180deg, #064e3b 0%, #022c22 100%)',
            border: '1px solid rgba(52, 211, 153, 0.4)',
            boxShadow: '0 2px 0 #011a14, inset 0 1px 1px rgba(255,255,255,0.15)',
          }}
        >
          <p className="text-[8px] font-bold text-emerald-300 uppercase leading-none">
            {t[language].bingo.wallet}
          </p>
          <p className="text-xs font-black text-emerald-300 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)] leading-tight">
            {fm(user?.main_balance)} ETB
          </p>
        </div>
      </div>
    </div>
  );

  if (!selectedStake) {
    return (
      <div className="h-[calc(100dvh-80px)] w-full bg-slate-50 dark:bg-[#070b14] flex flex-col select-none overflow-hidden relative transition-colors" onClick={initWebAudio}>
        
        {/* Background grid */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" style={{ display: 'grid', gridTemplateColumns: 'repeat(15, minmax(0, 1fr))', gap: '2px', padding: '2px' }}>
          {Array.from({ length: 150 }, (_, i) => (
            <div key={i} className="flex items-center justify-center bg-black dark:bg-cyan-400 rounded-[3px] text-black dark:text-cyan-400 font-black" style={{ fontSize: '6px' }}>{i + 1}</div>
          ))}
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* 3D Header with Light & Dark support */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.4)] transition-colors">
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{
                  background: 'radial-gradient(circle at 35% 25%, #34d399 0%, #10b981 50%, #047857 100%)',
                  boxShadow: '0 2.5px 0 #064e3b, 0 3px 6px rgba(0,0,0,0.15)',
                  border: '1.5px solid #6ee7b7',
                }}
              >
                {initial}
              </div>
              <p className="font-bold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-100">{user?.first_name || "USER"}</p>
            </div>
            <div className="flex items-center space-x-4 text-right">
              <div className="flex flex-col items-center">
                <Gift size={14} className="text-purple-600 dark:text-purple-400 mb-0.5" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{fm(user?.bonus_balance)} ETB</p>
              </div>
              <div className="flex flex-col items-end">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t[language].bingo.wallet}</p>
                <p className="text-sm font-bold text-green-600 dark:text-green-400">{fm(user?.main_balance)} ETB</p>
              </div>
            </div>
          </div>
          
          {/* Full-width Edge-to-Edge Logo Banner (Zero Gaps Left & Right) */}
          <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center p-0 z-20 shrink-0 shadow-sm transition-colors overflow-hidden">
            <img src="/hero.png" alt="Choice Bingo" className="w-full h-24 object-cover" />
          </div>

          <p className="text-center text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest font-bold pt-1.5 pb-2">
            {t[language].bingo.selectStakeWinBig}
          </p>
          
          {/* 3D Stake Cards 2x2 Grid */}
          <div className="flex-1 grid grid-cols-2 gap-3 px-4 pb-2 min-h-0">
            {STAKE_OPTIONS.map(opt => {
              const hg = homeGames[opt.value];
              const pool = hg?.pool || 0;
              const players = hg?.players || 0;
              const hasGame = pool > 0;
              const isWaiting = hg?.status === 'waiting';
              const isCalling = hg?.status === 'calling';
              const tl = homeTimeLeft[opt.value] || 0;
              
              let statusTxt = "Waiting...";
              let statusCls = "text-orange-500";
              if (isWaiting && tl <= 86400 && tl > 0) {
                statusTxt = `${tl}s`;
              } else if (isCalling) {
                statusTxt = "Active";
                statusCls = "text-emerald-500";
              }

              const headerGradients: Record<number, string> = {
                10: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 60%, #0369a1 100%)',
                20: 'linear-gradient(180deg, #34d399 0%, #059669 60%, #047857 100%)',
                50: 'linear-gradient(180deg, #c084fc 0%, #9333ea 60%, #7e22ce 100%)',
                100: 'linear-gradient(180deg, #fb7185 0%, #e11d48 60%, #be123c 100%)',
              };

              return (
                <button
                  key={opt.value}
                  onClick={() => { setSelectedStake(opt.value); initWebAudio(); }}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col active:translate-y-1 transition-all shadow-[0_6px_16px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.5)] select-none cursor-pointer"
                >
                  {/* Top: 3D Colored Header */}
                  <div
                    className="h-20 flex flex-col items-center justify-center w-full relative z-10"
                    style={{
                      background: headerGradients[opt.value] || 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -3px 6px rgba(0,0,0,0.2)',
                    }}
                  >
                    <span className="text-white/80 font-bold text-[8px] uppercase tracking-widest leading-none">
                      {t[language].bingo.stake}
                    </span>
                    <span className="text-white font-black text-4xl leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] mt-0.5">
                      {opt.value}
                    </span>
                    <span className="absolute top-1.5 right-1.5 bg-white/25 px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider backdrop-blur-sm">
                      ETB
                    </span>
                  </div>

                  {/* Middle: Derash | Players | Status — 3 columns */}
                  <div className="w-full bg-slate-50 dark:bg-slate-800/60 border-t border-b border-slate-100 dark:border-slate-800 flex h-[36px] shrink-0 relative z-10">
                    <div className="flex-1 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 dark:text-slate-500 text-[7px] font-bold uppercase tracking-wider">{t[language].bingo.derash}</span>
                      <span className={`text-[10px] font-black text-yellow-600 dark:text-yellow-400 ${hasGame ? 'animate-pulse' : ''}`}>{pool} ETB</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 dark:text-slate-500 text-[7px] font-bold uppercase tracking-wider">{t[language].bingo.players}</span>
                      <span className="text-[10px] font-black text-emerald-500">{players}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <span className="text-slate-400 dark:text-slate-500 text-[7px] font-bold uppercase tracking-wider">{t[language].bingo.status}</span>
                      <span className={`text-[10px] font-black ${statusCls}`}>{statusTxt}</span>
                    </div>
                  </div>

                  {/* Bottom: Action */}
                  <div className="w-full h-[32px] flex items-center justify-center relative z-10 bg-white dark:bg-slate-900">
                    {isWaiting ? (
                      <span className="text-orange-500 dark:text-orange-400 text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1">
                        🔥 {t[language].bingo.joinNow}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[9.5px] font-bold uppercase tracking-wider">
                        {t[language].bingo.startMatch}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 3D Back Button */}
          <div className="pb-3 flex justify-center shrink-0 relative z-10 mt-1">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-300 text-[10.5px] font-bold uppercase tracking-widest active:translate-y-0.5 transition-all shadow-[0_2.5px_0_#cbd5e1] dark:shadow-[0_2.5px_0_#0f172a] cursor-pointer"
            >
              ← {t[language].bingo.backToGames}
            </button>
          </div>
        </div>
      </div>
    );
  }


  if (loading && !game) {
    return (
      <div className="h-[calc(100dvh-80px)] w-full flex flex-col items-center justify-center relative overflow-hidden select-none px-4 bg-slate-50 dark:bg-[#070b14] transition-colors">
        {/* Ambient 3D Glow Rings */}
        <div className="absolute w-80 h-80 rounded-full bg-pink-500/10 dark:bg-pink-500/20 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute w-64 h-64 rounded-full bg-amber-400/15 dark:bg-yellow-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* 3D Casino Bingo Ball Loading Spinner */}
          <div className="relative flex items-center justify-center mb-6">
            {/* Soft Ambient Glow Behind Spinner */}
            <div className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-pink-500/30 to-amber-400/30 blur-xl animate-pulse" />

            {/* Outer Orbital Dotted Ring */}
            <div className="w-24 h-24 rounded-full border border-dashed border-slate-300 dark:border-slate-700/80 animate-[spin_8s_linear_infinite]" />

            {/* Spinning Neon Gradient Ring */}
            <div
              className="absolute w-18 h-18 rounded-full border-[3.5px] border-t-pink-500 border-r-amber-400 border-b-cyan-400 border-l-transparent animate-spin shadow-[0_0_20px_rgba(236,72,153,0.35)] dark:shadow-[0_0_25px_rgba(236,72,153,0.6)]"
            />

            {/* 3D Glossy Bingo Center Sphere */}
            <div
              className="absolute w-11 h-11 rounded-full flex items-center justify-center font-black text-white text-base shadow-[0_8px_18px_rgba(219,39,119,0.45)]"
              style={{
                background: 'radial-gradient(circle at 35% 25%, #ff2a8d 0%, #db2777 50%, #831843 100%)',
                boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.9), 0 4px 10px rgba(0,0,0,0.3)',
              }}
            >
              <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] font-mono">7</span>
            </div>
          </div>

          {/* Glowing Brand Headline */}
          <h2 className="text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-purple-700 via-pink-600 to-amber-500 dark:from-purple-300 dark:via-pink-400 dark:to-yellow-300 bg-clip-text text-transparent drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(236,72,153,0.6)] mb-1.5">
            ChoiceBingo
          </h2>
          <p className="text-xs font-black text-slate-500 dark:text-slate-300 tracking-widest uppercase animate-pulse">
            {t[language].bingo.preparingNext}
          </p>

          {/* 3D Sleek Progress Shimmer Track */}
          <div
            className="w-52 h-2 rounded-full overflow-hidden mt-5 bg-slate-200/90 dark:bg-white/10 shadow-inner border border-slate-300/40 dark:border-white/10"
          >
            <div
              className="h-full rounded-full w-28 animate-[pulse_1.5s_ease-in-out_infinite]"
              style={{
                background: 'linear-gradient(90deg, #ec4899, #facc15, #34d399)',
                boxShadow: '0 0 10px rgba(236, 72, 153, 0.8)',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="h-[calc(100dvh-80px)] w-full flex flex-col items-center justify-center p-6 text-center select-none bg-slate-50 dark:bg-[#070b14] transition-colors relative overflow-hidden">
        {/* Ambient 3D Glow Rings */}
        <div className="absolute w-80 h-80 rounded-full bg-pink-500/10 dark:bg-pink-500/20 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute w-64 h-64 rounded-full bg-amber-400/15 dark:bg-yellow-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* 3D Casino Bingo Ball Loading Spinner */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="w-24 h-24 rounded-full border border-dashed border-slate-300 dark:border-slate-700/80 animate-[spin_8s_linear_infinite]" />
            <div
              className="absolute w-18 h-18 rounded-full border-[3.5px] border-t-pink-500 border-r-amber-400 border-b-cyan-400 border-l-transparent animate-spin shadow-[0_0_20px_rgba(236,72,153,0.35)] dark:shadow-[0_0_25px_rgba(236,72,153,0.6)]"
            />
            <div
              className="absolute w-11 h-11 rounded-full flex items-center justify-center font-black text-white text-base shadow-[0_8px_18px_rgba(219,39,119,0.45)]"
              style={{
                background: 'radial-gradient(circle at 35% 25%, #ff2a8d 0%, #db2777 50%, #831843 100%)',
                boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.9), 0 4px 10px rgba(0,0,0,0.3)',
              }}
            >
              <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] font-mono">7</span>
            </div>
          </div>

          <h2 className="text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-purple-700 via-pink-600 to-amber-500 dark:from-purple-300 dark:via-pink-400 dark:to-yellow-300 bg-clip-text text-transparent drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(236,72,153,0.6)] mb-1">
            ChoiceBingo
          </h2>
          <p className="font-black text-sm text-amber-600 dark:text-yellow-300 drop-shadow-sm mb-6">{t[language].bingo.preparingNext}</p>

          <button
            onClick={fetchState}
            className="px-8 py-3 rounded-2xl font-black text-sm active:translate-y-1 transition-all select-none cursor-pointer shadow-lg"
            style={{
              background: 'linear-gradient(180deg, #fef08a 0%, #facc15 35%, #ca8a04 100%)',
              boxShadow: '0 4px 0 #854d0e, 0 6px 15px rgba(234,179,8,0.4)',
              color: '#451a03',
            }}
          >
            {t[language].bingo.refresh}
          </button>
          <button
            onClick={() => setSelectedStake(null)}
            className="text-slate-500 dark:text-slate-400 text-xs font-bold underline mt-4 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            {t[language].bingo.changeStake}
          </button>
        </div>
      </div>
    );
  }

  const renderCallingBoard = () => {
    const recent = [...called].reverse().slice(0, 6);
    const currentLetter = lastNum ? getLetter(lastNum) : null;
    const currentAmharic = lastNum ? AMHARIC_NUM[lastNum] : null;

    return (
      <div className="h-full flex flex-col px-1 pt-1 pb-2 gap-1">

        {/* 3D Top Info Bar */}
        <div
          className="flex items-center justify-between px-2.5 py-1 rounded-xl shrink-0"
          style={{
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 3px 6px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div className="text-slate-400 text-[9px] font-bold font-mono">ID: {(game.game_id || game.id?.slice(0, 8) || '').toUpperCase()}</div>
          <div className="flex items-center gap-1 text-yellow-300 text-[9px] font-black px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 shadow-sm">
            <Trophy size={10} className="text-yellow-400 drop-shadow" /> {game.prize_pool} ETB
          </div>
          <div className="flex items-center gap-1 text-blue-300 text-[9px] font-bold">
            <LayoutGrid size={10} /> {taken.length}
          </div>
          <div className="flex items-center gap-1 text-emerald-300 text-[9px] font-bold">
            <Clock size={10} /> {called.length}/75
          </div>
          <div className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-black animate-pulse border border-red-500/30 shadow-[0_0_6px_rgba(239,68,68,0.3)]">
            LIVE
          </div>
        </div>

        {/* 1-75 Tracker Board — compact 3D matrix */}
        <div
          className="rounded-xl px-1.5 py-1 shrink-0"
          style={{
            background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'inset 0 2px 5px rgba(0, 0, 0, 0.6), 0 3px 8px rgba(0, 0, 0, 0.4)'
          }}
        >
          <div className="flex flex-col gap-[2px]">
            {BINGO_LETTERS.map((letter, rowIndex) => (
              <div key={letter} className="flex items-center gap-1">
                <div className="w-3.5 flex-shrink-0 flex items-center justify-center font-black text-[9px] drop-shadow" style={{ color: LETTER_COLOR[letter] }}>{letter}</div>
                <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
                  {Array.from({ length: 15 }, (_, i) => {
                    const num = rowIndex * 15 + i + 1;
                    const isCalled = called.includes(num);
                    const isLatest = num === lastNum;
                    return (
                      <div
                        key={num}
                        className={`h-[15px] rounded-[3px] flex items-center justify-center text-[7.5px] font-black transition-all ${
                          isLatest ? 'scale-105 z-10' : ''
                        }`}
                        style={
                          isLatest
                            ? {
                                background: 'radial-gradient(circle at 35% 25%, #ffffff 0%, #e2e8f0 55%, #94a3b8 100%)',
                                boxShadow: '0 0 8px rgba(255,255,255,0.9), inset 0 1px 1px rgba(255,255,255,1)',
                                border: '1px solid #ffffff',
                                color: '#020617',
                              }
                            : isCalled
                            ? {
                                background: 'radial-gradient(circle at 35% 25%, #fef08a 0%, #facc15 50%, #ca8a04 100%)',
                                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), inset 0 -1px 1px rgba(161,98,7,0.7), 0 1px 2px rgba(0,0,0,0.3)',
                                border: '0.5px solid #fef08a',
                                color: '#451a03',
                              }
                            : {
                                background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 1px 2px rgba(0,0,0,0.3)',
                                border: '0.5px solid rgba(255, 255, 255, 0.05)',
                                color: '#64748b',
                              }
                        }
                      >
                        {num}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Caller Row + Card — scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <div className={`w-full ${myCartelas.length > 1 ? 'max-w-[420px]' : 'max-w-[280px]'} mx-auto flex flex-col gap-1.5 pb-2`}>
          {/* Caller Row with 3D Glossy Bingo Ball & Vertical Controls */}
          <div
            className="shrink-0 rounded-2xl px-2.5 py-1.5 w-full max-w-[340px] mx-auto shadow-xl"
            style={{
              background: 'linear-gradient(180deg, #141e33 0%, #0a0f1e 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.1), 0 6px 16px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div className="flex items-center justify-between gap-2">
              
              {/* Left / Center: 3D Glossy Bingo Ball + Spoken Amharic + Previous Balls */}
              <div className="flex items-center gap-2.5 min-w-0">
                {lastNum ? (
                  <div
                    className="rounded-full flex flex-col items-center justify-center shrink-0 relative select-none animate-bounce"
                    style={{
                      width: '48px',
                      height: '48px',
                      background: 'radial-gradient(circle at 35% 25%, #ffffff 0%, #f8fafc 25%, #e2e8f0 55%, #94a3b8 85%, #475569 100%)',
                      boxShadow: 'inset -4px -5px 10px rgba(15, 23, 42, 0.5), inset 3px 4px 6px rgba(255, 255, 255, 0.95), 0 8px 16px rgba(0, 0, 0, 0.6), 0 0 10px rgba(255, 255, 255, 0.25)',
                      border: '1.5px solid rgba(255, 255, 255, 0.9)',
                      animationDuration: '2.5s',
                    }}
                  >
                    <span className="text-[8px] font-black leading-none text-amber-500 font-mono -mt-0.5 drop-shadow-sm">
                      {currentLetter}
                    </span>
                    <span className="text-slate-950 font-black text-xl leading-none tracking-tight font-sans">
                      {lastNum}
                    </span>
                  </div>
                ) : (
                  <div
                    className="rounded-full flex flex-col items-center justify-center shrink-0 relative select-none animate-bounce"
                    style={{
                      width: '48px',
                      height: '48px',
                      background: 'radial-gradient(circle at 35% 25%, #ffffff 0%, #f8fafc 25%, #e2e8f0 55%, #94a3b8 85%, #475569 100%)',
                      boxShadow: 'inset -4px -5px 10px rgba(15, 23, 42, 0.5), inset 3px 4px 6px rgba(255, 255, 255, 0.95), 0 8px 16px rgba(0, 0, 0, 0.6), 0 0 14px rgba(245, 158, 11, 0.45)',
                      border: '1.5px solid rgba(255, 255, 255, 0.95)',
                      animationDuration: '2.5s',
                    }}
                  >
                    <span className="text-[7.5px] font-black leading-none text-amber-500 font-mono -mt-0.5 drop-shadow-sm">
                      BINGO
                    </span>
                    <span className="text-slate-950 font-black text-xl leading-none tracking-tight font-sans animate-pulse">
                      ?
                    </span>
                  </div>
                )}

                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-yellow-400 font-black text-sm tracking-wide truncate drop-shadow-sm">
                    {currentAmharic || (recent.length === 0 ? 'በመጠበቅ ላይ...' : '')}
                  </span>
                  
                  {/* Previous Called Balls — 5 mini 3D spheres */}
                  <div className="flex items-center gap-1 mt-1">
                    {recent.length > 0 ? (
                      recent.slice(1, 6).map((num, idx) => {
                        const l = getLetter(num);
                        return (
                          <div
                            key={`${num}-${idx}`}
                            className="w-[23px] h-[23px] rounded-full flex flex-col items-center justify-center shadow-md select-none shrink-0"
                            style={{
                              background: 'radial-gradient(circle at 35% 25%, #ffffff 0%, #f1f5f9 35%, #cbd5e1 70%, #64748b 100%)',
                              boxShadow: 'inset -2px -2px 3px rgba(15, 23, 42, 0.4), inset 1px 1.5px 2px rgba(255, 255, 255, 0.9), 0 2px 4px rgba(0, 0, 0, 0.4)',
                              border: '1px solid rgba(255, 255, 255, 0.7)',
                            }}
                          >
                            <span className="text-[5px] font-black leading-none text-amber-500 font-mono">{l}</span>
                            <span className="text-[8.5px] font-black leading-none text-slate-900">{num}</span>
                          </div>
                        );
                      })
                    ) : (
                      Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-[23px] h-[23px] rounded-full flex items-center justify-center select-none shrink-0"
                          style={{
                            background: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 50%, rgba(0,0,0,0.35) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.18)',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.3)',
                          }}
                        >
                          <span className="text-[8px] font-black text-amber-400/50">•</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Sound Toggle + Auto/Manual 3D Controls */}
              <div className="flex flex-col items-center gap-1 shrink-0 pl-1.5 border-l border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    localStorage.setItem('bingo_sound_enabled', String(next));
                    unlockAudio();
                    if (next) playCallAudio(lastNum || 1);
                  }}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all ${
                    soundEnabled ? 'text-blue-400' : 'text-red-400'
                  }`}
                  style={{
                    background: soundEnabled
                      ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.25) 0%, rgba(30, 64, 175, 0.35) 100%)'
                      : 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)',
                    border: soundEnabled ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !autoMark;
                    setAutoMark(next);
                    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.selectionChanged();
                    if (game?.id) {
                      fetch(`${API}/bingo/mode`, {
                        method: 'POST',
                        headers: hdrs(),
                        body: JSON.stringify({ game_id: game.id, is_auto: next }),
                      }).catch(() => {});
                    }
                  }}
                  className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider active:translate-y-0.5 transition-all flex items-center justify-center"
                  style={
                    autoMark
                      ? {
                          background: 'linear-gradient(180deg, #34d399 0%, #10b981 50%, #059669 100%)',
                          boxShadow: '0 2.5px 0 #047857, 0 3px 6px rgba(16,185,129,0.4), inset 0 1px 1px rgba(255,255,255,0.7)',
                          border: '1px solid #6ee7b7',
                          color: '#ffffff',
                        }
                      : {
                          background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                          boxShadow: '0 2.5px 0 #b45309, 0 3px 6px rgba(245,158,11,0.4), inset 0 1px 1px rgba(255,255,255,0.7)',
                          border: '1px solid #fde68a',
                          color: '#ffffff',
                        }
                  }
                >
                  {autoMark ? 'AUTO' : 'MANUAL'}
                </button>
              </div>

            </div>
          </div>

          {/* My Cards — dynamic layout: 1 card = centered classic; 2+ cards = all visible side-by-side grid */}
          {myCartelas.length > 0 ? (
            myCartelas.length === 1 ? (
              /* Single Cartela — 3D Resized to fit perfectly on mobile screens with breathing room */
              <div key={myCartelas[0].cartela_number} className="w-full max-w-[215px] mx-auto">
                <div
                  className="rounded-2xl overflow-hidden shadow-2xl"
                  style={{
                    background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.25)',
                  }}
                >
                  {/* BINGO 3D Header */}
                  <div className="grid grid-cols-5">
                    {BINGO_LETTERS.map(l => (
                      <div
                        key={l}
                        className="flex items-center justify-center py-1 font-black text-white text-xs drop-shadow-sm select-none"
                        style={{
                          background: LETTER_BG[l],
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(0,0,0,0.25)',
                        }}
                      >
                        {l}
                      </div>
                    ))}
                  </div>
                  {/* 3D Card Grid */}
                  <div className="grid grid-cols-5 gap-[2px] p-[2px] bg-[#070b16]">
                    {Array.from({ length: 5 }).flatMap((_, r) =>
                      Array.from({ length: 5 }, (_, c) => {
                        const num = myCartelas[0].card_matrix[r][c];
                        const isFree = num === 0;
                        const isCalled = called.includes(num);
                        const isManualMarked = manuallyMarked.has(num) && isCalled;
                        const marked = isFree || (autoMark ? isCalled : isManualMarked);
                        const isLast = num === lastNum;
                        const canTap = !autoMark && !isFree && isCalled;
                        return (
                          <div
                            key={`${r}-${c}`}
                            onClick={() => {
                              if (!canTap) {
                                if (!autoMark && !isFree && !isCalled && WebApp?.HapticFeedback) {
                                  WebApp.HapticFeedback.notificationOccurred("warning");
                                }
                                return;
                              }
                              setManuallyMarked(prev => {
                                const next = new Set(prev);
                                if (next.has(num)) next.delete(num); else next.add(num);
                                return next;
                              });
                              if (WebApp?.HapticFeedback) WebApp.HapticFeedback.selectionChanged();
                            }}
                            className={`aspect-square flex items-center justify-center font-black text-xs rounded-md transition-all duration-200 select-none ${
                              isLast && autoMark ? 'scale-105 z-10' : ''
                            } ${!autoMark && marked ? 'active:scale-95 cursor-pointer' : ''}`}
                            style={
                              isFree
                                ? {
                                    background: 'radial-gradient(circle at 35% 25%, #fef08a 0%, #facc15 50%, #ca8a04 100%)',
                                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.9), inset 0 -2px 3px rgba(161,98,7,0.7), 0 2px 4px rgba(0,0,0,0.3)',
                                    border: '1px solid #fef08a',
                                    color: '#713f12',
                                    fontSize: '13px',
                                  }
                                : isLast && autoMark
                                ? {
                                    background: 'radial-gradient(circle at 35% 25%, #fed7aa 0%, #f97316 55%, #c2410c 100%)',
                                    boxShadow: '0 0 10px rgba(249,115,22,0.8), inset 0 1px 1px rgba(255,255,255,0.8)',
                                    border: '1px solid #fed7aa',
                                    color: '#ffffff',
                                  }
                                : marked
                                ? {
                                    background: 'radial-gradient(circle at 35% 25%, #6ee7b7 0%, #10b981 50%, #047857 100%)',
                                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -2px 2px rgba(6,78,59,0.7), 0 0 8px rgba(16,185,129,0.5)',
                                    border: '1px solid #a7f3d0',
                                    color: '#ffffff',
                                  }
                                : canTap
                                ? {
                                    background: 'linear-gradient(180deg, #ffffff 0%, #fef9c3 100%)',
                                    boxShadow: '0 0 8px rgba(250,204,21,0.8), inset 0 1px 0 rgba(255,255,255,0.9)',
                                    border: '2px solid #eab308',
                                    color: '#0f172a',
                                    cursor: 'pointer',
                                  }
                                : {
                                    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)',
                                    boxShadow: '0 1.5px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(148,163,184,0.4)',
                                    border: '1px solid #cbd5e1',
                                    color: '#0f172a',
                                  }
                            }
                          >
                            {isFree ? '★' : num}
                          </div>
                        );
                      })
                    )}
                  </div>
                  {/* Cartela Label */}
                  <div className="py-0.5 text-center bg-[#070b16] border-t border-white/10">
                    <p className="text-white/70 font-black text-[8px] tracking-widest uppercase">{t[language].bingo.cartelaNum} {myCartelas[0].cartela_number}</p>
                  </div>
                </div>
              </div>
            ) : (
              /* 2 or More Cartelas — 3D Side-by-side grid */
              <div className="w-full flex flex-col gap-1 px-1">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-white/60 text-[10px] font-bold tracking-wider uppercase">CARTELAS ({myCartelas.length})</span>
                  <span className="text-emerald-400 text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shadow-sm">All Active</span>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full">
                  {myCartelas.map((card) => (
                    <div key={card.cartela_number} className="w-full">
                      <div
                        className="rounded-xl overflow-hidden shadow-lg"
                        style={{
                          background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          boxShadow: '0 8px 18px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        {/* BINGO 3D Header */}
                        <div className="grid grid-cols-5">
                          {BINGO_LETTERS.map(l => (
                            <div
                              key={l}
                              className="flex items-center justify-center py-0.5 font-black text-white text-[10px] drop-shadow-sm select-none"
                              style={{
                                background: LETTER_BG[l],
                                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -1.5px 2px rgba(0,0,0,0.2)',
                              }}
                            >
                              {l}
                            </div>
                          ))}
                        </div>
                        {/* 3D Card Grid */}
                        <div className="grid grid-cols-5 gap-[2px] p-[2px] bg-[#070b16]">
                          {Array.from({ length: 5 }).flatMap((_, r) =>
                            Array.from({ length: 5 }, (_, c) => {
                              const num = card.card_matrix[r][c];
                              const isFree = num === 0;
                              const isCalled = called.includes(num);
                              const isManualMarked = manuallyMarked.has(num) && isCalled;
                              const marked = isFree || (autoMark ? isCalled : isManualMarked);
                              const isLast = num === lastNum;
                              const canTap = !autoMark && !isFree && isCalled;
                              return (
                                <div
                                  key={`${r}-${c}`}
                                  onClick={() => {
                                    if (!canTap) {
                                      if (!autoMark && !isFree && !isCalled && WebApp?.HapticFeedback) {
                                        WebApp.HapticFeedback.notificationOccurred("warning");
                                      }
                                      return;
                                    }
                                    setManuallyMarked(prev => {
                                      const next = new Set(prev);
                                      if (next.has(num)) next.delete(num); else next.add(num);
                                      return next;
                                    });
                                    if (WebApp?.HapticFeedback) WebApp.HapticFeedback.selectionChanged();
                                  }}
                                  className={`aspect-square flex items-center justify-center font-black text-[11px] rounded transition-all duration-200 select-none ${
                                    isLast && autoMark ? 'scale-105 z-10' : ''
                                  } ${!autoMark && marked ? 'active:scale-95 cursor-pointer' : ''}`}
                                  style={
                                    isFree
                                      ? {
                                          background: 'radial-gradient(circle at 35% 25%, #fef08a 0%, #facc15 50%, #ca8a04 100%)',
                                          boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.9), inset 0 -2px 3px rgba(161,98,7,0.7), 0 2px 4px rgba(0,0,0,0.3)',
                                          border: '1px solid #fef08a',
                                          color: '#713f12',
                                          fontWeight: 900,
                                        }
                                      : isLast && autoMark
                                      ? {
                                          background: 'radial-gradient(circle at 35% 25%, #fed7aa 0%, #f97316 55%, #c2410c 100%)',
                                          boxShadow: '0 0 8px rgba(249,115,22,0.8), inset 0 1px 1px rgba(255,255,255,0.8)',
                                          border: '1px solid #fed7aa',
                                          color: '#ffffff',
                                        }
                                      : marked
                                      ? {
                                          background: 'radial-gradient(circle at 35% 25%, #6ee7b7 0%, #10b981 50%, #047857 100%)',
                                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -2px 2px rgba(6,78,59,0.7), 0 0 8px rgba(16,185,129,0.5)',
                                          border: '1px solid #a7f3d0',
                                          color: '#ffffff',
                                        }
                                      : canTap
                                      ? {
                                          background: 'linear-gradient(180deg, #ffffff 0%, #fef9c3 100%)',
                                          boxShadow: '0 0 6px rgba(250,204,21,0.7), inset 0 1px 0 rgba(255,255,255,0.9)',
                                          border: '1.5px solid #eab308',
                                          color: '#0f172a',
                                          cursor: 'pointer',
                                        }
                                      : {
                                          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)',
                                          boxShadow: '0 1.5px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(148,163,184,0.4)',
                                          border: '1px solid #cbd5e1',
                                          color: '#0f172a',
                                        }
                                  }
                                >
                                  {isFree ? '★' : num}
                                </div>
                              );
                            })
                          )}
                        </div>
                        {/* Cartela Label */}
                        <div className="py-0.5 px-2 flex items-center justify-between bg-[#070b16] border-t border-white/10">
                          <p className="text-yellow-400 font-black text-[8px] tracking-wider uppercase">#{card.cartela_number}</p>
                          <span className="text-white/40 text-[7px] font-bold uppercase">{t[language].bingo.cartelaNum.trim()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="w-full max-w-[215px] mx-auto relative mt-1 pointer-events-none">
              <div
                className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                style={{ background: 'linear-gradient(145deg, #1e293b 0%, #0f1829 100%)' }}
              >
                {/* BINGO Header */}
                <div className="grid grid-cols-5">
                  {BINGO_LETTERS.map(l => (
                    <div key={l} className="flex items-center justify-center py-1 font-black text-white text-xs select-none" style={{ background: LETTER_BG[l] }}>{l}</div>
                  ))}
                </div>
                
                {/* Dummy Grid */}
                <div className="grid grid-cols-5 gap-[2px] p-[2px] bg-[#070b16]">
                  {Array.from({ length: 5 }).flatMap((_, r) => 
                    Array.from({ length: 5 }, (_, c) => {
                      const isFree = r === 2 && c === 2;
                      const num = isFree ? '★' : (c * 15) + r + (c % 2 === 0 ? 3 : 8);
                      return (
                        <div
                          key={`${r}-${c}`}
                          className="aspect-square flex items-center justify-center font-black text-xs rounded-md"
                          style={
                            isFree
                              ? {
                                  background: 'radial-gradient(circle at 35% 25%, #fef08a 0%, #facc15 50%, #ca8a04 100%)',
                                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.9), inset 0 -2px 3px rgba(161,98,7,0.7)',
                                  border: '1px solid #fef08a',
                                  color: '#713f12',
                                }
                              : {
                                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)',
                                  boxShadow: '0 1.5px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9)',
                                  border: '1px solid #cbd5e1',
                                  color: '#0f172a',
                                }
                          }
                        >
                          {num}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Overlay Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-3 border border-red-500/30">
                    <span className="text-xl animate-pulse">⏳</span>
                  </div>
                  <h3 className="text-red-400 font-black text-lg uppercase tracking-widest mb-1 shadow-[0_0_10px_rgba(239,68,68,0.5)]">Match is active</h3>
                  <p className="text-white/80 text-[10px] font-bold text-center px-4 leading-relaxed uppercase tracking-wider">
                    <span dangerouslySetInnerHTML={{ __html: t[language].bingo.waitNext }} />
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Manual Mode: 3D Deluxe Casino BINGO Button (Always Visible!) */}
        {!autoMark && myCartelas.length > 0 && (
          <div className="shrink-0 w-full max-w-[280px] mx-auto pt-1 pb-1 px-3 z-20">
            {claimLockSeconds > 0 ? (
              <div className="flex flex-col items-center gap-1 w-full">
                <div
                  className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 select-none"
                  style={{
                    background: 'linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)',
                    boxShadow: '0 3px 0 #3b0707, inset 0 1px 1px rgba(255,255,255,0.2)',
                    border: '1px solid #ef4444',
                  }}
                >
                  <span className="text-red-300 text-base animate-pulse">🔒</span>
                  <span className="text-red-100 font-black text-xs tracking-widest uppercase">
                    {t[language].bingo.locked} ({claimLockSeconds}s)
                  </span>
                </div>
                <p className="text-red-400 text-[8.5px] font-bold text-center animate-pulse px-2 bg-black/50 rounded py-0.5">
                  {claimErrMsg || t[language].bingo.falseBingoLocked.replace('{s}', String(claimLockSeconds))}
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={isClaiming}
                onClick={handleClaimBingo}
                className="w-full py-2.5 px-6 rounded-2xl font-black text-lg uppercase tracking-widest active:translate-y-1 transition-all flex items-center justify-center gap-2 select-none cursor-pointer"
                style={{
                  background: 'linear-gradient(180deg, #fef08a 0%, #facc15 30%, #eab308 70%, #ca8a04 100%)',
                  boxShadow: '0 5px 0 #854d0e, 0 8px 18px rgba(234,179,8,0.45), inset 0 1px 2px rgba(255,255,255,0.95)',
                  border: '1px solid #fef08a',
                  color: '#451a03',
                }}
              >
                <span className="text-xl">🏆</span>
                <span className="drop-shadow-sm">{t[language].bingo.claimBingo}</span>
                <span className="text-xl">🎉</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCartelaPicker = () => {
    const myNums = myCartelas.map(c => c.cartela_number);
    const displayPlayers = maxPlayers || 200;
    const canPickMore = myCartelas.length < maxCartelasPerUser;
    const currentStake = selectedStake || game?.stake || 10;

    return (
      <>
        {/* Scrollable Number Board Container */}
        <div className={`flex-1 overflow-y-auto relative p-2 ${myCartelas.length > 0 ? 'pb-44' : 'pb-16'} select-none`}>
          {/* 3D Header Bar: Status Capsule & Picked Badge */}
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full shadow-md"
              style={{
                background: 'linear-gradient(180deg, #0e2238 0%, #061320 100%)',
                border: '1px solid rgba(34, 211, 238, 0.45)',
                boxShadow: '0 2px 0 #020b12, inset 0 1px 1px rgba(255, 255, 255, 0.15)',
              }}
            >
              <div className={`w-2 h-2 rounded-full ${canPickMore ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'}`} />
              <p className="text-[9.5px] text-cyan-300 font-black uppercase tracking-wider">
                {canPickMore ? `TAP TO PICK — ${taken.length}/${displayPlayers} TAKEN` : `ALL CARTELAS SELECTED ✓`}
              </p>
            </div>

            <div
              className="px-3 py-1 rounded-full text-center"
              style={{
                background: 'linear-gradient(180deg, #fef08a 0%, #facc15 40%, #ca8a04 100%)',
                boxShadow: '0 2.5px 0 #854d0e, inset 0 1px 1px rgba(255,255,255,0.9)',
                border: '1px solid #fef08a',
              }}
            >
              <p className="text-[9.5px] text-[#451a03] font-black tracking-wider uppercase drop-shadow-sm">
                {myCartelas.length}/{maxCartelasPerUser} PICKED
              </p>
            </div>
          </div>

          {/* 3D Casino Board Container */}
          <div
            className="rounded-2xl p-1.5"
            style={{
              background: 'linear-gradient(180deg, #0b1329 0%, #020617 100%)',
              border: '2px solid rgba(34, 211, 238, 0.65)',
              boxShadow: '0 0 25px rgba(6, 182, 212, 0.35), inset 0 3px 8px rgba(0,0,0,0.8), 0 8px 24px rgba(0,0,0,0.7)',
            }}
          >
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
              {Array.from({ length: displayPlayers }, (_, i) => {
                const n = i + 1;
                const isTaken = taken.includes(n);
                const isMine = myNums.includes(n);
                const isBuying = buying === n;
                const isReleasing = releasing === n;
                
                if (isMine) {
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleSeatClick(n)}
                      disabled={isReleasing}
                      className="aspect-square flex flex-col items-center justify-center rounded-[6px] font-black z-10 select-none cursor-pointer active:scale-95 transition-all"
                      style={{
                        background: 'radial-gradient(circle at 35% 25%, #34d399 0%, #10b981 50%, #047857 100%)',
                        boxShadow: '0 2.5px 0 #064e3b, 0 0 12px rgba(16,185,129,0.85), inset 0 1px 2px rgba(255,255,255,0.85)',
                        border: '1.5px solid #fef08a',
                        color: '#ffffff',
                      }}
                      title={language === 'am' ? 'ካርቴላውን ለመልቀቅ ደግመው ይጫኑ' : 'Double tap to release'}
                    >
                      {isReleasing ? (
                        <span className="animate-spin text-[10px]">⏳</span>
                      ) : (
                        <>
                          <span className="text-[10px] leading-none font-black">{n}</span>
                          <span className="text-[8px] text-yellow-300 leading-none font-black">✓</span>
                        </>
                      )}
                    </button>
                  );
                }
                
                if (isTaken) {
                  return (
                    <div
                      key={n}
                      className="aspect-square flex items-center justify-center rounded-[6px] text-[9.5px] font-black select-none"
                      style={{
                        background: 'linear-gradient(180deg, #3b0707 0%, #1c0505 100%)',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: 'rgba(248, 113, 113, 0.4)',
                      }}
                    >
                      <span className="line-through">{n}</span>
                    </div>
                  );
                }

                return (
                  <button
                    key={n}
                    type="button"
                    disabled={buying !== null || !canPickMore}
                    onClick={() => handleSeatClick(n)}
                    className={`aspect-square flex items-center justify-center rounded-[6px] text-[10.5px] font-black transition-all select-none ${
                      !canPickMore
                        ? 'cursor-not-allowed opacity-40'
                        : isBuying
                        ? 'opacity-50 scale-90'
                        : 'cursor-pointer active:translate-y-[2px]'
                    }`}
                    style={
                      !canPickMore
                        ? {
                            background: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.3)',
                          }
                        : {
                            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 45%, #e2e8f0 85%, #cbd5e1 100%)',
                            boxShadow: '0 2.5px 0 #94a3b8, 0 3px 5px rgba(0,0,0,0.35), inset 0 1px 0 #ffffff',
                            border: '1px solid #e2e8f0',
                            color: '#0f172a',
                          }
                    }
                  >
                    {isBuying ? (
                      <span className="animate-spin text-[10px]">⏳</span>
                    ) : (
                      <span>{n}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── FIXED SELECTED CARTELAS TRAY (3D Luxury White Curved Section Docked above bottom navigation) ── */}
        {myCartelas.length > 0 && (
          <div
            className="fixed bottom-16 left-0 right-0 z-30 px-2 pt-1.5 pb-1.5 rounded-t-[22px] border-t select-none transition-all"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 55%, #edf2f7 100%)',
              borderTop: '2px solid rgba(245, 158, 11, 0.6)',
              boxShadow: '0 -8px 25px rgba(0, 0, 0, 0.4), 0 -2px 6px rgba(0, 0, 0, 0.15), inset 0 2px 0 #ffffff',
            }}
          >
            {/* Header: Title and picked count */}
            <div className="flex items-center justify-between mb-1 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                  {language === 'am' ? 'የመረጡት ካርቴላዎች' : 'Your Selected Cartelas'}
                </h3>
              </div>
              <div className="px-1.5 py-0.2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 font-mono font-black text-[9.5px]">
                <span>{myCartelas.length}</span>
                <span className="text-slate-400 mx-0.5">/</span>
                <span>{maxCartelasPerUser}</span>
              </div>
            </div>

            {/* All 4 Selected Cartelas fit fully across the screen in 4-columns */}
            <div className="grid grid-cols-4 gap-1.5 w-full">
              {myCartelas.map((cartela) => (
                <div
                  key={cartela.cartela_number}
                  className="relative bg-white rounded-xl p-1 shadow-[0_4px_10px_rgba(0,0,0,0.12)] border border-slate-200/90 select-none cursor-pointer active:scale-95 transition-transform"
                  onClick={() => releaseCartela(cartela.cartela_number)}
                  title={language === 'am' ? 'ካርቴላውን ለመልቀቅ ይጫኑ' : 'Tap to release'}
                >
                  {/* Release Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      releaseCartela(cartela.cartela_number);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-red-500 hover:bg-red-600 active:scale-90 text-white rounded-full flex items-center justify-center text-[9px] font-black shadow-md z-20 cursor-pointer border-1.5 border-white"
                    title={language === 'am' ? 'ካርቴላውን ልቀቅ' : 'Release Cartela'}
                  >
                    ✕
                  </button>

                  {/* Top Row: "Choice" & "#Num" */}
                  <div className="flex items-center justify-between px-0.5 mb-0.5">
                    <span className="text-[7.5px] font-black text-amber-600 uppercase tracking-tight">
                      Choice
                    </span>
                    <span className="text-[8.5px] font-black text-slate-900 font-mono">
                      #{cartela.cartela_number}
                    </span>
                  </div>

                  {/* B I N G O Header Row */}
                  <div className="grid grid-cols-5 text-center font-black text-[7px] text-white rounded-t overflow-hidden leading-tight">
                    <div className="bg-[#2563eb] py-[1.5px]">B</div>
                    <div className="bg-[#dc2626] py-[1.5px]">I</div>
                    <div className="bg-[#475569] py-[1.5px]">N</div>
                    <div className="bg-[#059669] py-[1.5px]">G</div>
                    <div className="bg-[#d97706] py-[1.5px]">O</div>
                  </div>

                  {/* 5x5 Number Grid with Star Icon in Center */}
                  <div className="grid grid-cols-5 gap-[0.5px] bg-slate-200 border-x border-b border-slate-200 rounded-b overflow-hidden">
                    {cartela.card_matrix.map((row, r) =>
                      row.map((num, c) => {
                        const isCenter = r === 2 && c === 2;
                        return (
                          <div
                            key={`${r}-${c}`}
                            className={`aspect-square flex items-center justify-center text-[6.5px] font-black leading-none ${
                              isCenter
                                ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-amber-950 font-black shadow-inner'
                                : 'bg-white text-slate-900'
                            }`}
                          >
                            {isCenter ? '★' : num}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const showCallingBoard = game.status === 'calling' || game.status === 'finished';

  return (
    <div className="h-[calc(100dvh-80px)] w-full bg-[#05081a] flex flex-col select-none" onClick={initWebAudio}>
      <div className="sticky top-0 z-40 bg-[#05081a] flex flex-col shrink-0">
        <Header />
        {!showCallingBoard && (
          <div
            className="px-3 pt-1 pb-1"
            style={{
              background: 'linear-gradient(180deg, #0a0e1e 0%, #060814 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => setSelectedStake(null)}
                className="h-9 w-10 flex items-center justify-center rounded-xl transition-all active:translate-y-0.5 cursor-pointer"
                style={{
                  background: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
                  boxShadow: '0 3px 0 #0f172a, inset 0 1px 1px rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <ArrowLeft size={18} className="text-white drop-shadow" />
              </button>

              <div className="relative">
                <button 
                  onClick={() => {
                    if (myCartelas.length === 0) setShowStakeDropdown(!showStakeDropdown);
                  }}
                  className={`flex items-center gap-2 rounded-xl pl-3 pr-3 h-9 font-black text-sm transition-all select-none ${
                    myCartelas.length > 0 ? 'opacity-50 cursor-not-allowed' : 'active:translate-y-0.5 cursor-pointer'
                  }`}
                  style={{
                    background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                    boxShadow: '0 3px 0 #020617, inset 0 1px 1px rgba(255,255,255,0.15)',
                    border: '1px solid rgba(250, 204, 21, 0.45)',
                    color: '#facc15',
                  }}
                >
                  <span className="drop-shadow-sm">{selectedStake} ETB</span>
                  <ChevronDown size={14} className={`text-yellow-400 transition-transform ${showStakeDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {showStakeDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowStakeDropdown(false)} />
                    <div
                      className="absolute top-[calc(100%+8px)] left-0 w-36 rounded-2xl z-50 overflow-hidden"
                      style={{
                        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                        border: '1.5px solid rgba(250, 204, 21, 0.5)',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.8), 0 0 15px rgba(250,204,21,0.2)',
                      }}
                    >
                      {[10, 20, 50, 100].map(val => (
                        <button
                          key={val}
                          onClick={() => {
                            setSelectedStake(val);
                            setGame(null); setMyCard(null); setMyCartelas([]); setActiveCartelaIdx(0); setTaken([]);
                            setShowStakeDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 flex items-center justify-between border-b border-white/5 last:border-0 hover:bg-white/10 active:bg-white/15 transition-colors ${
                            selectedStake === val ? 'text-yellow-400 font-black' : 'text-slate-300 font-bold'
                          }`}
                        >
                          <span className="text-sm">{val} ETB</span>
                          {selectedStake === val && <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 3D Game ID pod */}
              <div
                className="flex-1 rounded-xl h-9 flex flex-col items-center justify-center px-2"
                style={{
                  background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                  boxShadow: '0 3px 0 #020617, inset 0 1px 1px rgba(255,255,255,0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                }}
              >
                <span className="text-[8px] text-slate-400 font-bold leading-none uppercase tracking-wider">
                  {t[language].bingo.gameId}
                </span>
                <span className="text-xs font-black text-cyan-300 leading-tight font-mono tracking-wider drop-shadow-sm">
                  {(game.game_id || game.id?.slice(0, 8) || '').toUpperCase()}
                </span>
              </div>

              {/* 3D Tutorial Pill */}
              <button
                onClick={() => setShowVideoGuide(true)}
                className="h-9 px-2.5 flex items-center gap-1 rounded-xl transition-all active:translate-y-0.5 cursor-pointer text-white font-black text-[11px] shrink-0"
                style={{
                  background: 'linear-gradient(180deg, #7c3aed 0%, #4f46e5 100%)',
                  boxShadow: '0 3px 0 #312e81, inset 0 1px 1px rgba(255,255,255,0.25)',
                  border: '1px solid rgba(196, 181, 253, 0.4)',
                }}
                title="How to play video tutorial"
              >
                <Play size={11} className="fill-white" />
                <span className="hidden sm:inline">{language === 'am' ? 'መመሪያ' : 'Guide'}</span>
              </button>
            </div>

            {/* 5-pod 3D Stats Matrix */}
            <div className="grid grid-cols-5 gap-1.5">
              {/* Stake */}
              <div
                className="rounded-xl py-1 px-0.5 text-center"
                style={{
                  background: 'linear-gradient(180deg, #1e293b 0%, #0b1120 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 2.5px 0 #020617, inset 0 1px 1px rgba(255,255,255,0.15)',
                }}
              >
                <p className="text-[7.5px] text-slate-400 font-bold uppercase">{t[language].bingo.stake}</p>
                <p className="text-xs font-black text-white">{game.stake} ETB</p>
              </div>

              {/* Players */}
              <div
                className="rounded-xl py-1 px-0.5 text-center"
                style={{
                  background: 'linear-gradient(180deg, #1e293b 0%, #0b1120 100%)',
                  border: '1px solid rgba(52, 211, 153, 0.25)',
                  boxShadow: '0 2.5px 0 #020617, inset 0 1px 1px rgba(255,255,255,0.15)',
                }}
              >
                <p className="text-[7.5px] text-emerald-400/80 font-bold uppercase">{t[language].bingo.players}</p>
                <p className="text-xs font-black text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]">{uniquePlayers}</p>
              </div>

              {/* Cartelas */}
              <div
                className="rounded-xl py-1 px-0.5 text-center"
                style={{
                  background: 'linear-gradient(180deg, #1e293b 0%, #0b1120 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  boxShadow: '0 2.5px 0 #020617, inset 0 1px 1px rgba(255,255,255,0.15)',
                }}
              >
                <p className="text-[7.5px] text-cyan-400/80 font-bold uppercase">{t[language].bingo.cartelas}</p>
                <p className="text-xs font-black text-cyan-300 drop-shadow-[0_0_4px_rgba(56,189,248,0.5)]">{taken.length}</p>
              </div>

              {/* Derash (Prize Pool) */}
              <div
                className="rounded-xl py-1 px-0.5 text-center"
                style={{
                  background: 'linear-gradient(180deg, #2d2006 0%, #140d02 100%)',
                  border: '1px solid rgba(250, 204, 21, 0.4)',
                  boxShadow: '0 2.5px 0 #020617, inset 0 1px 1px rgba(255,255,255,0.2)',
                }}
              >
                <p className="text-[7.5px] text-yellow-400/90 font-bold uppercase">{t[language].bingo.derash}</p>
                <p className="text-xs font-black text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]">{game.prize_pool} ETB</p>
              </div>

              {/* Status */}
              <div
                className="rounded-xl py-1 px-0.5 text-center"
                style={{
                  background: 'linear-gradient(180deg, #1e293b 0%, #0b1120 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 2.5px 0 #020617, inset 0 1px 1px rgba(255,255,255,0.15)',
                }}
              >
                <p className="text-[7.5px] text-slate-400 font-bold uppercase">{t[language].bingo.status}</p>
                <p className={`text-xs font-black animate-pulse ${statusCls}`}>{statusTxt}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {errMsg && (
        <div className="mx-3 mt-2 px-3 py-2 bg-red-500/20 border border-red-500/40 rounded-xl flex items-center justify-between z-10 shrink-0">
          <p className="text-red-400 text-xs font-bold">{errMsg}</p>
          <button onClick={() => setErrMsg("")} className="text-red-400 text-base leading-none ml-2">✕</button>
        </div>
      )}

      <div className={`flex-1 min-h-0 ${showCallingBoard ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {showCallingBoard ? renderCallingBoard() : renderCartelaPicker()}
      </div>

      {/* Winner Celebration (Fantastic 3D Luxury White Casino Celebration Card) */}
      {celebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div
            className="rounded-3xl p-5 text-center max-w-sm w-full relative select-none flex flex-col items-center animate-in zoom-in-95 duration-300 shadow-[0_25px_60px_rgba(0,0,0,0.35)]"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%)',
              border: '2.5px solid #f59e0b',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35), 0 0 35px rgba(245, 158, 11, 0.35), inset 0 2px 0 #ffffff, 0 8px 0 #b45309',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setCelebration(null);
                setMyCard(null);
                setMyCartelas([]);
                setActiveCartelaIdx(0);
                setTaken([]);
                fetchState();
                refreshUser();
              }}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center border border-slate-200 shadow-sm active:scale-90 transition-all text-xs font-black z-20"
            >
              ✕
            </button>

            {/* ── REMATCH ── */}
            {celebration.winner_name === 'REMATCH' ? (
              <>
                <div className="text-5xl mb-2 animate-spin filter drop-shadow-[0_8px_16px_rgba(249,115,22,0.4)]">🔄</div>
                <h2 className="text-3xl font-black text-orange-600 mb-2 drop-shadow-sm">{t[language].bingo.rematch}</h2>
                <div
                  className="rounded-2xl p-3.5 mb-3 w-full border"
                  style={{
                    background: 'linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)',
                    borderColor: 'rgba(249, 115, 22, 0.4)',
                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.1)',
                  }}
                >
                  <p className="text-orange-950 font-black text-sm mb-1">{t[language].bingo.tieDesc}</p>
                  <p className="text-slate-600 text-xs font-semibold">{t[language].bingo.stakeRefunded}</p>
                  <p className="text-slate-500 text-xs mt-1 font-medium">{t[language].bingo.newGameStarts}</p>
                </div>
                <div
                  className="py-1.5 px-4 rounded-full text-[11px] font-black flex items-center gap-1.5 shadow-sm mt-1"
                  style={{
                    background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
                    border: '1px solid rgba(249, 115, 22, 0.4)',
                    color: '#9a3412',
                  }}
                >
                  <span className="animate-spin text-[10px]">⏳</span>
                  <span>{t[language].bingo.returning} ({celebrationSecondsLeft}s)</span>
                </div>
              </>
            ) : celebration.winner_name.includes(' & ') ? (
              <>
                {/* ── 2-WAY TIE ── */}
                <div className="flex flex-col items-center mb-2.5">
                  <div className="text-5xl mb-1 filter drop-shadow-[0_8px_16px_rgba(245,158,11,0.5)] animate-bounce">🏆</div>
                  <h2 className="text-xl font-black text-amber-600 mb-1 drop-shadow-sm">{t[language].bingo.tieTitle}</h2>
                  <div
                    className="px-5 py-1.5 rounded-full font-black text-sm text-white flex items-center gap-1.5 shadow-md"
                    style={{
                      background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                      boxShadow: '0 3px 0 0 #047857, 0 6px 15px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <span>🎉</span>
                    <span>{Number(celebration.winner_prize || 0).toLocaleString()} ETB {t[language].bingo.each}</span>
                  </div>
                </div>

                {celebration.winners_list && celebration.winners_list.length > 0 ? (
                  <div className="flex gap-2 w-full justify-center overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                    {celebration.winners_list.map((w, idx) => {
                      const winCells = getWinningCells(w.card_matrix, celebration.called);
                      const winTitle = getWinningPatternTitle(w.card_matrix, celebration.called);
                      return (
                        <div
                          key={idx}
                          className="flex-shrink-0 w-[140px] rounded-2xl p-2.5 flex flex-col items-center shadow-md bg-white border-2 border-amber-400"
                        >
                          <p className="text-slate-900 font-black text-sm truncate w-full">{w.first_name}</p>
                          <div className="flex items-center justify-between w-full mb-1.5">
                            <p className="text-amber-700 font-bold text-[9px]">{t[language].bingo.cartelaNum}{w.cartela_number}</p>
                            <span className="text-emerald-700 text-[8px] font-black">{winTitle.replace(' BINGO!', '')}</span>
                          </div>
                          <div className="w-full rounded-xl overflow-hidden border border-amber-300">
                            <div className="grid grid-cols-5">
                              {['B', 'I', 'N', 'G', 'O'].map(l => (
                                <div key={l} className="flex items-center justify-center py-0.5 font-black text-white text-[9px]" style={{ background: l === 'B' ? '#3b82f6' : l === 'I' ? '#8b5cf6' : l === 'N' ? '#ec4899' : l === 'G' ? '#22c55e' : '#3b82f6' }}>{l}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-5 gap-[1px] p-[1px] bg-slate-200">
                              {w.card_matrix.map((row, r) =>
                                row.map((num, c) => {
                                  const isFree = num === 0;
                                  const isWin = winCells.has(`${r}-${c}`);
                                  const isCalled = celebration.called?.map(Number).includes(Number(num));
                                  return (
                                    <div
                                      key={c}
                                      className={`aspect-square flex items-center justify-center text-[8px] font-black ${
                                        isFree
                                          ? 'bg-amber-400 text-yellow-950 font-black'
                                          : isWin
                                          ? 'bg-emerald-500 text-white shadow-[0_0_4px_rgba(16,185,129,0.9)] ring-1 ring-yellow-400 font-black'
                                          : isCalled
                                          ? 'bg-amber-100 text-slate-800'
                                          : 'bg-white text-slate-800'
                                      }`}
                                    >
                                      {isFree ? '★' : num}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl p-3 mb-3 w-full border border-slate-200">
                    <p className="text-slate-900 font-black text-lg">{celebration.winner_name}</p>
                  </div>
                )}

                <div
                  className="py-1.5 px-4 rounded-full text-[11px] font-black flex items-center gap-1.5 shadow-sm mt-1"
                  style={{
                    background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
                    border: '1.5px solid rgba(245, 158, 11, 0.45)',
                    color: '#78350f',
                  }}
                >
                  <span className="animate-spin text-[10px]">⏳</span>
                  <span>{t[language].bingo.returning} ({celebrationSecondsLeft}s)</span>
                </div>
              </>
            ) : (
              <>
                {/* ── FANTASTIC 3D SINGLE WINNER CELEBRATION (WHITE LUXURY THEME) ── */}
                <div className="flex flex-col items-center mb-2.5">
                  <div className="text-5xl mb-1 filter drop-shadow-[0_8px_16px_rgba(245,158,11,0.5)] animate-bounce">
                    🏆
                  </div>
                  <div
                    className="px-8 py-1.5 rounded-full font-black text-2xl tracking-widest text-slate-950 uppercase select-none"
                    style={{
                      background: 'linear-gradient(180deg, #fef08a 0%, #f59e0b 50%, #b45309 100%)',
                      boxShadow: '0 4px 0 0 #78350f, 0 8px 20px rgba(245, 158, 11, 0.45), inset 0 2px 2px rgba(255,255,255,0.85)',
                      textShadow: '0 1px 0 rgba(255,255,255,0.5)',
                    }}
                  >
                    BINGO!
                  </div>
                </div>

                {/* 3D White Winner Info Card */}
                <div
                  className="w-full rounded-2xl p-3.5 mb-3 flex flex-col items-center"
                  style={{
                    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1.5px solid rgba(245, 158, 11, 0.35)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05), inset 0 1px 0 #ffffff',
                  }}
                >
                  <p className="text-amber-600 font-black text-[11px] uppercase tracking-widest mb-0.5">
                    {celebration.iWon ? '🎉 YOU ARE THE WINNER!' : '🏆 BINGO WINNER'}
                  </p>
                  <p className="text-slate-900 font-black text-2xl leading-tight drop-shadow-sm">{celebration.winner_name}</p>
                  {celebration.winner_cartela > 0 && (
                    <span className="mt-1 px-3 py-0.5 rounded-full text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 shadow-sm">
                      {t[language].bingo.cartelaNum}{celebration.winner_cartela}
                    </span>
                  )}
                  <div
                    className="mt-2.5 px-6 py-1.5 rounded-full font-black text-lg text-white flex items-center gap-1.5 shadow-md"
                    style={{
                      background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                      boxShadow: '0 3.5px 0 0 #047857, 0 6px 15px rgba(16, 185, 129, 0.35), inset 0 1px 1px rgba(255,255,255,0.4)',
                    }}
                  >
                    <span>🎉</span>
                    <span>{Number(celebration.winner_prize || 0).toLocaleString()} ETB</span>
                  </div>
                </div>

                {/* Winner Card 3D Display (White Theme) */}
                {celebration.winner_matrix ? (
                  (() => {
                    const winCells = getWinningCells(celebration.winner_matrix, celebration.called);
                    const winTitle = getWinningPatternTitle(celebration.winner_matrix, celebration.called);
                    return (
                      <div
                        className="w-full rounded-2xl overflow-hidden mb-3 bg-white"
                        style={{
                          border: '2px solid rgba(245, 158, 11, 0.75)',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.08), 0 0 15px rgba(245, 158, 11, 0.2)',
                        }}
                      >
                        {/* BINGO Header */}
                        <div className="grid grid-cols-5 text-center font-black text-white text-xs py-1.5">
                          {BINGO_LETTERS.map(l => (
                            <div key={l} style={{ background: LETTER_BG[l] }} className="py-1">{l}</div>
                          ))}
                        </div>
                        {/* Card Grid */}
                        <div className="grid grid-cols-5 gap-[2px] p-[2px] bg-slate-200">
                          {Array.from({ length: 5 }).flatMap((_, r) =>
                            Array.from({ length: 5 }).map((_, c) => {
                              const num = celebration.winner_matrix![r][c];
                              const isFree = num === 0;
                              const isWin = winCells.has(`${r}-${c}`);
                              const isCalled = celebration.called?.map(Number).includes(Number(num));
                              return (
                                <div
                                  key={`${r}-${c}`}
                                  className={`aspect-square flex items-center justify-center font-black text-xs rounded transition-all ${
                                    isFree
                                      ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 font-black shadow-inner'
                                      : isWin
                                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-black shadow-[0_0_10px_rgba(16,185,129,0.95)] ring-2 ring-yellow-400 scale-105 z-10'
                                      : isCalled
                                      ? 'bg-amber-100 text-amber-950 font-bold'
                                      : 'bg-white text-slate-800 font-bold'
                                  }`}
                                >
                                  {isFree ? '★' : num}
                                </div>
                              );
                            })
                          )}
                        </div>
                        {/* Cartela Label + Winning Pattern Tag */}
                        <div className="py-2 px-3 flex items-center justify-between bg-white border-t border-slate-200">
                          <p className="text-slate-800 font-black text-[11px] tracking-wider uppercase">
                            CARTELA # {celebration.winner_cartela}
                          </p>
                          <span className="text-emerald-700 text-[10px] font-black uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300 shadow-sm">
                            {winTitle}
                          </span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="w-full bg-slate-50 rounded-2xl p-4 mb-3 border border-slate-200 flex flex-col items-center">
                    <div className="animate-spin text-2xl mb-1">⏳</div>
                    <p className="text-slate-500 text-xs font-bold">Loading winning cartela...</p>
                  </div>
                )}

                {/* 3D Countdown Return Pill */}
                <div
                  className="py-1.5 px-4 rounded-full text-[11px] font-black flex items-center gap-1.5 shadow-sm mt-0.5"
                  style={{
                    background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
                    border: '1.5px solid rgba(245, 158, 11, 0.45)',
                    color: '#78350f',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05), inset 0 1px 0 #ffffff',
                  }}
                >
                  <span className="animate-spin text-[10px]">⏳</span>
                  <span>{t[language].bingo.returning} ({celebrationSecondsLeft}s)</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── HOW TO PLAY VIDEO GUIDE MODAL ── */}
      <VideoGuideModal
        isOpen={showVideoGuide}
        onClose={() => setShowVideoGuide(false)}
        category="how_to_play"
      />

    </div>
  );
}
