/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Compass, Clock, Sliders, Calendar, Star, PlusCircle, Bookmark, Check, Lock, Bell, BellRing, Hourglass, Rocket, Film, Ghost, Layers } from 'lucide-react';
import { Movie, isMovieAllowedForUser } from '../types';
import RatingBadge from './RatingBadge';
import { getPopcornScore } from '../utils/reviewUtils';

interface BrowseViewProps {
  movies: Movie[];
  onSelectMovie: (id: string) => void;
  onRequestScreening: (newMovie: Partial<Movie>) => void;
  userAge: number | null;
  parentMaxRating: string;
  isParentalModeActive: boolean;
  watchlistIds?: string[];
  onToggleWatchlist?: (movieId: string) => void;
  triggerNotification?: (notif: any) => void;
}

const GENRES = ['ALL', 'COMING SOON', 'THRILLER', 'CLASSIC', 'SCI-FI', 'DOCUMENTARY', 'ANIMATED', 'COMEDY', 'DRAMA'];

interface UpcomingMovie {
  id: string;
  title: string;
  genre: string;
  premiereDate: string;
  synopsis: string;
  imageUrl: string;
  director: string;
  cast: string[];
}

const UPCOMING_MOVIES: UpcomingMovie[] = [
  {
    id: 'up-synapse',
    title: 'SYNAPSE',
    genre: 'SCI-FI THRILLER',
    premiereDate: '2026-06-10T20:00:00Z',
    synopsis: 'An experimental neural interface connects two minds across different timelines, unlocking forbidden secrets of the subconscious.',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=600',
    director: 'Marcus Vance',
    cast: ['Elena Rostova', 'Julian Cross'],
  },
  {
    id: 'up-depths',
    title: 'THE SILENT DEPTHS',
    genre: 'ADVENTURE DRAMA',
    premiereDate: '2026-06-15T18:30:00Z',
    synopsis: 'A high-tech deep-sea archaeological expedition discovers an active, submerged city harboring an ancient electromagnetic power source.',
    imageUrl: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&q=80&w=600',
    director: 'Sarah Lin',
    cast: ['David Hayes', 'Dr. Alanna Reed'],
  },
  {
    id: 'up-shadow',
    title: 'KINETIC SHADOW',
    genre: 'CYBERPUNK ACTION',
    premiereDate: '2026-06-22T21:00:00Z',
    synopsis: 'In a rain-slicked neon megalopolis, a rogue cybernetic courier is blackmailed into delivering an unstable quantum drive within 24 hours.',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600',
    director: 'Kenji Takahashi',
    cast: ["Ren 'Zero' Sato", 'Maya Fletcher'],
  },
  {
    id: 'up-echoes',
    title: 'ECHOES OF THE PAST',
    genre: 'MYSTERY NOIR',
    premiereDate: '2026-06-29T19:15:00Z',
    synopsis: 'A seasoned investigator uncovers a web of conspiracy involving a historical theater and missing pieces of cinematic history.',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=600',
    director: 'Helena Black',
    cast: ['Arthur Pendelton', 'Sylvia Gray'],
  },
];

const getRemainingTimeStr = (premiereTimeMs: number, currentTimeMs: number) => {
  const diff = premiereTimeMs - currentTimeMs;
  if (diff <= 0) return 'Premiered!';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  return `${hours}h ${minutes}m remaining`;
};

const getPremiereProgress = (premiereDateStr: string, now: Date) => {
  const TIME_BASELINE = new Date('2026-06-01T00:00:00Z').getTime();
  const premiereTime = new Date(premiereDateStr).getTime();
  const currentTime = now.getTime();

  const totalDuration = premiereTime - TIME_BASELINE;
  const elapsed = currentTime - TIME_BASELINE;

  if (totalDuration <= 0) return 100;
  const percent = (elapsed / totalDuration) * 100;
  return Math.max(0, Math.min(100, Math.round(percent * 10) / 10)); // rounded to 1 decimal place
};

