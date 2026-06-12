/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { getRatingBadgeText } from '../types';

interface RatingBadgeProps {
  rating: string;
  className?: string;
}

export default function RatingBadge({ rating, className = '' }: RatingBadgeProps) {
  const badge = getRatingBadgeText(rating);
  
  // Custom theme colors for each rating level as specified in guidelines
  const colors: Record<'U' | 'PG' | '12' | '15' | '18', string> = {
    'U': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    'PG': 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    '12': 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    '15': 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    '18': 'bg-red-500/10 border-red-500/30 text-red-400',
  };

  const currentColors = colors[badge] || colors['U'];

  return (
    <span 
      className={`inline-flex items-center justify-center font-mono font-bold text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md border select-none ${currentColors} ${className}`}
      title={`Content Rating: ${badge}`}
    >
      {badge === 'U' ? 'U' : badge}
    </span>
  );
}
