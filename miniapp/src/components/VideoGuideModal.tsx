import React, { useState, useEffect } from 'react';
import { Play, X, Clock, HelpCircle, ArrowRight } from 'lucide-react';
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

const CATEGORY_META: Record<VideoCategory, { titleEn: string; titleAm: string; subEn: string; subAm: string; stepsEn: string[]; stepsAm: string[] }> = {
  deposit: {
    titleEn: 'Deposit Video Guide',
    titleAm: 'የገንዘብ ማስገቢያ ቪዲዮ መመሪያ',
    subEn: 'Learn how to deposit via Telebirr or Mobile Banking',
    subAm: 'በቴሌብር ወይም በባንክ እንዴት በቀላሉ ገንዘብ እንደሚያስገቡ ደረጃ በደረጃ ይመልከቱ',
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
    titleEn: 'Withdrawal Video Guide',
    titleAm: 'የገንዘብ ማውጫ ቪዲዮ መመሪያ',
    subEn: 'Learn how to withdraw winnings straight to your account',
    subAm: 'ያሸነፉትን ገንዘብ ወደ ባንክ ወይም ቴሌብር እንዴት እንደሚያወጡ ይመልከቱ',
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
    titleEn: 'Invite & Earn Video Guide',
    titleAm: 'የግብዣ እና ሽልማት ቪዲዮ መመሪያ',
    subEn: 'Learn how to invite friends and earn rewards',
    subAm: 'ጓደኞችን በመጋበዝ እንዴት ተጨማሪ ገቢ እንደሚያገኙ ይመልከቱ',
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
    titleEn: 'Transfer Funds Video Guide',
    titleAm: 'የገንዘብ ማስተላለፊያ ቪዲዮ መመሪያ',
    subEn: 'Learn how to instantly send balance to any player',
    subAm: 'ለሌላ ተጫዋች በቅጽበት ገንዘብ እንዴት እንደሚያስተላልፉ ይመልከቱ',
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
    titleEn: 'How to Play Video Guide',
    titleAm: 'የጨዋታ አጨዋወት ቪዲዮ መመሪያ',
    subEn: 'Learn how to pick cartelas and win Choice Bingo',
    subAm: 'ካርቴላ መርጠው እንዴት ቢንጎ እንደሚጫወቱ እና እንደሚያሸንፉ ይመልከቱ',
    stepsEn: [
      'Choose your stake and pick 1 to 2 lucky cartelas',
      'Wait for the caller to announce numbers',
      'Complete any line, pattern, or diagonal and tap BINGO!'
    ],
    stepsAm: [
      'የመደብ መጠን መርጠው 1 ወይም 2 ካርቴላ ይምረጡ',
      'ቁጥሮቹ በድምፅ ሲጠሩ ካርቴላዎ ላይ ይምረጡ',
      'መስመር ሲሞሉ ቢንጎ የሚለውን በመጫን ያሸንፉ!'
    ]
  },
  how_to_use: {
    titleEn: 'How to Use Video Guide',
    titleAm: 'የመተግበሪያው አጠቃቀም ቪዲዮ መመሪያ',
    subEn: 'Complete guide on navigating and using Choice Bingo',
    subAm: 'Choice Bingo መተግበሪያን እንዴት በቀላሉ እንደሚጠቀሙ ይመልከቱ',
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
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  return ytMatch ? `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0` : null;
}

export default function VideoGuideModal({ isOpen, onClose, category }: VideoGuideModalProps) {
  const { language } = useGameStore();
  const [videos, setVideos] = useState<SupportVideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<SupportVideoItem | null>(null);

  const meta = CATEGORY_META[category] || CATEGORY_META.deposit;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3.5 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative animate-scale-up max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3 shrink-0">
          <div className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Play size={16} className="fill-white translate-x-0.5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-white text-sm leading-tight">
                {language === 'am' ? meta.titleAm : meta.titleEn}
              </h3>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                {language === 'am' ? 'ደረጃ በደረጃ አጠቃቀም' : 'Step-by-step tutorial'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto space-y-3.5 pr-0.5 flex-1 text-left">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3 shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {language === 'am' ? 'ቪዲዮው በመጫን ላይ ነው...' : 'Loading video guide...'}
              </p>
            </div>
          ) : selectedVideo ? (
            <div>
              {/* Dynamic Video Player */}
              {(() => {
                const ytEmbed = getYouTubeEmbedUrl(selectedVideo.video_url);
                if (ytEmbed) {
                  return (
                    <div className="relative rounded-2xl overflow-hidden aspect-video bg-black shadow-lg border border-slate-200 dark:border-slate-800">
                      <iframe
                        src={ytEmbed}
                        title={selectedVideo.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  );
                }
                return (
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-black shadow-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                    <video
                      key={selectedVideo.id}
                      src={selectedVideo.video_url}
                      poster={selectedVideo.thumbnail_url || undefined}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                );
              })()}

              {/* Video Title & Details */}
              <div className="mt-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3">
                <h4 className="font-black text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  <span>{selectedVideo.title}</span>
                </h4>
                {selectedVideo.description && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {selectedVideo.description}
                  </p>
                )}
              </div>

              {/* Multiple Videos Selector if more than 1 */}
              {videos.length > 1 && (
                <div className="mt-2.5">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                    {language === 'am' ? 'ተጨማሪ ቪዲዮዎች' : 'More Guides'} ({videos.length})
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {videos.map((v, idx) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVideo(v)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all ${
                          selectedVideo.id === v.id
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        #{idx + 1} {v.title.slice(0, 18)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Fallback if no video is uploaded yet */
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 mx-auto flex items-center justify-center mb-3">
                <Play size={28} className="fill-amber-500" />
              </div>
              <h3 className="font-black text-slate-800 dark:text-white text-base text-center">
                {language === 'am' ? meta.titleAm : meta.titleEn}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3.5 leading-relaxed text-center">
                {language === 'am'
                  ? 'ቪዲዮው በአስተዳዳሪው ገና አልተጫነም:: የሚከተሉትን ቀላል ደረጃዎች ይከተሉ:'
                  : 'Tutorial video coming soon! Follow these quick steps:'}
              </p>
              <div className="space-y-2 text-left mb-2">
                {(language === 'am' ? meta.stepsAm : meta.stepsEn).map((step, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-2 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-2xl font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all"
          >
            {language === 'am' ? 'ተረድቻለሁ' : 'Got it!'}
          </button>
        </div>
      </div>
    </div>
  );
}
