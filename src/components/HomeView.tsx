/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import RowOneLogo from './RowOneLogo';
import { 
  Ticket, 
  ArrowRight, 
  HelpCircle, 
  Tv, 
  PlayCircle, 
  Star, 
  Users, 
  Compass, 
  Layers, 
  Clock, 
  VolumeX, 
  Volume2, 
  Sparkles,
  Play,
  Crown,
  Smartphone,
  Download
} from 'lucide-react';
import { INITIAL_MOVIES } from '../data';
import { Movie } from '../types';
import RatingBadge from './RatingBadge';
import { getPopcornScore } from '../utils/reviewUtils';
import FriendsActivityFeed from './FriendsActivityFeed';
// @ts-ignore
import cinemaBackground from '../assets/images/cinema_background_1781183822127.jpg';

interface HomeViewProps {
  onBrowse: () => void;
  onSelectMovie: (movieId: string) => void;
  recentlyViewedIds?: string[];
  movies?: Movie[];
  onJoinRoom: (movieId: string) => void;
  watchlistIds?: string[];
  onToggleWatchlist?: (movieId: string) => void;
}

// Simple internal ScrollReveal wrapper to trigger beautiful transitions
function RevealSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number; key?: React.Key }) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const current = domRef.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, []);

  return (
    <div
      ref={domRef}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8 pointer-events-none'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function HomeView({ 
  onBrowse, 
  onSelectMovie, 
  recentlyViewedIds = [], 
  movies = INITIAL_MOVIES,
  onJoinRoom
}: HomeViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambienceGainNodeRef = useRef<GainNode | null>(null);
  
  // Mixkit retro cinematic projector looping video clip
  const loopVideoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-classic-projector-playing-a-film-42230-large.mp4';

  const startProjectorAudio = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      
      const masterGain = ctx.createGain();
      // Keep background drone very cozy and soft so it doesn't overpower human ears on landing
      masterGain.gain.setValueAtTime(0.18, ctx.currentTime);
      masterGain.connect(ctx.destination);
      ambienceGainNodeRef.current = masterGain;

      // Synthesize a high-fidelity continuous white noise buffer
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      // 1. Vintage Motor Hum: Triangle wave with subtle mechanical belt flutter
      const projMotorOsc = ctx.createOscillator();
      projMotorOsc.type = 'triangle';
      projMotorOsc.frequency.setValueAtTime(88, ctx.currentTime); // 88Hz vintage motor hum
      
      const projMotorGain = ctx.createGain();
      projMotorGain.gain.setValueAtTime(0.04, ctx.currentTime);
      
      const flutterOsc = ctx.createOscillator();
      flutterOsc.type = 'sine';
      flutterOsc.frequency.setValueAtTime(14.5, ctx.currentTime); // 14.5 Hz rotation speed
      
      const flutterGain = ctx.createGain();
      flutterGain.gain.setValueAtTime(3, ctx.currentTime);
      
      flutterOsc.connect(flutterGain);
      flutterGain.connect(projMotorOsc.frequency);
      
      projMotorOsc.connect(projMotorGain);
      projMotorGain.connect(masterGain);
      
      projMotorOsc.start();
      flutterOsc.start();

      // 2. Cooling Fan Whirr: continuous filtered white noise
      const fanNoiseSource = ctx.createBufferSource();
      fanNoiseSource.buffer = noiseBuffer;
      fanNoiseSource.loop = true;
      
      const fanFilter = ctx.createBiquadFilter();
      fanFilter.type = 'bandpass';
      fanFilter.frequency.setValueAtTime(450, ctx.currentTime);
      fanFilter.Q.setValueAtTime(0.8, ctx.currentTime);
      
      const fanGain = ctx.createGain();
      fanGain.gain.setValueAtTime(0.012, ctx.currentTime);
      
      fanNoiseSource.connect(fanFilter);
      fanFilter.connect(fanGain);
      fanGain.connect(masterGain);
      fanNoiseSource.start();

      // 3. Shutter Flap & sprocket tooth celluloid click at 24 Fps
      let projectorTimer: any;
      const playProjectorFlap = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
        
        // click/flap 1 (shutter blade transit)
        const flapSource = ctx.createBufferSource();
        flapSource.buffer = noiseBuffer;
        
        const flapFilter = ctx.createBiquadFilter();
        flapFilter.type = 'bandpass';
        // Acoustic resonance of metal gate casing
        flapFilter.frequency.setValueAtTime(260 + Math.random() * 40, ctx.currentTime);
        flapFilter.Q.setValueAtTime(3.5, ctx.currentTime);
        
        const flapGainNode = ctx.createGain();
        flapGainNode.gain.setValueAtTime(0, ctx.currentTime);
        flapGainNode.gain.linearRampToValueAtTime(0.06 + Math.random() * 0.03, ctx.currentTime + 0.001);
        flapGainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.012 + Math.random() * 0.006);
        
        flapSource.connect(flapFilter);
        flapFilter.connect(flapGainNode);
        flapGainNode.connect(masterGain);
        
        flapSource.start();
        flapSource.stop(ctx.currentTime + 0.05);

        // Sprocket teeth scraping celluloid film strips
        const sprocketSource = ctx.createBufferSource();
        sprocketSource.buffer = noiseBuffer;
        
        const sprockFilter = ctx.createBiquadFilter();
        sprockFilter.type = 'highpass';
        sprockFilter.frequency.setValueAtTime(6500, ctx.currentTime);
        
        const sprockGainNode = ctx.createGain();
        sprockGainNode.gain.setValueAtTime(0, ctx.currentTime);
        sprockGainNode.gain.setValueAtTime(0.006, ctx.currentTime + 0.004);
        sprockGainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.014);
        
        sprocketSource.connect(sprockFilter);
        sprockFilter.connect(sprockGainNode);
        sprockGainNode.connect(masterGain);
        
        sprocketSource.start(ctx.currentTime + 0.004);
        sprocketSource.stop(ctx.currentTime + 0.03);
        
        const frameInterval = 41.67 + (Math.random() * 2.2 - 1.1); 
        projectorTimer = setTimeout(playProjectorFlap, frameInterval);
      };
      
      playProjectorFlap();

      // Store on context object to clean up later
      (ctx as any).projectorTimer = projectorTimer;
      (ctx as any).projMotorOsc = projMotorOsc;
      (ctx as any).flutterOsc = flutterOsc;
      (ctx as any).fanNoiseSource = fanNoiseSource;
    } catch (err) {
      console.warn("Failed to spin up procedural projector audio engine in landing page:", err);
    }
  };

  const stopProjectorAudio = () => {
    const ctx = audioContextRef.current;
    if (ctx) {
      if ((ctx as any).projectorTimer) clearTimeout((ctx as any).projectorTimer);
      try { (ctx as any).projMotorOsc?.stop(); } catch(e){}
      try { (ctx as any).flutterOsc?.stop(); } catch(e){}
      try { (ctx as any).fanNoiseSource?.stop(); } catch(e){}
      try { ctx.close(); } catch(e){}
      audioContextRef.current = null;
      ambienceGainNodeRef.current = null;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsVideoMuted(nextMuted);
      
      if (!nextMuted) {
        startProjectorAudio();
      } else {
        stopProjectorAudio();
      }
    }
  };

  useEffect(() => {
    return () => {
      stopProjectorAudio();
    };
  }, []);

  // Movie posters segmented for marquee rows (Row 1 and Row 2)
  const marqueeRow1 = [...movies.slice(0, 4), ...movies.slice(0, 4)];
  const marqueeRow2 = [...movies.slice(4, 8), ...movies.slice(4, 8)];

  // Pick some movies featured for tonight's slots
  const featuredMovies = movies.filter(m => 
    m.id === 'm6' || m.id === 'm1' || m.id === 'm7' || m.id === 'm8'
  );

  const recentlyViewedMovies = recentlyViewedIds
    .map((id) => movies.find((m) => m.id === id))
    .filter((m): m is Movie => m !== undefined);

  return (
    <div className="text-on-surface bg-[#030303] min-h-screen relative overflow-hidden select-none">
      
      {/* Dynamic 50% opacity cinema theater backdrop */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-50 bg-cover bg-center bg-no-repeat mix-blend-lighten"
        style={{ 
          backgroundImage: `url(${cinemaBackground})`,
        }}
      />
      
      {/* Cinematic Ambient Backdrop Glows */}
      <div className="absolute top-[20%] left-[-10%] w-[50vw] h-[50vw] bg-primary/5 rounded-full blur-[160px] animate-pulse-glow" />
      <div className="absolute top-[60%] right-[-10%] w-[50vw] h-[50vw] bg-secondary/5 rounded-full blur-[160px] animate-pulse-glow" style={{ animationDelay: '3000ms' }} />

      {/* Hero Section Container */}
      <section className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden border-b border-white/5 bg-black">
        
        {/* Full-width Muted Looping Video Background Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            ref={videoRef}
            src={loopVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover brightness-[0.45] scale-105 pointer-events-none transition-all duration-1000"
          />
          {/* Elite double vignette and gradient shading to ensure pristine visual readability of title elements */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-black/55 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-transparent to-[#030303]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_10%,#030303_85%)]" />
        </div>

        {/* Ambient projection beam effect overlaying the video */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] h-[400px] bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none blur-3xl" />

        {/* Hero Central Text Elements */}
        <div className="relative z-10 text-center max-w-5xl px-6 md:px-12 pt-28 pb-16 space-y-8 flex flex-col items-center">
          
          {/* Subtle Live Badge Pinned Above Heading */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-black/65 border border-primary/25 backdrop-blur-md shadow-2xl">
            <RowOneLogo size={20} />
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="font-sans text-[8.5px] tracking-[0.25em] font-black uppercase text-primary">
              CINEPHILE NETWORK ONLINE
            </span>
          </div>

          {/* Majestic Serif Tagline */}
          <h1 className="font-serif text-5xl sm:text-7xl md:text-8xl tracking-tight leading-[1.05] text-[#F5EFEB] select-none text-center">
            <span className="block">
              <span className="inline-block transition-transform duration-300 hover:scale-[1.05] cursor-default origin-center">
                Your cinema.
              </span>
            </span>
            <span className="block mt-2">
              <span className="text-primary font-medium tracking-tight relative italic inline-block transition-transform duration-300 hover:scale-[1.05] cursor-default origin-center">
                Your couch.
                <span className="absolute bottom-1 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-transparent rounded" />
              </span>
            </span>
            <span className="block mt-2">
              <span className="text-[#dda75f] tracking-tight font-semibold italic inline-block transition-transform duration-300 hover:scale-[1.05] cursor-default origin-center">
                Your people.
              </span>
            </span>
          </h1>

          {/* 'Your people' active squad status checklist avatar navigation group with hover tooltips */}
          <div className="flex items-center gap-3 mt-4 animate-fade-in relative z-20">
            <span className="font-mono text-[9px] tracking-[0.2em] text-[#dda75f]/80 uppercase select-none mr-1 font-black">
              active squad:
            </span>
            <div className="flex -space-x-2">
              {[
                {
                  id: 'fr1',
                  username: 'Leo_V',
                  fullName: 'Leo Ventura',
                  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUMMmg4wUjOeGP67BHvckW7QK54LA2AaZMcuCpoM3Hu2vY9Ic9lti4YRyceBT4Xa4aVgS7MpwB64SBM0VilWuJV2mdhKG4RfOmkV6SHU7iEUNbS72EU7jB91skEIP5DDmDYOjKPZmUryVWd3v4_1VXYJ8p9TwrkZJ5eqP3NastiUon4s-VH-EhBJQb4vIFZ294pPzvvwroP1eXEUvONKLSB1iLgrLRvbY9BBCCjiInO0x9ZM1geU0eP_XnbkoiNJzz2yLq-q5qibW7',
                  status: 'watching',
                  watchingMovieTitle: 'NEON ECHOES',
                  watchingRoom: 'IMAX Hall A'
                },
                {
                  id: 'fr2',
                  username: 'Sarah_Lin',
                  fullName: 'Sarah Lin',
                  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBN1zkyN0Pb8734ZFQ0q6_UU1ErZWPzuHCM2h5RXzYtYFsE0wGk0tDndVTt82vO2j9N1i4muihePJYlyoEsyO-MN6WgdBcmG4hdllHWUPnoZYhYXg_4HRe24hHm9FVnJyx5ZLbvxzTg2BXW0sdT-MjvOwU-h9rD5EwNfrgu96iPb_xurjXNQUONPl5E8o68dUeilrcKFFrPvPt-86Vem85Vo0IoL85mzDg1E5ZlDH1QMaFfc-auV_uw3qMgmeWmJU6Ghd40J4E6DfSN',
                  status: 'watching',
                  watchingMovieTitle: 'THE LAST REEL',
                  watchingRoom: 'Screening Room 2'
                },
                {
                  id: 'fr3',
                  username: 'cyber_junkie',
                  fullName: 'Alex Vance',
                  avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150',
                  status: 'watching',
                  watchingMovieTitle: 'FROZEN PEAKS',
                  watchingRoom: 'Dolby Hall Z'
                },
                {
                  id: 'fr4',
                  username: 'retro_coder',
                  fullName: 'Diana Woods',
                  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
                  status: 'idle'
                }
              ].map((friend) => (
                <div 
                  key={friend.id} 
                  className="relative group/tooltip cursor-pointer active:scale-95 transition-all"
                >
                  <img 
                    src={friend.avatarUrl} 
                    alt={friend.fullName} 
                    className="w-10 h-10 rounded-full border-2 border-[#030303] hover:border-primary object-cover hover:z-30 relative transition-transform hover:-translate-y-0.5 duration-300 shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#030303] ${
                    friend.status === 'watching' 
                      ? 'bg-green-500 animate-pulse' 
                      : 'bg-amber-400'
                  }`} />
                  
                  {/* Custom Tooltip Overlay Component */}
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 scale-90 group-hover/tooltip:scale-100 bg-neutral-900/95 border border-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-2xl w-52 text-left z-50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="font-sans font-black text-[11px] text-[#eedecb] truncate block max-w-[110px]">{friend.fullName}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider ${
                          friend.status === 'watching' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                        }`}>
                          {friend.status}
                        </span>
                      </div>
                      
                      <div className="font-sans text-[9px] text-[#dac8bb] leading-normal pt-1 break-words lowercase">
                        {friend.status === 'watching' ? (
                          <>
                            watching <strong className="text-white uppercase font-sans tracking-wide">{friend.watchingMovieTitle}</strong> in <span className="text-primary font-bold">{friend.watchingRoom}</span>
                          </>
                        ) : (
                          <>
                            browsing corridor lobbies (idle)
                          </>
                        )}
                      </div>
                    </div>
                    {/* Tiny dropdown arrow anchor */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cinematic Editorial Description Text */}
          <p className="font-sans text-sm md:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed lowercase">
            experience high-fidelity synchronized playback, private couch seating, and instant real-time reactions with the ones who matter most.
          </p>

          {/* Primary Call to Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full sm:w-auto">
            <button
              onClick={() => onSelectMovie('m6')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-sans font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-2.5 transition-all hover:scale-105 active:scale-95 duration-200 shadow-2xl shadow-primary/20 group cursor-pointer"
            >
              <span>Book Midnight Screening</span>
              <Ticket className="h-4 w-4 text-on-primary group-hover:rotate-12 transition-transform duration-300" />
            </button>

            <button
              onClick={onBrowse}
              className="w-full sm:w-auto px-8 py-4 rounded-xl border border-outline hover:border-secondary text-on-surface font-sans font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-2.5 hover:bg-white/5 transition-all active:scale-95 duration-200 cursor-pointer"
            >
              <span>Explore Vault</span>
              <ArrowRight className="h-4 w-4 text-on-surface" />
            </button>
          </div>
        </div>

        {/* Floating Sound Controller pinned to bottom corner of video */}
        <div className="absolute right-6 bottom-8 z-20">
          <button
            onClick={toggleMute}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/5 hover:border-primary/30 text-xs font-sans text-on-surface-variant hover:text-white transition-all cursor-pointer backdrop-blur-md"
            title={isVideoMuted ? "Unmute Ambient Projector Code" : "Mute Sound"}
          >
            {isVideoMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            <span className="text-[9px] font-mono tracking-widest uppercase">Projector Audio</span>
          </button>
        </div>

      </section>

      {/* Double horizontal continuous flowing poster collage Row */}
      <section className="relative py-12 bg-gradient-to-b from-[#030303] to-[#0a0808] border-y border-white/5 overflow-hidden select-none">
        
        {/* Subtle blur bars left/right to mask edges beautifully */}
        <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-[#030303] to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#030303] to-transparent z-10 pointer-events-none" />

        <div className="space-y-6">
          
          {/* Row 1 Sliding Left */}
          <div className="flex w-[200%] gap-4 overflow-hidden pointer-events-auto">
            <div className="flex gap-4 shrink-0 animate-marquee-left">
              {marqueeRow1.map((movie, index) => (
                <div 
                  key={`marq1-${movie.id}-${index}`}
                  onClick={() => onSelectMovie(movie.id)}
                  className="w-36 md:w-44 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer relative group border border-white/5 hover:border-primary/40 transition-all duration-300 bg-surface-container shadow-2xl"
                >
                  <img 
                    src={movie.imageUrl} 
                    alt={movie.title} 
                    className="w-full h-full object-cover brightness-75 group-hover:scale-105 group-hover:brightness-90 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
                    <span className="font-mono text-[9px] text-secondary font-black tracking-widest uppercase mb-1">{movie.genre}</span>
                    <h5 className="font-display font-black text-[11px] uppercase text-white leading-tight truncate">{movie.title}</h5>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2 Sliding Right */}
          <div className="flex w-[200%] gap-4 overflow-hidden pointer-events-auto">
            <div className="flex gap-4 shrink-0 animate-marquee-right">
              {marqueeRow2.map((movie, index) => (
                <div 
                  key={`marq2-${movie.id}-${index}`}
                  onClick={() => onSelectMovie(movie.id)}
                  className="w-36 md:w-44 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer relative group border border-white/5 hover:border-secondary/40 transition-all duration-300 bg-surface-container shadow-2xl"
                >
                  <img 
                    src={movie.imageUrl} 
                    alt={movie.title} 
                    className="w-full h-full object-cover brightness-75 group-hover:scale-105 group-hover:brightness-90 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
                    <span className="font-mono text-[9px] text-primary font-black tracking-widest uppercase mb-1">{movie.genre}</span>
                    <h5 className="font-display font-black text-[11px] uppercase text-white leading-tight truncate">{movie.title}</h5>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Recently Viewed Section (rendered dynamically if user has history) */}
      {recentlyViewedMovies.length > 0 && (
        <section className="py-12 px-4 md:px-8 max-w-7xl mx-auto space-y-6">
          <RevealSection>
            <div className="flex items-center gap-1.5 text-primary text-[10px] font-black tracking-widest uppercase">
              <Clock className="h-4 w-4 text-primary animate-pulse" />
              <span>Resume Your Screenings</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#F5EFEB] mt-1 uppercase tracking-tight">
              Recently Viewed
            </h2>
            <p className="font-sans text-xs text-on-surface-variant max-w-sm lowercase">
              instantly jump back into the synced theatrical seats you loaded or browsed recently.
            </p>
          </RevealSection>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory">
            {recentlyViewedMovies.map((movie) => (
              <div
                key={`recent-${movie.id}`}
                onClick={() => onSelectMovie(movie.id)}
                className="w-36 md:w-44 shrink-0 rounded-2xl overflow-hidden cursor-pointer relative group border border-white/5 hover:border-primary/45 transition-all duration-300 bg-[#110e0e]/95 shadow-2xl snap-start flex flex-col justify-between"
              >
                <div className="aspect-[2/3] relative overflow-hidden bg-black shrink-0">
                  <img
                    src={movie.imageUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover brightness-75 group-hover:scale-105 duration-350 transition-all"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <RatingBadge rating={movie.rating} />
                  </div>
                </div>
                <div className="p-3 space-y-1 text-left flex-grow flex flex-col justify-between">
                  <div>
                    <span className="font-sans text-[8px] text-primary font-black uppercase tracking-widest leading-none block">
                      {movie.genre}
                    </span>
                    <h4 className="font-display font-black text-xs text-[#f5efeb] truncate uppercase mt-1 group-hover:text-primary transition-colors">
                      {movie.title}
                    </h4>
                  </div>
                  {(() => {
                    const popcornData = getPopcornScore(movie.id, movie.ratingScore);
                    return (
                      <span className="font-sans text-[8.5px] text-[#dda75f] flex items-center gap-1 mt-1 font-black uppercase tracking-wider">
                        🍿 {popcornData.scorePercent}% ROWONE Score
                      </span>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Friends Squad Timeline Feed */}
      <section className="py-8 px-4 md:px-8 max-w-7xl mx-auto">
        <RevealSection>
          <FriendsActivityFeed
            movies={movies}
            onSelectMovie={onSelectMovie}
            onJoinRoom={onJoinRoom}
          />
        </RevealSection>
      </section>

      {/* CROWN OFFICIAL PREMIERE EVENTS SECTION */}
      {(() => {
        const premiereMovies = movies.filter(m => m.isPremiere);
        if (premiereMovies.length === 0) return null;
        return (
          <section className="py-14 border-t border-b border-yellow-500/15 bg-gradient-to-b from-[#0a0600] to-[#040404] select-none relative overflow-hidden">
            {/* VIP Backdrop Glowing Orbs */}
            <div className="absolute top-1/2 left-1/4 w-[40vw] h-[40vw] bg-yellow-500/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-0 right-10 w-[30vw] h-[30vw] bg-[#9d174d]/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-10 relative z-10">
              <RevealSection>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 pb-6 border-b border-yellow-500/10">
                  <div className="space-y-1 pt-4 text-left">
                    <span className="font-mono text-[9px] text-yellow-400 font-bold tracking-widest uppercase bg-yellow-400/10 border border-yellow-500/20 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(250,204,21,0.15)] animate-pulse">
                      <Crown className="w-3.5 h-3.5 text-yellow-400" />
                      OFFICIAL STUDIO PREMIERES ACTIVE
                    </span>
                    <h2 className="font-serif text-3xl md:text-5xl font-black text-white mt-1.5 uppercase tracking-tight">
                      Red Carpet Openings
                    </h2>
                    <p className="font-sans text-xs text-[#dac6a8] max-w-lg leading-relaxed lowercase">
                      exclusive showrunner-hosted premium screenings. unlocks pre-show live star cast q&amp;a chats, commemorative attendance badges, and interactive reaction playbacks.
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex items-center gap-2 font-sans text-[10px] text-yellow-400 font-extrabold max-w-sm">
                    <span className="text-sm">🛋️</span>
                    <span>all tickets priced separately &amp; feature interactive pre-screening hubs.</span>
                  </div>
                </div>
              </RevealSection>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {premiereMovies.map((movie, idx) => {
                  const screeningPrice = movie.screenings?.[0]?.ticketPrice || 18.50;
                  return (
                    <RevealSection key={`premiere-${movie.id}`} delay={(idx + 1) * 100}>
                      <div className="group bg-gradient-to-b from-[#18120d] to-[#0c0805] hover:from-[#201710] border border-yellow-500/20 hover:border-yellow-400/50 rounded-2xl p-4 transition-all duration-300 relative shadow-[0_4px_30px_rgba(0,0,0,0.4)] flex flex-col justify-between h-[340px]">
                        
                        {/* Elite Corner RSVP/Spotlight Badge */}
                        <div className="absolute top-3.5 right-3.5 bg-yellow-400 text-black font-sans text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(250,204,21,0.4)] z-10 flex items-center gap-1">
                          <span>VIP ACCESS</span>
                        </div>

                        <div className="flex gap-4">
                          {/* Poster aspect thumbnail */}
                          <div 
                            onClick={() => onSelectMovie(movie.id)}
                            className="w-24 aspect-[2/3] rounded-xl overflow-hidden shrink-0 border border-yellow-500/20 cursor-pointer hover:border-yellow-400/45"
                          >
                            <img 
                              src={movie.imageUrl} 
                              alt={movie.title} 
                              className="w-full h-full object-cover brightness-95 hover:scale-105 duration-350 transition-transform" 
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <div className="space-y-1.5 text-left flex-1 min-w-0">
                            <span className="font-mono text-[8.5px] text-yellow-400/80 font-bold uppercase tracking-wider block">
                              {movie.genre} • {movie.format}
                            </span>
                            <h3 
                              onClick={() => onSelectMovie(movie.id)}
                              className="font-display font-black text-sm uppercase text-[#edeae8] line-clamp-2 hover:text-yellow-400 transition-colors leading-snug cursor-pointer"
                            >
                              {movie.title}
                            </h3>
                            <p className="font-sans text-[10px] text-[#dac6a8]/70 line-clamp-3 leading-relaxed max-w-xs lowercase">
                              {movie.synopsis}
                            </p>
                          </div>
                        </div>

                        {/* Mid Row details & ticket price */}
                        <div className="p-3 bg-black/60 border border-yellow-500/10 rounded-xl flex justify-between items-center my-3">
                          <div className="text-left">
                            <span className="font-sans text-[7.5px] font-black text-[#dac6a8]/60 uppercase tracking-widest block font-bold">PREMIUM PRICE</span>
                            <span className="font-mono text-base font-black text-yellow-400">${screeningPrice.toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-sans text-[7.5px] font-black text-[#dac6a8]/60 uppercase tracking-widest block font-bold font-sans">COUNTDOWN</span>
                            <span className="font-mono text-[10.5px] font-bold text-emerald-400 animate-pulse uppercase">Tonight @ 21:30</span>
                          </div>
                        </div>

                        {/* Booking CTA button with VIP ID */}
                        <button
                          id={`btn-home-premiere-${movie.id}`}
                          onClick={() => onSelectMovie(movie.id)}
                          className="w-full py-2.5 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-400 hover:brightness-110 active:scale-95 text-black font-sans text-[9px] font-black tracking-widest uppercase rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Crown className="w-3.5 h-3.5 animate-pulse" />
                          <span>Enter Red Carpet Hub 🎟️</span>
                        </button>

                      </div>
                    </RevealSection>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Featured Tonight's Screenings Section */}
      <section className="py-20 md:py-28 px-4 md:px-8 max-w-7xl mx-auto space-y-16">
        
        <RevealSection>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-secondary text-[10px] font-black tracking-widest uppercase">
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
                <span>Midnight Curated Picks</span>
              </div>
              <h2 className="font-serif text-4xl md:text-6xl font-black text-on-surface">
                Featured Tonight
              </h2>
              <p className="font-sans text-xs md:text-sm text-on-surface-variant max-w-lg lowercase">
                our curated list of high-definition communal theatrical streams running now. book a seat adjacent to colleagues.
              </p>
            </div>
            
            <button
              onClick={onBrowse}
              className="px-6 py-3 rounded-lg bg-surface-container border border-white/5 hover:border-primary/20 text-on-surface text-[10px] font-mono tracking-widest uppercase transition-all flex items-center gap-2 cursor-pointer outline-none"
            >
              <span>Explore Complete Library</span>
              <Compass className="h-3.5 w-3.5 text-primary" />
            </button>
          </div>
        </RevealSection>

        {/* Tonight Screenings layout grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {featuredMovies.map((movie, idx) => (
            <RevealSection key={`featured-${movie.id}`} delay={(idx + 1) * 100}>
              <div className="group relative bg-[#110e0e]/80 border border-white/5 hover:border-primary/25 rounded-3xl p-5 md:p-6 transition-all duration-500 shadow-2xl flex flex-col sm:flex-row gap-6 hover:-translate-y-1">
                
                {/* Backdrop decorative aura */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full transition-opacity opacity-0 group-hover:opacity-100" />
                
                {/* Visual Thumbnail */}
                <div 
                  onClick={() => onSelectMovie(movie.id)}
                  className="w-full sm:w-36 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden relative border border-white/5 shadow-lg bg-black cursor-pointer group-hover:border-secondary/20 transition-all duration-300"
                >
                  <img
                    src={movie.imageUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover brightness-90 group-hover:scale-105 duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3">
                    <RatingBadge rating={movie.rating} />
                  </div>
                </div>

                {/* Meta details */}
                <div className="flex-grow flex flex-col justify-between space-y-4">
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-sans text-[10px] font-bold text-primary tracking-widest uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/15">
                        {movie.genre}
                      </span>
                      {(() => {
                        const popcornData = getPopcornScore(movie.id, movie.ratingScore);
                        return (
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#dda75f] font-black bg-[#dda75f]/10 px-2.5 py-0.5 rounded border border-[#dda75f]/25">
                            <span>🍿 {popcornData.scorePercent}% ROWONE Score</span>
                          </div>
                        );
                      })()}
                    </div>

                    <h3 
                      onClick={() => onSelectMovie(movie.id)}
                      className="font-display font-black text-xl hover:text-primary leading-tight uppercase transition-colors duration-300 cursor-pointer text-[#F5EFEB]"
                    >
                      {movie.title}
                    </h3>
                    
                    <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed line-clamp-2 max-w-sm lowercase">
                      {movie.synopsis}
                    </p>
                  </div>

                  {/* Micro list features info */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-sans text-on-surface-variant font-medium text-[10px]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-secondary" />
                        <span>{movie.runtime}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        <span className="font-mono">{movie.format}</span>
                      </span>
                    </div>

                    {/* Screening time quick buttons */}
                    <div className="space-y-1.5">
                      <span className="text-[8px] tracking-widest font-black text-on-surface-variant uppercase block">communing schedules</span>
                      <div className="flex gap-2">
                        {['21:30', '22:00', '23:45'].map((time) => (
                          <button
                            key={`${movie.id}-time-${time}`}
                            onClick={() => onSelectMovie(movie.id)}
                            className="px-2.5 py-1 text-[9px] font-mono font-black border border-white/5 hover:border-primary/50 text-[#ebd6aa] hover:bg-primary/5 rounded transition-all active:scale-95 cursor-pointer"
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Booking Link button */}
                  <button
                    onClick={() => onSelectMovie(movie.id)}
                    className="w-full py-2.5 rounded-xl border border-white/5 hover:border-primary/20 bg-background/50 hover:bg-primary text-on-surface hover:text-white font-sans text-[10px] font-black tracking-widest uppercase transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Secure Couch Seats</span>
                  </button>

                </div>

              </div>
            </RevealSection>
          ))}
        </div>

      </section>

      {/* "How It Works" Section */}
      <section className="py-24 md:py-32 bg-surface-container-low/50 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-20">
          
          <RevealSection>
            <div className="text-center space-y-3">
              <span className="inline-flex items-center gap-1.5 font-sans font-black text-[10px] text-primary tracking-[0.25em] uppercase">
                <Compass className="h-4 w-4 text-primary" />
                <span>The Premiere Roadmap</span>
              </span>
              <h2 className="font-serif text-4xl md:text-6xl font-bold text-on-surface">
                How It Works
              </h2>
              <p className="font-sans text-xs md:text-sm text-on-surface-variant max-w-sm mx-auto lowercase">
                the absolute three simple protocols to launch a shared real-time synchronized cinema event.
              </p>
            </div>
          </RevealSection>

          {/* Glowing 3 Steps columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            
            {/* Step 1 */}
            <RevealSection delay={100}>
              <div className="bg-[#110e0e]/75 hover:bg-black p-8 rounded-3xl border border-outline-variant/20 hover:border-primary/40 shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between h-[360px] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 text-7xl font-sans font-black tracking-tight text-white/[0.02] group-hover:text-primary/[0.04] transition-colors leading-none pointer-events-none select-none">
                  01
                </div>
                
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-500 shadow-inner shrink-0 leading-none">
                  <Compass className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-primary font-black uppercase tracking-wider block">Initiative Step</span>
                    <h3 className="font-display font-black text-xl text-on-surface uppercase tracking-wide">Browse Library</h3>
                  </div>
                  <p className="font-sans text-[11px] text-[#dac8bb] leading-relaxed lowercase">
                    Explore our curated vault of pristine 4K releases, nostalgic classics, and private premieres. Each film is selected specifically for visual impact.
                  </p>
                </div>
              </div>
            </RevealSection>

            {/* Step 2 */}
            <RevealSection delay={200}>
              <div className="bg-[#110e0e]/75 hover:bg-black p-8 rounded-3xl border border-outline-variant/20 hover:border-secondary/40 shadow-xl hover:shadow-secondary/5 transition-all duration-300 group flex flex-col justify-between h-[360px] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 text-7xl font-sans font-black tracking-tight text-white/[0.02] group-hover:text-secondary/[0.04] transition-colors leading-none pointer-events-none select-none">
                  02
                </div>

                <div className="w-14 h-14 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center group-hover:bg-secondary group-hover:border-secondary transition-all duration-500 shadow-inner shrink-0 leading-none">
                  <Ticket className="h-6 w-6 text-secondary group-hover:text-black transition-colors" />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-secondary font-black uppercase tracking-wider block">Reservation Step</span>
                    <h3 className="font-display font-black text-xl text-on-surface uppercase tracking-wide">Book Your Couch</h3>
                  </div>
                  <p className="font-sans text-[11px] text-[#dac8bb] leading-relaxed lowercase">
                    Reserve digital seat markers for your family. Generate instant shareable invitation codes so your coworkers and close friends can board the room.
                  </p>
                </div>
              </div>
            </RevealSection>

            {/* Step 3 */}
            <RevealSection delay={300}>
              <div className="bg-[#110e0e]/75 hover:bg-black p-8 rounded-3xl border border-outline-variant/20 hover:border-primary/40 shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between h-[360px] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 text-7xl font-sans font-black tracking-tight text-white/[0.02] group-hover:text-primary/[0.04] transition-colors leading-none pointer-events-none select-none">
                  03
                </div>

                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-500 shadow-inner shrink-0 leading-none">
                  <Users className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-primary font-black uppercase tracking-wider block">Complicity Step</span>
                    <h3 className="font-display font-black text-xl text-on-surface uppercase tracking-wide">Watch Together</h3>
                  </div>
                  <p className="font-sans text-[11px] text-[#dac8bb] leading-relaxed lowercase">
                    Deploy rooms and enjoy high-tech synchronized playback streamings, real-time live chats, and quick response floating emojis seamlessly.
                  </p>
                </div>
              </div>
            </RevealSection>

          </div>
        </div>
      </section>

      {/* 📺 APPLE TV & ANDROID TV BIG SCREEN APPS MARKETING SHOWCASE */}
      <section className="py-24 md:py-32 border-t border-white/5 bg-[#090707] relative overflow-hidden">
        {/* Ambient glow backgrounds */}
        <div className="absolute top-0 right-10 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-yellow-500/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-20 relative z-10">
          <RevealSection>
            <div className="text-center space-y-3">
              <span className="inline-flex items-center gap-1.5 font-sans font-black text-[10px] text-yellow-500 tracking-[0.25em] uppercase bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                <Tv className="h-4.5 w-4.5 text-yellow-500" />
                <span>Now On The Big Living Screen</span>
              </span>
              <h2 className="font-serif text-4xl md:text-6xl font-black text-white uppercase tracking-tight">
                ROWONE for Smart TVs
              </h2>
              <p className="font-sans text-xs md:text-sm text-on-surface-variant max-w-lg mx-auto lowercase leading-relaxed">
                enjoy premium synchronized cinema streaming and active sofa discussion panels straight from your Apple TV or Android TV device.
              </p>
            </div>
          </RevealSection>

          {/* Grid layout containing dynamic TV apps detail Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            
            {/* Apple TV App Card */}
            <RevealSection delay={100}>
              <div className="bg-[#110e0e]/80 p-8 md:p-10 rounded-3xl border border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col justify-between h-full space-y-8 group relative overflow-hidden hover:-translate-y-1 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <span className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white inline-block">
                      
                    </span>
                    <span className="font-mono text-[8px] text-stone-500 font-bold uppercase tracking-widest pl-1">
                      Designed for tvOS 16+
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display font-black text-2xl text-white uppercase tracking-wide">ROWONE Apple TV App</h3>
                    <p className="font-sans text-[11.5px] text-[#dac8bb] leading-relaxed lowercase">
                      Engineered with raw native Swift interfaces, designed to integrate seamlessly on your Apple TV 4K. Supports fluid Siri Remote fluid touchpad track-pad gestures & swipe-to-react emojis on couch screenings.
                    </p>
                  </div>

                  <ul className="space-y-2 font-sans text-[11px] text-stone-400">
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-500">✦</span>
                      <span>Dolby Vision & Spatial Audio Atmos compatibility</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-500">✦</span>
                      <span>Siri touch remote gestures navigation optimized</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-500">✦</span>
                      <span>Seamless Apple iCloud multi-device syncing</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center justify-between gap-4">
                  <div className="flex flex-col text-left">
                    <span className="font-mono text-[8px] text-stone-500 uppercase font-black">Download Status</span>
                    <span className="font-sans text-xs text-green-400 font-bold uppercase">AVAILABLE IN APP STORE</span>
                  </div>
                  <button className="py-2.5 px-4 bg-white hover:bg-stone-200 text-black font-sans text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 leading-none">
                    <Download className="w-3.5 h-3.5" />
                    <span>Get iOS / tvOS App</span>
                  </button>
                </div>
              </div>
            </RevealSection>

            {/* Android TV & Fire TV App Card */}
            <RevealSection delay={200}>
              <div className="bg-[#110e0e]/80 p-8 md:p-10 rounded-3xl border border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col justify-between h-full space-y-8 group relative overflow-hidden hover:-translate-y-1 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <span className="p-3 bg-white/5 border border-white/10 rounded-2xl text-green-400 inline-block font-sans font-bold text-sm">
                      🤖
                    </span>
                    <span className="font-mono text-[8px] text-stone-500 font-bold uppercase tracking-widest pl-1">
                      Designed for Android TV 11+
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display font-black text-2xl text-white uppercase tracking-wide">ROWONE Android TV App</h3>
                    <p className="font-sans text-[11.5px] text-[#dac8bb] leading-relaxed lowercase">
                      unleash cinematic performance with Google Cast & Chromecast built-in support. fully optimized for Google TV, Sony Bravia, Shield TV, and Amazon Fire TV sticks. enjoy fluid 4K streams & zero input lag.
                    </p>
                  </div>

                  <ul className="space-y-2 font-sans text-[11px] text-stone-400">
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-500">✦</span>
                      <span>Chromecast built-in support with Google Cast</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-500">✦</span>
                      <span>Google Assistant integration for remote voice search</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-500">✦</span>
                      <span>Lightweight apk structure with automatic updates</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center justify-between gap-4">
                  <div className="flex flex-col text-left">
                    <span className="font-mono text-[8px] text-stone-500 uppercase font-black">Download Status</span>
                    <span className="font-sans text-xs text-green-400 font-bold uppercase">AVAILABLE IN GOOGLE PLAY TV</span>
                  </div>
                  <button className="py-2.5 px-4 bg-green-500 hover:bg-green-400 text-black font-sans text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 leading-none">
                    <Download className="w-3.5 h-3.5" />
                    <span>Get APK / Google Play</span>
                  </button>
                </div>
              </div>
            </RevealSection>

          </div>

          {/* Interactive Live TV demo entry CTA strip */}
          <RevealSection delay={300}>
            <div className="bg-gradient-to-r from-amber-500/10 via-yellow-400/5 to-transparent border border-yellow-500/15 p-6 md:p-8 rounded-3xl select-none relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1.5 text-left relative z-10 max-w-lg">
                <span className="font-mono text-[8px] text-yellow-400 font-bold tracking-widest uppercase bg-yellow-400/10 border border-yellow-500/30 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 leading-none">
                  <Sparkles className="w-2.5 h-2.5 text-yellow-500 animate-spin-slow" />
                  EXPERIENCE LIVING ROOM CALIBRATION right inside web preview
                </span>
                <h4 className="font-serif text-xl font-bold text-white uppercase tracking-tight">On-Screen Smart TV Simulator</h4>
                <p className="font-sans text-xs text-[#dac6a8] leading-relaxed max-w-md lowercase">
                  want to test how the 55"+ tv screen mode scales up, responds to keyboard arrow keys, or pairs with your phone in real-time? enter the simulator directly.
                </p>
              </div>

              <div className="relative z-10 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    alert("Click the '📺 TV MODE' button in the top navigation header bar to enter the fully operational television simulator!");
                  }}
                  className="py-3 px-5 bg-gradient-to-tr from-yellow-500 via-amber-500 to-yellow-400 text-black font-sans text-[10px] font-black tracking-widest uppercase rounded-xl hover:scale-101 duration-300 shadow-glow cursor-pointer"
                >
                  🚀 Test TV Simulator Mode
                </button>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

    </div>
  );
}