export default function BrowseView({
  movies,
  onSelectMovie,
  onRequestScreening,
  userAge,
  parentMaxRating,
  isParentalModeActive,
  watchlistIds = [],
  onToggleWatchlist,
  triggerNotification,
}: BrowseViewProps) {
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [upcomingGenreFilter, setUpcomingGenreFilter] = useState<'All' | 'Sci-Fi' | 'Classic' | 'Thriller'>('All');
  const [showRequestModal, setShowRequestModal] = useState(false);

  // States for timeline countdowns and user reminders
  const [currentTime, setCurrentTime] = useState<Date>(new Date('2026-06-07T13:58:10Z'));
  const [reminders, setReminders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('rowone-reminders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [triggeredAlerts, setTriggeredAlerts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('rowone-triggered-premiere-alerts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [localToast, setLocalToast] = useState<{ id: string; title: string; message: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('rowone-triggered-premiere-alerts', JSON.stringify(triggeredAlerts));
    } catch (e) {}
  }, [triggeredAlerts]);

  // Real-time automatic 30-minute reminder check loop
  useEffect(() => {
    reminders.forEach((movieId) => {
      const movie = UPCOMING_MOVIES.find(m => m.id === movieId);
      if (!movie) return;

      const pTime = new Date(movie.premiereDate).getTime();
      const nTime = currentTime.getTime();
      const diffMs = pTime - nTime;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      // Trigger if we are 30 minutes or less before premiere (between 0 and 30 minutes)
      if (diffMs > 0 && diffMinutes <= 30 && !triggeredAlerts.includes(movieId)) {
        if (triggerNotification) {
          triggerNotification({
            id: `premiere-remind-${movieId}-${Date.now()}`,
            type: 'screening',
            title: `Premiere Reminder: ${movie.title} 🍿`,
            message: `${movie.title} is scheduled to premiere in 30 minutes! Your virtual seat is reserved.`,
            timestamp: 'Just now',
            movieTitle: movie.title.toUpperCase(),
            countdownMinutes: 30
          });
        }
        
        setLocalToast({
          id: Math.random().toString(),
          title: 'Premiere Alert Triggered! 🚨',
          message: `${movie.title} premieres in 30 minutes!`,
          type: 'success'
        });

        setTriggeredAlerts(prev => [...prev, movieId]);
      }
    });
  }, [currentTime, reminders, triggeredAlerts, triggerNotification]);

  useEffect(() => {
    // Tick the clock every 10 seconds to update progress bars and timers smoothly
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('rowone-reminders', JSON.stringify(reminders));
    } catch (e) {}
  }, [reminders]);

  useEffect(() => {
    if (!localToast) return;
    const timer = setTimeout(() => {
      setLocalToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [localToast]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (localToast && !target.closest('.browse-local-toast')) {
        setLocalToast(null);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [localToast]);

  const toggleReminder = (movieId: string, movieTitle: string) => {
    const isSet = reminders.includes(movieId);
    if (isSet) {
      setReminders(prev => prev.filter(id => id !== movieId));
      setTriggeredAlerts(prev => prev.filter(id => id !== movieId));
      setLocalToast({
        id: Math.random().toString(),
        title: 'Reminder Dismissed 📥',
        message: `You have successfully canceled reminder notifications for ${movieTitle}.`,
        type: 'info'
      });
    } else {
      setReminders(prev => [...prev, movieId]);
      setLocalToast({
        id: Math.random().toString(),
        title: 'Reminder Programmed! 🔔',
        message: `We've flagged ${movieTitle}. You will receive a high priority alert prior to premiere!`,
        type: 'success'
      });
    }
  };
  
  // Custom states for the add-screening modal
  const [reqTitle, setReqTitle] = useState('');
  const [reqGenre, setReqGenre] = useState('SCI-FI');
  const [reqRuntime, setReqRuntime] = useState('1h 45m');
  const [reqRating, setReqRating] = useState('12+');
  const [reqSynopsis, setReqSynopsis] = useState('');
  const [reqStartsIn, setReqStartsIn] = useState('Starts in 25m');
  const [reqImg, setReqImg] = useState('https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=600');

  // Dynamically map and include unreleased upcoming films into the available dataset for the 'COMING SOON' category filter
  const allAvailableMovies = [
    ...movies,
    ...UPCOMING_MOVIES.map((up) => {
      const remainingStr = getRemainingTimeStr(new Date(up.premiereDate).getTime(), currentTime.getTime());
      return {
        id: up.id,
        title: up.title,
        genre: 'COMING SOON',
        originalGenre: up.genre,
        rating: '12+',
        runtime: 'TBA',
        format: '4K ULTRA',
        ratingScore: 4.8,
        reviewsCount: '800',
        imageUrl: up.imageUrl,
        startsIn: remainingStr,
        cast: up.cast.map((name, i) => ({
          id: `${up.id}-c-${i}`,
          name,
          character: 'Cast Member',
          imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        })),
        isPremiere: true,
        tag: 'COMING SOON',
        isUpcoming: true,
      };
    })
  ] as (Movie & { isUpcoming?: boolean; originalGenre?: string })[];

  // Filter movies
  const filteredMovies = allAvailableMovies.filter((movie) => {
    // Exclude unreleased movies from other categories including "ALL" to keep active movies clean
    if (selectedGenre !== 'COMING SOON' && movie.isUpcoming) {
      return false;
    }
    const matchesGenre =
      selectedGenre === 'ALL' ||
      movie.genre.toUpperCase() === selectedGenre.toUpperCase() ||
      (selectedGenre === 'DOCUMENTARY' && movie.genre.toUpperCase() === 'DOCU');
    return matchesGenre;
  });

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle) return;

    onRequestScreening({
      title: reqTitle,
      genre: reqGenre,
      runtime: reqRuntime,
      rating: reqRating,
      synopsis: reqSynopsis || 'A private custom film screening requested by the host community.',
      startsIn: reqStartsIn,
      format: '4K ULTRA',
      imageUrl: reqImg,
      cast: [
        { id: 'custom-c1', name: 'User Nominated', character: 'Principal Actor', imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150' }
      ],
      tag: 'REQUESTED'
    });

    // Reset fields
    setReqTitle('');
    setReqSynopsis('');
    setShowRequestModal(false);
  };

  return (
    <div className="space-y-12 animate-fade-in max-w-7xl mx-auto px-1 md:px-4">
      {/* Hero Filter Section */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 select-none">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-on-surface">
              Upcoming Screenings
            </h2>
            <p className="text-on-surface-variant font-sans text-xs md:text-sm max-w-md">
              Reserve your seat in our virtual lounge. High-fidelity audio and communal atmosphere await.
            </p>
          </div>

          {/* Quick Dropdown Shells */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <button className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant hover:border-primary transition-all duration-300 pointer-events-none select-none text-xs font-sans tracking-wider uppercase font-bold text-on-surface">
                <span>Genre</span>
                <Sliders className="h-3.5 w-3.5 text-on-surface-variant" />
              </button>
            </div>
            <div className="relative group">
              <button className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant hover:border-primary transition-all duration-300 pointer-events-none select-none text-xs font-sans tracking-wider uppercase font-bold text-on-surface">
                <span>Date</span>
                <Calendar className="h-3.5 w-3.5 text-on-surface-variant" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Tag Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
          {GENRES.map((genre) => {
            const isSelected = selectedGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-sans tracking-widest font-black uppercase transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-on-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10'
                    : 'bg-surface-container-highest text-[#f5efeb] hover:bg-surface-variant hover:text-[#dda75f] border border-transparent hover:border-[#dda75f]/30'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </section>

      {/* Mobile View: Horizontally Scrollable Netflix-style tracks grouped by genre */}
      <section className="block md:hidden space-y-8 pb-12 select-none">
        {(() => {
          const moviesByGenre = GENRES.filter(g => g !== 'ALL').map(genre => {
            const genreMovies = allAvailableMovies.filter(movie => 
              movie.genre.toUpperCase() === genre.toUpperCase() ||
              (genre === 'DOCUMENTARY' && movie.genre.toUpperCase() === 'DOCU')
            );
            return { genre, movies: genreMovies };
          }).filter(g => g.movies.length > 0);

          if (selectedGenre === 'ALL') {
            return moviesByGenre.map(({ genre, movies: genreMovies }) => (
              <div key={genre} className="space-y-3">
                <div className="flex items-center justify-between px-3">
                  <h3 className="font-display font-black text-sm text-[#f5efeb] tracking-wider uppercase">
                    {genre}
                  </h3>
                  <span className="font-mono text-[9px] text-primary/70 font-bold uppercase tracking-widest">
                    {genreMovies.length} rooms
                  </span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 px-3 scrollbar-none snap-x snap-mandatory">
                  {genreMovies.map((movie) => {
                    const check = isMovieAllowedForUser(movie.rating, userAge, parentMaxRating, isParentalModeActive);
                    const isAllowed = check.allowed;
                    return (
                      <div 
                        key={movie.id} 
                        onClick={() => {
                          if (movie.id.startsWith('up-')) {
                            toggleReminder(movie.id, movie.title);
                          } else if (isAllowed) {
                            onSelectMovie(movie.id);
                          }
                        }}
                        className="w-36 shrink-0 snap-start bg-surface-container-low border border-white/5 rounded-xl overflow-hidden active:scale-95 transition-all relative shadow-xl cursor-pointer group"
                      >
                        <div className="aspect-[2/3] relative overflow-hidden bg-black">
                          <img 
                            src={movie.imageUrl} 
                            alt={movie.title} 
                            className={`w-full h-full object-cover ${isAllowed ? 'brightness-90' : 'brightness-[0.3]'}`}
                            referrerPolicy="no-referrer"
                          />
                          {!isAllowed && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col justify-center items-center p-2 text-center">
                              <Lock className="h-4 w-4 text-red-500 mb-1" />
                              <span className="text-[7px] text-[#ff9e9e] uppercase font-black tracking-wider">Locked</span>
                            </div>
                          )}
                          <div className="absolute top-1.5 left-1.5 scale-75 origin-top-left z-10">
                            <RatingBadge rating={movie.rating} />
                          </div>
                          {movie.id.startsWith('up-') ? (
                            (() => {
                              const hasReminder = reminders.includes(movie.id);
                              return (
                                <button
                                  id={`remind-browse-all-${movie.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleReminder(movie.id, movie.title);
                                  }}
                                  className={`absolute top-1.5 right-1.5 p-1.5 rounded-full z-20 backdrop-blur-md border transition-all duration-300 hover:scale-110 active:scale-90 ${
                                    hasReminder
                                      ? 'bg-primary border-primary text-on-primary shadow-lg shadow-primary/20'
                                      : 'bg-black/50 border-white/10 text-white hover:bg-black/80'
                                  }`}
                                >
                                  {hasReminder ? <BellRing className="h-3.5 w-3.5 text-[#dda75f] animate-pulse" /> : <Bell className="h-3.5 w-3.5" />}
                                </button>
                              );
                            })()
                          ) : (
                            onToggleWatchlist && isAllowed && (
                              <button
                                id={`wl-browse-all-${movie.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleWatchlist(movie.id);
                                }}
                                className={`absolute top-1.5 right-1.5 p-1.5 rounded-full z-20 backdrop-blur-md border transition-all duration-300 hover:scale-110 active:scale-90 ${
                                  watchlistIds.includes(movie.id)
                                    ? 'bg-primary border-primary text-on-primary shadow-lg shadow-primary/20'
                                    : 'bg-black/50 border-white/10 text-white hover:bg-black/80'
                                }`}
                              >
                                <Bookmark className={`h-3 w-3 ${watchlistIds.includes(movie.id) ? 'fill-current' : ''}`} />
                              </button>
                            )
                          )}
                        </div>
                        <div className="p-2.5 space-y-1 bg-[#110e0e]/95">
                          <h4 className="font-display font-black text-[10px] text-[#ecd8b9] truncate leading-tight uppercase">
                            {movie.title}
                          </h4>
                          <div className="flex items-center justify-between gap-1 font-sans text-[8px] text-on-surface-variant font-medium">
                            <span className="truncate lowercase">{movie.startsIn || 'Scheduled'}</span>
                            <span className="shrink-0 text-amber-400 font-bold flex items-center gap-0.5">🍿{getPopcornScore(movie.id, movie.ratingScore || 4.7).scorePercent}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          } else {
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-3">
                  <h3 className="font-display font-black text-sm text-[#f5efeb] tracking-wider uppercase">
                    {selectedGenre}
                  </h3>
                  <span className="font-mono text-[9px] text-primary/70 font-bold uppercase tracking-widest">
                    {filteredMovies.length} rooms
                  </span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 px-3 scrollbar-none snap-x snap-mandatory">
                  {filteredMovies.map((movie) => {
                    const check = isMovieAllowedForUser(movie.rating, userAge, parentMaxRating, isParentalModeActive);
                    const isAllowed = check.allowed;
                    return (
                      <div 
                        key={movie.id} 
                        onClick={() => {
                          if (movie.id.startsWith('up-')) {
                            toggleReminder(movie.id, movie.title);
                          } else if (isAllowed) {
                            onSelectMovie(movie.id);
                          }
                        }}
                        className="w-36 shrink-0 snap-start bg-surface-container-low border border-white/5 rounded-xl overflow-hidden active:scale-95 transition-all relative shadow-xl cursor-pointer group"
                      >
                        <div className="aspect-[2/3] relative overflow-hidden bg-black">
                          <img 
                            src={movie.imageUrl} 
                            alt={movie.title} 
                            className={`w-full h-full object-cover ${isAllowed ? 'brightness-90' : 'brightness-[0.3]'}`}
                            referrerPolicy="no-referrer"
                          />
                          {!isAllowed && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col justify-center items-center p-2 text-center">
                              <Lock className="h-4 w-4 text-red-500 mb-1" />
                              <span className="text-[7px] text-[#ff9e9e] uppercase font-black tracking-wider">Locked</span>
                            </div>
                          )}
                          <div className="absolute top-1.5 left-1.5 scale-75 origin-top-left z-10">
                            <RatingBadge rating={movie.rating} />
                          </div>
                          {movie.id.startsWith('up-') ? (
                            (() => {
                              const hasReminder = reminders.includes(movie.id);
                              return (
                                <button
                                  id={`remind-browse-genre-${movie.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleReminder(movie.id, movie.title);
                                  }}
                                  className={`absolute top-1.5 right-1.5 p-1.5 rounded-full z-20 backdrop-blur-md border transition-all duration-300 hover:scale-110 active:scale-90 ${
                                    hasReminder
                                      ? 'bg-primary border-primary text-on-primary shadow-lg shadow-primary/20'
                                      : 'bg-black/50 border-white/10 text-white hover:bg-black/80'
                                  }`}
                                >
                                  {hasReminder ? <BellRing className="h-3.5 w-3.5 text-[#dda75f] animate-pulse" /> : <Bell className="h-3.5 w-3.5" />}
                                </button>
                              );
                            })()
                          ) : (
                            onToggleWatchlist && isAllowed && (
                              <button
                                id={`wl-browse-genre-${movie.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleWatchlist(movie.id);
                                }}
                                className={`absolute top-1.5 right-1.5 p-1.5 rounded-full z-20 backdrop-blur-md border transition-all duration-300 hover:scale-110 active:scale-90 ${
                                  watchlistIds.includes(movie.id)
                                    ? 'bg-primary border-primary text-on-primary shadow-lg shadow-primary/20'
                                    : 'bg-black/50 border-white/10 text-white hover:bg-black/80'
                                }`}
                              >
                                <Bookmark className={`h-3 w-3 ${watchlistIds.includes(movie.id) ? 'fill-current' : ''}`} />
                              </button>
                            )
                          )}
                        </div>
                        <div className="p-2.5 space-y-1 bg-[#110e0e]/95">
                          <h4 className="font-display font-black text-[10px] text-[#ecd8b9] truncate leading-tight uppercase">
                            {movie.title}
                          </h4>
                          <div className="flex items-center justify-between gap-1 font-sans text-[8px] text-on-surface-variant font-medium">
                            <span className="truncate lowercase">{movie.startsIn || 'Scheduled'}</span>
                            <span className="shrink-0 text-amber-400 font-bold flex items-center gap-0.5">🍿{getPopcornScore(movie.id, movie.ratingScore || 4.7).scorePercent}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
        })()}

        {/* Quick add custom request card on mobile */}
        <div className="px-3 pt-2">
          <div 
            onClick={() => setShowRequestModal(true)}
            className="bg-[#110e0e]/80 border border-dashed border-outline-variant/30 rounded-xl p-4 flex items-center justify-center gap-3 cursor-pointer active:scale-95 transition-all duration-200"
          >
            <PlusCircle className="h-4.5 w-4.5 text-primary" />
            <span className="font-sans text-[9px] font-black tracking-widest text-on-surface uppercase pb-[1px]">
              Request Private Screening
            </span>
          </div>
        </div>
      </section>

      {/* Desktop View: Full-featured Asymmetric Grid */}
      <section className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMovies.map((movie) => {
          const check = isMovieAllowedForUser(movie.rating, userAge, parentMaxRating, isParentalModeActive);
          const isAllowed = check.allowed;
          const reason = check.reason;
          const isUpcoming = movie.id.startsWith('up-');

          return (
            <div
              key={movie.id}
              className={`cinema-card group relative bg-surface-container-low rounded-2xl overflow-hidden border border-outline-variant/30 flex flex-col h-[520px] transition-all duration-500 select-none ${
                isAllowed 
                  ? 'hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/5' 
                  : 'opacity-85'
              }`}
            >
              {/* Background red visual glow trail */}
              {isAllowed && (
                <div className="absolute inset-0 bg-primary/5 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              )}

              {/* Poster Image */}
              <div 
                className="relative aspect-[2/3] overflow-hidden bg-black"
                onClick={() => {
                  if (isUpcoming) {
                    toggleReminder(movie.id, movie.title);
                  } else if (isAllowed) {
                    onSelectMovie(movie.id);
                  }
                }}
              >
                <img
                  src={movie.imageUrl}
                  alt={movie.title}
                  className={`w-full h-full object-cover transition-all duration-700 ${
                    isAllowed 
                      ? 'group-hover:scale-105 brightness-90 cursor-pointer' 
                      : 'blur-md brightness-[0.35]'
                  }`}
                />

                {/* Restricted overlay box if not allowed */}
                {!isAllowed && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col justify-center items-center p-4 text-center select-none animate-fade-in z-20">
                    <div className="p-2.5 bg-red-500/15 border border-red-500/30 text-red-500 rounded-full mb-3 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                      <Lock className="h-5 w-5 animate-pulse" />
                    </div>
                    <h4 className="font-display font-black text-[11px] text-[#ff9e9e] uppercase tracking-wider leading-none">Restricted Title</h4>
                    <p className="font-sans text-[10px] text-on-surface-variant max-w-[170px] leading-normal mt-2 lowercase">
                      Not available for your profile. {reason === 'age-locked' ? 'Requires higher verified age.' : 'Locked by parental filters.'}
                    </p>
                  </div>
                )}

                {/* Tags, Labels absolutely positioned */}
                {isAllowed && (
                  movie.isLive ? (
                    <div className="absolute top-3 left-3 bg-primary/95 text-on-primary font-sans text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-md shadow-md">
                      LIVE
                    </div>
                  ) : movie.isPremiere ? (
                    <div className="absolute top-3 left-3 bg-yellow-400 text-black font-sans text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-[0_0_12px_rgba(250,204,21,0.5)] flex items-center gap-1 select-none">
                      👑 PREMIERE
                    </div>
                  ) : movie.tag ? (
                    <div className="absolute top-3 left-3 bg-secondary/95 text-on-secondary font-sans text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-md shadow-md">
                      {movie.tag}
                    </div>
                  ) : null
                )}

                <div className="absolute top-3 right-3 z-10 transition-transform group-hover:scale-105">
                  <RatingBadge rating={movie.rating} />
                </div>
              </div>

              {/* Content Panel */}
              <div className="p-5 flex flex-col flex-grow justify-between bg-surface-container-low/80 backdrop-blur-sm relative z-10">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h3 
                      onClick={() => {
                        if (isUpcoming) {
                          toggleReminder(movie.id, movie.title);
                        } else if (isAllowed) {
                          onSelectMovie(movie.id);
                        }
                      }}
                      className={`font-display font-black text-lg leading-tight truncate flex-1 ${
                        isAllowed 
                          ? 'text-on-surface hover:text-primary transition-colors cursor-pointer' 
                          : 'text-on-surface-variant cursor-not-allowed'
                      }`}
                    >
                      {movie.title}
                    </h3>
                    <span className="text-secondary font-sans text-[10px] font-black tracking-widest uppercase shrink-0">
                      {movie.originalGenre || movie.genre}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-on-surface-variant text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-secondary-fixed text-[#ebd6aa]" />
                      <span>{movie.startsIn || 'Scheduled'}</span>
                    </div>
                    <div className="flex items-center gap-1 font-sans text-xs text-[#dda75f] font-black uppercase tracking-wider">
                      <span>🍿 {getPopcornScore(movie.id, movie.ratingScore || 4.7).scorePercent}% ROWONE Score</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {isUpcoming ? (
                    (() => {
                      const hasReminder = reminders.includes(movie.id);
                      return (
                        <button
                          onClick={() => toggleReminder(movie.id, movie.title)}
                          className={`w-full py-3 rounded-xl font-sans text-[10px] font-black tracking-widest uppercase transition-all duration-300 text-center block cursor-pointer border ${
                            hasReminder
                              ? 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/25 hover:brightness-110'
                              : 'bg-surface-container-highest hover:bg-surface-variant text-on-surface border-outline-variant/30'
                          }`}
                        >
                          {hasReminder ? '🔔 REMINDER ACTIVE' : '🔔 REMIND ME'}
                        </button>
                      );
                    })()
                  ) : (
                    <button
                      disabled={!isAllowed}
                      onClick={() => {
                        if (isAllowed) {
                          onSelectMovie(movie.id);
                        }
                      }}
                      className={`w-full py-3 rounded-xl font-sans text-[10px] font-black tracking-widest uppercase transition-all duration-200 text-center block ${
                        isAllowed
                          ? 'bg-gradient-to-r from-primary to-primary-container text-on-primary hover:shadow-lg hover:shadow-primary/20 active:scale-95 cursor-pointer'
                          : 'bg-white/5 border border-white/5 text-on-surface-variant cursor-not-allowed select-none opacity-40'
                      }`}
                    >
                      {isAllowed ? 'BOOK SEAT' : 'RESTRICTED'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty screening balance placeholder */}
        <div 
          onClick={() => setShowRequestModal(true)}
          className="cinema-card group relative bg-surface-container-lowest rounded-2xl overflow-hidden border border-dashed border-outline-variant/60 flex flex-col items-center justify-center p-8 h-[520px] cursor-pointer hover:border-primary/50 hover:bg-surface-container-low/25 transition-all duration-500 select-none"
        >
          <PlusCircle className="h-10 w-10 text-outline-variant group-hover:text-primary transition-all duration-300 mb-4" />
          <p className="font-sans text-[10px] text-center font-bold tracking-widest text-on-tertiary-container uppercase leading-relaxed">
            REQUEST A<br />
            PRIVATE SCREENING
          </p>
        </div>
      </section>

      {/* Screen booking request popup modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-container-low border border-white/5 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl relative select-none">
            <div className="p-6 border-b border-outline-variant/35 flex justify-between items-center bg-surface-container-low/95">
              <h3 className="font-display font-bold text-xl text-primary">Request Film Screening</h3>
              <button 
                onClick={() => setShowRequestModal(false)}
                className="text-on-surface-variant hover:text-white font-bold text-sm bg-white/5 hover:bg-white/10 px-3 py-1 rounded"
              >
                CLOSE
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold tracking-wider text-on-surface-variant uppercase block">Movie Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INCEPTION, INTERSTELLAR"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant/35 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold tracking-wider text-on-surface-variant uppercase block">Genre</label>
                  <select
                    value={reqGenre}
                    onChange={(e) => setReqGenre(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/35 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-0 transition-colors"
                  >
                    <option value="SCI-FI">SCI-FI</option>
                    <option value="THRILLER">THRILLER</option>
                    <option value="CLASSIC">CLASSIC</option>
                    <option value="DOCUMENTARY">DOCUMENTARY</option>
                    <option value="ANIMATED">ANIMATED</option>
                    <option value="COMEDY">COMEDY</option>
                    <option value="DRAMA">DRAMA</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold tracking-wider text-on-surface-variant uppercase block">Rating</label>
                  <select
                    value={reqRating}
                    onChange={(e) => setReqRating(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/35 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-0"
                  >
                    <option value="U">U</option>
                    <option value="PG">PG</option>
                    <option value="12+">12+</option>
                    <option value="15+">15+</option>
                    <option value="18+">18+</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold tracking-wider text-on-surface-variant uppercase block">Runtime</label>
                  <input
                    type="text"
                    value={reqRuntime}
                    onChange={(e) => setReqRuntime(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/35 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold tracking-wider text-on-surface-variant uppercase block">Starts In</label>
                  <input
                    type="text"
                    value={reqStartsIn}
                    onChange={(e) => setReqStartsIn(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/35 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold tracking-wider text-on-surface-variant uppercase block">Synopsis / Description</label>
                <textarea
                  value={reqSynopsis}
                  onChange={(e) => setReqSynopsis(e.target.value)}
                  placeholder="Tell us why this film would make an unforgettable private screening..."
                  className="w-full h-20 bg-surface-container border border-outline-variant/35 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 mt-2 rounded-xl bg-primary text-on-primary font-sans text-xs font-black tracking-widest uppercase transition-all duration-200 active:scale-95 shadow-lg shadow-primary/20"
              >
                CONFIRM &amp; ADD TO LISTINGS
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Coming Soon Section - Chronological Roadmap Timeline */}
      <section className="space-y-8 pt-12 border-t border-outline-variant/25">
        <div className="space-y-2 select-none">
          <h2 className="font-display text-2xl md:text-4xl font-bold text-on-surface flex items-center gap-3">
            <Hourglass className="h-6 w-6 text-primary animate-pulse" />
            <span>Chronological Roadmaps &amp; Premieres</span>
          </h2>
          <p className="text-on-surface-variant font-sans text-xs md:text-sm max-w-xl">
            Track upcoming showcase premieres. Setup alarm flags to receive immediate reservation reminders.
          </p>
        </div>

        {/* Genre filter tab bar for upcoming releases */}
        <div className="flex gap-2 overflow-x-auto py-1.5 scrollbar-none select-none border-b border-white/5 pb-4 max-w-lg">
          {(['All', 'Sci-Fi', 'Classic', 'Thriller'] as const).map((filterGenre) => {
            const isSelected = upcomingGenreFilter === filterGenre;
            return (
              <button
                key={filterGenre}
                type="button"
                onClick={() => setUpcomingGenreFilter(filterGenre)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-sans tracking-widest font-black uppercase transition-all duration-300 cursor-pointer shadow-sm hover:scale-102 active:scale-95 ${
                  isSelected
                    ? 'bg-primary text-on-primary ring-2 ring-primary/25 shadow-lg shadow-primary/10 font-bold'
                    : 'bg-surface-container-highest text-[#f5efeb] hover:bg-surface-variant hover:text-[#dda75f] border border-transparent hover:border-[#dda75f]/30'
                }`}
              >
                {filterGenre === 'All' && <Layers className="h-3.5 w-3.5 shrink-0" />}
                {filterGenre === 'Sci-Fi' && <Rocket className="h-3.5 w-3.5 shrink-0" />}
                {filterGenre === 'Classic' && <Film className="h-3.5 w-3.5 shrink-0" />}
                {filterGenre === 'Thriller' && <Ghost className="h-3.5 w-3.5 shrink-0" />}
                <span>{filterGenre}</span>
              </button>
            );
          })}
        </div>

        {/* Timeline Line Container */}
        <div className="relative border-l border-outline-variant/40 ml-4 md:ml-8 pl-6 md:pl-10 space-y-12 pb-6">
          {(() => {
            const filteredUpcoming = UPCOMING_MOVIES.filter((movie) => {
              if (upcomingGenreFilter === 'All') return true;
              const f = upcomingGenreFilter.toUpperCase();
              const g = movie.genre.toUpperCase();
              
              if (f === 'SCI-FI') {
                return g.includes('SCI-FI') || g.includes('CYBERPUNK');
              }
              if (f === 'THRILLER') {
                return g.includes('THRILLER') || g.includes('MYSTERY') || g.includes('NOIR');
              }
              if (f === 'CLASSIC') {
                return g.includes('CLASSIC') || g.includes('NOIR') || g.includes('DRAMA');
              }
              return g.includes(f);
            });

            if (filteredUpcoming.length === 0) {
              return (
                <div className="text-on-surface-variant py-8 text-xs font-sans italic lowercase">
                  no upcoming releases found matching the chosen genre.
                </div>
              );
            }

            return filteredUpcoming.map((upcoming) => {
              const hasReminder = reminders.includes(upcoming.id);
              const progress = getPremiereProgress(upcoming.premiereDate, currentTime);
              const remainingStr = getRemainingTimeStr(new Date(upcoming.premiereDate).getTime(), currentTime.getTime());

              return (
                <div key={upcoming.id} className="relative group/timeline">
                  {/* Timeline Dot Node Indicator */}
                  <div className="absolute -left-[31px] md:-left-[46px] top-6 w-3.5 h-3.5 rounded-full bg-black border border-outline-variant/80 flex items-center justify-center transition-all duration-300 group-hover/timeline:border-primary group-hover/timeline:scale-125 animate-fade-in">
                    <div className={`w-1.5 h-1.5 rounded-full ${hasReminder ? 'bg-primary animate-pulse' : 'bg-outline-variant'}`} />
                  </div>

                  {/* Main Card */}
                  <div className="bg-surface-container-low border border-outline-variant/30 hover:border-primary/45 rounded-2xl p-5 md:p-6 flex flex-col lg:flex-row gap-6 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                    {/* Aspect Poster Thumbnail container */}
                    <div className="w-full lg:w-40 shrink-0 aspect-[16/9] lg:aspect-[2/3] rounded-xl overflow-hidden bg-black relative">
                      <img
                        src={upcoming.imageUrl}
                        alt={upcoming.title}
                        className="w-full h-full object-cover brightness-90 group-hover/timeline:scale-102 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-sans font-black tracking-wider text-[#dda75f] uppercase">
                        {upcoming.genre}
                      </div>
                    </div>

                    {/* Body textual list of components */}
                    <div className="flex-1 w-full space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h3 className="font-display font-black text-lg text-on-surface uppercase tracking-wider group-hover/timeline:text-primary transition-colors">
                            {upcoming.title}
                          </h3>
                          <p className="font-sans text-[10px] text-on-surface-variant">
                            Directed by <span className="text-secondary font-bold">{upcoming.director}</span> • Starring <span className="text-[#ebd6aa]">{upcoming.cast.join(', ')}</span>
                          </p>
                        </div>

                        {/* Reminder Trigger Trigger Button */}
                        <div className="flex flex-col sm:items-end gap-2 shrink-0">
                          <button
                            onClick={() => toggleReminder(upcoming.id, upcoming.title)}
                            className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded-full font-sans text-[9px] font-black tracking-wider uppercase transition-all duration-300 cursor-pointer ${
                              hasReminder
                                ? 'bg-primary text-on-primary shadow-lg shadow-primary/25 border border-primary hover:brightness-110'
                                : 'bg-surface-container-highest hover:bg-surface-variant text-on-surface border border-outline-variant/30'
                            }`}
                            id={`remind-btn-${upcoming.id}`}
                          >
                            {hasReminder ? (
                              <>
                                <BellRing className="h-3 w-3 animate-pulse" />
                                <span>Reminder Active 🔔</span>
                              </>
                            ) : (
                              <>
                                <Bell className="h-3 w-3" />
                                <span>Remind Me</span>
                              </>
                            )}
                          </button>

                          {/* Demo 30m Alert Simulator Trigger */}
                          {hasReminder && (
                            <button
                              onClick={() => {
                                const pTimeMs = new Date(upcoming.premiereDate).getTime();
                                const targetTimeMs = pTimeMs - (30 * 60 * 1000);
                                setCurrentTime(new Date(targetTimeMs));
                                setTriggeredAlerts(prev => prev.filter(id => id !== upcoming.id));
                                setLocalToast({
                                  id: Math.random().toString(),
                                  title: 'Time Travel Active ⏳',
                                  message: `Simulating clock tick at exactly 30 minutes before ${upcoming.title} premiere!`,
                                  type: 'success'
                                });
                              }}
                              className="flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-[#dda75f]/15 hover:bg-[#dda75f]/25 border border-[#dda75f]/20 text-[#dda75f] font-sans text-[8.5px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer"
                              title="Fast-forward system mock clock to exactly 30 minutes prior to premiere"
                            >
                              <Clock className="h-2.5 w-2.5 text-[#dda75f] animate-spin" style={{ animationDuration: '3s' }} />
                              <span>Demo 30m Alert</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="font-sans text-xs text-on-surface-variant font-normal leading-relaxed">
                        {upcoming.synopsis}
                      </p>

                      {/* 🎞️ PREMIUM COMPOSITE FILMSTRIP TIMELINE METER */}
                      <div className="space-y-4 pt-4 border-t border-white/10 select-none">
                        <div className="flex items-center justify-between text-[9px] font-mono tracking-widest text-[#dda75f] uppercase font-bold">
                          <span>🎞️ FILMSTRIP DYNAMIC PROGRESS METER</span>
                          <span className="text-[#dda75f] font-black tracking-widest bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">LIVE PLAYHEAD: NOW</span>
                        </div>

                        {/* Visual Filmstrip Bar with Sprockets */}
                        <div className="relative bg-[#0d0a0f] border border-white/10 rounded-xl p-2.5 overflow-hidden shadow-inner group/filmstrip">
                          {/* Top Sprocket Holes */}
                          <div className="flex justify-between px-1 mb-2 opacity-50 group-hover/filmstrip:opacity-80 transition-opacity">
                            {Array.from({ length: 15 }).map((_, i) => (
                              <div key={`sprocket-top-${i}`} className="w-1.5 h-1.5 bg-zinc-800 border border-black rounded-sm shadow-sm" />
                            ))}
                          </div>

                          {/* Dual Range Bar Track */}
                          <div className="h-5 w-full bg-[#18111c] rounded-md overflow-hidden relative flex items-center border border-zinc-800">
                            {/* Elapsed Fill Segment */}
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1.2, ease: 'easeOut' }}
                              className="h-full bg-gradient-to-r from-red-700 via-rose-500 to-orange-500 relative flex items-center justify-end"
                              style={{ width: `${progress}%` }}
                            >
                              {/* Glowing Scanline Strip pattern */}
                              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:12px_12px] animate-[pulse_3s_infinite]" />
                              
                              {/* Embedded Percentage Tag */}
                              {progress > 18 && (
                                <span className="text-[7.5px] font-sans font-black text-white pr-2 tracking-tighter drop-shadow-md shrink-0">
                                  {progress}% elapsed
                                </span>
                              )}
                            </motion.div>

                            {/* Playhead Divider Needle */}
                            <motion.div
                              initial={{ left: 0 }}
                              animate={{ left: `${progress}%` }}
                              transition={{ duration: 1.2, ease: 'easeOut' }}
                              className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10 shadow-[0_0_8px_#fbbf24] flex items-center justify-center"
                              style={{ left: `${progress}%` }}
                            >
                              <div className="absolute w-2 h-2 rounded-full bg-yellow-400 border border-black shadow-md animate-ping" />
                              <div className="absolute w-1.5 h-1.5 rounded-full bg-yellow-400 border border-black shadow-md" />
                            </motion.div>

                            {/* Remaining Fill Segment */}
                            <motion.div
                              initial={{ width: '100%' }}
                              animate={{ width: `${100 - progress}%` }}
                              transition={{ duration: 1.2, ease: 'easeOut' }}
                              className="h-full bg-gradient-to-r from-[#dda75f]/50 via-[#dda75f]/20 to-amber-950/10 flex items-center pl-2"
                              style={{ width: `${100 - progress}%` }}
                            >
                              {/* Embedded Count Tag */}
                              {100 - progress > 22 && (
                                <span className="text-[7.5px] font-sans font-black text-[#fef08a] tracking-tighter drop-shadow-sm shrink-0">
                                  {Math.round((100 - progress) * 10) / 10}% remaining
                                </span>
                              )}
                            </motion.div>
                          </div>

                          {/* Bottom Sprocket Holes */}
                          <div className="flex justify-between px-1 mt-2 opacity-50 group-hover/filmstrip:opacity-80 transition-opacity">
                            {Array.from({ length: 15 }).map((_, i) => (
                              <div key={`sprocket-bot-${i}`} className="w-1.5 h-1.5 bg-zinc-800 border border-black rounded-sm shadow-sm" />
                            ))}
                          </div>
                        </div>

                        {/* Interactive Stats row */}
                        <div className="grid grid-cols-2 gap-4 text-[10px]">
                          {/* Elapsed (Left Stats) */}
                          <div className="p-2.5 bg-[#140e17] rounded-xl border border-white/5 space-y-1">
                            <span className="flex items-center gap-1.5 text-[8.5px] font-mono tracking-wider font-extrabold text-zinc-400 uppercase">
                              <Calendar className="h-3 w-3 text-red-500 animate-pulse" />
                              <span>Exposed Film / Elapsed</span>
                            </span>
                            <p className="font-display font-medium text-[#edeae8] lowercase">
                              {new Date(upcoming.premiereDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <span className="text-[8px] font-mono text-zinc-500 font-bold block lowercase">
                              system baseline: june 1st
                            </span>
                          </div>

                          {/* Remaining (Right Stats) */}
                          <div className="p-2.5 bg-[#1a1413] rounded-xl border border-white/5 space-y-1 text-right">
                            <span className="flex items-center justify-end gap-1.5 text-[8.5px] font-mono tracking-wider font-extrabold text-[#dda75f] uppercase">
                              <span>Unexposed Film / Remaining</span>
                              <Clock className="h-3 w-3 text-[#dda75f] animate-spin" style={{ animationDuration: '8s' }} />
                            </span>
                            <p className="font-display font-medium text-amber-200 uppercase tracking-widest text-[9px] md:text-[10px] truncate">
                              {remainingStr}
                            </p>
                            <span className="text-[8px] font-mono text-[#dda75f]/60 font-bold block lowercase">
                              live tick countdown
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </section>

      {/* Floating alert/local toast container */}
      {localToast && (
        <div className="browse-local-toast fixed bottom-6 right-6 z-50 bg-[#161212]/95 border-2 border-primary/45 p-4 rounded-xl shadow-2xl max-w-sm w-full animate-fade-in flex items-start gap-3 backdrop-blur-md">
          <div className="p-1.5 bg-primary/15 text-primary rounded-lg">
            <BellRing className="h-4.5 w-4.5 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h4 className="font-sans font-black text-xs uppercase tracking-wider text-primary">
              {localToast.title}
            </h4>
            <p className="font-sans text-[10px] text-on-surface-variant leading-normal lowercase">
              {localToast.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
