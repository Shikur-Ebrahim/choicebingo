import React, { useState, useEffect, useRef } from 'react';
import { Play, X, CheckCircle2, Sparkles } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export type VideoCategory =
  | 'deposit'
  | 'withdraw'
  | 'invite'
  | 'transfer'
  | 'how_to_use'
  | 'how_to_play';

interface SupportVideoItem {
  id: string;
  category: string;
  title: string;
  description: string | null;
  video_url: string;
  video_key: string;
  thumbnail_url: string | null;
  sort_order: number;
}

interface VideoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: VideoCategory;
}

const CATEGORY_META: Record<
  VideoCategory,
  {
    titleEn: string;
    titleAm: string;
    subEn: string;
    subAm: string;
    badgeEn: string;
    badgeAm: string;
    gradient: string;
    stepsEn: string[];
    stepsAm: string[];
  }
> = {
  deposit: {
    titleEn: 'How to Deposit',
    titleAm: 'የገንዘብ ማስገቢያ መመሪያ',
    subEn: 'Step-by-step guide for Telebirr & CBE',
    subAm: 'በቴሌብር ወይም በባንክ እንዴት ገንዘብ እንደሚያስገቡ ደረጃ በደረጃ ይመልከቱ',
    badgeEn: 'DEPOSIT GUIDE',
    badgeAm: 'ተቀማጭ መመሪያ',
    gradient: 'from-amber-500 to-rose-500',
    stepsEn: [
      'Copy the official bank or Telebirr account number',
      'Transfer funds via your mobile banking app',
      'Upload receipt screenshot or paste transaction SMS'
    ],
    stepsAm: [
      'የባንክ ወይም የቴሌብር አካውንት ቁጥሩን ይቅዱ',
      'በሞባይል ባንኪንግ ገንዘቡን ያስተላልፉ',
      'ስክሪንሾት ያያይዙ ወይም የግብይቱን SMS ጽሑፍ ይለጥፉ'
    ]
  },
  withdraw: {
    titleEn: 'How to Withdraw',
    titleAm: 'የገንዘብ ማውጫ መመሪያ',
    subEn: 'Instant payouts straight to your account',
    subAm: 'ያሸነፉትን ገንዘብ ወደ ባንክ ወይም ቴሌብር እንዴት እንደሚያወጡ ይመልከቱ',
    badgeEn: 'WITHDRAW GUIDE',
    badgeAm: 'ወጪ መመሪያ',
    gradient: 'from-emerald-500 to-teal-500',
    stepsEn: [
      'Select your payout method (Telebirr, CBE, Awash, etc.)',
      'Enter your account number and holder name',
      'Enter amount and submit — admin reviews and sends immediately'
    ],
    stepsAm: [
      'የመክፈያ መንገድ ይምረጡ (ቴሌብር፣ ንግድ ባንክ፣ አዋሽ ባንክ ወዘተ)',
      'የአካውንት ቁጥር እና ባለቤት ስም ያስገቡ',
      'የመጠኑን ልክ አስገብተው ይላኩ — በጥቂት ደቂቃዎች ውስጥ ይላካል'
    ]
  },
  invite: {
    titleEn: 'How to Invite & Earn',
    titleAm: 'የግብዣ እና ሽልማት መመሪያ',
    subEn: 'Earn lifetime commissions on friend deposits',
    subAm: 'ጓደኞችን በመጋበዝ እንዴት ተጨማሪ ገቢ እንደሚያገኙ ይመልከቱ',
    badgeEn: 'INVITE GUIDE',
    badgeAm: 'ግብዣ መመሪያ',
    gradient: 'from-fuchsia-500 to-pink-500',
    stepsEn: [
      'Copy your unique invitation link from the Invite page',
      'Share with friends, Telegram groups or social media',
      'Earn bonuses whenever your friends join and play'
    ],
    stepsAm: [
      'የእርስዎን ልዩ የግብዣ ሊንክ ከገጹ ላይ ይቅዱ',
      'ለጓደኞች፣ ቴሌግራም ግሩፖች ወይም ማህበራዊ ሚዲያ ያጋሩ',
      'ጓደኞችዎ ተመዝግበው ሲጫወቱ ቦነስ እና ሽልማት ይሰብሰቡ'
    ]
  },
  transfer: {
    titleEn: 'How to Transfer Funds',
    titleAm: 'የገንዘብ ማስተላለፊያ መመሪያ',
    subEn: 'Send balance instantly to another player',
    subAm: 'ለሌላ ተጫዋች በቅጽበት ገንዘብ እንዴት እንደሚያስተላልፉ ይመልከቱ',
    badgeEn: 'TRANSFER GUIDE',
    badgeAm: 'ማስተላለፍ መመሪያ',
    gradient: 'from-cyan-500 to-blue-500',
    stepsEn: [
      'Enter the recipient player\'s Telegram ID',
      'Verify the recipient\'s name on the confirmation step',
      'Confirm transfer — balance is credited instantly with zero fees'
    ],
    stepsAm: [
      'የተቀባዩን ተጫዋች የቴሌግራም መለያ (ID) ያስገቡ',
      'በማረጋገጫው ገጽ ላይ የተቀባዩን ትክክለኛ ስም ይመልከቱ',
      'አረጋግጠው ይላኩ — በቅጽበት ያለ ምንም ክፍያ ገቢ ይሆናል'
    ]
  },
  how_to_play: {
    titleEn: 'How to Play Choice Bingo',
    titleAm: 'የጨዋታ አጨዋወት መመሪያ',
    subEn: 'Pick cartelas, match numbers, win the jackpot',
    subAm: 'ካርቴላ መርጠው እንዴት ቢንጎ እንደሚጫወቱ እና እንደሚያሸንፉ ይመልከቱ',
    badgeEn: 'HOW TO PLAY',
    badgeAm: 'አጨዋወት',
    gradient: 'from-violet-500 to-indigo-500',
    stepsEn: [
      'Choose your stake and pick 1 to 4 lucky cartelas',
      'Wait for the caller to announce numbers',
      'Complete any line, pattern, or diagonal and tap BINGO!'
    ],
    stepsAm: [
      'የመደብ መጠን መርጠው 1 እስከ 4 ካርቴላ ይምረጡ',
      'ቁጥሮቹ በድምፅ ሲጠሩ ካርቴላዎ ላይ ይምረጡ',
      'መስመር ሲሞሉ ቢንጎ የሚለውን በመጫን ያሸንፉ!'
    ]
  },
  how_to_use: {
    titleEn: 'How to Use Choice Bingo',
    titleAm: 'የመተግበሪያው አጠቃቀም መመሪያ',
    subEn: 'Complete walkthrough of features and navigation',
    subAm: 'Choice Bingo መተግበሪያን እንዴት በቀላሉ እንደሚጠቀሙ ይመልከቱ',
    badgeEn: 'HOW TO USE',
    badgeAm: 'አጠቃቀም',
    gradient: 'from-amber-500 to-orange-500',
    stepsEn: [
      'Explore games, deposits, withdrawals and rewards',
      'Track your game stats and claim live bonuses',
      'Enjoy 24/7 fast support whenever you need help'
    ],
    stepsAm: [
      'ጨዋታዎችን፣ ተቀማጭ፣ ወጪ እና ሽልማቶችን ያስሱ',
      'የጨዋታ ታሪክዎን ይከታተሉ እና ቦነስ ይሰብስቡ',
      'ለማንኛውም ጥያቄ ፈጣን የ24/7 ድጋፍ ያግኙ'
    ]
  }
};

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  return ytMatch
    ? `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&enablejsapi=1`
    : null;
}

