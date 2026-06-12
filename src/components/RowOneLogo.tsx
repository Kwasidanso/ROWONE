/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface RowOneLogoProps {
  className?: string;
  size?: number; // diameter of the emblem circular outer rim
  showText?: boolean; // display "ROWONE" spread out below
  textColor?: string; // CSS style color text matching
  goldColor?: string; // hex color pattern overlay
}

export default function RowOneLogo({
  className = '',
  size = 32,
  showText = false,
  textColor = 'text-[#eedecb]',
  goldColor = '#dda75f',
}: RowOneLogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
      >
        <defs>
          {/* Subtle logo premium glow */}
          <filter id="rowone-gold-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          {/* High-fidelity warm brassy gold gradient */}
          <linearGradient id="rowone-goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f3e0c3" />
            <stop offset="40%" stopColor="#dda75f" />
            <stop offset="80%" stopColor="#bfa16f" />
            <stop offset="100%" stopColor="#8d6832" />
          </linearGradient>
        </defs>

        {/* Outer Dark rim contour border */}
        <circle cx="50" cy="50" r="48" fill="#141111" stroke="url(#rowone-goldGradient)" strokeWidth="1" />

        {/* Vintage Ivory / Off-white dial scale face */}
        <circle cx="50" cy="50" r="45" fill="#eedecb" />

        {/* Dial ring borders */}
        <circle cx="50" cy="50" r="42.5" fill="none" stroke="#141111" strokeWidth="1.2" />
        <circle cx="50" cy="50" r="34.5" fill="none" stroke="#141111" strokeWidth="1.2" />

        {/* Inner Film Reel sprocket track */}
        <circle
          cx="50"
          cy="50"
          r="38.5"
          fill="none"
          stroke="#141111"
          strokeWidth="4"
          strokeDasharray="2.2 2.6"
        />

        {/* Crosshair compass alignments (vertical and horizontal film spool indicators) */}
        <line x1="50" y1="5" x2="50" y2="15" stroke="#141111" strokeWidth="1.5" />
        <line x1="50" y1="85" x2="50" y2="95" stroke="#141111" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="5" y1="50" x2="15" y2="50" stroke="#141111" strokeWidth="1.5" />
        <line x1="85" y1="50" x2="95" y2="50" stroke="#141111" strokeWidth="1.5" strokeLinecap="round" />

        {/* Crosshair indicator dots */}
        <circle cx="50" cy="18" r="1.2" fill="#141111" />
        <circle cx="50" cy="82" r="1.2" fill="#141111" />
        <circle cx="18" cy="50" r="1.2" fill="#141111" />
        <circle cx="82" cy="50" r="1.2" fill="#141111" />

        {/* Center cinema hub dark fill */}
        <circle cx="50" cy="50" r="29" fill="#141111" />

        {/* Hub border accent gold ring */}
        <circle cx="50" cy="50" r="27" fill="none" stroke="url(#rowone-goldGradient)" strokeWidth="0.8" />

        {/* R1 characters rendering */}
        <g filter="url(#rowone-gold-glow)">
          {/* 'R' in high-contrast traditional serif style */}
          <text
            x="36"
            y="57"
            fontFamily="'Cinzel', 'Georgia', 'Playfair Display', serif"
            fontSize="34"
            fontWeight="900"
            fill="url(#rowone-goldGradient)"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            R
          </text>
          
          {/* '1' in high-contrast corresponding serif style */}
          <text
            x="64"
            y="54"
            fontFamily="'Cinzel', 'Georgia', 'Playfair Display', serif"
            fontSize="32"
            fontWeight="bold"
            fill="url(#rowone-goldGradient)"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            1
          </text>
        </g>
      </svg>
      {showText && (
        <span 
          className={`mt-2.5 font-serif text-[10px] tracking-[0.4em] font-black uppercase tracking-widest text-center select-none ${textColor}`}
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}
        >
          ROWONE
        </span>
      )}
    </div>
  );
}
