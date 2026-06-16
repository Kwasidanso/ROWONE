/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import RowOneLogo from './RowOneLogo';

interface IntroAnimationProps {
  onComplete: () => void;
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
  // Auto-complete after the dramatic sequence concludes (approx 5.2 seconds total)
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
      sessionStorage.setItem('intro_played', 'true');
    }, 5200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleSkip = () => {
    onComplete();
    sessionStorage.setItem('intro_played', 'true');
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 1.08,
        filter: 'blur(15px)',
        transition: { duration: 1.0, ease: [0.65, 0, 0.35, 1] } 
      }}
      className="fixed inset-0 z-[9999] bg-[#090707] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Projector Glow Backlight Shimmer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vw] h-[140vw] max-w-[820px] max-h-[820px] bg-[radial-gradient(circle_at_center,rgba(221,167,95,0.09)_0%,rgba(14,13,13,0)_70%)] rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '4.5s' }} />
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#dda75f]/20 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#dda75f]/10 to-transparent" />
      </div>

      <div className="flex flex-col items-center justify-center space-y-10 z-10 relative">
        {/* Anamorphic Lens Flare Sweep across screen */}
        <motion.div 
          initial={{ x: '-120vw', opacity: 0 }}
          animate={{ 
            x: '120vw', 
            opacity: [0, 0.3, 0.7, 0.3, 0],
          }}
          transition={{
            duration: 2.2,
            ease: "easeInOut",
            delay: 0.3,
          }}
          className="absolute h-[2px] w-[300px] bg-gradient-to-r from-transparent via-[#dda75f]/80 to-transparent pointer-events-none filter blur-[1px] shadow-[0_0_15px_rgba(221,167,95,0.8)]"
          style={{ top: '40%' }}
        />

        {/* Expansion Shockwaves on logo entrance */}
        <div className="relative">
          <motion.div
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ 
              scale: [0.2, 1.4, 2.0], 
              opacity: [0, 0.4, 0], 
            }}
            transition={{
              duration: 2.0,
              ease: "easeOut",
              delay: 1.1,
            }}
            className="absolute inset-0 rounded-full border border-[#dda75f]/45 pointer-events-none filter blur-[2px]"
          />
          <motion.div
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ 
              scale: [0.2, 1.1, 1.6], 
              opacity: [0, 0.25, 0], 
            }}
            transition={{
              duration: 1.6,
              ease: "easeOut",
              delay: 1.3,
            }}
            className="absolute inset-0 rounded-full border border-white/20 pointer-events-none"
          />

          {/* Logo Reveal Rotation & Bounce Scale */}
          <motion.div
            initial={{ scale: 0, rotate: -210, opacity: 0, filter: 'blur(8px)' }}
            animate={{ 
              scale: 1, 
              rotate: 0, 
              opacity: 1, 
              filter: 'blur(0px)'
            }}
            transition={{
              type: 'spring',
              stiffness: 80,
              damping: 14,
              delay: 0.6,
            }}
            className="relative"
          >
            <RowOneLogo size={130} showText={false} />
            
            {/* Pulsing Back Glow */}
            <motion.div
              animate={{ 
                boxShadow: [
                  '0 0 20px rgba(221, 167, 95, 0.05)', 
                  '0 0 45px rgba(221, 167, 95, 0.35)', 
                  '0 0 20px rgba(221, 167, 95, 0.05)'
                ]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-2 rounded-full pointer-events-none"
            />
          </motion.div>
        </div>

        {/* Cinema Brand Title & Slogan Timeline */}
        <div className="flex flex-col items-center space-y-4 text-center">
          {/* Brand Name Spreads Out with space tracking */}
          <motion.h1
            initial={{ opacity: 0, y: 15, letterSpacing: '0.25em' }}
            animate={{ opacity: 1, y: 0, letterSpacing: '0.62em' }}
            transition={{
              duration: 1.6,
              ease: [0.16, 1, 0.3, 1],
              delay: 1.4,
            }}
            className="font-serif text-3xl sm:text-4xl font-black tracking-widest relative ml-[0.62em] group cursor-default transition-all duration-300"
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 0 35px rgba(221,167,95,0.15)' }}
          >
            <span className="text-[#dda75f] group-hover:text-[#fde2af] transition-all duration-300 group-hover:[text-shadow:0_0_12px_rgba(253,226,175,0.7)]">Row</span>
            <span className="text-white group-hover:text-white/95 transition-all duration-300 group-hover:[text-shadow:0_0_10px_rgba(255,255,255,0.5)]">One</span>
          </motion.h1>

          {/* Golden Gate film stripes / Cinematic Subtitles staggered */}
          <div className="flex flex-col items-center space-y-1.5 pt-2">
            {/* Slogan line 1 */}
            <motion.p
              initial={{ opacity: 0, filter: 'blur(4px)', y: 6 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              transition={{ duration: 1.0, ease: 'easeOut', delay: 2.0 }}
              className="font-sans text-[11px] sm:text-xs font-bold text-[#F5EFEB]/90 tracking-[0.25em] uppercase select-none"
            >
              Your cinema.
            </motion.p>

            {/* Slogan line 2 */}
            <motion.p
              initial={{ opacity: 0, filter: 'blur(4px)', y: 6 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              transition={{ duration: 1.0, ease: 'easeOut', delay: 2.5 }}
              className="font-sans text-[11.5px] sm:text-[12.5px] font-black text-[#dda75f] tracking-[0.25em] italic uppercase select-none"
            >
              Your couch.
            </motion.p>

            {/* Slogan line 3 */}
            <motion.p
              initial={{ opacity: 0, filter: 'blur(4px)', y: 6 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              transition={{ duration: 1.0, ease: 'easeOut', delay: 3.0 }}
              className="font-sans text-[11px] sm:text-xs font-bold text-[#F5EFEB]/90 tracking-[0.25em] uppercase select-none w-max"
            >
              Your people.
            </motion.p>
          </div>
        </div>

        {/* Minimal Linear Progress Loader at Bottom */}
        <div className="absolute bottom-16 inset-x-12 sm:inset-x-24 md:inset-x-48 h-[1px] bg-white/5 overflow-hidden rounded-full pointer-events-none">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: 4.2,
              ease: 'linear',
              delay: 0.6,
            }}
            className="h-full bg-gradient-to-r from-transparent via-[#dda75f] to-transparent origin-left"
          />
        </div>
      </div>

      {/* Skip Button Overlay */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
        whileHover={{ opacity: 1, color: '#dda75f', scale: 1.03 }}
        onClick={handleSkip}
        className="absolute bottom-8 right-8 font-sans font-black text-[9.5px] tracking-[0.25em] text-[#f5efeb]/75 uppercase cursor-pointer py-2 px-4 border border-white/5 hover:border-[#dda75f]/30 rounded-lg bg-[#141111]/30 backdrop-blur-md transition-all duration-300 select-none z-20"
      >
        Skip Intro ✦
      </motion.button>
    </motion.div>
  );
}