/**
 * Custom hook to automatically open the Video Guide on the user's first time visiting a page/section.
 * Remembers in localStorage so it only opens once automatically, while keeping manual clicks working anytime.
 */
export function useAutoVideoGuide(
  category: VideoCategory,
  setIsOpen: (open: boolean) => void,
  userId?: string
) {
  useEffect(() => {
    try {
      const userKey = userId ? `cb_seen_video_${category}_${userId}` : null;
      const deviceKey = `cb_seen_video_${category}`;

      if (
        localStorage.getItem(deviceKey) === 'true' ||
        (userKey && localStorage.getItem(userKey) === 'true')
      ) {
        return;
      }

      // First time visit: auto-open smoothly after 450ms
      const timer = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem(deviceKey, 'true');
        if (userKey) localStorage.setItem(userKey, 'true');
      }, 450);

      return () => clearTimeout(timer);
    } catch {
      // Ignore localStorage exceptions in restrictive/private browsing mode
    }
  }, [category, setIsOpen, userId]);
}

export default function VideoGuideModal({ isOpen, onClose, category }: VideoGuideModalProps) {
  const { language } = useGameStore();
  const [videos, setVideos] = useState<SupportVideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<SupportVideoItem | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const meta = CATEGORY_META[category] || CATEGORY_META.deposit;

  useEffect(() => {
    if (!isOpen) {
      setIsCompleted(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setIsCompleted(false);

    fetch(`${API_URL}/support-videos?category=${category}`)
      .then((res) => (res.ok ? res.json() : Promise.reject('Failed to fetch')))
      .then((data) => {
        if (!isMounted) return;
        const vids = (data.videos || []) as SupportVideoItem[];
        setVideos(vids);
        if (vids.length > 0) {
          setSelectedVideo(vids[0]);
        } else {
          setSelectedVideo(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load video guides:', err);
        if (isMounted) {
          setVideos([]);
          setSelectedVideo(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, category]);

  // Handle video playback finish -> show completion overlay and automatically disappear smoothly
  const handleVideoEnded = () => {
    setIsCompleted(true);
    const timer = setTimeout(() => {
      onClose();
      setIsCompleted(false);
    }, 650);
    return () => clearTimeout(timer);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in"
      onClick={onClose}
    >
      {/* ── FULL VERTICAL ATTRACTIVE CARD ── */}
      <div
        className="w-full max-w-sm sm:max-w-md h-[95vh] sm:h-[88vh] bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white rounded-[28px] sm:rounded-[36px] shadow-[0_25px_70px_rgba(0,0,0,0.95)] border border-slate-700/60 flex flex-col overflow-hidden relative select-none animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background effects */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* ── HEADER (Sleek Glassmorphic Bar) ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-white/5 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${meta.gradient} text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0`}
            >
              <Play size={16} className="fill-white translate-x-0.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-amber-300">
                  {language === 'am' ? meta.badgeAm : meta.badgeEn}
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
              <h3 className="font-black text-white text-sm leading-tight truncate">
                {language === 'am' ? meta.titleAm : meta.titleEn}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all shrink-0 ml-2 border border-white/10"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── MAIN VERTICAL HERO VIDEO AREA (Fills screen height vertically) ── */}
        <div className="flex-1 min-h-0 relative mx-3 my-2 rounded-2xl overflow-hidden bg-black/95 border border-white/10 flex items-center justify-center shadow-inner group">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3 shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
              <p className="text-xs font-bold text-slate-400">
                {language === 'am' ? 'ቪዲዮው በመጫን ላይ ነው...' : 'Loading video guide...'}
              </p>
            </div>
          ) : selectedVideo ? (
            <>
              {(() => {
                const ytEmbed = getYouTubeEmbedUrl(selectedVideo.video_url);
                if (ytEmbed) {
                  return (
                    <iframe
                      src={ytEmbed}
                      title={selectedVideo.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  );
                }
                return (
                  <video
                    ref={videoRef}
                    key={selectedVideo.id}
                    src={selectedVideo.video_url}
                    poster={selectedVideo.thumbnail_url || undefined}
                    controls
                    autoPlay
                    playsInline
                    onEnded={handleVideoEnded}
                    className="w-full h-full object-contain"
                  />
                );
              })()}

              {/* ── AUTO-DISAPPEAR ANIMATED BADGE WHEN FINISHED ── */}
              {isCompleted && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-4 z-20 animate-fade-in">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center shadow-xl shadow-emerald-500/40 mb-3 animate-scale-up">
                    <CheckCircle2 size={36} className="text-white" />
                  </div>
                  <h4 className="text-base font-black text-white">
                    {language === 'am' ? 'ቪዲዮው ተጠናቋል!' : 'Guide Completed!'}
                  </h4>
                  <p className="text-xs text-emerald-400 font-bold mt-1 flex items-center gap-1">
                    <Sparkles size={13} />
                    {language === 'am' ? 'በራስ-ሰር በመዘጋት ላይ...' : 'Closing automatically...'}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Fallback if no video uploaded yet */
            <div className="p-6 text-center flex flex-col items-center justify-center h-full">
              <div
                className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${meta.gradient} text-white mx-auto flex items-center justify-center mb-4 shadow-xl`}
              >
                <Play size={28} className="fill-white translate-x-0.5" />
              </div>
              <h3 className="font-black text-white text-base">
                {language === 'am' ? meta.titleAm : meta.titleEn}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 mb-4 max-w-xs leading-relaxed">
                {language === 'am'
                  ? 'ቪዲዮው ገና አልተጫነም:: የሚከተሉትን ቀላል ደረጃዎች ይከተሉ:'
                  : 'Tutorial video coming soon! Follow these quick steps:'}
              </p>
              <div className="space-y-2 text-left w-full max-w-xs">
                {(language === 'am' ? meta.stepsAm : meta.stepsEn).map((step, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 border border-white/10 p-2.5 rounded-xl flex items-center gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-[11.5px] font-bold text-slate-200">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── DETAILS & SELECTOR SECTION (Below video) ── */}
        <div className="px-4 py-2 shrink-0 space-y-2 bg-white/[0.02]">
          {selectedVideo && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <h4 className="font-black text-xs text-white truncate">
                    {selectedVideo.title}
                  </h4>
                </div>
                {selectedVideo.description && (
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                    {selectedVideo.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Multiple Videos Switcher */}
          {videos.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[9px] font-black uppercase text-slate-400 shrink-0">
                {language === 'am' ? 'ቪዲዮዎች:' : 'Guides:'}
              </span>
              {videos.map((v, idx) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVideo(v);
                    setIsCompleted(false);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[10.5px] font-black shrink-0 transition-all ${
                    selectedVideo?.id === v.id
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                      : 'bg-white/10 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  #{idx + 1} {v.title.slice(0, 16)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="p-3 border-t border-white/10 shrink-0 bg-white/5 backdrop-blur-md">
          <button
            onClick={onClose}
            className={`w-full py-3 bg-gradient-to-r ${meta.gradient} hover:brightness-110 active:scale-[0.98] text-white rounded-2xl font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5`}
          >
            <CheckCircle2 size={15} />
            <span>{language === 'am' ? 'ተረድቻለሁ (ዝጋ)' : 'Got it! (Close)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
