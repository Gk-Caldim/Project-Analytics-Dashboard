import React from 'react';
import { Smile, Frown, Meh, AlertCircle } from 'lucide-react';

const SENTIMENT_THEMES = {
  angry: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/5',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/20 dark:border-rose-500/10',
    icon: Frown,
    label: 'Angry 😡'
  },
  frustrated: {
    bg: 'bg-orange-500/10 dark:bg-orange-500/5',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/20 dark:border-orange-500/10',
    icon: Frown,
    label: 'Frustrated 😠'
  },
  neutral: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/5',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/20 dark:border-slate-500/10',
    icon: Meh,
    label: 'Neutral 😐'
  },
  satisfied: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/5',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20 dark:border-emerald-500/10',
    icon: Smile,
    label: 'Satisfied 😊'
  }
};

const SentimentBadge = ({ score = 0, emotion = 'neutral' }) => {
  const normalizedEmotion = String(emotion).toLowerCase();
  const theme = SENTIMENT_THEMES[normalizedEmotion] || SENTIMENT_THEMES.neutral;
  const Icon = theme.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-wide transition-all ${theme.bg} ${theme.text} ${theme.border}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{theme.label}</span>
      <span className="opacity-40">|</span>
      <span className="font-mono font-bold">
        {score !== null ? (score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2)) : '—'}
      </span>
    </div>
  );
};

export default SentimentBadge;
