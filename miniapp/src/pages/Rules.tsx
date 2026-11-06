import { ArrowLeft, Trophy, Clock, Users, Coins, Star, AlertCircle, CheckCircle2, Zap, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { t } from '../lib/translations';

export default function Rules() {
  const navigate = useNavigate();
  const { language } = useGameStore();
  
  const rules = [
    {
      icon: Users,
      color: 'bg-blue-50 text-blue-500 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-blue-800/60',
      title: t[language].rules.rule1Title,
      body: t[language].rules.rule1Body,
    },
    {
      icon: Clock,
      color: 'bg-purple-50 text-purple-500 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-100 dark:border-purple-800/60',
      title: t[language].rules.rule2Title,
      body: t[language].rules.rule2Body,
    },
    {
      icon: Star,
      color: 'bg-yellow-50 text-yellow-500 dark:bg-yellow-950/50 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-800/60',
      title: t[language].rules.rule3Title,
      body: t[language].rules.rule3Body,
    },
    {
      icon: Trophy,
      color: 'bg-green-50 text-green-500 dark:bg-green-950/50 dark:text-green-400 border border-green-100 dark:border-green-800/60',
      title: t[language].rules.rule4Title,
      body: t[language].rules.rule4Body,
    },
    {
      icon: Coins,
      color: 'bg-orange-50 text-orange-500 dark:bg-orange-950/50 dark:text-orange-400 border border-orange-100 dark:border-orange-800/60',
      title: t[language].rules.rule5Title,
      body: t[language].rules.rule5Body,
    },
    {
      icon: AlertCircle,
      color: 'bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-100 dark:border-rose-800/60',
      title: t[language].rules.rule6Title,
      body: t[language].rules.rule6Body,
    },
    {
      icon: CheckCircle2,
      color: 'bg-teal-50 text-teal-500 dark:bg-teal-950/50 dark:text-teal-400 border border-teal-100 dark:border-teal-800/60',
      title: t[language].rules.rule7Title,
      body: t[language].rules.rule7Body,
    },
  ];

  const bonusRules = [
    {
      icon: Zap,
      color: 'bg-amber-50 text-amber-500 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-700/60',
      badge: '⚡ ' + t[language].rules.bonus1Badge,
      title: t[language].rules.bonus1Title,
      body: t[language].rules.bonus1Body,
      highlight: true,
    },
    {
      icon: Zap,
      color: 'bg-violet-50 text-violet-500 dark:bg-violet-950/50 dark:text-violet-400 border border-violet-200 dark:border-violet-700/60',
      badge: '⚡ ' + t[language].rules.bonus2Badge,
      title: t[language].rules.bonus2Title,
      body: t[language].rules.bonus2Body,
      highlight: true,
    },
    {
      icon: Gift,
      color: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/60',
      badge: '🎁 ' + t[language].rules.bonus3Badge,
      title: t[language].rules.bonus3Title,
      body: t[language].rules.bonus3Body,
      highlight: true,
    },
    {
      icon: Gift,
      color: 'bg-pink-50 text-pink-500 dark:bg-pink-950/50 dark:text-pink-400 border border-pink-200 dark:border-pink-700/60',
      badge: '🎁 ' + t[language].rules.bonus4Badge,
      title: t[language].rules.bonus4Title,
      body: t[language].rules.bonus4Body,
      highlight: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 transition-colors duration-200 pb-12">

      {/* ── 3D HEADER ── */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-20 px-4 pt-5 pb-4 border-b border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] transition-colors">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all border border-slate-200/60 dark:border-slate-700 shadow-sm flex items-center justify-center shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-800 dark:text-white leading-tight">{t[language].rules.title}</h1>
            <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">{t[language].rules.subtitle}</p>
          </div>
        </div>
      </div>

      {/* ── 3D HERO BANNER ── */}
      <div className="mx-4 mt-4 relative overflow-hidden bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 dark:from-amber-600 dark:via-amber-700 dark:to-orange-800 rounded-3xl p-5 shadow-[0_10px_25px_rgba(245,158,11,0.3)] dark:shadow-[0_10px_30px_rgba(245,158,11,0.2)] border-t border-white/40 flex items-center gap-4">
        {/* Ambient glow highlight */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl -translate-y-8 translate-x-8 pointer-events-none" />
        <div className="w-14 h-14 bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
          <Trophy size={28} className="text-white drop-shadow-md animate-pulse" />
        </div>
        <div className="relative z-10">
          <p className="text-white font-black text-base leading-tight drop-shadow-sm">{t[language].rules.heroTitle}</p>
          <p className="text-white/90 text-xs mt-1 leading-snug">{t[language].rules.heroDesc}</p>
        </div>
      </div>

      {/* ── RULES LIST (3D CARDS) ── */}
      <div className="px-4 mt-4 space-y-3">
        {rules.map((rule, i) => {
          const Icon = rule.icon;
          return (
            <div key={i} className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-[0_6px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.4)] flex gap-3.5 transition-all hover:scale-[1.01] backdrop-blur-sm">
              <div className={`w-10 h-10 rounded-xl ${rule.color} flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700">
                    {i + 1}
                  </span>
                  <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{rule.title}</p>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{rule.body}</p>
              </div>
            </div>
          );
        })}

        {/* ── BONUS REWARDS SECTION ── */}
        <div className="mt-7">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-3.5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 dark:via-amber-600/50 to-transparent" />
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full px-4 py-1.5 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(245,158,11,0.35)] border-t border-white/30">
              <Gift size={13} className="text-white drop-shadow-sm" />
              <span className="text-white font-black text-[11px] uppercase tracking-wider">{t[language].rules.bonusRewardsTitle}</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-300 dark:via-amber-600/50 to-transparent" />
          </div>

          <div className="space-y-3">
            {bonusRules.map((rule, i) => {
              const Icon = rule.icon;
              return (
                <div key={i} className="bg-gradient-to-br from-white to-amber-50/50 dark:from-slate-900/90 dark:to-amber-950/20 rounded-2xl p-4 border border-amber-200/80 dark:border-amber-600/30 shadow-[0_6px_16px_rgba(245,158,11,0.08)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.4)] flex gap-3.5 relative overflow-hidden backdrop-blur-sm">
                  {/* Subtle glow accent */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 dark:bg-amber-400/5 rounded-full blur-lg -translate-y-6 translate-x-6 pointer-events-none" />
                  <div className={`w-10 h-10 rounded-xl ${rule.color} flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shrink-0 shadow-sm">
                        {rule.badge}
                      </span>
                    </div>
                    <p className="font-black text-slate-800 dark:text-slate-100 text-sm mb-1">{rule.title}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{rule.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      
        {/* ── FOOTER NOTE ── */}
        <div className="bg-slate-800 dark:bg-slate-900/90 rounded-2xl px-4 py-4 flex items-start gap-3 mt-4 border border-slate-700/60 dark:border-slate-800 shadow-lg">
          <AlertCircle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-slate-200 dark:text-slate-300 text-xs leading-relaxed">
            {t[language].rules.footerNote}
          </p>
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
}
