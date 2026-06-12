/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Ticket, 
  Compass, 
  Star, 
  ChevronRight, 
  User, 
  Heart, 
  Clock, 
  PlayCircle, 
  Users, 
  Bookmark, 
  Trash2, 
  Plus, 
  Sparkles, 
  FileText, 
  Calendar,
  Layers,
  Flame,
  Film,
  Share2,
  Send,
  Copy,
  Check
} from 'lucide-react';
import { Movie, BookedTicket } from '../types';
import { AVATAR_LEO, AVATAR_SARAH } from '../data';

interface HistoryViewProps {
  bookedTickets: BookedTicket[];
  onExploreLibrary: () => void;
  onJoinRoom: (movieTitle: string) => void;
  movies?: Movie[];
  watchlistIds?: string[];
  onToggleWatchlist?: (movieId: string) => void;
  onClearWatchlist?: () => void;
  libraryItems?: any[];
  onLogWatchedMovie?: (movieId: string, date: string, rating: number, review: string) => void;
  onRemoveFromLibrary?: (libId: string) => void;
  onStartRewatchParty?: (movie: Movie) => void;
  unlockedBadges?: string[];
  recentRooms?: any[];
  isLoggedIn?: boolean;
  username?: string;
  userAvatarUrl?: string;
  isPopcornPass?: boolean;
  onAwardBadge?: (badgeName: string) => void;
  favoriteChips?: string[];
  onUpdateFavoriteChips?: (chips: string[]) => void;
}

