/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Sparkles, Star, Clock, Flame, Calendar, Film, Heart, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { Movie, isMovieAllowedForUser } from '../types';
import RatingBadge from './RatingBadge';
import { getPopcornScore } from '../utils/reviewUtils';

interface DiscoverViewProps {
  movies: Movie[];
  onSelectMovie: (id: string) => void;
  onSurpriseMe: () => void;
  userAge: number | null;
  parentMaxRating: string;
  isParentalModeActive: boolean;
}

export default function DiscoverView({
  movies,
  onSelectMovie,
  onSurpriseMe,
  userAge,
  parentMaxRating,
  isParentalModeActive,
}: DiscoverViewProps) {
  
  // 1. Trending: high ratingScore and reviewsCount
  const trendingMovies = [...movies]
    .filter(m => m.ratingScore >= 4.7)
    .sort((a, b) => b.ratingScore - a.ratingScore);

  // 2. New Releases: isNewRelease is true
  const newReleases = movies.filter(m => m.isNewRelease);

  // 3. Coming Soon: StartsIn Scheduled, Tomorrow, or tag present
  const comingSoon = movies.filter(m => 
    m.startsIn === 'Tomorrow' || 
    m.startsIn === 'Tonight' || 
    m.startsIn === 'Scheduled' ||
    m.tag === 'LIMITED' || 
    m.tag === 'COMING FRIDAY'
  );

  // 4. Top Rated: descending by ratingScore
  const topRated = [...movies].sort((a, b) => b.ratingScore - a.ratingScore);

  // 5. Categorize by major genres
  const scifiMovies = movies.filter(m => m.genre === 'SCI-FI');
  const actionMovies = movies.filter(m => m.genre === 'ACTION');
  const thrillerMovies = movies.filter(m => m.genre === 'THRILLER');
  const classicMovies = movies.filter(m => m.genre === 'CLASSIC');
  const documentaryMovies = movies.filter(m => m.genre === 'DOCUMENTARY' || m.genre === 'DOCU');
  const animatedMovies = movies.filter(m => m.genre === 'ANIMATED');
  const dramaMovies = movies.filter(m => m.genre === 'DRAMA');

  // Multi-row horizontal layout engine helper
  const RowSection = ({ 
    title, 
    subtitle, 
    movieList, 
    icon: Icon 
  }: { 
    title: string; 
    subtitle: string; 
    movieList: Movie[]; 
    icon: React.ComponentType<{ className?: string }> 
  }) => {
    const listRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
      if (listRef.current) {
        const { scrollLeft, clientWidth } = listRef.current;
        const scrollAmount = clientWidth * 0.75;
        listRef.current.scrollTo({
          left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
          behavior: 'smooth'
        });
      }
    };

    if (movieList.length === 0) return null;

    return (
      <div className="space-y-4 relative group/row select-none">
        <div className="flex items-center justify-between px-1">
          <div className="space-y-1">
            <h3 className="font-display font-black text-md md:text-xl text-[#f3ebd9] tracking-wider uppercase flex items-center gap-2">
              <Icon className="h-4.5 w-4.5 text-primary shrink-0" />
              <span>{title}</span>
            </h3>
            <p className="font-sans text-[10px] md:text-xs text-on-surface-variant leading-none lowercase">
              {subtitle}
            </p>
          </div>
          
          <div className="hidden md:flex items-center gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity duration-300">
            <button
              onClick={() => scroll('left')}
              className="p-1.5 rounded-lg bg-surface-container/60 hover:bg-surface-container-high border border-white/5 hover:border-primary/20 transition-all text-on-surface cursor-pointer"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1.5 rounded-lg bg-surface-container/60 hover:bg-surface-container-high border border-white/5 hover:border-primary/20 transition-all text-on-surface cursor-pointer"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Scroll Track container */}
        <div 
          ref={listRef}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory"
        >
          {movieList.map((movie) => {
            const allowedCheck = isMovieAllowedForUser(
              movie.rating, 
              userAge, 
              parentMaxRating, 
              isParentalModeActive
            );

            return (
              <div
                key={movie.id}
                onClick={() => onSelectMovie(movie.id)}
                className={`w-36 md:w-48 shrink-0 rounded-2xl overflow-hidden cursor-pointer relative group/card border transition-all duration-300 bg-[#110e0e]/90 shadow-lg snap-start flex flex-col justify-between ${
                  allowedCheck.allowed 
                    ? 'border-white/5 hover:border-primary/30 hover:-translate-y-1' 
                    : 'border-red-900/15 opacity-60 hover:opacity-85'
                }`}
              >
                {/* Micro Thumbnail */}
                <div className="aspect-[2/3] relative overflow-hidden bg-black shrink-0">
                  <img
                    src={movie.imageUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105 group-hover/card:brightness-90 pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Rating Tag */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <RatingBadge rating={movie.rating} />
                  </div>

                  {/* Format Indicator Tag bottom right of image */}
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 border border-white/10 rounded font-mono text-[8px] font-bold text-on-surface-variant scale-90">
                    {movie.format}
                  </div>

                  {/* Parental Advisory Watermark Overlay */}
                  {!allowedCheck.allowed && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 text-center">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-1">
                        🔒
                      </div>
                      <span className="font-sans text-[8px] font-black uppercase text-red-400 tracking-wider">Locked</span>
                      <p className="font-sans text-[7px] text-red-400/80 leading-snug mt-1 font-semibold">Max Rating: {parentMaxRating}</p>
                    </div>
                  )}

                  {/* Subscribed Gold Banner indicator if passOnly */}
                  {movie.isPassOnly && (
                    <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 bg-yellow-400 text-black text-[7px] font-sans font-black uppercase tracking-widest rounded shadow">
                      PASS ONLY
                    </div>
                  )}
                </div>

                {/* Info summary */}
                <div className="p-3 space-y-1 text-left flex-grow flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-sans text-on-surface-variant">
                      <span className="font-black uppercase tracking-widest text-primary truncate max-w-[80px]">
                        {movie.genre}
                      </span>
                      {(() => {
                        const popcornData = getPopcornScore(movie.id, movie.ratingScore);
                        return (
                          <span className="font-mono flex items-center gap-0.5 text-[#dda75f] font-black text-[9px]">
                            🍿 {popcornData.scorePercent}%
                          </span>
                        );
                      })()}
                    </div>

                    <h4 className="font-display font-black text-[11px] md:text-sm text-[#f5efeb] leading-tight group-hover/card:text-primary transition-colors uppercase truncate">
                      {movie.title}
                    </h4>
                  </div>

                  <p className="font-sans text-[8px] md:text-[9px] text-on-surface-variant leading-tight truncate lowercase pt-1.5 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-on-surface-variant shrink-0" />
                    <span>{movie.startsIn || 'Scheduled'}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 animate-fade-in max-w-7xl mx-auto px-1 md:px-4">
      
      {/* 1. Header Hero Banner with Sparkle Serendipity engine surprise choice */}
      <section className="relative overflow-hidden bg-gradient-to-r from-purple-950/40 via-black/85 to-[#0b0416]/50 border border-purple-500/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_35px_rgba(111,44,244,0.06)]">
        
        {/* Soft magical circular glow backdrops */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

        <div className="space-y-3 max-w-xl text-center md:text-left select-none">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 font-sans text-[9px] font-black tracking-widest uppercase">
            <Sparkles className="h-3.5 w-3.5 fill-purple-400 text-purple-400" />
            <span>COMMUNAL SERENDIPITY DECK</span>
          </div>

          <h2 className="font-serif text-2.5xl md:text-4.5xl font-black text-[#f5efeb] tracking-tight">
            Let the Machine Choose!
          </h2>
          <p className="font-sans text-xs text-on-surface-variant leading-relaxed font-normal">
            Can't decide on the next cinematic lounge ticket? Hit the button below to activate our instant <span className="text-primary font-bold">Surprise Me Gate</span>. It computes available halls and drops you directly into a synchronized live stream player matching your age credentials!
          </p>
        </div>

        <button
          onClick={onSurpriseMe}
          className="shrink-0 px-8 py-4 bg-gradient-to-r from-purple-500 to-primary hover:from-purple-600 hover:to-primary-container text-white font-sans text-xs font-black tracking-widest uppercase rounded-xl shadow-lg hover:shadow-purple-500/15 duration-300 transition-all hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer border border-white/5 active:border-purple-400/30"
        >
          <Sparkles className="h-4 w-4 fill-white" />
          <span>Launch Surprise Stream</span>
        </button>
      </section>

      {/* 2. Horizontal Netflix tracks rows */}
      <div className="space-y-12">
        
        {/* Row: Trending */}
        <RowSection 
          title="Trending This Week" 
          subtitle="hottest active rooms evaluated by audience participation logs" 
          movieList={trendingMovies} 
          icon={Flame} 
        />

        {/* Row: New Releases */}
        <RowSection 
          title="New Releases" 
          subtitle="digitally re-mastered classics and premier uploads in 4k" 
          movieList={newReleases} 
          icon={Sparkles} 
        />

        {/* Row: Coming Soon */}
        <RowSection 
          title="Coming Soon" 
          subtitle="upcoming community countdown locks and studio nominations" 
          movieList={comingSoon} 
          icon={Calendar} 
        />

        {/* Row: Top Rated */}
        <RowSection 
          title="All-Time Top Rated" 
          subtitle="the highest rated cinematic memories as voted by verified cinephiles" 
          movieList={topRated} 
          icon={Star} 
        />

        {/* Rows: Genres */}
        <div className="border-t border-white/5 pt-10 space-y-12">
          
          <RowSection 
            title="Sci-Fi Lounges" 
            subtitle="renegade androids, cosmic travelers, and futuristic synths" 
            movieList={scifiMovies} 
            icon={Film} 
          />

          <RowSection 
            title="Thrillers &amp; Noir" 
            subtitle="rainy streets, distorted realities, and shadows holding secrets" 
            movieList={thrillerMovies} 
            icon={Film} 
          />

          <RowSection 
            title="Vintage Classics" 
            subtitle="the tactile legacy of high-budget projection rooms" 
            movieList={classicMovies} 
            icon={Film} 
          />

          <RowSection 
            title="Elite Documentaries" 
            subtitle="awe-inspiring real-world summits and extreme peaks" 
            movieList={documentaryMovies} 
            icon={Film} 
          />

          <RowSection 
            title="Animated &amp; Comedy" 
            subtitle="playful celestial beings and galactic laughing tracks" 
            movieList={animatedMovies} 
            icon={Film} 
          />

          <RowSection 
            title="Theatrical Drama" 
            subtitle="intimate emotional arcs and silver screen tributes" 
            movieList={dramaMovies} 
            icon={Film} 
          />
        </div>

      </div>

    </div>
  );
}
