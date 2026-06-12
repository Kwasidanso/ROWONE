/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, ChevronRight, Share2, Send, Copy, FileText, Clock, Video, Users, Check, Crown, Play, XCircle, Lock, MonitorPlay, ThumbsUp, Bookmark, Trash2 } from 'lucide-react';
import { Movie } from '../types';
import { INITIAL_SCREENINGS } from '../data';
import RatingBadge from './RatingBadge';
import { getMovieReviews, upvoteReview, addMovieReview, getPopcornScore } from '../utils/reviewUtils';

interface MovieDetailViewProps {
  movie: Movie;
  onBookSeat: (time: string, hall: string, price: string, date?: string) => void;
  onBack: () => void;
  isPopcornPass: boolean;
  onTriggerUpgrade: (movieTitle?: string) => void;
  friends?: any[];
  onCreateWatchParty?: (movieId: string, roomName: string) => void;
  watchlistIds?: string[];
  onToggleWatchlist?: (movieId: string) => void;
  onClearWatchlist?: () => void;
  allMovies?: Movie[];
  onSelectMovie?: (movieId: string) => void;
}

export default function MovieDetailView({ 
  movie, 
  onBookSeat, 
  onBack, 
  isPopcornPass, 
  onTriggerUpgrade,
  friends = [],
  onCreateWatchParty,
  watchlistIds = [],
  onToggleWatchlist,
  onClearWatchlist,
  allMovies = [],
  onSelectMovie
}: MovieDetailViewProps) {
  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow'>('today');
  const [copied, setCopied] = useState(false);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'overview' | 'watchlist'>('overview');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Reactive state to force updates of community reviews block
  const [reviewsUpdated, setReviewsUpdated] = useState(0);

  // --- CONNECTED SOCIAL PLATFORMS & BROADCAST STATE ---
  const [socialConnections, setSocialConnections] = useState<Record<string, { connected: boolean; username: string }>>({
    twitter: { connected: true, username: '@CinematicScribe' },
    discord: { connected: false, username: '' },
    facebook: { connected: false, username: '' },
    whatsapp: { connected: true, username: 'Authorized Web Session' },
    letterboxd: { connected: false, username: '' },
  });
  
  const [customInviteNote, setCustomInviteNote] = useState('');
  const [selectedScreeningForPlans, setSelectedScreeningForPlans] = useState<string>('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState(0);
  const [recentBroadcasts, setRecentBroadcasts] = useState<Array<{ id: string; platform: string; text: string; time: string }>>([]);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [mockConnectName, setMockConnectName] = useState('');

  const playDetailBeep = (freq = 1450, duration = 0.12) => {
    try {
      const audioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxClass) return;
      const audioCtx = new audioCtxClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (err) {
      console.warn('Audio check blocked:', err);
    }
  };

  const handleConnectPlatform = (platform: string) => {
    setConnectingPlatform(platform);
    setMockConnectName('');
    playDetailBeep(880, 0.1);
  };

  const handleConfirmConnect = (platform: string, usernameStr: string) => {
    const userHandle = usernameStr.trim() || `PopcornUser_${Math.floor(Math.random() * 9000 + 1000)}`;
    setSocialConnections(prev => ({
      ...prev,
      [platform]: { connected: true, username: userHandle }
    }));
    setConnectingPlatform(null);
    playDetailBeep(1200, 0.25);
    setTimeout(() => playDetailBeep(1600, 0.15), 100);
  };

  const handleDisconnectPlatform = (platform: string) => {
    setSocialConnections(prev => ({
      ...prev,
      [platform]: { connected: false, username: '' }
    }));
    playDetailBeep(440, 0.3);
  };

  const triggerSocialWindow = (platform: string, text: string) => {
    const shareUrl = window.location.href;
    let target = '';
    
    switch (platform) {
      case 'twitter':
        target = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        target = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'whatsapp':
        target = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
        break;
      case 'telegram':
        target = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case 'reddit':
        target = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(text)}`;
        break;
      default:
        navigator.clipboard.writeText(`${text} ${shareUrl}`);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
        return;
    }
    
    if (target) {
      window.open(target, '_blank', 'noopener,noreferrer');
    }
  };

  // --- SHARE INVITATION STATE AND HANDLERS ---
  const [showShareModal, setShowShareModal] = useState(false);
  const [generatedRoomCode, setGeneratedRoomCode] = useState('');
  const [generatedDeepLink, setGeneratedDeepLink] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  const handleOpenShareDialogue = () => {
    const cleanTitle = movie.title.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const code = `POPCORN-${cleanTitle || 'SQUAD'}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const origin = window.location.origin || 'http://localhost:3000';
    const link = `${origin}/?movie=${movie.id}&room=${code}`;
    setGeneratedRoomCode(code);
    setGeneratedDeepLink(link);
    setShowShareModal(true);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(generatedDeepLink);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  // --- PREMIERE EVENT RED CARPET STATE VECTORS ---
  const [detailMode, setDetailMode] = useState<'standard' | 'redcarpet'>(movie.isPremiere ? 'redcarpet' : 'standard');
  const [rsvpName, setRsvpName] = useState('');
  const [rsvpList, setRsvpList] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`popcorn_rsvp_${movie.id}`);
      return stored ? JSON.parse(stored) : ["Elena Vance (Star Cast)", "Julian Thorne (Star Cast)", "Marcus Reed (Director)", "Jane Doe (Super Fan)"];
    } catch {
      return ["Elena Vance (Star Cast)", "Julian Thorne (Star Cast)", "Marcus Reed (Director)", "Jane Doe (Super Fan)"];
    }
  });
  const [premiereCountdown, setPremiereCountdown] = useState({ hours: 3, minutes: 42, seconds: 18 });

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPremiereCountdown((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 0, minutes: 0, seconds: 0 };
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRSVPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim()) return;
    const nextList = [...rsvpList, `${rsvpName.trim()} 🎟️ (Guest / RSVP)`];
    setRsvpList(nextList);
    try {
      localStorage.setItem(`popcorn_rsvp_${movie.id}`, JSON.stringify(nextList));
    } catch {}
    setRsvpName('');
  };

  // Parse custom trailer links (e.g., youtube normal watch url, short links, or direct embeds)
  const getEmbedUrl = (url?: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/embed/')) return `${url}${(url.includes('?') ? '&' : '?')}autoplay=1`;
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    return url;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build combined screenings listing with subscription pricing rules applied
  const getPricing = (originalPrice: number) => {
    if (movie.isPassOnly) {
      if (isPopcornPass) {
        return { priceString: 'FREE (Pass Early Access) 👑', rawPrice: 0.00 };
      }
      return { priceString: `$${originalPrice.toFixed(2)} (Pass Required) 🔒`, rawPrice: originalPrice };
    }
    if (movie.isNewRelease) {
      if (isPopcornPass) {
        return { priceString: '$4.99 (Pass Discount) 🔥', rawPrice: 4.99 };
      }
      return { priceString: `$${originalPrice.toFixed(2)}`, rawPrice: originalPrice };
    }
    // Catalogue film: free for Pass members, standard for free tier
    if (isPopcornPass) {
      return { priceString: 'FREE (Pass Unlimited) 👑', rawPrice: 0.00 };
    }
    return { priceString: `$${originalPrice.toFixed(2)}`, rawPrice: originalPrice };
  };

  const displayScreenings = movie.screenings && movie.screenings.length > 0
    ? movie.screenings.map(s => {
        const pricing = getPricing(s.ticketPrice);
        return {
          id: s.id,
          hallName: s.hallName || 'Lounge Hall 1',
          features: s.features || 'Laser IMAX • Dolby Atmos',
          time: s.time,
          date: s.date || 'today',
          isAvailable: s.isAvailable !== undefined ? s.isAvailable : true,
          priceString: pricing.priceString,
          rawPrice: pricing.rawPrice,
        };
      })
    : INITIAL_SCREENINGS.map((s) => {
        const pricing = getPricing(12.50);
        return {
          id: s.id,
          hallName: s.hallName,
          features: s.features,
          time: s.time,
          date: selectedDay,
          isAvailable: s.isAvailable,
          priceString: pricing.priceString,
          rawPrice: pricing.rawPrice,
        };
      });

  const handleBook = (screening: { time: string; hallName: string; priceString: string; date?: string }) => {
    if (movie.isPassOnly && !isPopcornPass) {
      onTriggerUpgrade(movie.title);
      return;
    }
    onBookSeat(screening.time, screening.hallName, screening.priceString, screening.date);
  };

  return (
    <div className="space-y-12 animate-fade-in max-w-7xl mx-auto px-1 md:px-4">
      {/* Visual 'Link Copied' Toast notification overlay */}
      <AnimatePresence>
        {(copied || shareCopied) && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 py-3 px-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full border border-emerald-400 font-sans text-xs font-black uppercase tracking-widest shadow-[0_12px_40px_rgba(16,185,129,0.4)] flex items-center gap-2"
          >
            <Check className="h-4 w-4 text-white stroke-[3px]" />
            <span>Link Copied!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back navigation and VIP Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-white/5 hover:bg-neutral-800 text-on-surface rounded-full transition-all duration-200 text-xs font-sans tracking-widest uppercase font-bold cursor-pointer"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          <span>Back to Grid</span>
        </button>

        {movie.isPremiere && (
          <div className="bg-neutral-950 p-1.5 rounded-2xl border border-yellow-500/20 flex gap-1 items-center shadow-2xl relative z-10">
            <button
              id="tab-detail-standard"
              onClick={() => setDetailMode('standard')}
              className={`px-4 py-2 rounded-xl text-[9px] font-sans font-black uppercase tracking-widest transition-all cursor-pointer ${
                detailMode === 'standard' 
                  ? 'bg-white text-black font-extrabold shadow-md' 
                  : 'text-[#dac6a8] hover:text-white hover:bg-white/5'
              }`}
            >
              🎬 Standard Sheet
            </button>
            <button
              id="tab-detail-redcarpet"
              onClick={() => setDetailMode('redcarpet')}
              className={`px-4 py-2 rounded-xl text-[9px] font-sans font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 ${
                detailMode === 'redcarpet' 
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black shadow-[0_0_15px_rgba(245,158,11,0.35)]' 
                  : 'text-yellow-400/80 hover:text-yellow-400 hover:bg-white/5'
              }`}
            >
              <Crown className="h-3 w-3 animate-pulse" />
              <span>👑 VIP Red Carpet Hub</span>
            </button>
          </div>
        )}
      </div>

      {detailMode === 'redcarpet' && movie.isPremiere ? (
        <div className="space-y-8 animate-fade-in relative">
          {/* Decorative flashing paparazzi lights overlay of sparkling stars */}
          <div className="absolute inset-0 z-0 bg-radial-gradient(circle at center, rgba(157, 23, 77, 0.1) 0%, transparent 80%) pointer-events-none" />
          
          {/* Large Red Carpet Hero Poster Flyer */}
          <section className="relative w-full rounded-2xl overflow-hidden border-2 border-yellow-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)] bg-gradient-to-r from-[#1c0d0a] via-[#3c1010] to-[#1c0d0a] p-6 md:p-12 text-left flex flex-col md:flex-row gap-8 items-center md:items-stretch select-none">
            
            {/* Visual poster aspect */}
            <div className="w-48 md:w-64 shrink-0 rounded-2xl overflow-hidden border-2 border-yellow-400 shadow-2xl relative group">
              <img 
                src={movie.imageUrl} 
                alt={movie.title} 
                className="w-full h-full object-cover brightness-105" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                <span className="font-sans text-[8px] bg-yellow-400 text-black px-2 py-0.5 rounded font-black tracking-widest uppercase block w-max mb-1">
                  OFFICIAL PREMIERE
                </span>
                <span className="font-mono text-[9px] text-[#dac6a8]">{movie.format} • {movie.runtime}</span>
              </div>
            </div>

            {/* Central Event Details column */}
            <div className="flex-1 flex flex-col justify-between space-y-6 md:space-y-0 text-left">
              <div className="space-y-3">
                <span className="font-mono text-[9px] text-yellow-400 font-bold tracking-widest uppercase bg-yellow-400/10 border border-yellow-500/25 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-md">
                  <Crown className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                  VIP RED CARPET EVENT ACTIVE
                </span>

                <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-black text-[#F5EFEB] uppercase tracking-tight leading-tight">
                  {movie.title}
                </h1>

                <p className="font-sans text-xs md:text-sm text-[#dac6a8] leading-relaxed max-w-2xl capitalize lowercase">
                  welcome to the official, showrunner-sanctioned red carpet premier. you are cordially invited to enter our interactive pre-show lobby before the film begins to ask your burning questions to our lead cast.
                </p>

                {/* WCAG compliant contrast badge indicating pricing */}
                <div className="flex flex-wrap gap-2.5 items-center pt-2">
                  <div className="bg-yellow-450 border border-yellow-400/50 text-black font-sans text-xs font-bold uppercase tracking-wider px-3 py-1 rounded shadow-md font-sans">
                    🎟️ PREMIUM TICKET: ${displayScreenings[0]?.rawPrice ? displayScreenings[0].rawPrice.toFixed(2) : '18.50'}
                  </div>
                  <div className="bg-white/5 border border-white/10 text-on-surface-variant px-3 py-1 rounded-lg font-sans text-[10px] font-semibold">
                    🍿 commemorative badge awarded on watch
                  </div>
                </div>
              </div>

              {/* LIVE Ticking Countdown Timer */}
              <div className="bg-black/70 border border-yellow-500/20 backdrop-blur-md rounded-2xl p-5 md:p-6 shadow-2xl space-y-3 max-w-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="font-sans text-[8px] text-yellow-400 font-black tracking-widest uppercase">
                      LIVE PRE-SHOW CLOCK
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-[#dac6a8] font-bold">STARTS TONIGHT @ 21:30</span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center font-mono">
                  <div className="bg-neutral-900 border border-white/5 p-2 rounded-xl">
                    <span className="text-2xl md:text-3xl font-black text-white block">
                      {String(premiereCountdown.hours).padStart(2, '0')}
                    </span>
                    <span className="font-sans text-[8px] text-on-surface-variant font-bold uppercase tracking-widest block mt-0.5">HOURS</span>
                  </div>
                  <div className="bg-neutral-900 border border-white/5 p-2 rounded-xl">
                    <span className="text-2xl md:text-3xl font-black text-white block">
                      {String(premiereCountdown.minutes).padStart(2, '0')}
                    </span>
                    <span className="font-sans text-[8px] text-on-surface-variant font-bold uppercase tracking-widest block mt-0.5">MINUTES</span>
                  </div>
                  <div className="bg-neutral-900 border border-white/5 p-2 rounded-xl animate-pulse">
                    <span className="text-2xl md:text-3xl font-black text-yellow-400 block font-black">
                      {String(premiereCountdown.seconds).padStart(2, '0')}
                    </span>
                    <span className="font-sans text-[8px] text-on-surface-variant font-bold uppercase tracking-widest block mt-0.5">SECONDS</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Cast Info Cards and RSVP list Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
            
            {/* Cast Info column */}
            <div className="md:col-span-7 space-y-6">
              <div className="flex items-center gap-1.5 text-yellow-400 text-[10px] font-black tracking-wider uppercase pl-2">
                <Users className="h-4 w-4" />
                <span>MEET THE RED CARPET CAST</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {movie.cast && movie.cast.map((c) => (
                  <div 
                    key={`cast-carpet-${c.id}`}
                    className="bg-[#121214] border border-yellow-500/10 hover:border-yellow-400/30 rounded-2xl p-3 flex gap-3 items-center shadow-lg transition-all"
                  >
                    <img 
                      src={c.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=80'} 
                      alt={c.name} 
                      className="w-11 h-11 rounded-full object-cover border border-white/10 shrink-0 container-fit"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h4 className="font-sans font-black text-[11px] text-white truncate uppercase">{c.name}</h4>
                      <p className="font-sans text-[9px] text-[#dac6a8] truncate mt-0.5 lowercase">role: {c.character}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Theater booking option */}
              <div className="bg-[#18110e] border border-yellow-500/20 rounded-3xl p-5 md:p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h3 className="font-sans font-black text-[11px] tracking-wider text-yellow-400 uppercase">OFFICIAL SHOWTIMES</h3>
                    <p className="font-sans text-[9px] text-[#dac6a8] lowercase">reserve seat inside the premium theater hall.</p>
                  </div>
                  <RatingBadge rating={movie.rating} />
                </div>

                <div className="space-y-2">
                  {displayScreenings.map((s) => (
                    <div 
                      key={`scr-carpet-${s.id}`}
                      className="p-3.5 bg-black/60 hover:bg-black/95 border border-white/5 hover:border-yellow-500/25 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all"
                    >
                      <div className="space-y-1">
                        <span className="font-sans text-[10px] text-white font-bold uppercase tracking-wider block">
                          🛋️ {s.hallName}
                        </span>
                        <span className="font-mono text-[8px] text-[#dac6a8]/80 uppercase block">
                          {s.features}
                        </span>
                      </div>

                      <button
                        id={`btn-book-carpet-${s.id}`}
                        onClick={() => handleBook(s)}
                        className="py-1.5 px-4 bg-gradient-to-r from-yellow-400 to-amber-500 hover:brightness-115 rounded-lg text-black font-sans text-[9px] font-black tracking-widest uppercase cursor-pointer"
                      >
                        BOOK SEAT @ {s.time} • {s.priceString.split(' ')[0]}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RSVP Guest list column */}
            <div className="md:col-span-5 space-y-6">
              <div className="flex items-center gap-1.5 text-yellow-400 text-[10px] font-black tracking-wider uppercase pl-2">
                <Crown className="h-4 w-4 text-yellow-400" />
                <span>RSVP OFFICIAL GUEST WALL</span>
              </div>

              <div className="bg-[#121214] border border-yellow-500/15 rounded-3xl p-5 md:p-6 space-y-5 shadow-2xl">
                <div>
                  <h4 className="font-sans font-black text-[11.5px] text-white uppercase tracking-wider">Join The Red Carpet List</h4>
                  <p className="font-sans text-[9px] text-[#dac6a8] mt-1 lowercase">sign the guestbook to unlock your vip entrance pass and sync up with standard watchlists.</p>
                </div>

                {/* RSVP input Form */}
                <form onSubmit={handleRSVPSubmit} className="space-y-3">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Enter guest or group name..." 
                      value={rsvpName}
                      onChange={(e) => setRsvpName(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 focus:border-yellow-400 rounded-xl px-4 py-3 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none"
                    />
                  </div>
                  <button
                    id="btn-rsvp-submit"
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-500 hover:scale-[1.01] active:scale-95 text-black font-sans text-[9px] font-black tracking-widest uppercase rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    ✨ SUBMIT VIP RSVP
                  </button>
                </form>

                {/* Interactive RSVP Scroller guest registry */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[8px] font-sans font-black tracking-widest text-[#dac6a8] uppercase block">GUESTBOOK REGISTRY ({rsvpList.length})</span>
                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1.5 scrollbar-thin">
                    {rsvpList.map((guest, index) => {
                      const isCreator = guest.includes('🎟️ (Guest / RSVP)');
                      return (
                        <div 
                          key={`guest-${index}`}
                          className={`p-2 rounded-lg text-[9px] font-sans flex items-center justify-between border ${
                            isCreator 
                              ? 'bg-yellow-400/10 border-yellow-400/20 text-yellow-255' 
                              : 'bg-white/[0.02] border-white/5 text-[#ccc]'
                          }`}
                        >
                          <span className="font-medium truncate">{guest}</span>
                          <span className="font-mono text-[7px] bg-white/10 text-white px-1.5 py-0.5 rounded uppercase shrink-0 font-bold">
                            {isCreator ? 'CONFIRMED' : 'VIP'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      ) : (
        <>
          {/* Hero Trailer / Background Backdrop */}
          <section className="relative w-full aspect-video md:h-[480px] bg-surface-container-lowest rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
        {isPlayingTrailer && movie.trailerUrl ? (
          <div className="absolute inset-0 z-30 bg-black animate-fade-in">
            <iframe
              src={getEmbedUrl(movie.trailerUrl)}
              title={`${movie.title} Official Trailer`}
              className="absolute inset-0 w-full h-full border-0 rounded-3xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
            <button
              onClick={() => setIsPlayingTrailer(false)}
              className="absolute top-4 right-4 z-40 px-4 py-2 bg-black/80 hover:bg-primary hover:text-white rounded-full text-xs font-sans font-black tracking-widest uppercase flex items-center gap-2 border border-white/15 transition-all cursor-pointer shadow-lg"
            >
              <XCircle className="h-4 w-4" />
              <span>Exit Trailer</span>
            </button>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 z-0 select-none pointer-events-none">
              <img
                src={movie.heroImageUrl || movie.imageUrl}
                alt={`${movie.title} Background Frame`}
                className="w-full h-full object-cover scale-105 blur bg-center opacity-40 animate-fade-in"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            </div>

            {/* Video Player Action Center Play Trigger */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div 
                onClick={() => {
                  if (movie.trailerUrl) {
                    setIsPlayingTrailer(true);
                  } else {
                    alert("This exclusive screening's trailer loop is hosted in the digital lobby room. Click 'Book My Seat' below to explore.");
                  }
                }}
                className="group relative cursor-pointer active:scale-95 transition-transform"
              >
                <div className="absolute -inset-8 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-2xl relative z-20 transition-all group-hover:scale-105">
                  <Play className="h-8 w-8 text-on-primary fill-on-primary ml-1" />
                </div>
                <p className="text-center font-sans text-[10px] font-black tracking-widest uppercase text-white mt-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {movie.trailerUrl ? 'PLAY TRAILER' : 'LOBBY SHOWROOM ACTIVE'}
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Movie Meta Information Structure */}
      <div className="relative z-20 grid grid-cols-1 lg:grid-cols-12 gap-8 -mt-24 md:-mt-32 px-4 md:px-8">
        
        {/* Left column: Movie Poster and core Specs */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/5 relative group select-none">
            {/* Soft background light projection bloom */}
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-[40px] opacity-100 group-hover:opacity-80 transition-opacity"></div>
            <img
              src={movie.imageUrl}
              alt={movie.title}
              className="w-full aspect-[2/3] object-cover relative z-10"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/20 shadow-md">
            <div className="flex flex-col text-center flex-1 items-center">
              <span className="font-sans text-[9px] font-black tracking-widest text-on-surface-variant uppercase mb-1">RATING</span>
              <RatingBadge rating={movie.rating} />
            </div>
            <div className="h-8 w-px bg-outline-variant/30"></div>
            <div className="flex flex-col text-center flex-1">
              <span className="font-sans text-[9px] font-black tracking-widest text-on-surface-variant uppercase">RUNTIME</span>
              <span className="font-sans text-sm font-black text-on-surface leading-normal">{movie.runtime}</span>
            </div>
            <div className="h-8 w-px bg-outline-variant/30"></div>
            <div className="flex flex-col text-center flex-1">
              <span className="font-sans text-[9px] font-black tracking-widest text-on-surface-variant uppercase">FORMAT</span>
              <span className="inline-flex self-center px-1.5 py-0.5 rounded-full bg-primary-container/20 text-primary font-sans text-[8px] font-black tracking-widest border border-primary/20 mt-0.5">
                {movie.format}
              </span>
            </div>
          </div>
        </div>

        {/* Right column: Synopsis, Cast details, & Showtimes bookings */}
        <div className="lg:col-span-8 flex flex-col gap-8 space-y-2">
          
          {/* Header Title with review stars and Premiere check */}
          <div className="space-y-3">
            {movie.isPremiere && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-yellow-400/10 border border-yellow-400/35 rounded-full text-yellow-400 font-sans text-[9px] font-black tracking-widest uppercase select-none shadow-[0_0_15px_rgba(250,204,21,0.08)]">
                <Crown className="h-3 w-3 fill-yellow-400" />
                <span>EXCEPTIONAL STUDIO PREMIERE</span>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-on-surface tracking-tight">
                {movie.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 shrink-0 self-start sm:self-center">
                {onToggleWatchlist && (
                  <button
                    id={`btn-watchlist-${movie.id}`}
                    onClick={() => onToggleWatchlist(movie.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-sans text-[10px] font-black tracking-widest uppercase transition-all duration-300 cursor-pointer ${
                      watchlistIds.includes(movie.id)
                        ? 'bg-primary border-primary text-on-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-white/5 border-white/10 text-on-surface hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${watchlistIds.includes(movie.id) ? 'fill-current' : ''}`} />
                    <span>{watchlistIds.includes(movie.id) ? 'In Watchlist' : 'Add to Watchlist'}</span>
                  </button>
                )}

                {/* Share Invitation button */}
                <button
                  id={`btn-share-invite-header-${movie.id}`}
                  onClick={handleOpenShareDialogue}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#dda75f]/15 border border-[#dda75f]/35 text-[#dda75f] hover:bg-[#dda75f]/25 hover:border-[#dda75f]/50 font-sans text-[10px] font-black tracking-widest uppercase transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  title="Generate a custom shareable link for this watch party"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share Invitation</span>
                </button>

                {/* Copy Movie Link button */}
                <button
                  id={`btn-copy-movie-link-${movie.id}`}
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-on-surface hover:bg-white/10 hover:border-white/20 font-sans text-[10px] font-black tracking-widest uppercase transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  title="Copy direct movie page link to clipboard"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy Link</span>
                </button>

                {/* Instant Plan Social Shares */}
                <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                  {[
                    { key: 'twitter', icon: '🐦', name: 'X', color: 'hover:bg-sky-500/20 hover:text-sky-400 border-sky-500/10' },
                    { key: 'facebook', icon: '📘', name: 'Facebook', color: 'hover:bg-blue-600/20 hover:text-blue-400 border-blue-600/10' },
                    { key: 'whatsapp', icon: '💬', name: 'WhatsApp', color: 'hover:bg-emerald-500/20 hover:text-emerald-400 border-emerald-500/10' }
                  ].map((pSoc) => (
                    <button
                      key={pSoc.key}
                      onClick={() => {
                        const directUrl = window.location.href;
                        const defaultText = `🍿 Let's stream on the big screen! join my watch plans for "${movie.title}" at ROWONE Cinema Lounge! 🎞️🍿`;
                        triggerSocialWindow(pSoc.key, defaultText);
                      }}
                      className={`h-9 w-9 rounded-xl bg-white/5 border flex items-center justify-center transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] cursor-pointer text-sm ${pSoc.color}`}
                      title={`Share direct movie details on ${pSoc.name}`}
                    >
                      {pSoc.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {(() => {
                const popcornData = getPopcornScore(movie.id, movie.ratingScore);
                return (
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs md:text-sm text-[#dda75f] font-black uppercase tracking-wider bg-[#dda75f]/10 border border-[#dda75f]/25 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                      🍿 {popcornData.scorePercent}% ROWONE Score
                    </span>
                    <span className="font-sans text-[11px] text-[#dac6a8] lowercase">
                      ({popcornData.count} active screening reviews)
                    </span>
                  </div>
                );
              })()}
              <RatingBadge rating={movie.rating} />
            </div>
          </div>

          {/* Internal sub-tab selector to switch between Movie Details and Watchlist Collection */}
          <div className="flex border-b border-white/5 pb-px gap-6 select-none mt-4">
            <button
              onClick={() => setActiveDetailsTab('overview')}
              className={`py-3 px-2 text-xs font-sans font-black tracking-widest uppercase transition-all shrink-0 border-b-2 cursor-pointer ${
                activeDetailsTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-white'
              }`}
            >
              🎬 Movie Overview & Cast
            </button>
            <button
              onClick={() => setActiveDetailsTab('watchlist')}
              className={`py-3 px-2 text-xs font-sans font-black tracking-widest uppercase transition-all shrink-0 border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeDetailsTab === 'watchlist'
                  ? 'border-primary text-primary font-black'
                  : 'border-transparent text-on-surface-variant hover:text-white'
              }`}
            >
              <span>📌 My Collection Watchlist</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono shrink-0 ${
                activeDetailsTab === 'watchlist' ? 'bg-primary text-on-primary' : 'bg-white/10 text-on-surface-variant'
              }`}>
                {watchlistIds.length}
              </span>
            </button>
          </div>

          {activeDetailsTab === 'overview' ? (
            <>
              {/* Synopsis Section */}
              <div className="space-y-3">
                <h2 className="font-display text-xl md:text-2xl font-bold text-primary animate-fade-in">Synopsis</h2>
                <p className="font-sans text-sm md:text-base text-on-surface-variant leading-relaxed max-w-2xl animate-fade-in">
                  {movie.synopsis}
                </p>
              </div>

              {/* Cast Profiles Grid */}
              <div className="space-y-4">
                <h2 className="font-display text-xl md:text-2xl font-bold text-primary">Featured Cast</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {movie.cast && movie.cast.length > 0 ? (
                    movie.cast.map((actor) => (
                      <div key={actor.id} className="group cursor-default flex flex-col items-center text-center">
                        <div className="relative aspect-square w-16 h-16 rounded-full overflow-hidden mb-2 border-2 border-transparent group-hover:border-primary transition-all duration-300 select-none">
                          <img
                            src={actor.imageUrl}
                            alt={actor.name}
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                          />
                        </div>
                        <p className="font-sans text-[10px] font-black uppercase text-on-surface tracking-widest leading-none truncate w-full">
                          {actor.name}
                        </p>
                        <p className="font-sans text-[9px] text-on-surface-variant leading-normal truncate w-full">
                          {actor.character}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-4 py-4 bg-white/5 border border-dashed border-white/15 rounded-xl px-4 text-center ">
                      <p className="font-sans text-[10px] font-black text-on-surface-variant tracking-wider uppercase">CAST PROFILES UNDER SEAL</p>
                      <p className="font-sans text-[9px] text-on-surface-variant/70 mt-0.5 lowercase">confidential global screen actors guild registrations loaded upon entry</p>
                    </div>
                  )}
                </div>
              </div>

              {/* --- SOCIAL MEDIA BROADCASTING & PLANS SHARING HUB --- */}
              {(() => {
                const targetShowtimeString = selectedScreeningForPlans || (displayScreenings[0] ? `${displayScreenings[0].time} (${displayScreenings[0].hallName})` : 'TBA Showcase');
                
                const connectionDetails = Object.values(socialConnections) as Array<{ connected: boolean; username: string }>;
                const isAnyPlatformConnected = connectionDetails.some(c => c.connected);

                const getCompiledShareText = (screening: string) => {
                  const defaultNote = customInviteNote.trim() 
                    ? `"${customInviteNote.trim()}"` 
                    : `Watching this masterpiece soon!`;
                  return `🍿 My Upcoming Movie Plans: I am watching "${movie.title}" at ${screening} on ROWONE Lounge! ${defaultNote} join me 🎬👇`;
                };

                const handleBulkBroadcast = () => {
                  if (isBroadcasting) return;
                  setIsBroadcasting(true);
                  setBroadcastProgress(0);
                  playDetailBeep(600, 0.1);
                  
                  const interval = setInterval(() => {
                    setBroadcastProgress(prev => {
                      if (prev >= 100) {
                        clearInterval(interval);
                        setIsBroadcasting(false);
                        
                        const text = getCompiledShareText(targetShowtimeString);
                        const activePlatforms = (Object.entries(socialConnections) as Array<[string, { connected: boolean; username: string }]>)
                          .filter(([_, data]) => (data as any).connected)
                          .map(([plat]) => plat);
                          
                        const newPosts = activePlatforms.map(plat => ({
                          id: Math.random().toString(36).substring(2, 9),
                          platform: plat,
                          text,
                          time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        }));
                        
                        setRecentBroadcasts(prevList => [...newPosts, ...prevList].slice(0, 8));
                        
                        playDetailBeep(1000, 0.1);
                        setTimeout(() => playDetailBeep(1250, 0.1), 100);
                        setTimeout(() => playDetailBeep(1500, 0.25), 200);
                        
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 2000);
                        return 100;
                      }
                      return prev + 10;
                    });
                  }, 150);
                };

                return (
                  <div className="border-t border-white/5 pt-8 space-y-6" id="social-broadcasting-hub">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <h2 className="font-display text-xl md:text-2xl font-bold text-primary">
                            Social Broadcast Hub
                          </h2>
                        </div>
                        <p className="font-sans text-xs text-on-surface-variant lowercase">
                          coordinate and broadcast your upcoming lounge screening plans directly to connected platforms.
                        </p>
                      </div>
                      
                      {navigator.share && (
                        <button
                          onClick={async () => {
                            try {
                              await navigator.share({
                                title: `Catch me at ROWONE Lounge: ${movie.title}`,
                                text: `I'm planning to watch "${movie.title}" soon! Join my watch circle! 🍿📽️`,
                                url: window.location.origin + `/?movie=${movie.id}`
                              });
                            } catch (err) {
                              console.log('Share error:', err);
                            }
                          }}
                          className="px-4 py-2 bg-[#dda75f]/10 border border-[#dda75f]/35 hover:border-[#dda75f] text-[#dda75f] hover:text-white rounded-xl font-sans text-[9px] font-black tracking-widest uppercase transition-all duration-200 cursor-pointer"
                        >
                          📲 System Native Share
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      {/* Left Column: Plan Customizer & Text Builder */}
                      <div className="md:col-span-7 bg-white/[0.01] border border-white/5 rounded-2xl p-5 md:p-6 space-y-5">
                        <span className="font-mono text-[9px] text-[#dda75f] font-bold uppercase tracking-wider block">
                          1. configure your movie invitation plans
                        </span>

                        {/* Showtime choosing select */}
                        <div className="space-y-2">
                          <label className="font-sans text-[10px] text-on-surface-variant uppercase font-bold block">
                            Select Intended Screening
                          </label>
                          <select
                            value={selectedScreeningForPlans}
                            onChange={(e) => setSelectedScreeningForPlans(e.target.value)}
                            className="w-full bg-neutral-950 px-3 py-2.5 rounded-xl border border-white/10 text-xs font-sans text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                          >
                            <option value="">-- Choose Showtime --</option>
                            {displayScreenings.map((s) => (
                              <option key={s.id} value={`${s.time} in ${s.hallName}`}>
                                📅 {s.time} — {s.hallName} ({s.features})
                              </option>
                            ))}
                            <option value="TBA Screening">📅 Custom / TBA Showcase</option>
                          </select>
                        </div>

                        {/* Custom Note Input */}
                        <div className="space-y-2">
                          <label className="font-sans text-[10px] text-on-surface-variant uppercase font-bold block flex justify-between">
                            <span>Personal Invitation Note</span>
                            <span className="font-mono text-[9px] text-zinc-500 lowercase">Optional</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. reserving middle Row-D seats / anyone up for drinks before? 🥂"
                            value={customInviteNote}
                            onChange={(e) => setCustomInviteNote(e.target.value)}
                            className="w-full bg-neutral-950 px-3.5 py-2.5 rounded-xl border border-white/10 text-xs font-sans text-on-surface placeholder:text-zinc-650 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                          />
                        </div>

                        {/* Live Preview Box */}
                        <div className="space-y-1.5 pt-2">
                          <span className="font-sans text-[8px] text-zinc-500 uppercase font-black tracking-widest block">
                            invitation packet live transmission preview
                          </span>
                          <div className="bg-[#09070c] rounded-xl p-4 border border-purple-500/10 font-mono text-[11px] text-zinc-300 leading-relaxed text-wrap break-all relative">
                            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                            <span className="text-purple-400 font-bold">&gt;&gt; TEXT_PAYLOAD: </span>
                            {getCompiledShareText(targetShowtimeString)}
                          </div>
                        </div>

                        {/* Mega Bulk Broadcast button */}
                        <div className="pt-2">
                          <button
                            onClick={handleBulkBroadcast}
                            disabled={isBroadcasting || !isAnyPlatformConnected}
                            className={`w-full py-3 rounded-xl font-sans text-[10px] font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                              isBroadcasting
                                ? 'bg-neutral-800 text-zinc-500 border border-white/5 cursor-not-allowed'
                                : !isAnyPlatformConnected
                                ? 'bg-neutral-950 text-zinc-650 border border-dashed border-white/10 cursor-not-allowed'
                                : 'bg-gradient-to-r from-primary to-secondary text-[#030303] hover:scale-[1.01] active:scale-[0.99] shadow-primary/10'
                            }`}
                          >
                            <span>🚀 BROADCAST INVITATION TO CONNECTED OUTLETS</span>
                          </button>
                          {!isAnyPlatformConnected && (
                            <p className="text-[9px] text-center text-red-400/70 font-sans mt-2 lowercase">
                              ⚠️ connect at least one external account in the right-side panel to unlock multi-channel broadcasting
                            </p>
                          )}
                        </div>

                        {/* Broadcasting Progress Bar */}
                        <AnimatePresence>
                          {isBroadcasting && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="pt-1.5 space-y-1.5 overflow-hidden"
                            >
                              <div className="flex justify-between font-mono text-[9px] text-purple-400">
                                <span>TRANSMITTING MULTICAST BEAMS...</span>
                                <span>{broadcastProgress}%</span>
                              </div>
                              <div className="w-full bg-neutral-950 rounded-full h-1 border border-white/5 overflow-hidden">
                                <div className="bg-primary h-full transition-all duration-150" style={{ width: `${broadcastProgress}%` }} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>

                      {/* Right Column: Platform Connections & Simulation */}
                      <div className="md:col-span-5 flex flex-col justify-between bg-white/[0.01] border border-white/5 rounded-2xl p-5 md:p-6 space-y-4">
                        <div>
                          <span className="font-mono text-[9px] text-[#dda75f] font-bold uppercase tracking-wider block mb-3">
                            2. connected sharing platforms
                          </span>

                          {/* Connection List */}
                          <div className="space-y-2.5">
                            {[
                              { key: 'twitter', name: 'Twitter/X', icon: '🐦' },
                              { key: 'discord', name: 'Discord', icon: '👾' },
                              { key: 'facebook', name: 'Facebook', icon: '📘' },
                              { key: 'whatsapp', name: 'WhatsApp', icon: '💬' },
                              { key: 'letterboxd', name: 'Letterboxd', icon: '🎬' }
                            ].map((pVal) => {
                              const connData = socialConnections[pVal.key];
                              const isConn = connData?.connected;
                              return (
                                <div
                                  key={pVal.key}
                                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                                    isConn 
                                      ? 'bg-white/[0.02] border-white/10' 
                                      : 'bg-neutral-950/40 border-white/5 opacity-70 hover:opacity-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-sm shrink-0">{pVal.icon}</span>
                                    <div className="min-w-0">
                                      <p className="font-sans font-bold text-[11px] text-white leading-none">
                                        {pVal.name}
                                      </p>
                                      {isConn ? (
                                        <p className="font-mono text-[8px] text-emerald-400 truncate mt-0.5 max-w-[120px]">
                                          ● {connData.username}
                                        </p>
                                      ) : (
                                        <p className="font-mono text-[8px] text-zinc-500 italic mt-0.5">
                                          Not Connected
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {isConn ? (
                                      <>
                                        <button
                                          onClick={() => triggerSocialWindow(pVal.key, getCompiledShareText(targetShowtimeString))}
                                          className="px-2 py-1 bg-white/5 hover:bg-white/10 text-on-surface rounded font-sans text-[8px] font-black tracking-widest uppercase cursor-pointer"
                                          title="Open official sharing window for this plan"
                                        >
                                          Share
                                        </button>
                                        <button
                                          onClick={() => handleDisconnectPlatform(pVal.key)}
                                          className="p-1 text-red-400 hover:text-red-300 hover:bg-white/5 rounded transition-colors cursor-pointer"
                                          title="Revoke connection access"
                                        >
                                          ✕
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => handleConnectPlatform(pVal.key)}
                                        className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded font-sans text-[8px] font-black tracking-widest uppercase cursor-pointer border border-primary/20"
                                      >
                                        Connect
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Social connection modal setup inline simulation block */}
                        <AnimatePresence>
                          {connectingPlatform && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="bg-neutral-950 border border-primary/25 rounded-xl p-3.5 text-left space-y-3 shadow-md mt-2"
                            >
                              <span className="font-mono text-[8px] text-primary/70 font-bold uppercase tracking-widest block">
                                🔑 CONNECT OUTLET AUTHORIZATION
                              </span>
                              <div className="space-y-2">
                                <p className="text-[10px] text-zinc-300 leading-normal lowercase">
                                  please insert your real account handle or credentials for authentication to link this platform.
                                </p>
                                <input
                                  type="text"
                                  placeholder="e.g. @cine_critic"
                                  value={mockConnectName}
                                  onChange={(e) => setMockConnectName(e.target.value)}
                                  className="w-full bg-[#110e12] px-3 py-1.5 rounded-lg border border-white/5 text-[11px] font-sans text-on-surface focus:border-primary outline-none"
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setConnectingPlatform(null)}
                                  className="px-2 py-1 font-sans text-[8px] font-black tracking-widest uppercase text-zinc-500 hover:text-white cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleConfirmConnect(connectingPlatform, mockConnectName)}
                                  className="px-3 py-1 bg-primary text-black rounded font-sans text-[8px] font-black tracking-widest uppercase hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                  Authorize Link
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Simulation Live Feed Ticker */}
                        {recentBroadcasts.length > 0 && (
                          <div className="bg-[#09070a]/90 rounded-xl p-3 border border-white/5 space-y-2 max-h-[140px] overflow-y-auto">
                            <span className="font-mono text-[8px] text-emerald-400 uppercase tracking-widest font-black block">
                              💬 Recent Live Feed Broadcasting Posts
                            </span>
                            <div className="space-y-1.5">
                              {recentBroadcasts.map((post) => (
                                <div key={post.id} className="text-[9px] font-mono leading-relaxed text-zinc-500 border-b border-white/[0.03] pb-1 bg-white/[0.01] p-1.5 rounded">
                                  <span className="text-[#dda75f] font-bold uppercase">[{post.platform}] </span>
                                  <span className="text-zinc-400">@{socialConnections[post.platform]?.username || 'You'} &bull; {post.time} </span>
                                  <p className="text-zinc-200 select-all mt-0.5">{post.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="space-y-6 animate-fade-in text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-display text-xl md:text-2xl font-bold text-primary">My Bookmark Collection</h3>
                  <p className="font-sans text-xs text-on-surface-variant lowercase">
                    track your curated list of bookmarked movies here. click on any film card to view its full details, trailers, cast lists, and active live lounge screening times.
                  </p>
                </div>
                {allMovies && allMovies.filter(m => watchlistIds.includes(m.id)).length > 0 && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="sm:self-center shrink-0 px-3 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 font-sans text-[10px] font-black tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer h-fit"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {/* Confirmation Modal for Clearing Watchlist */}
              <AnimatePresence>
                {showClearConfirm && (
                  <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[150] p-4 select-none font-sans">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 15 }}
                      transition={{ duration: 0.25 }}
                      className="bg-[#14120f] border border-red-500/20 max-w-sm w-full rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative"
                    >
                      <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/25">
                        <Trash2 className="h-6 w-6 text-red-500 animate-pulse" />
                      </div>

                      <div className="space-y-2 text-center">
                        <h4 className="font-display font-black text-lg text-white uppercase tracking-wider">
                          Clear Entire Watchlist?
                        </h4>
                        <p className="font-sans text-[11px] text-[#dac8bb] leading-relaxed">
                          Are you absolutely sure you want to remove all <span className="text-primary font-bold">{watchlistIds.length}</span> saved movies from your bookmark collection? This action cannot be undone.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowClearConfirm(false)}
                          className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-sans text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer transition-all duration-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onClearWatchlist) {
                              onClearWatchlist();
                            }
                            setShowClearConfirm(false);
                          }}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-sans text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer shadow-lg shadow-red-600/10 hover:shadow-red-600/20 transition-all duration-200"
                        >
                          Yes, Clear All
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {allMovies && allMovies.filter(m => watchlistIds.includes(m.id)).length === 0 ? (
                <div className="bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-8 text-center max-w-xl flex flex-col justify-center items-center gap-2 select-none">
                  <Bookmark className="h-8 w-8 text-on-surface-variant/50 mb-1" />
                  <p className="font-sans text-xs text-on-surface font-bold uppercase tracking-widest">
                    Your Collection Watchlist is Empty
                  </p>
                  <p className="font-sans text-[10.5px] text-on-surface-variant leading-relaxed max-w-sm">
                    Click the <span className="text-primary font-bold">"Add to Watchlist"</span> button above or mark show flyers around the browse loops to organize films you'd like to experience later.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {allMovies && allMovies.filter(m => watchlistIds.includes(m.id)).map((savedMovie) => {
                    const savedSessionsCount = savedMovie.screenings?.length || 0;
                    return (
                      <div 
                        key={`col-movie-${savedMovie.id}`}
                        className={`p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4 transition-all duration-300 group/saved ${
                          savedMovie.id === movie.id ? 'ring-1 ring-primary/40 bg-primary/5' : 'hover:border-primary/20 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div 
                          className="w-16 h-24 rounded-lg overflow-hidden shrink-0 relative cursor-pointer select-none border border-white/5 shadow-md bg-neutral-900"
                          onClick={() => onSelectMovie && onSelectMovie(savedMovie.id)}
                        >
                          <img 
                            src={savedMovie.imageUrl} 
                            alt={savedMovie.title} 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/saved:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h4 
                                className="font-display font-black text-[11px] text-on-surface hover:text-primary uppercase tracking-wide truncate cursor-pointer transition-colors"
                                onClick={() => onSelectMovie && onSelectMovie(savedMovie.id)}
                              >
                                {savedMovie.title}
                              </h4>
                              {savedMovie.id === movie.id && (
                                <span className="font-sans text-[7px] font-black uppercase text-primary tracking-widest bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full shrink-0">
                                  Viewing
                                </span>
                              )}
                            </div>
                            <p className="font-sans text-[9px] text-on-surface-variant mt-0.5 lowercase">
                              {savedMovie.genre} &bull; {savedMovie.runtime}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className="font-sans text-[7.5px] font-black text-[#dda75f] bg-[#dda75f]/5 border border-[#dda75f]/15 px-1 py-0.5 rounded leading-none">
                                {savedMovie.format}
                              </span>
                              {savedSessionsCount > 0 ? (
                                <span className="font-sans text-[7.5px] font-extrabold text-green-400 bg-green-400/5 border border-green-400/10 px-1 py-0.5 rounded leading-none uppercase tracking-wider">
                                  {savedSessionsCount} Showtimes Active
                                </span>
                              ) : (
                                <span className="font-sans text-[7.5px] font-extrabold text-on-surface-variant bg-white/5 border border-white/5 px-1 py-0.5 rounded leading-none uppercase tracking-wider">
                                  TBA Schedules
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => onSelectMovie && onSelectMovie(savedMovie.id)}
                              className="px-2.5 py-1 bg-[#dda75f]/10 hover:bg-[#dda75f]/20 text-[#dda75f] hover:text-white rounded-lg font-sans text-[8px] font-black tracking-widest uppercase cursor-pointer"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => {
                                if (onToggleWatchlist) onToggleWatchlist(savedMovie.id);
                              }}
                              className="px-2 py-1 bg-red-400/10 hover:bg-red-400/20 text-red-100 hover:text-white rounded-lg font-sans text-[8px] font-black tracking-widest uppercase cursor-pointer"
                              title="Delete bookmark"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Screenings and Theater options view */}
      <section className="border-t border-outline-variant/35 pt-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="space-y-2 select-none">
            <h2 className="font-display text-2xl md:text-4xl font-bold text-on-surface">Experience the Magic</h2>
            <p className="font-sans text-xs md:text-sm text-on-surface-variant">
              Select your preferred screening time inside of the premium lounge lists below.
            </p>
          </div>

          {!movie.screenings || movie.screenings.length === 0 ? (
            <div className="flex gap-2 select-none">
              <button
                onClick={() => setSelectedDay('today')}
                className={`px-5 py-2 rounded-full font-sans text-[10px] font-black tracking-widest uppercase transition-colors cursor-pointer ${
                  selectedDay === 'today'
                    ? 'bg-surface-container-high text-on-surface ring-1 ring-white/10'
                    : 'border border-outline-variant text-on-surface-variant hover:text-primary'
                }`}
              >
                TODAY, MAY 29
              </button>
              <button
                onClick={() => setSelectedDay('tomorrow')}
                className={`px-5 py-2 rounded-full font-sans text-[10px] font-black tracking-widest uppercase transition-colors cursor-pointer ${
                  selectedDay === 'tomorrow'
                    ? 'bg-surface-container-high text-on-surface ring-1 ring-white/10'
                    : 'border border-outline-variant text-on-surface-variant hover:text-primary'
                }`}
              >
                TOMORROW, MAY 30
              </button>
            </div>
          ) : (
            <div className="px-4 py-2 bg-gradient-to-r from-yellow-400/5 to-primary/5 border border-white/5 rounded-xl uppercase font-sans text-[9px] font-black tracking-widest text-[#d8c2b5]">
              📅 STUDIO SCHEDULED DIRECT PRESENTS
            </div>
          )}
        </div>

        {/* Screening grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayScreenings.length === 0 ? (
            <div className="col-span-3 py-16 bg-surface-container-high border border-dashed border-white/5 rounded-2xl text-center space-y-2">
              <Clock className="h-8 w-8 text-on-surface-variant mx-auto opacity-40" />
              <p className="font-sans text-[11px] font-black tracking-widest uppercase text-on-surface">NO SCREENINGS AVAILABLE</p>
              <p className="font-sans text-[10px] text-on-surface-variant max-w-xs mx-auto">This newly uploaded film is drafting preview schedules. Contact the studio box office for details.</p>
            </div>
          ) : (
            displayScreenings.map((screening) => {
              // Find matching friends for this screening segment
              const movieFriends = (friends || []).filter(
                (f: any) => f.watchingMovieId === movie.id || f.watchingMovieTitle?.toLowerCase() === movie.title.toLowerCase()
              );
              let attendingFriends = movieFriends;
              if (attendingFriends.length === 0 && friends && friends.length > 0) {
                if (screening.time.includes('21') || screening.time.includes('22')) {
                  attendingFriends = [friends[0]];
                } else if (screening.time.includes('18') || screening.time.includes('19')) {
                  attendingFriends = [friends[1]].filter(Boolean);
                } else {
                  attendingFriends = friends.slice(0, 2);
                }
              }

              return (
                <div
                  key={screening.id}
                  className={`glass-panel p-6 rounded-2xl border border-white/5 transition-all duration-300 relative overflow-hidden group select-none ${
                    screening.isAvailable ? 'hover:border-primary/50' : 'opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                      <h3 className="font-sans font-black text-md text-on-surface">{screening.hallName}</h3>
                      <p className="font-sans text-xs text-on-surface-variant">{screening.features}</p>
                    </div>
                    <Video className="h-5 w-5 text-secondary" />
                  </div>

                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span
                      className={`px-4 py-2.5 rounded-xl font-sans font-black text-md transition-all ${
                        screening.isAvailable
                          ? 'bg-primary-container/30 text-primary border border-primary/20'
                          : 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed opacity-50'
                      }`}
                    >
                      {screening.time}
                    </span>
                    
                    <div className="text-right">
                      <p className="font-sans text-[8px] font-black text-on-surface-variant tracking-widest uppercase">TICKET PRICE</p>
                      <p className="font-mono text-sm font-black text-on-surface">{screening.priceString}</p>
                    </div>
                  </div>

                  {/* Friends attending indicator */}
                  {attendingFriends.length > 0 && (
                    <div className="mb-6 py-2 px-3 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 rounded-xl flex items-center gap-2.5 duration-200">
                      <div className="flex -space-x-1.5 shrink-0">
                        {attendingFriends.map((f: any, fIdx: number) => (
                          <img 
                            key={`f-avatar-${f.id}-${fIdx}`}
                            src={f.avatarUrl} 
                            alt={f.username} 
                            className="w-5 h-5 rounded-full border border-black object-cover"
                            title={`@${f.username} is attending`}
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                      <span className="font-sans text-[9px] text-purple-400 font-extrabold uppercase tracking-wide leading-none">
                        {attendingFriends.length === 1 
                          ? `@${attendingFriends[0].username} is attending` 
                          : `@${attendingFriends[0].username} & ${attendingFriends.length - 1} friend attending`}
                      </span>
                    </div>
                  )}

                  <button
                    disabled={!screening.isAvailable}
                    onClick={() => handleBook(screening)}
                    className={`w-full py-4 rounded-xl font-sans text-[10px] font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                      screening.isAvailable
                        ? 'bg-primary text-on-primary hover:scale-[1.02] active:scale-[0.98] shadow-primary/10 cursor-pointer'
                        : 'bg-surface-container text-on-surface-variant cursor-not-allowed shadow-none'
                    }`}
                  >
                    <span>BOOK MY SEAT</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}

          {/* Social share card prompt */}
          <div className="bg-gradient-to-br from-primary-container/20 to-surface-container-lowest p-6 rounded-2xl border border-primary/20 flex flex-col justify-center items-center text-center gap-4 select-none relative overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-secondary-container/20 border border-secondary-container/25 flex items-center justify-center text-secondary mb-2">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-primary">Better Together</h3>
            <p className="font-sans text-xs text-on-surface-variant px-4 leading-relaxed">
              Experience the screening event with your squad circles. Share a custom deep-link invitation code immediately.
            </p>
            
            <button
              onClick={handleOpenShareDialogue}
              className="mt-2 w-full max-w-[180px] py-2 bg-gradient-to-r from-primary/80 to-secondary/80 hover:from-primary hover:to-secondary text-white font-sans text-[9px] font-black tracking-widest uppercase rounded-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share Invite Link</span>
            </button>
          </div>

          {/* Private Watch Party Creator Card */}
          <div className="bg-gradient-to-br from-[#1b0a25] to-[#120516] p-6 rounded-2xl border border-purple-500/35 flex flex-col justify-center items-center text-center gap-4 select-none relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-2xl rounded-full transition-opacity opacity-0 group-hover:opacity-100" />
            
            <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-2">
              <Lock className="h-5 w-5" />
            </div>

            <span className="font-mono text-[8px] text-purple-400 font-extrabold tracking-widest uppercase bg-purple-500/5 px-2.5 py-1 rounded-full border border-purple-500/10">SQUAD ROOM EXCLUSIVE</span>
            
            <h3 className="font-display font-extrabold text-lg text-primary uppercase">Private Watch Party</h3>
            <p className="font-sans text-xs text-on-surface-variant px-2 leading-relaxed lowercase">
              Launch a synchronized play loop. Only users within your active Couch Squad are authorized to join.
            </p>
            
            <div className="w-full flex flex-col items-center gap-2 mt-2">
              <button
                onClick={() => {
                  if (onCreateWatchParty) {
                    onCreateWatchParty(movie.id, `${movie.title} Private Squad Lounge`);
                  }
                }}
                className="w-full max-w-[200px] py-2.5 bg-gradient-to-r from-purple-500 to-primary text-white font-sans text-[10px] font-black tracking-widest uppercase rounded-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg transition-transform outline-none"
              >
                LAUNCH PARTY ROOM 🚀
              </button>

              <button
                id={`btn-share-party-invite-${movie.id}`}
                onClick={handleOpenShareDialogue}
                className="w-full max-w-[200px] py-2 bg-purple-950/45 hover:bg-purple-950/80 text-purple-300 hover:text-purple-100 font-sans text-[9px] font-black tracking-widest uppercase rounded-xl border border-purple-500/20 hover:border-purple-500/40 cursor-pointer shadow-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-1.5"
                title="Generate watch party room deep link coordinates"
              >
                <Share2 className="h-3 w-3" />
                <span>Share Invitation Loop</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Community Screening Reviews & Premiere Buzz Feed */}
      <section className="mt-12 bg-white/[0.01] border-t border-white/5 pt-12 space-y-8 select-none text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-[#dda75f] font-black tracking-widest uppercase bg-[#dda75f]/10 border border-[#dda75f]/25 px-2.5 py-1 rounded-full">
                Premiere Lobby Feed 🍿
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white uppercase">
              Community Screening Reviews
            </h2>
            <p className="font-sans text-xs text-on-surface-variant max-w-xl lowercase leading-relaxed">
              real reaction logs tie directly to specific screenings, hall sound systems, and movie timestamps. upvote top reviews to issue verified credentials!
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
            <div className="text-center">
              <span className="block font-display text-2xl font-black text-[#dda75f]">
                {getPopcornScore(movie.id, movie.ratingScore).scorePercent}%
              </span>
              <span className="font-sans text-[8px] text-[#dac6a8] font-bold uppercase tracking-wider block">
                POPCORN SCORE
              </span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-left text-xs">
              <span className="text-white font-sans block font-semibold">
                {getMovieReviews(movie.id).length} Reviews
              </span>
              <span className="text-on-surface-variant block leading-none font-sans text-[10px]">
                aggregated from live halls
              </span>
            </div>
          </div>
        </div>

        {/* List of Screening Reviews */}
        <div className="space-y-4 max-w-4xl">
          {(() => {
            const reviews = getMovieReviews(movie.id);
            if (reviews.length === 0) {
              return (
                <div className="text-center py-10 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-6">
                  <span className="block text-2xl mb-2">🎞️</span>
                  <p className="font-sans text-xs text-on-surface-variant leading-relaxed lowercase max-w-sm mx-auto">
                    no active reviews reported for this film yet. launch a theater room or book a seat to write the first post-watch review!
                  </p>
                </div>
              );
            }

            // Sort reviews by upvotes descending, so "Top Reviews" show first!
            const sortedReviews = [...reviews].sort((a,b) => b.upvotes - a.upvotes);

            return (
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                {sortedReviews.map((r) => {
                  const isCritic = r.upvotes >= 3;
                  return (
                    <div 
                      key={r.id}
                      className="bg-[#121212] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all duration-300 flex flex-col justify-between gap-4 shadow-xl"
                    >
                      <div className="space-y-3">
                        {/* Review Header card */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <img 
                              src={r.avatarUrl} 
                              alt={r.username} 
                              className="w-8 h-8 rounded-full border border-white/15 object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="block text-xs font-sans font-bold text-white leading-none">
                                @{r.username}
                              </span>
                              <span className="text-[9px] text-[#b6a090] font-sans block mt-1">
                                {r.timestamp}
                              </span>
                            </div>
                          </div>

                          {/* Critic Badge trigger based on likes */}
                          {isCritic && (
                            <span 
                              className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/35 text-amber-300 font-sans text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full shadow-md animate-pulse"
                              title="Critic badge issued for highly upvoted commentary"
                            >
                              ★ CRITIC BADGE
                            </span>
                          )}
                        </div>

                        {/* Stars Rating and Watch Hall Source */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          <div className="flex select-none">
                            {[1, 2, 3, 4, 5].map((starIdx) => (
                              <Star 
                                key={`review-star-${starIdx}`}
                                className={`h-3 w-3 ${
                                  starIdx <= r.rating 
                                    ? 'fill-amber-400 text-amber-400' 
                                    : 'text-white/10'
                                }`}
                              />
                            ))}
                          </div>

                          {/* Screening specificity display */}
                          <span className="bg-white/5 border border-white/5 text-[#edd7b1] font-sans text-[9px] px-2 py-0.5 rounded-full block tracking-wide">
                            🍿 {r.screeningName || 'Digital Screening'}
                          </span>
                        </div>

                        {/* Written Content of user */}
                        <p className="font-sans text-xs text-on-surface-variant leading-relaxed pt-1.5 border-t border-white/5">
                          "{r.text}"
                        </p>
                      </div>

                      {/* Review footer with interactive moment anchors and upvotes likes counters */}
                      <div className="flex justify-between items-center gap-2 pt-2 border-t border-white/5">
                        {/* Capture exact playhead anchoring timestamp */}
                        {r.movieMoment ? (
                          <span className="font-mono text-[9px] text-primary bg-primary/10 border border-primary/15 px-2 py-0.5 rounded flex items-center gap-1">
                            ⚓ Moment: <span className="text-white font-extrabold">{r.movieMoment}</span>
                          </span>
                        ) : (
                          <span className="text-[8px] font-sans text-on-surface-variant">General impression</span>
                        )}

                        <button 
                          onClick={() => {
                            upvoteReview(r.id, 'cinephile_99');
                            setReviewsUpdated(p => p + 1);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-sans font-black tracking-wider uppercase border transition-all active:scale-95 cursor-pointer ${
                            isCritic 
                              ? 'bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border-amber-500/20'
                              : 'bg-white/5 hover:bg-[#dda75f]/15 hover:text-[#dda75f] text-on-surface hover:border-[#dda75f]/30 border-white/5'
                          }`}
                          title="Like this written review. 3 Likes verifies this reviewer as a Critic!"
                        >
                          <ThumbsUp className="h-2.5 w-2.5 leading-none shrink-0" />
                          <span>{r.upvotes} LIKES</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </section>

      {/* Similar Movies Recommendations Section */}
      {(() => {
        const getSimilarMovies = () => {
          if (!allMovies) return [];
          const currentGenres = movie.genre.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
          const candidates = allMovies.filter(m => m.id !== movie.id);
          const scoredCandidates = candidates.map(m => {
            const candidateGenres = m.genre.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
            const matchCount = currentGenres.filter(g => candidateGenres.includes(g)).length;
            return { m, matchCount };
          });
          scoredCandidates.sort((a, b) => {
            if (b.matchCount !== a.matchCount) {
              return b.matchCount - a.matchCount;
            }
            return b.m.ratingScore - a.m.ratingScore;
          });
          return scoredCandidates.map(item => item.m).slice(0, 4);
        };

        const similarList = getSimilarMovies();
        if (similarList.length === 0) return null;

        return (
          <section className="mt-12 bg-white/[0.01] border-t border-white/5 pt-12 space-y-8 select-none text-left">
            <div className="space-y-1">
              <span className="font-mono text-[9px] text-[#dda75f] font-black tracking-widest uppercase bg-[#dda75f]/10 border border-[#dda75f]/25 px-2.5 py-1 rounded-full">
                Curated Recommendations 🎞️
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white uppercase">
                Similar Movies
              </h2>
              <p className="font-sans text-xs text-on-surface-variant max-w-xl lowercase leading-relaxed">
                explore other cinematic masterpieces under the <span className="text-[#dda75f] font-bold">{movie.genre}</span> genre orbit.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              {similarList.map((similar) => {
                const normalizedGenre = similar.genre.toUpperCase();
                return (
                  <div
                    key={similar.id}
                    onClick={() => {
                      if (onSelectMovie) {
                        onSelectMovie(similar.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="group relative bg-[#0f0a12]/60 border border-white/5 rounded-2xl p-3 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Thumbnail frame with custom zoom on hover */}
                      <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-neutral-950 relative">
                        <img
                          src={similar.imageUrl}
                          alt={similar.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-95 group-hover:brightness-100"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded text-[7px] font-sans font-black text-primary tracking-widest uppercase">
                          {normalizedGenre}
                        </div>
                      </div>

                      {/* Header and rating info */}
                      <div className="space-y-1 px-1">
                        <h4 className="font-display font-black text-xs text-white uppercase tracking-wider group-hover:text-primary transition-colors truncate">
                          {similar.title}
                        </h4>
                        <div className="flex items-center justify-between text-[9px] font-mono text-on-surface-variant">
                          <span>{similar.runtime}</span>
                          <span className="flex items-center gap-0.5 text-[#dda75f] font-bold">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            {similar.ratingScore}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 px-1 border-t border-white/5 mt-3 flex items-center justify-between text-[9px]">
                      <span className="text-secondary font-sans font-semibold truncate max-w-[70%]">
                        {similar.rating} • {similar.format}
                      </span>
                      <span className="text-primary font-black uppercase text-[8px] tracking-wider group-hover:translate-x-0.5 transition-transform">
                        Explore →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}
        </>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in text-left">
          <div className="relative max-w-md w-full bg-[#110b14] border border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(168,85,247,0.25)] overflow-hidden">
            {/* Visual background lights ornament pattern */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />

            <div className="relative z-10 space-y-6">
              {/* Header section with Close handler */}
              <div className="flex justify-between items-center select-none">
                <div className="space-y-0.5">
                  <span className="font-mono text-[8px] text-purple-400 font-extrabold tracking-widest uppercase bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                    🎬 HOST DEEP LINK COUPLER
                  </span>
                  <h3 className="font-display font-black text-lg md:text-xl text-white uppercase tracking-tight">
                    Share Invitation
                  </h3>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1 px-2 text-[10px] uppercase font-mono font-black text-on-surface-variant hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                >
                  ESC ✕
                </button>
              </div>

              {/* Informational description */}
              <p className="font-sans text-xs text-on-surface-variant leading-relaxed lowercase">
                generate an instant synchronization coordinate. send this direct join deep link to external friends so they can log in and enter your live screening room automatically in one click.
              </p>

              {/* Key details area: Movie Title */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-sans text-on-surface-variant uppercase font-bold">TARGET WORK</span>
                  <span className="font-mono text-[#dda75f] font-bold">{movie.genre || 'FEATURE'}</span>
                </div>
                <p className="font-display font-black text-sm text-white uppercase tracking-wide truncate">
                  {movie.title}
                </p>
              </div>

              {/* Room Code box block */}
              <div className="space-y-2">
                <label className="font-sans text-[10px] text-on-surface-variant uppercase font-bold block">
                  Active Room Sync Code
                </label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 bg-neutral-950 px-4 py-3 rounded-xl border border-white/5 font-mono text-xs text-[#dda75f] font-bold tracking-wide select-all truncate">
                    {generatedRoomCode}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedRoomCode);
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2000);
                    }}
                    className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 cursor-pointer transition-colors"
                    title="Copy Room Code Only"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Full Deep Link Box block */}
              <div className="space-y-2">
                <label className="font-sans text-[10px] text-on-surface-variant uppercase font-bold block">
                  Deep Link watch party URL
                </label>
                <div className="bg-neutral-950 p-3.5 rounded-xl border border-white/5 font-mono text-[10px] text-wrap break-all text-on-surface-variant leading-relaxed">
                  {generatedDeepLink}
                </div>
              </div>

              {/* Mega Action Button */}
              <button
                onClick={handleCopyShareLink}
                className={`w-full py-3.5 rounded-xl font-sans text-[10px] font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                  shareCopied
                    ? 'bg-green-500 text-black shadow-green-500/10 hover:bg-green-400'
                    : 'bg-primary text-on-primary shadow-primary/10 hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {shareCopied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>COPIED COORDINATES TO CLIPBOARD!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>COPY INVITATION LINK</span>
                  </>
                )}
              </button>

              {/* Social Channels Row */}
              <div className="space-y-2.5 pt-2 border-t border-white/5">
                <span className="font-mono text-[8.5px] text-zinc-400 font-bold uppercase tracking-wider block">
                  Broadcast Invite to Connected Outlets:
                </span>
                <div className="flex gap-2.5 flex-wrap">
                  {[
                    { key: 'twitter', icon: '🐦', name: 'Twitter/X', color: 'hover:bg-sky-500/20 text-sky-400 border-sky-500/10' },
                    { key: 'facebook', icon: '📘', name: 'Facebook', color: 'hover:bg-blue-600/20 text-blue-400 border-blue-600/10' },
                    { key: 'whatsapp', icon: '💬', name: 'WhatsApp', color: 'hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/10' },
                    { key: 'telegram', icon: '✈️', name: 'Telegram', color: 'hover:bg-blue-400/20 text-blue-300 border-blue-400/10' }
                  ].map((outlet) => (
                    <button
                      key={outlet.key}
                      onClick={() => {
                        const invitationText = `🍿 Lock of the night: Join my direct private watch circle for "${movie.title}" on ROWONE. Code: ${generatedRoomCode}! Direct link:`;
                        triggerSocialWindow(outlet.key, invitationText);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-sans font-bold transition-all duration-200 cursor-pointer border ${outlet.color}`}
                    >
                      <span>{outlet.icon}</span>
                      <span>{outlet.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-center pt-2 select-none">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="font-sans text-[9px] text-purple-400 font-extrabold uppercase tracking-widest hover:text-purple-300 transition-colors cursor-pointer"
                >
                  DISMISS AND COUCH BACK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