export default function HistoryView({ 
  bookedTickets = [], 
  onExploreLibrary, 
  onJoinRoom,
  movies = [],
  watchlistIds = [],
  onToggleWatchlist,
  onClearWatchlist,
  libraryItems = [],
  onLogWatchedMovie,
  onRemoveFromLibrary,
  onStartRewatchParty,
  unlockedBadges = [],
  recentRooms = [],
  isLoggedIn = false,
  username = '',
  userAvatarUrl = '',
  isPopcornPass = false,
  onAwardBadge,
  favoriteChips,
  onUpdateFavoriteChips,
}: HistoryViewProps) {
  const userUploadedMoviesCount = movies ? movies.filter(m => m.isUserUploaded).length : 0;
  const isVerifiedFilmmaker = userUploadedMoviesCount > 5;

  const [premiereAttendanceCount, setPremiereAttendanceCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('rowone-premiere-attendance-count');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [lobbyTimeSpentSeconds, setLobbyTimeSpentSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('rowone-lobby-time-spent-seconds');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Share system states
  const [selectedShareBadge, setSelectedShareBadge] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [hasBroadcasted, setHasBroadcasted] = useState(false);
  const [simulatedMessages, setSimulatedMessages] = useState<Array<{ id: string; username: string; text: string; time: string; avatar: string }>>([]);

  const handleOpenShareModal = (badgeName: string) => {
    setSelectedShareBadge(badgeName);
    setCopiedShareLink(false);
    setHasBroadcasted(false);
    setSimulatedMessages([]);
  };

  const handleBroadcastToFeed = () => {
    setHasBroadcasted(true);
    const userMsg = {
      id: `bc-user-${Date.now()}`,
      username: username || 'cinephile_guest',
      text: `🏆 UNLOCKED MILESTONE: Just received the elite "${selectedShareBadge}" credentials at ROWONE cinema club! Join me in the upcoming screening lobbies! 🍿🎬`,
      time: 'Just now',
      avatar: userAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
    };
    
    setSimulatedMessages([userMsg]);

    const simulatedFollowUps = [
      {
        username: 'retro_screener',
        text: `whaaat?! no way, @${username || 'user'} is an absolute legend! 🔥 Congrats on the badge!`,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
      },
      {
        username: 'sarah_foyer',
        text: 'wow!!! this is fantastic. how many hours did you accumulate in the pre-show lounge? 🎖️🍿',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
      },
      {
        username: 'neon_vance',
        text: 'Vanguard spectator achievements are highly competitive. Respect! 🚀🎬',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150'
      }
    ];

    simulatedFollowUps.forEach((follow, index) => {
      setTimeout(() => {
        setSimulatedMessages(prev => [
          ...prev,
          {
            id: `bc-sim-${index}-${Date.now()}`,
            username: follow.username,
            text: follow.text,
            time: 'Just now',
            avatar: follow.avatar
          }
        ]);
      }, (index + 1) * 1100);
    });
  };

  const handleCopyShareLink = () => {
    const shareText = `🏆 Check out my cinematic achievement milestone: "${selectedShareBadge}" unlocked on ROWONE! 🎬🍿 join the ultimate moviegoers arena: ${window.location.origin}`;
    navigator.clipboard.writeText(shareText);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2000);
  };

  // Track achievements and auto-trigger on target limits
  React.useEffect(() => {
    try {
      localStorage.setItem('rowone-premiere-attendance-count', String(premiereAttendanceCount));
    } catch {}

    if (premiereAttendanceCount >= 5 && onAwardBadge) {
      onAwardBadge('Vanguard Spectator 🎬');
    }
  }, [premiereAttendanceCount, onAwardBadge]);

  React.useEffect(() => {
    try {
      localStorage.setItem('rowone-lobby-time-spent-seconds', String(lobbyTimeSpentSeconds));
    } catch {}

    if (lobbyTimeSpentSeconds >= 10800 && onAwardBadge) {
      onAwardBadge('Lobby Legend 🕰️');
    }
  }, [lobbyTimeSpentSeconds, onAwardBadge]);

  const [activeSubTab, setActiveSubTab] = useState<'tickets' | 'watchlist' | 'library' | 'wrapped'>('tickets');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [localFavoriteChips, setLocalFavoriteChips] = useState<string[]>([
    'CYBERPUNK',
    'PSYCHOLOGICAL',
    'NOSTALGIC CLASSICS',
    '4K ULTRA'
  ]);
  const activeChips = favoriteChips !== undefined ? favoriteChips : localFavoriteChips;
  const updateChips = (newChips: string[]) => {
    if (onUpdateFavoriteChips) {
      onUpdateFavoriteChips(newChips);
    } else {
      setLocalFavoriteChips(newChips);
    }
  };
  const [newChipVal, setNewChipVal] = useState('');
  
  // State for manual film logger
  const [showLogForm, setShowLogForm] = useState(false);
  const [selectedLogMovieId, setSelectedLogMovieId] = useState(movies[0]?.id || '');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logRating, setLogRating] = useState(5);
  const [logReview, setLogReview] = useState('');

  const handleAddChip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChipVal.trim()) return;
    const addedValue = newChipVal.trim().toUpperCase();
    if (!activeChips.includes(addedValue)) {
      updateChips([...activeChips, addedValue]);
    }
    setNewChipVal('');
  };

  const handleManualFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogMovieId) return;
    if (onLogWatchedMovie) {
      onLogWatchedMovie(selectedLogMovieId, logDate, logRating, logReview);
    }
    // Reset
    setLogReview('');
    setShowLogForm(false);
  };

  const friendsActivity = [
    {
      name: 'Leo Thorne',
      status: 'Active Now',
      watching: 'NEON ECHOES',
      avatarUrl: AVATAR_LEO,
      isLiveJoinable: true
    },
    {
      name: 'Sarah Wood',
      status: 'Watched 2h ago',
      watching: 'THE LAST REEL',
      avatarUrl: AVATAR_SARAH,
      isLiveJoinable: false
    }
  ];

  // Map watchlisted movie ids to full movie metadata
  const watchlistedMovies = movies.filter(m => watchlistIds.includes(m.id));

  // --- WRAPPED STATS CALCULATION ---
  const totalWatched = libraryItems.length;
  
  // Favourite Genre
  const genreCounts: { [key: string]: number } = {};
  libraryItems.forEach((item) => {
    const rawGenre = item.genre || 'SCI-FI';
    const g = rawGenre.toUpperCase();
    genreCounts[g] = (genreCounts[g] || 0) + 1;
  });
  let favoriteGenre = 'SCI-FI';
  let maxGenreCount = 0;
  Object.keys(genreCounts).forEach((g) => {
    if (genreCounts[g] > maxGenreCount) {
      maxGenreCount = genreCounts[g];
      favoriteGenre = g;
    }
  });

  // Active Month
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthCounts: { [key: string]: number } = {};
  libraryItems.forEach((item) => {
    if (item.dateWatched) {
      const monthIdx = new Date(item.dateWatched).getMonth();
      const mName = monthNames[monthIdx];
      monthCounts[mName] = (monthCounts[mName] || 0) + 1;
    }
  });
  let mostActiveMonth = 'May';
  let maxMonthCount = 0;
  Object.keys(monthCounts).forEach((m) => {
    if (monthCounts[m] > maxMonthCount) {
      maxMonthCount = monthCounts[m];
      mostActiveMonth = m;
    }
  });

  // Top Comment text
  let topComment = "“Every pixel screams atmosphere. This cinematic simulation feels completely authentic!”";
  const commentsRanked = [...libraryItems].sort((a, b) => (b.reviewText || '').length - (a.reviewText || '').length);
  const bestLog = commentsRanked.find(item => item.reviewText && item.reviewText.trim().length > 6);
  if (bestLog) {
    topComment = `“${bestLog.reviewText}”`;
  }

  // Derived persona title based on favorite genre
  const getPersonaTitle = (genre: string) => {
    switch (genre.toUpperCase()) {
      case 'THRILLER': return 'The Suspense Scholar';
      case 'CLASSIC': return 'The Film Archivist';
      case 'SCI-FI': return 'The Cyber Space Cadet';
      case 'DOCUMENTARY': return 'The Realist Thinker';
      case 'ANIMATED': return 'The Dream World Curator';
      default: return 'The Cinephile Wanderer';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-2 md:px-4">
      
      {/* Premium Profile Banner Header */}
      <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 bg-gradient-to-r from-primary-container/20 to-surface-container-low flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative select-none">
        <div className="absolute inset-y-0 right-0 w-96 bg-primary/5 rounded-full blur-[90px] opacity-100 pointer-events-none"></div>

        <div className="flex items-center gap-4 relative z-10">
          {userAvatarUrl ? (
            <div className={`h-16 w-16 md:h-20 md:w-20 rounded-full overflow-hidden flex items-center justify-center border-2 ${
              isPopcornPass 
                ? 'border-yellow-400 ring-4 ring-yellow-400/20 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                : 'border-primary/40 ring-2 ring-primary/10'
            } shadow-xl shadow-primary/20 shrink-0`}>
              <img src={userAvatarUrl} className="h-full w-full object-cover" alt="User Profile" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-tr from-secondary-container to-primary flex items-center justify-center text-on-primary font-display font-black text-2xl shadow-xl shadow-primary/20 shrink-0">
              {username ? username.charAt(0).toUpperCase() : 'UC'}
            </div>
          )}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-on-surface">
                {isLoggedIn && username ? `@${username}` : 'Universal Cinephile'}
              </h2>
              {isPopcornPass ? (
                <span className="bg-yellow-400 text-black px-2.5 py-0.5 rounded-full font-sans text-[8px] font-black tracking-widest uppercase shadow-md border border-neutral-900">
                  👑 PREMIUM PASS
                </span>
              ) : (
                <span className="bg-primary/20 border border-primary/40 px-2.5 py-0.5 rounded-full text-primary font-sans text-[8px] font-black tracking-widest uppercase">
                  FREE MEMBER
                </span>
              )}
              {isVerifiedFilmmaker && (
                <span className="bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-emerald-400 font-sans text-[8.5px] font-black tracking-widest uppercase flex items-center gap-1 shadow-sm font-bold">
                  🎬 VERIFIED FILMMAKER
                </span>
              )}
            </div>
            <p className="font-sans text-xs text-on-surface-variant">
              Account ID: POP-{isLoggedIn && username ? username.toUpperCase().charCodeAt(0) * 8535 : '847291'} • Member since May 2024
            </p>
          </div>
        </div>

        <div className="flex gap-8 relative z-10">
          <div className="text-center">
            <span className="font-sans text-[9px] font-black tracking-widest text-[#d8c3c1] uppercase block">Bookings</span>
            <span className="font-display text-2xl md:text-3xl font-bold text-primary leading-normal">{bookedTickets.length}</span>
          </div>
          <div className="h-10 w-px bg-outline-variant/30 align-middle self-center"></div>
          <div className="text-center">
            <span className="font-sans text-[9px] font-black tracking-widest text-[#d8c3c1] uppercase block">Watched</span>
            <span className="font-display text-2xl md:text-3xl font-bold text-primary leading-normal">{totalWatched}</span>
          </div>
          <div className="h-10 w-px bg-outline-variant/30 align-middle self-center"></div>
          <div className="text-center">
            <span className="font-sans text-[9px] font-black tracking-widest text-[#d8c3c1] uppercase block">Watchlist</span>
            <span className="font-display text-2xl md:text-3xl font-bold text-primary leading-normal">{watchlistIds.length}</span>
          </div>
        </div>
      </section>

      {/* 🏆 DIGITAL PREMIERE BADGES SHELF CONTAINER */}
      <section className="bg-gradient-to-r from-amber-500/10 via-yellow-400/5 to-transparent border border-yellow-500/15 p-5 md:p-6 rounded-3xl select-none relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1 text-left relative z-10 max-w-md">
          <span className="font-mono text-[8px] text-yellow-400 font-bold tracking-widest uppercase bg-yellow-400/10 border border-yellow-500/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 leading-normal">
            <Sparkles className="w-2.5 h-2.5 text-yellow-500 animate-spin-slow" />
            COMMEMORATIVE PREMIERE CREDENTIALS CABINET
          </span>
          <h4 className="font-serif text-lg font-bold text-white uppercase tracking-tight">Digital Achievements Shelf</h4>
          <p className="font-sans text-[10px] text-[#dac6a8] leading-relaxed max-w-sm">
            special limited edition credentials awarded by studios for watching exclusive events and joining opening night live screenings.
          </p>
        </div>

        {/* The Badge shelf alignment */}
        <div className="flex flex-wrap gap-4 relative z-10">
          {unlockedBadges.length === 0 ? (
            <p className="font-sans text-[10px] text-on-surface-variant font-bold uppercase tracking-widest py-2">
              No badges unlocked yet. Join an opening night premiere!
            </p>
          ) : (
            unlockedBadges.map((badge, index) => (
              <motion.div 
                key={`badge-card-${index}`}
                whileHover="hover"
                initial="initial"
                animate={{ scale: 1, y: 0 }}
                variants={{
                  hover: {
                    scale: 1.04,
                    y: -4,
                    borderColor: 'rgba(234, 179, 8, 0.9)',
                    boxShadow: '0 10px 25px -5px rgba(234, 179, 8, 0.25), 0 8px 10px -6px rgba(234, 179, 8, 0.2)'
                  }
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="bg-[#18120d] border-2 border-yellow-500/30 rounded-2xl p-3 flex gap-2.5 items-center shadow-lg relative overflow-hidden group min-w-[210px] cursor-pointer"
              >
                {/* Visual Gold Crest Aura */}
                <div className="absolute top-0 right-0 w-12 h-12 bg-yellow-400/5 blur-xl group-hover:bg-yellow-400/10" />
                
                <motion.div 
                  variants={{
                    hover: { rotate: [0, -10, 10, -10, 10, 0], scale: 1.1 }
                  }}
                  transition={{ duration: 0.55, ease: 'easeInOut' }}
                  className="h-10 w-10 shrink-0 bg-gradient-to-tr from-yellow-500 via-amber-500 to-yellow-400 rounded-full flex items-center justify-center text-black shadow-md border border-yellow-400 font-serif font-black"
                >
                  🏆
                </motion.div>
                <div className="text-left">
                  <span className="font-sans font-black text-[9px] text-yellow-400 block tracking-wide uppercase">OFFICIAL GUESTPASS</span>
                  <span className="font-display font-semibold text-[10.5px] text-[#edeae8] block mt-0.5 truncate max-w-[105px]">{badge}</span>
                </div>
                {/* Share Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenShareModal(badge);
                  }}
                  className="ml-auto p-1.5 rounded-xl bg-yellow-400/10 hover:bg-yellow-400 text-yellow-500 hover:text-black border border-yellow-400/20 hover:border-yellow-400 cursor-pointer shadow-sm active:scale-95 transition-all duration-200 shrink-0 z-10"
                  title="Share achievement milestone"
                >
                  <Share2 className="h-3 w-3" />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* 🏅 CINEMATIC ACHIEVEMENTS TRACKER */}
      <section className="bg-[#0b070d]/90 border border-white/5 hover:border-[#dda75f]/30 rounded-3xl p-5 md:p-6 select-none relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-36 h-36 bg-primary/5 blur-3xl rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-[#dda75f]/5 blur-2xl rounded-full" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-stretch gap-6">
          {/* Header Description Left */}
          <div className="lg:w-1/3 flex flex-col justify-between">
            <div className="space-y-2 text-left">
              <span className="font-mono text-[8px] text-[#dda75f] font-bold tracking-widest uppercase bg-[#dda75f]/10 border border-[#dda75f]/35 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 leading-normal">
                🔥 SPECIAL LIVE OBJECTIVES
              </span>
              <h4 className="font-display font-black text-lg text-white uppercase tracking-tight">Cinematic Achievement System</h4>
              <p className="font-sans text-[10.5px] text-on-surface-variant leading-relaxed lowercase">
                unlock profile-tier limited edition digital badges by completing high fidelity audience achievements.
              </p>
            </div>
            
            {/* Legend / Info footer for QA & Reviewers to test quickly */}
            <div className="pt-4 border-t border-white/5 mt-4 text-left">
              <span className="font-mono text-[8px] text-on-surface-variant font-bold uppercase tracking-wider block">🛠️ System Control Panel</span>
              <p className="text-[9.5px] text-[#dac6a8] leading-normal font-sans mt-0.5">
                Use the quick time-travel fast forward tools to simulate criteria and test badge delivery instant updates.
              </p>
            </div>
          </div>

          <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Achievement 1: Premiere Vanguard */}
            {(() => {
              const isUnlocked = premiereAttendanceCount >= 5;
              const progressPct = Math.min(100, (premiereAttendanceCount / 5) * 100);
              return (
                <div className={`border p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all duration-300 ${
                  isUnlocked 
                    ? 'bg-[#121c17]/65 border-emerald-500/25 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.06)]' 
                    : 'bg-surface-container-low border-white/5 text-on-surface'
                }`}>
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between items-center">
                      <span className={`font-mono text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${
                        isUnlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-on-surface-variant'
                      }`}>
                        {isUnlocked ? '✅ UNLOCKED' : '🔒 ACTIVE GOAL'}
                      </span>
                      <span className="font-mono text-[9px] text-[#dda75f] font-bold">{premiereAttendanceCount} / 5</span>
                    </div>
                    <h5 className="font-display font-bold text-xs uppercase tracking-wide text-white">Vanguard Spectator</h5>
                    <p className="font-sans text-[10px] text-on-surface-variant leading-relaxed lowercase">
                      Participate in 5+ limited digital premiere events or launch live sync opening-night screens.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {/* Progress Track */}
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${isUnlocked ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-[#dda75f]'}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between gap-2.5">
                      {isUnlocked ? (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold tracking-tight">
                            <span>🎖️ Badge Earned:</span>
                            <span className="text-[#edeae8] font-semibold">Vanguard Spectator 🎬</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenShareModal('Vanguard Spectator 🎬')}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 hover:text-black border border-emerald-500/20 text-emerald-450 font-mono text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                          >
                            <Share2 className="h-2.5 w-2.5" />
                            <span>Share</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[9.5px] text-on-surface-variant font-sans lowercase">Join 5 premieres to claim.</span>
                      )}
                      
                      {/* Simulation Button */}
                      {!isUnlocked && (
                        <button
                          onClick={() => setPremiereAttendanceCount(prev => Math.min(5, prev + 1))}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 transition-all font-mono text-[8px] font-bold uppercase tracking-wider text-[#dda75f] cursor-pointer shrink-0"
                          title="Simulate entering +1 premiere room/view"
                        >
                          +1 Premiere
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Achievement 2: Lobby Legend */}
            {(() => {
              const isUnlocked = lobbyTimeSpentSeconds >= 10800; // 3 hours = 10800 seconds
              const progressPct = Math.min(100, (lobbyTimeSpentSeconds / 10800) * 100);
              const hoursPlayed = (lobbyTimeSpentSeconds / 3600).toFixed(1);
              return (
                <div className={`border p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all duration-300 ${
                  isUnlocked 
                    ? 'bg-[#1c1813]/65 border-yellow-500/25 text-yellow-100 shadow-[0_0_15px_rgba(234,179,8,0.06)]' 
                    : 'bg-surface-container-low border-white/5 text-on-surface'
                }`}>
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between items-center">
                      <span className={`font-mono text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded ${
                        isUnlocked ? 'bg-yellow-500/25 text-yellow-400' : 'bg-white/5 text-on-surface-variant'
                      }`}>
                        {isUnlocked ? '✅ UNLOCKED' : '🔒 ACTIVE GOAL'}
                      </span>
                      <span className="font-mono text-[9px] text-[#dda75f] font-bold">{hoursPlayed} / 3.0 hrs</span>
                    </div>
                    <h5 className="font-display font-bold text-xs uppercase tracking-wide text-white">Lobby Legend</h5>
                    <p className="font-sans text-[10px] text-on-surface-variant leading-relaxed lowercase">
                      Stay in communal virtual lobbies, watch-parties, or live countdown lounges for over 3 hours.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {/* Progress Track */}
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${isUnlocked ? 'bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'bg-[#dda75f]'}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between gap-2.5">
                      {isUnlocked ? (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1 text-[9px] text-yellow-400 font-bold tracking-tight">
                            <span>🎖️ Badge Earned:</span>
                            <span className="text-[#edeae8] font-semibold">Lobby Legend 🕰️</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenShareModal('Lobby Legend 🕰️')}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500 hover:text-black border border-yellow-500/20 text-[#dda75f] font-mono text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                          >
                            <Share2 className="h-2.5 w-2.5" />
                            <span>Share</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[9.5px] text-on-surface-variant font-sans lowercase font-normal">Accumulate 3 hours to claim.</span>
                      )}
                      
                      {/* Simulation Button */}
                      {!isUnlocked && (
                        <button
                          onClick={() => setLobbyTimeSpentSeconds(prev => Math.min(10800, prev + 3600))}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 transition-all font-mono text-[8px] font-bold uppercase tracking-wider text-[#dda75f] cursor-pointer shrink-0"
                          title="Simulate staying in lobby room for +1 hour"
                        >
                          +1 Hr Lobby Stay
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Sub-Tabs Selector */}
      <div className="flex border-b border-white/5 pb-px gap-2 sm:gap-4 overflow-x-auto scrollbar-none">
        {[
          { id: 'tickets', label: '🎟️ Activity & Tickets' },
          { id: 'watchlist', label: `📌 My Watchlist (${watchlistIds.length})` },
          { id: 'library', label: `🎬 Watched Library (${totalWatched})` },
          { id: 'wrapped', label: '✨ Spotlight Wrapped' }
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-profile-${tab.id}`}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`py-3 px-4 text-xs font-sans font-black tracking-widest uppercase transition-all shrink-0 border-b-2 hover:text-white cursor-pointer ${
              activeSubTab === tab.id
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-on-surface-variant'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* RENDER ACTIVE TAB */}

      {activeSubTab === 'tickets' && (
        <div className="space-y-12">
          {/* Recent Rooms Component Subsection */}
          <section className="space-y-4">
            <div className="flex justify-between items-center select-none">
              <h3 className="font-display text-lg md:text-xl font-bold text-on-surface flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-primary" />
                <span>Recent Joined Cinema Rooms</span>
              </h3>
              <span className="font-sans text-[8px] sm:text-[9.5px] text-[#dda75f] font-black tracking-widest uppercase bg-[#dda75f]/15 border border-[#dda75f]/25 px-2.5 py-1 rounded-full animate-pulse">
                🟢 Live Loop Sync
              </span>
            </div>

            {recentRooms.length === 0 ? (
              <div className="bg-surface-container/20 rounded-2xl p-8 text-center border border-dashed border-outline-variant/30 max-w-lg mx-auto">
                <p className="font-sans text-xs text-on-surface-variant font-bold uppercase tracking-widest">
                  No recently visited cinema rooms found
                </p>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 select-none">
                {recentRooms.map((room) => (
                  <div
                    key={room.id}
                    className="min-w-[270px] sm:min-w-[300px] max-w-[320px] bg-[#121212]/90 hover:bg-[#181818]/90 rounded-2xl overflow-hidden border border-white/5 shadow-xl flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1 hover:border-primary/20"
                  >
                    {/* Image Header with live marker overlay */}
                    <div className="h-28 bg-black relative overflow-hidden shrink-0">
                      <img
                        src={room.imageUrl}
                        alt={room.movieTitle}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent p-3 pt-5 flex justify-between items-end">
                        <span className="font-sans text-[8px] font-black tracking-widest text-[#dda75f] bg-[#dda75f]/10 border border-[#dda75f]/25 px-2 py-0.5 rounded uppercase">
                          {room.genre}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[8.5px] text-green-400 font-extrabold bg-black/85 px-2 py-0.5 rounded border border-green-500/20">
                          <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                          <span>{room.activeViewers} ONLINE</span>
                        </span>
                      </div>
                    </div>

                    {/* Metadata specs & instant rejoin */}
                    <div className="p-4 flex-grow flex flex-col justify-between space-y-3.5">
                      <div className="text-left space-y-0.5 min-w-0">
                        <h4 className="font-display font-black text-xs md:text-sm text-[#f5f2eb] uppercase leading-tight truncate">
                          {room.movieTitle}
                        </h4>
                        <p className="font-sans text-[9px] text-on-surface-variant leading-none truncate lowercase">
                          active lounge: <strong className="text-[#dac6a8] font-bold">{room.roomName}</strong>
                        </p>
                      </div>

                      <button
                        onClick={() => onJoinRoom(room.movieTitle)}
                        className="w-full py-2 bg-primary hover:bg-primary-container text-on-primary hover:text-primary font-sans text-[8.5px] font-black tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer rounded-xl font-black shadow-md shadow-primary/5 active:scale-95"
                      >
                        <PlayCircle className="h-3 w-3" />
                        <span>Rejoin Room Sync</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active Cinema Bookings */}
          <section className="space-y-6">
            <h3 className="font-display text-xl md:text-2xl font-bold text-on-surface select-none">
              Active Virtual Tickets
            </h3>

            {bookedTickets.length === 0 ? (
              <div className="bg-surface-container rounded-2xl p-12 text-center border border-dashed border-outline-variant/40 max-w-lg mx-auto flex flex-col justify-center items-center gap-4 select-none">
                <Ticket className="h-10 w-10 text-outline-variant mb-2" />
                <p className="font-sans text-xs text-on-surface-variant font-bold uppercase tracking-widest">
                  No tickets booked yet for tonight
                </p>
                <button
                  onClick={onExploreLibrary}
                  className="px-6 py-3 bg-primary text-on-primary font-sans text-[10px] font-black tracking-widest uppercase rounded-xl hover:scale-105 active:scale-95 duration-250 transition-transform cursor-pointer shadow-lg shadow-primary/10"
                >
                  Browse Rooms
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bookedTickets.map((ticket) => {
                  return (
                    <div
                      key={ticket.id}
                      className="bg-surface-container-high hover:bg-surface-container rounded-2xl overflow-hidden border border-white/5 shadow-xl flex select-none relative group"
                    >
                      {/* Poster background thumbnail */}
                      <div className="w-28 sm:w-36 overflow-hidden flex-shrink-0 bg-black relative">
                        <img
                          src={ticket.imageUrl}
                          alt={ticket.movieTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface-container-high/95"></div>
                      </div>

                      {/* Details specs */}
                      <div className="p-5 flex-1 flex flex-col justify-between relative pl-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="font-sans text-[9px] font-black tracking-widest text-[#e8bfa1] bg-secondary-container/20 border border-secondary-container/35 px-2 py-0.5 rounded uppercase font-bold">
                              STUDIO PASS
                            </span>
                            <span className="font-mono text-[9px] text-on-surface-variant">#{ticket.id}</span>
                          </div>

                          <h4 className="font-display font-black text-sm sm:text-md text-on-surface uppercase leading-tight truncate">
                            {ticket.movieTitle}
                          </h4>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] sm:text-xs">
                            <p className="font-sans text-[#ccc] leading-normal truncate">
                              Time: <strong className="text-on-surface">{ticket.time}</strong>
                            </p>
                            <p className="font-sans text-[#ccc] leading-normal truncate">
                              Seat: <strong className="text-on-surface">{ticket.seat}</strong>
                            </p>
                            <p className="font-sans text-[#ccc] leading-normal truncate col-span-2">
                              Lounge: <strong className="text-on-surface">{ticket.hall}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex gap-2">
                          <button
                            onClick={() => onJoinRoom(ticket.movieTitle)}
                            className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary hover:text-primary font-sans text-[9px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                            <span>ENTER LOUNGE</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Social connections & tags */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 bg-surface-container-low rounded-2xl border border-white/5 p-6 space-y-6 select-none flex flex-col">
              <h3 className="font-display font-bold text-lg text-on-surface flex items-center gap-2.5 text-primary">
                <Users className="h-5 w-5" />
                <span>Group Watch & Friends</span>
              </h3>

              <div className="space-y-4">
                {friendsActivity.map((friend, i) => {
                  return (
                    <div key={i} className="flex gap-4 items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
                      <div className="flex gap-3 items-center">
                        <div className="relative h-10 w-10 rounded-full border border-white/5 overflow-hidden">
                          <img
                            src={friend.avatarUrl}
                            alt={friend.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-sans font-black text-xs md:text-sm text-on-surface leading-normal">
                            {friend.name}
                          </p>
                          <p className="font-sans text-[10px] text-on-surface-variant flex items-center gap-1.5 font-bold">
                            {friend.isLiveJoinable && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
                            <span>{friend.status} • Watching {friend.watching}</span>
                          </p>
                        </div>
                      </div>

                      {friend.isLiveJoinable && (
                        <button
                          onClick={() => onJoinRoom(friend.watching)}
                          className="px-3.5 py-2 bg-primary/15 border border-primary/30 text-primary text-[9px] font-black tracking-widest uppercase rounded-lg hover:bg-primary hover:text-on-primary transition-all active:scale-95 cursor-pointer font-black"
                        >
                          JOIN ROOM
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-6 bg-surface-container-low rounded-2xl border border-white/5 p-6 space-y-6 select-none">
              <h3 className="font-display font-bold text-lg text-on-surface flex items-center gap-2 text-primary">
                <Heart className="h-4.5 w-4.5" />
                <span>Curations Favorited</span>
              </h3>

              <div className="flex flex-wrap gap-2">
                {activeChips.map((chip) => {
                  return (
                    <div
                      key={chip}
                      className="px-3.5 py-1.5 bg-surface-container border border-[#3e3c3c]/50 rounded-full text-[9px] font-sans font-black tracking-widest text-[#ffbe71] uppercase flex items-center gap-2 group cursor-default"
                    >
                      <span>{chip}</span>
                      <button 
                        onClick={() => updateChips(activeChips.filter((c) => c !== chip))}
                        className="hover:text-red-400 text-on-surface-variant text-[11px] font-bold"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleAddChip} className="flex gap-2">
                <input
                  type="text"
                  placeholder="ADD CUSTOM VALUE"
                  value={newChipVal}
                  onChange={(e) => setNewChipVal(e.target.value)}
                  className="bg-surface-container border border-white/5 rounded-xl px-4 py-2 text-xs text-on-surface focus:outline-none focus:border-primary shrink w-full uppercase placeholder:text-surface-variant"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-on-primary font-sans text-[10px] font-black tracking-widest uppercase rounded-r rounded-xl hover:scale-105 duration-200 transition-transform cursor-pointer"
                >
                  ADD
                </button>
              </form>
            </div>
          </section>
        </div>
      )}

      {activeSubTab === 'watchlist' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center select-none">
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-on-surface">Watchlist</h3>
              <p className="font-sans text-xs text-on-surface-variant">Your upcoming screenings checklist. Click scheduled sessions to book tickets.</p>
            </div>
            <div className="flex gap-2">
              {watchlistedMovies.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/15 hover:border-red-500/30 font-sans text-[10px] font-black tracking-widest uppercase rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear All</span>
                </button>
              )}
              <button
                onClick={onExploreLibrary}
                className="flex items-center gap-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 font-sans text-[10px] font-black tracking-widest uppercase transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Explore More</span>
              </button>
            </div>
          </div>

          {/* Confirmation Modal for Clearing Watchlist */}
          <AnimatePresence>
            {showClearConfirm && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[150] p-4 select-none font-sans overflow-hidden">
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
                      Are you absolutely sure you want to remove all <span className="text-primary font-bold">{watchlistIds.length}</span> saved movies from your watchlist? This action cannot be undone.
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

          {watchlistedMovies.length === 0 ? (
            <div className="bg-surface-container rounded-2xl p-12 text-center border border-dashed border-outline-variant/40 max-w-lg mx-auto flex flex-col justify-center items-center gap-4 select-none">
              <Bookmark className="h-10 w-10 text-outline-variant mb-2" />
              <p className="font-sans text-xs text-on-surface-variant font-bold uppercase tracking-widest">
                Your Watchlist is empty
              </p>
              <p className="font-sans text-xs text-on-surface-variant max-w-xs leading-relaxed">
                Click the Bookmark icon on show flyers, posters, or detail screens across the app to pin upcoming releases. We will notify you dynamic screening times.
              </p>
              <button
                onClick={onExploreLibrary}
                className="px-6 py-3 bg-primary text-on-primary font-sans text-[10px] font-black tracking-widest uppercase rounded-xl hover:scale-105 active:scale-95 duration-250 transition-transform cursor-pointer"
              >
                Browse Rooms
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {watchlistedMovies.map((movie) => {
                // Determine if this movie has a scheduled session
                const sessions = movie.screenings || [];
                const isScheduled = sessions.length > 0;

                return (
                  <div 
                    key={movie.id} 
                    className="bg-surface-container-high rounded-xl overflow-hidden border border-white/5 shadow-lg relative flex flex-col justify-between group"
                  >
                    {/* Poster section with Badge alerts */}
                    <div className="aspect-[5/7] relative overflow-hidden bg-black">
                      <img 
                        src={movie.imageUrl} 
                        alt={movie.title} 
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Active Scheduled Showcase alert block */}
                      {isScheduled ? (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-950/95 via-emerald-950/85 to-transparent p-2 text-center border-t border-emerald-500/25">
                          <p className="font-sans text-[8px] text-emerald-400 font-extrabold uppercase tracking-widest flex items-center justify-center gap-1 animate-pulse">
                            <Flame className="h-2.5 w-2.5 fill-current" />
                            <span>Scheduled! (${movie.screenings && movie.screenings[0] ? `$${movie.screenings[0].ticketPrice}` : '$12.50'})</span>
                          </p>
                        </div>
                      ) : (
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-xs p-1.5 text-center">
                          <p className="font-sans text-[8px] text-zinc-400 font-medium lowercase tracking-wide">
                            {movie.startsIn || 'Coming soon'}
                          </p>
                        </div>
                      )}

                      {/* Remove Bookmark trigger in top right corner */}
                      {onToggleWatchlist && (
                        <button
                          id={`wl-rem-tag-${movie.id}`}
                          onClick={() => onToggleWatchlist(movie.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-full z-10 bg-black/50 hover:bg-red-950 hover:text-red-400 border border-white/5 text-white transition-all duration-300"
                          title="Remove from watchlist"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h4 className="font-display font-black text-[11px] text-[#ecd8b9] uppercase leading-tight truncate">
                          {movie.title}
                        </h4>
                        <p className="font-sans text-[9px] text-[#af9c7f] tracking-widest uppercase font-bold">{movie.genre}</p>
                      </div>

                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        {isScheduled ? (
                          <div className="space-y-1">
                            <p className="font-mono text-[8.5px] text-[#dac6a8] leading-relaxed truncate">
                              🕒 {sessions[0].date} at {sessions[0].time}
                            </p>
                            <button
                              onClick={() => {
                                // Simulate detailed navigation and trigger pop-up
                                onExploreLibrary();
                              }}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-[8px] font-black tracking-widest uppercase rounded cursor-pointer transition-all"
                            >
                              BOOK SESSION PASS
                            </button>
                          </div>
                        ) : (
                          <div className="text-center py-1">
                            <span className="font-sans text-[8px] text-zinc-400 lowercase italic">Awaiting scheduler logs</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'library' && (
        <div className="space-y-8 animate-fade-in select-none">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-on-surface">My Watched Library</h3>
              <p className="font-sans text-xs text-on-surface-variant">A collection of your previously watched cinema screenings. Spin up synced Rewatch Parties at any moment!</p>
            </div>
            
            <button
              onClick={() => setShowLogForm(!showLogForm)}
              className="px-4 py-2.5 bg-primary hover:bg-primary-container text-on-primary hover:text-primary rounded-xl font-sans text-[10px] font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer font-black"
            >
              <Plus className="h-4 w-4" />
              <span>{showLogForm ? 'Close Logger' : 'Log a Memory'}</span>
            </button>
          </div>

          {/* Collapsible Manual Watch Log Form */}
          {showLogForm && (
            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-primary/20 bg-gradient-to-tr from-surface-container-high via-surface-container to-[#171414] max-w-xl mx-auto space-y-4 shadow-2xl relative">
              <div className="absolute top-2 right-2 px-2.5 py-1 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-[8px] font-black tracking-widest rounded-full uppercase">
                Retro Archivist
              </div>
              <h4 className="font-display font-bold text-md text-on-surface flex items-center gap-1.5 text-primary">
                <Film className="h-4 w-4 text-primary" />
                <span>Log a Watched Screening Memory</span>
              </h4>

              <form onSubmit={handleManualFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Select Film */}
                  <div className="space-y-1">
                    <label className="font-sans text-[9px] font-bold tracking-wider text-on-surface-variant uppercase">Select Film</label>
                    <select
                      value={selectedLogMovieId}
                      onChange={(e) => setSelectedLogMovieId(e.target.value)}
                      className="w-full bg-surface-container-low border border-white/10 rounded-xl px-3 py-2 text-xs text-[#ecd8b9] focus:outline-none focus:border-primary cursor-pointer uppercase"
                    >
                      {movies.map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Watched */}
                  <div className="space-y-1">
                    <label className="font-sans text-[9px] font-bold tracking-wider text-on-surface-variant uppercase">Date Watched</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={logDate}
                        onChange={(e) => setLogDate(e.target.value)}
                        className="w-full bg-surface-container-low border border-white/10 rounded-xl px-3 py-2 text-xs text-[#ecd8b9] focus:outline-none focus:border-primary uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* Rating Stars Selection */}
                  <div className="space-y-1">
                    <label className="font-sans text-[9px] font-bold tracking-wider text-on-surface-variant uppercase block">Rating Score</label>
                    <div className="flex gap-1.5 pt-1">
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => setLogRating(starVal)}
                          className={`p-1 hover:scale-125 transition-transform duration-200 cursor-pointer ${
                            starVal <= logRating ? 'text-amber-400' : 'text-zinc-600'
                          }`}
                        >
                          <Star className={`h-5 w-5 ${starVal <= logRating ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Review Text */}
                <div className="space-y-1">
                  <label className="font-sans text-[9px] font-bold tracking-wider text-on-surface-variant uppercase">Your Cinematic Critique</label>
                  <textarea
                    placeholder="Enter thoughts on popcorn score, sound effects, or lounge atmosphere..."
                    value={logReview}
                    onChange={(e) => setLogReview(e.target.value)}
                    rows={2}
                    className="w-full bg-surface-container-low border border-white/10 rounded-xl px-3 py-2 text-xs text-[#ecd8b9] focus:outline-none focus:border-primary placeholder:text-[#555] uppercase"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary hover:bg-primary-container text-on-primary font-sans text-[9px] font-black tracking-widest uppercase rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
                >
                  SAVE RECORD TO MY ARCHIVES
                </button>
              </form>
            </div>
          )}

          {/* Library log items rendering */}
          {libraryItems.length === 0 ? (
            <div className="bg-surface-container rounded-2xl p-12 text-center border border-dashed border-outline-variant/40 max-w-lg mx-auto flex flex-col justify-center items-center gap-4 select-none">
              <Layers className="h-10 w-10 text-outline-variant mb-2" />
              <p className="font-sans text-xs text-on-surface-variant font-bold uppercase tracking-widest">
                No films logged to Library
              </p>
              <p className="font-sans text-xs text-on-surface-variant max-w-xs leading-relaxed">
                Log watched sessions manually using the button above or watch movies live in sync lounges to generate custom memory records here automatically!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {libraryItems.map((item) => {
                // Find matching movie object
                const matchedFilm = movies.find(m => m.id === item.movieId || m.title.toUpperCase() === item.movieTitle.toUpperCase());

                return (
                  <div
                    key={item.id}
                    className="bg-surface-container hover:bg-surface-container-high rounded-2xl overflow-hidden border border-white/5 flex select-none relative group transition-all"
                  >
                    {/* Poster on left */}
                    <div className="w-24 sm:w-32 bg-black relative shrink-0 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.movieTitle}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface-container/95"></div>
                    </div>

                    {/* Details content */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between pl-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-sans text-[8px] font-black tracking-wider text-[#d5b19e] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
                            WATCHED {item.dateWatched}
                          </span>
                          
                          {/* Remove Log Action Button */}
                          {onRemoveFromLibrary && (
                            <button
                              onClick={() => onRemoveFromLibrary(item.id)}
                              className="text-zinc-600 hover:text-red-400 p-1 rounded hover:bg-red-400/10 transition-colors"
                              title="Delete log record"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        <h4 className="font-display font-black text-md text-[#fbf8f5] uppercase truncate leading-tight">
                          {item.movieTitle}
                        </h4>

                        {/* Stars score */}
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, starIdx) => (
                            <Star 
                              key={starIdx}
                              className={`h-3 w-3 ${starIdx < item.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`}
                            />
                          ))}
                        </div>

                        {/* Critique Quote */}
                        {item.reviewText && (
                          <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                            <p className="font-sans text-[10px] text-zinc-300 italic leading-snug line-clamp-2 uppercase">
                              &ldquo;{item.reviewText}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Rewatch Actions */}
                      <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row gap-2">
                        {matchedFilm && onStartRewatchParty ? (
                          <button
                            onClick={() => onStartRewatchParty(matchedFilm)}
                            className="flex-1 py-1.5 bg-[#df9547]/10 hover:bg-[#df9547] border border-[#df9547]/40 hover:border-[#df9547] text-[#df9547] hover:text-black font-sans text-[8.5px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-1 cursor-pointer rounded"
                          >
                            <Users className="h-3 w-3" />
                            <span>INSTANT REWATCH PARTY</span>
                          </button>
                        ) : (
                          <div className="text-[8px] text-zinc-500 italic">Rewatch link unavailable for raw logged files</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'wrapped' && (
        <div className="space-y-6 animate-fade-in select-none max-w-4xl mx-auto">
          {/* Title Header */}
          <div className="text-center relative py-6">
            <div className="absolute inset-0 bg-primary/5 rounded-full blur-[70px] pointer-events-none"></div>
            <div className="inline-flex items-center gap-1 py-1 px-3 bg-primary/15 border border-primary/35 rounded-full text-primary font-sans text-[9px] font-black tracking-widest uppercase mb-2">
              <Sparkles className="h-3 w-3 animate-spin duration-3000" />
              <span>YEARLY RETROSPECTIVE</span>
            </div>
            <h3 className="font-display text-3xl md:text-5xl font-black text-on-surface uppercase tracking-tight">
              Spotlight Wrapped
            </h3>
            <p className="font-sans text-xs text-on-surface-variant max-w-md mx-auto pt-1">
              A cinematic summary of your screen time, critic logs, and architectural achievements on ROWONE Lounge.
            </p>
          </div>

          {totalWatched === 0 ? (
            <div className="bg-surface-container rounded-3xl p-12 text-center border border-dashed border-outline-variant/40 max-w-lg mx-auto flex flex-col justify-center items-center gap-4">
              <Sparkles className="h-10 w-10 text-primary mb-2" />
              <p className="font-sans text-xs text-on-surface-variant font-bold uppercase tracking-widest">
                Retrospective Awaiting Logs
              </p>
              <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
                Log at least 1 film into your watched library to generate your Wrapped slide statistics automatically!
              </p>
              <button
                onClick={() => setActiveSubTab('library')}
                className="px-6 py-2.5 bg-primary text-on-primary font-sans text-[10.5px] font-black tracking-widest uppercase rounded-xl hover:scale-105 duration-250 cursor-pointer"
              >
                Log a film memory
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Profile Card Summary */}
              <div className="md:col-span-5 bg-gradient-to-br from-[#1b1420] via-surface-container-high to-[#150a1e] rounded-3xl border border-primary/20 p-6 flex flex-col justify-between h-96 relative overflow-hidden shadow-2xl">
                <div className="absolute top-[-50px] right-[-50px] h-48 w-48 bg-primary/10 rounded-full blur-[60px] pointer-events-none"></div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-sans text-[9px] font-black tracking-widest text-[#ecd8b9] uppercase">CINEPHILE CARD</span>
                    <span className="font-mono text-[8px] text-zinc-500">POP-847291</span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-sans text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Your Persona Rating</p>
                    <h4 className="font-display text-2xl font-black text-primary leading-tight uppercase">
                      {getPersonaTitle(favoriteGenre)}
                    </h4>
                  </div>
                </div>

                {/* Ambient Retro Badge layout */}
                <div className="py-2 flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-500/10 to-primary/40 flex flex-col items-center justify-center border border-yellow-400/20 shadow-lg relative animate-pulse">
                    <Star className="h-6 w-6 text-yellow-400 fill-yellow-400 mb-1" />
                    <span className="font-sans text-[8px] font-black text-white tracking-widest uppercase">LEVEL {Math.min(9, Math.floor(totalWatched / 2) + 1)}</span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-2">
                  <p className="font-sans text-[10px] text-zinc-400 lowercase">
                    Assigned based on <strong className="text-white">{totalWatched} watch logs</strong> across multi-lounge synced cinema projections since early 2026.
                  </p>
                  <p className="font-mono text-[8px] text-[#dac6a8] uppercase font-black text-center tracking-wider">
                    🎟️ ROWONE Lounge verified
                  </p>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="md:col-span-7 grid grid-cols-2 gap-4">
                
                {/* Stat 1: Total films */}
                <div className="bg-surface-container p-5 rounded-2xl border border-white/5 flex flex-col justify-between h-44">
                  <span className="font-sans text-[9px] font-black tracking-widest text-zinc-400 uppercase">Films Decoded</span>
                  <div>
                    <h2 className="font-display text-4xl sm:text-5xl font-black text-primary leading-none">
                      {totalWatched}
                    </h2>
                    <span className="font-sans text-[9px] text-[#ccc] lowercase font-bold">completed items</span>
                  </div>
                </div>

                {/* Stat 2: Favorite Genre */}
                <div className="bg-surface-container p-5 rounded-2xl border border-white/5 flex flex-col justify-between h-44">
                  <span className="font-sans text-[9px] font-black tracking-widest text-zinc-400 uppercase">Favorite Genre</span>
                  <div>
                    <h2 className="font-display text-2xl sm:text-3xl font-black text-[#df9547] leading-none uppercase truncate">
                      {favoriteGenre}
                    </h2>
                    <span className="font-sans text-[9px] text-[#ccc] lowercase font-bold">dominates your timeline</span>
                  </div>
                </div>

                {/* Stat 3: Peak Screening Month */}
                <div className="bg-surface-container p-5 rounded-2xl border border-white/5 flex flex-col justify-between h-44 col-span-2">
                  <span className="font-sans text-[9px] font-black tracking-widest text-zinc-400 uppercase">Most Active Month</span>
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="font-display text-3xl sm:text-4xl font-black text-emerald-400 leading-none">
                        {mostActiveMonth}
                      </h2>
                      <span className="font-sans text-[9px] text-[#ccc] lowercase font-bold">active session logs</span>
                    </div>
                    <span className="hidden sm:inline font-mono text-[8px] text-emerald-500 bg-emerald-500/10 px-2.5 py-1 border border-emerald-500/25 rounded font-black tracking-widest">
                      🔥 MAXIMUM FREQUENCY
                    </span>
                  </div>
                </div>

                {/* Stat 4: Longest / Top comment text quote */}
                <div className="bg-gradient-to-r from-surface-container to-[#1c1616] p-5 rounded-2xl border border-white/5 col-span-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-sans text-[9px] font-black tracking-widest text-zinc-400 uppercase">Top Review Critique Moment</span>
                    <span className="font-sans text-[10px] text-amber-400">📝 rating stars standard</span>
                  </div>
                  <p className="font-sans text-xs text-on-surface-variant italic leading-relaxed text-[#eee]">
                    {topComment}
                  </p>
                </div>

              </div>

            </div>
          )}
        </div>
      )}

      {/* 🔮 CINEMATIC ACHIEVEMENT SHARE MODAL */}
      <AnimatePresence>
        {selectedShareBadge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b070d]/95 border-2 border-[#dda75f]/30 hover:border-[#dda75f]/50 max-w-lg w-full rounded-3xl p-6 shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative backgrounds */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 blur-3xl rounded-full" />
              <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-[#dda75f]/10 blur-3xl rounded-full" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedShareBadge(null)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors duration-200 cursor-pointer"
              >
                ✕
              </button>

              <div className="space-y-5 relative z-10">
                <div className="space-y-1 text-center">
                  <span className="font-mono text-[9px] text-[#dda75f] font-black tracking-widest uppercase bg-[#dda75f]/10 border border-[#dda75f]/35 px-2.5 py-0.5 rounded-full">
                    🏆 MILESTONE UNLOCKED
                  </span>
                  <p className="font-display font-black text-lg text-white uppercase tracking-tight mt-1.5">Share Your Achievement</p>
                </div>

                {/* Badge Visual Representation */}
                <div className="bg-gradient-to-br from-[#120816] via-[#1a0e21] to-black border border-[#dda75f]/20 rounded-2xl p-5 text-center select-none space-y-3">
                  <div className="mx-auto h-16 w-16 bg-gradient-to-tr from-yellow-500 via-amber-500 to-yellow-400 rounded-full flex items-center justify-center text-black shadow-xl border-2 border-yellow-400 font-serif text-2xl animate-bounce" style={{ animationDuration: '3s' }}>
                    🏆
                  </div>
                  <div className="space-y-1">
                    <span className="font-sans font-black text-[9px] text-[#dda75f] tracking-widest uppercase">ROWONE OFFICIAL CREDENTIAL</span>
                    <h5 className="font-display font-black text-sm text-white uppercase tracking-wide">{selectedShareBadge}</h5>
                    <p className="font-sans text-[10px] text-zinc-300 max-w-sm mx-auto leading-normal lowercase">
                      {selectedShareBadge.toLowerCase().includes('vanguard') 
                        ? 'participated in 5+ limited digital premiere events or launched live sync opening-night screens.' 
                        : 'stayed in communal virtual lobbies, watch-parties, or live countdown lounges for over 3 hours.'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleBroadcastToFeed}
                    disabled={hasBroadcasted}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-sans text-[10px] font-black tracking-wider uppercase transition-all duration-300 border cursor-pointer ${
                      hasBroadcasted
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default'
                        : 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98]'
                    }`}
                  >
                    <Send className="h-3 w-3" />
                    <span>{hasBroadcasted ? 'Broadcasted 🪐' : 'Broadcast to Chat Feed'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-sans text-[10px] font-black tracking-wider uppercase transition-all duration-300 border cursor-pointer ${
                      copiedShareLink
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-surface-container-highest hover:bg-surface-variant text-on-surface border-white/5 active:scale-[0.98]'
                    }`}
                  >
                    {copiedShareLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 text-[#dda75f]" />}
                    <span>{copiedShareLink ? 'Link Copied!' : 'Copy Share Link'}</span>
                  </button>
                </div>

                {/* Mock External Social Outlets */}
                <div className="space-y-2 pt-1.5 border-t border-white/5 text-left">
                  <span className="font-mono text-[8px] text-zinc-400 font-bold uppercase tracking-wider block">Share to Social Channels:</span>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { icon: '🐦', name: 'Twitter/X' },
                      { icon: '👾', name: 'Discord' },
                      { icon: '🎬', name: 'Letterboxd' }
                    ].map((platform) => (
                      <button
                        key={platform.name}
                        onClick={() => {
                          const mockUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                            `🏆 Checked in on ROWONE lounge and earned my official elite "${selectedShareBadge}" profile credentials! 🍿🎬 join the arena!`
                          )}`;
                          window.open(mockUrl, '_blank', 'noreferrer');
                          setCopiedShareLink(true);
                          setTimeout(() => setCopiedShareLink(false), 2000);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-sans font-bold text-zinc-300 hover:text-white transition-colors duration-250 cursor-pointer border border-white/5"
                        type="button"
                      >
                        <span>{platform.icon}</span>
                        <span>{platform.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social Simulation live comment feed if broadcasted */}
                {hasBroadcasted && (
                  <div className="bg-[#0f0a12]/80 border border-white/5 rounded-2xl p-4 text-left animate-fade-in max-h-[170px] overflow-y-auto space-y-3">
                    <span className="font-mono text-[8px] text-[#dda75f] tracking-wide uppercase font-black block">💬 ROWONE Live Virtual Feed</span>
                    <div className="space-y-3.5">
                      {simulatedMessages.map((msg) => (
                        <div key={msg.id} className="flex gap-2.5 items-start">
                          <img
                            src={msg.avatar}
                            className="h-5 w-5 rounded-full object-cover border border-white/10 shrink-0"
                            alt={msg.username}
                          />
                          <div className="space-y-0.5 text-[10.5px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-display font-semibold text-white">@{msg.username}</span>
                              <span className="text-[8px] text-zinc-500 font-mono">{msg.time}</span>
                            </div>
                            <p className="text-zinc-300 lowercase leading-relaxed font-sans">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
