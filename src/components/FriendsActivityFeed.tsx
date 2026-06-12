/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  Sparkles, 
  MessageSquare, 
  ThumbsUp, 
  Play, 
  Heart, 
  Star, 
  Ticket, 
  Flame,
  Radio
} from 'lucide-react';
import { Movie } from '../types';

export interface ActivityItem {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  type: 'watch' | 'rating' | 'join_room';
  movieTitle: string;
  movieId: string;
  timestamp: string;
  ratingScore?: number;
  reviewText?: string;
  roomName?: string;
  likesCount: number;
  hasLiked?: boolean;
}

interface FriendsActivityFeedProps {
  movies: Movie[];
  onSelectMovie: (movieId: string) => void;
  onJoinRoom: (movieId: string) => void;
}

export default function FriendsActivityFeed({
  movies,
  onSelectMovie,
  onJoinRoom
}: FriendsActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: 'act1',
      username: 'Leo_V',
      fullName: 'Leo Ventura',
      avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUMMmg4wUjOeGP67BHvckW7QK54LA2AaZMcuCpoM3Hu2vY9Ic9lti4YRyceBT4Xa4aVgS7MpwB64SBM0VilWuJV2mdhKG4RfOmkV6SHU7iEUNbS72EU7jB91skEIP5DDmDYOjKPZmUryVWd3v4_1VXYJ8p9TwrkZJ5eqP3NastiUon4s-VH-EhBJQb4vIFZ294pPzvvwroP1eXEUvONKLSB1iLgrLRvbY9BBCCjiInO0x9ZM1geU0eP_XnbkoiNJzz2yLq-q5qibW7',
      type: 'rating',
      movieTitle: 'NEON ECHOES',
      movieId: 'm6',
      timestamp: '14 mins ago',
      ratingScore: 5,
      reviewText: 'An absolute masterpiece of audio-visual ambient rhythm. The synth track combined with Dolby Atmos in Hall A is downright legendary!',
      likesCount: 12,
      hasLiked: false
    },
    {
      id: 'act2',
      username: 'Sarah_Lin',
      fullName: 'Sarah Lin',
      avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBN1zkyN0Pb8734ZFQ0q6_UU1ErZWPzuHCM2h5RXzYtYFsE0wGk0tDndVTt82vO2j9N1i4muihePJYlyoEsyO-MN6WgdBcmG4hdllHWUPnoZYhYXg_4HRe24hHm9FVnJyx5ZLbvxzTg2BXW0sdT-MjvOwU-h9rD5EwNfrgu96iPb_xurjXNQUONPl5E8o68dUeilrcKFFrPvPt-86Vem85Vo0IoL85mzDg1E5ZlDH1QMaFfc-auV_uw3qMgmeWmJU6Ghd40J4E6DfSN',
      type: 'join_room',
      movieTitle: 'THE LAST REEL',
      movieId: 'm1',
      timestamp: '32m ago',
      roomName: 'Screening Room 2',
      likesCount: 8,
      hasLiked: true
    },
    {
      id: 'act3',
      username: 'cyber_junkie',
      fullName: 'Alex Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150',
      type: 'watch',
      movieTitle: 'FROZEN PEAKS',
      movieId: 'm7',
      timestamp: '1 hour ago',
      likesCount: 4,
      hasLiked: false
    },
    {
      id: 'act4',
      username: 'retro_coder',
      fullName: 'Diana Woods',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
      type: 'rating',
      movieTitle: 'The Midnight Premiere',
      movieId: 'm4',
      timestamp: '3h ago',
      ratingScore: 4.8,
      reviewText: 'Nostalgic noir pacing with crisp contemporary lighting structure. Cozy premiere lounge crowd made the screening feel alive.',
      likesCount: 21,
      hasLiked: false
    }
  ]);

  const handleLikeActivity = (id: string) => {
    setActivities(prev => prev.map(act => {
      if (act.id === id) {
        return {
          ...act,
          hasLiked: !act.hasLiked,
          likesCount: act.hasLiked ? act.likesCount - 1 : act.likesCount + 1
        };
      }
      return act;
    }));
  };

  return (
    <div className="space-y-6 select-none bg-black/40 p-6 rounded-3xl border border-white/5 shadow-inner">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Users className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="font-sans text-[8px] font-black text-primary uppercase tracking-widest leading-none block">COMMUNAL FLOW</span>
            <h3 className="font-serif text-xl md:text-2xl font-black text-[#F5EFEB] mt-0.5">SQUAD TIMELINE</h3>
          </div>
        </div>

        <div className="text-[10px] font-sans text-on-surface-variant flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
          <Radio className="h-3.5 w-3.5 text-primary animate-pulse" />
          <span>Real-time social telemetry active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activities.map((item) => {
          const matchingMovie = movies.find(m => m.id === item.movieId);

          return (
            <div 
              key={item.id}
              className="p-4 bg-[#110e14]/70 border border-white/5 hover:border-primary/20 hover:bg-[#141018]/90% rounded-2xl transition-all duration-300 flex gap-4 text-left relative overflow-hidden group/card shadow-lg flex-col justify-between"
            >
              <div className="flex gap-3">
                {/* User avatar and symbol info */}
                <div className="relative shrink-0 select-none">
                  <img 
                    src={item.avatarUrl} 
                    alt={item.username} 
                    className="w-10 h-10 rounded-full border border-white/10 shrink-0 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black border border-white/10 flex items-center justify-center text-[9px]">
                    {item.type === 'watch' && '🎬'}
                    {item.type === 'rating' && '⭐'}
                    {item.type === 'join_room' && '🍿'}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <span className="font-sans font-black text-xs text-[#eedecb]">@{item.username}</span>
                    <span className="font-mono text-[9px] text-on-surface-variant/70 shrink-0">{item.timestamp}</span>
                  </div>

                  <p className="font-sans text-[11px] text-on-surface-variant">
                    {item.type === 'rating' && (
                      <span>
                        rated <strong className="text-white hover:text-primary cursor-pointer uppercase font-sans tracking-wide" onClick={() => onSelectMovie(item.movieId)}>{item.movieTitle}</strong>
                      </span>
                    )}
                    {item.type === 'join_room' && (
                      <span>
                        joined Lounge <strong className="text-white hover:text-primary cursor-pointer uppercase font-sans tracking-wide" onClick={() => onSelectMovie(item.movieId)}>{item.movieTitle}</strong>
                      </span>
                    )}
                    {item.type === 'watch' && (
                      <span>
                        commenced streaming <strong className="text-white hover:text-primary cursor-pointer uppercase font-sans tracking-wide" onClick={() => onSelectMovie(item.movieId)}>{item.movieTitle}</strong>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Review block / Custom context block */}
              {item.type === 'rating' && item.reviewText && (
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 relative my-2">
                  <div className="flex gap-0.5 text-secondary select-none mb-1.5">
                    {Array.from({ length: 5 }).map((_, sIdx) => (
                      <Star 
                        key={sIdx} 
                        className={`h-3 w-3 ${sIdx < Math.floor(item.ratingScore || 5) ? 'fill-secondary text-secondary' : 'text-secondary/20'}`} 
                      />
                    ))}
                  </div>
                  <p className="font-sans text-[11.5px] italic text-[#dfd0be] leading-relaxed">
                    "{item.reviewText}"
                  </p>
                </div>
              )}

              {item.type === 'join_room' && item.roomName && (
                <div className="p-2.5 bg-gradient-to-r from-purple-500/5 to-primary/5 rounded-xl border border-primary/10 flex items-center justify-between my-2">
                  <div className="min-w-0">
                    <span className="text-[7.5px] font-mono text-purple-400 font-black tracking-widest uppercase block leading-none">COMMUNAL PORTAL</span>
                    <span className="font-sans font-extrabold text-[#dac2ad] text-[10.5px] block truncate mt-1">Lounge: {item.roomName}</span>
                  </div>
                  <button
                    onClick={() => onJoinRoom(item.movieId)}
                    className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-[#030303] hover:text-white font-sans text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Play className="h-2.5 w-2.5 fill-current" />
                    <span>LOBBY IN</span>
                  </button>
                </div>
              )}

              {/* Movie Backdrop Thumbnail card */}
              {item.type === 'watch' && matchingMovie && (
                <div 
                  onClick={() => onSelectMovie(item.movieId)}
                  className="mx-1 my-2 rounded-xl group overflow-hidden border border-white/5 relative aspect-video cursor-pointer"
                >
                  <img 
                    src={matchingMovie.heroImageUrl || matchingMovie.imageUrl} 
                    alt={matchingMovie.title} 
                    className="w-full h-full object-cover brightness-50 group-hover:scale-105 duration-350 transition-all"
                  />
                  <div className="absolute inset-x-2 bottom-2 bg-black/60 blur-xs max-w-max p-1 rounded"></div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/40 to-transparent p-3 flex justify-between items-end">
                    <div>
                      <span className="font-sans text-[8px] font-black text-secondary uppercase tracking-widest leading-none block">{matchingMovie.genre}</span>
                      <span className="font-display font-black text-xs text-white uppercase block mt-1 leading-none">{matchingMovie.title}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-sans text-[8px] font-black tracking-widest uppercase">
                      STREAMING
                    </span>
                  </div>
                </div>
              )}

              {/* Interaction Likes Row */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-2">
                <button
                  onClick={() => handleLikeActivity(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-sans font-black uppercase tracking-wider transition-all cursor-pointer ${
                    item.hasLiked
                      ? 'bg-purple-500/10 border-purple-500/35 text-purple-400'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white'
                  }`}
                >
                  <Heart className={`h-3 w-3 ${item.hasLiked ? 'fill-purple-400 text-purple-400 animate-pulse' : ''}`} />
                  <span>{item.likesCount} fistbumps</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
