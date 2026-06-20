import React from 'react';
import { motion } from 'motion/react';

interface LampContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function LampContainer({ children, className = '' }: LampContainerProps) {
  const isTransparent = className.includes('bg-transparent');
  const bgClass = isTransparent ? '' : 'bg-black';
  const maskBgClass = isTransparent ? 'bg-transparent' : 'bg-black';

  return (
    <div
      className={`relative flex min-h-[90vh] md:min-h-screen flex-col items-center justify-center overflow-hidden w-full rounded-md z-0 ${bgClass} ${className}`}
    >
      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0">
        {/* Left Conic Beam (Amber / Gold) */}
        <motion.div
          initial={{ opacity: 0.3, width: "15rem" }}
          whileInView={{ opacity: 0.65, width: "35rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(from 70deg at center top, #dda75f 0%, transparent 60%)`,
          }}
          className="absolute inset-auto right-1/2 h-56 overflow-visible w-[35rem] text-white opacity-60"
        >
          {/* Masking gradients to soften edges and fade out at bottom */}
          <div className="absolute w-full left-0 bg-[#030303]/90 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-40 h-full left-0 bg-[#030303]/90 bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>

        {/* Right Conic Beam (Primary Red) */}
        <motion.div
          initial={{ opacity: 0.3, width: "15rem" }}
          whileInView={{ opacity: 0.65, width: "35rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(from 290deg at center top, transparent 40%, #ff1a40 100%)`,
          }}
          className="absolute inset-auto left-1/2 h-56 w-[35rem] text-white opacity-60"
        >
          {/* Masking gradients */}
          <div className="absolute w-40 h-full right-0 bg-[#030303]/90 bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute w-full right-0 bg-[#030303]/90 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>

        {/* Additional projection lighting layers for depth */}
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-transparent blur-3xl" />
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />
        <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-amber-500 opacity-20 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />

        {/* Small intense hot-spot behind header to feel like a real projector lens */}
        <motion.div
          initial={{ width: "8rem" }}
          whileInView={{ width: "18rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-30 h-36 w-72 -translate-y-[6rem] rounded-full bg-primary/25 blur-3xl animate-pulse"
        />
        
        {/* Horizontal slice laser line */}
        <motion.div
          initial={{ width: "15rem" }}
          whileInView={{ width: "40rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-50 h-[1.5px] w-[40rem] -translate-y-[7rem] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-60"
        />

        {/* Block masking layer to hide top seam smoothly */}
        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-[#030303]/95" />
      </div>

      {/* Primary content card wrapper */}
      <div className="relative z-50 flex flex-col items-center px-4 max-w-5xl text-center">
        {children}
      </div>
    </div>
  );
}
