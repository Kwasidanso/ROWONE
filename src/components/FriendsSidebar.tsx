/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  X, 
  UserPlus, 
  UserCheck, 
  Play, 
  Tv, 
  Radio, 
  UserMinus, 
  Clock, 
  Check, 
  Lock, 
  Eye, 
  Sparkles,
  Award,
  CircleDot,
  Send,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';
import { Movie } from '../types';

export interface Friend {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  status: 'watching' | 'idle' | 'offline';
  watchingMovieId?: string;
  watchingMovieTitle?: string;
  watchingRoom?: string;
}

export interface FriendRequest {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  type: 'incoming' | 'outgoing';
}

interface FriendsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  onTriggerAuth: () => void;
  movies: Movie[];
  onJoinFriendRoom: (movieId: string) => void;
  onTriggerNotification: (title: string, msg: string, type: 'screening' | 'invite') => void;
  username: string;
  onFriendsChange?: (friends: Friend[]) => void;
}

export default function FriendsSidebar({
  isOpen,
  onClose,
  isLoggedIn,
  onTriggerAuth,
  movies,
  onJoinFriendRoom,
  onTriggerNotification,
  username,
  onFriendsChange
}: FriendsSidebarProps) {
  // Tabs of control: 'friends' | 'search' | 'requests'
  const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'requests'>('friends');
  
  // Storage keys matching current system username or generic user
  const prefixKey = username ? username : 'guest';

  // State: Friends List
  const [friends, setFriends] = useState<Friend[]>(() => {
    try {
      const stored = localStorage.getItem(`popcorn_friends_${prefixKey}`);
      if (stored) return JSON.parse(stored);
    } catch (e) { console.warn(e); }
    
    // Default system friends for simulated social system
    return [
      {
        id: 'fr1',
        username: 'Leo_V',
        fullName: 'Leo Ventura',
        avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUMMmg4wUjOeGP67BHvckW7QK54LA2AaZMcuCpoM3Hu2vY9Ic9lti4YRyceBT4Xa4aVgS7MpwB64SBM0VilWuJV2mdhKG4RfOmkV6SHU7iEUNbS72EU7jB91skEIP5DDmDYOjKPZmUryVWd3v4_1VXYJ8p9TwrkZJ5eqP3NastiUon4s-VH-EhBJQb4vIFZ294pPzvvwroP1eXEUvONKLSB1iLgrLRvbY9BBCCjiInO0x9ZM1geU0eP_XnbkoiNJzz2yLq-q5qibW7',
        status: 'watching',
        watchingMovieId: 'm6',
        watchingMovieTitle: 'NEON ECHOES',
        watchingRoom: 'IMAX Hall A'
      },
      {
        id: 'fr2',
        username: 'Sarah_Lin',
        fullName: 'Sarah Lin',
        avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBN1zkyN0Pb8734ZFQ0q6_UU1ErZWPzuHCM2h5RXzYtYFsE0wGk0tDndVTt82vO2j9N1i4muihePJYlyoEsyO-MN6WgdBcmG4hdllHWUPnoZYhYXg_4HRe24hHm9FVnJyx5ZLbvxzTg2BXW0sdT-MjvOwU-h9rD5EwNfrgu96iPb_xurjXNQUONPl5E8o68dUeilrcKFFrPvPt-86Vem85Vo0IoL85mzDg1E5ZlDH1QMaFfc-auV_uw3qMgmeWmJU6Ghd40J4E6DfSN',
        status: 'watching',
        watchingMovieId: 'm1',
        watchingMovieTitle: 'THE LAST REEL',
        watchingRoom: 'Screening Room 2'
      },
      {
        id: 'fr3',
        username: 'cyber_junkie',
        fullName: 'Alex Vance',
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150',
        status: 'watching',
        watchingMovieId: 'm7',
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
    ];
  });

  // State: Quick Chat Messages list
  const [chatMessages, setChatMessages] = useState<Record<string, string>>({});

  // State: Active moderation report trigger state
  const [reportingFriendId, setReportingFriendId] = useState<string | null>(null);

  const handleReportUser = (friendId: string, usernameStr: string, reason: string) => {
    setReportingFriendId(null);
    onTriggerNotification(
      'User Report Dispatched 🛡️',
      `Sent abuse flag for @${usernameStr} (${reason}) to cinema moderators. Action pending.`,
      'screening'
    );
  };

  const handleQuickChatSubmit = (e: React.FormEvent, friendId: string, fullName: string, usernameStr: string) => {
    e.preventDefault();
    const msg = chatMessages[friendId]?.trim();
    if (!msg) return;

    // Clear message field
    setChatMessages(prev => ({ ...prev, [friendId]: '' }));
    
    const isInvite = msg.toLowerCase().includes('invite') || msg.toLowerCase().includes('watch') || msg.toLowerCase().includes('sync') || msg.toLowerCase().includes('join') || msg.toLowerCase().includes('lobby');
    
    onTriggerNotification(
      isInvite ? 'Watch Party Invite Sent ✉️' : 'Message Transmitted 💬',
      `Sent message to @${usernameStr}: "${msg}"`,
      isInvite ? 'invite' : 'screening'
    );
  };

  const sendPresetMessage = (friendId: string, fullName: string, usernameStr: string, text: string) => {
    const isInvite = text.toLowerCase().includes('invite') || text.toLowerCase().includes('sync') || text.toLowerCase().includes('couch');
    onTriggerNotification(
      isInvite ? 'Watch Party Invite Sent ✉️' : 'Message Transmitted 💬',
      `Sent preset alert to @${usernameStr}: "${text}"`,
      isInvite ? 'invite' : 'screening'
    );
  };

  // State: Friend Requests
  const [requests, setRequests] = useState<FriendRequest[]>(() => {
    try {
      const stored = localStorage.getItem(`popcorn_requests_${prefixKey}`);
      if (stored) return JSON.parse(stored);
    } catch (e) { console.warn(e); }

    // Preset pending requests to trigger active experience
    return [
      {
        id: 'req1',
        username: 'filmbuff77',
        fullName: 'Marcus Green',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
        type: 'incoming'
      }
    ];
  });

  // Database of searchable other global users to simulate search directory
  const defaultGlobalUsers = [
    { username: 'popcorn_master', fullName: 'Jack Miller', avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=150' },
    { username: 'indie_gal', fullName: 'Sophie White', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150' },
    { username: 'cinephile_max', fullName: 'Max Carter', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150' },
    { username: 'scifi_dreamer', fullName: 'Esther Kim', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150' }
  ];

  const [searchVal, setSearchVal] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchSuccessId, setSearchSuccessId] = useState<string | null>(null);

  // Sync to local storage and propagate up
  useEffect(() => {
    localStorage.setItem(`popcorn_friends_${prefixKey}`, JSON.stringify(friends));
    if (onFriendsChange) {
      onFriendsChange(friends);
    }
  }, [friends, prefixKey, onFriendsChange]);

  useEffect(() => {
    localStorage.setItem(`popcorn_requests_${prefixKey}`, JSON.stringify(requests));
  }, [requests, prefixKey]);

  if (!isOpen) return null;

  // Search filter
  const filteredSearchUsers = defaultGlobalUsers.filter(u => {
    const raw = searchVal.toLowerCase();
    return u.username.toLowerCase().includes(raw) || u.fullName.toLowerCase().includes(raw);
  }).filter(u => {
    // Hide if already friends or has request
    const isFriend = friends.some(f => f.username === u.username);
    const hasRequest = requests.some(r => r.username === u.username);
    return !isFriend && !hasRequest;
  });

  const handleSendFriendRequestDirect = (targetName: string) => {
    if (!isLoggedIn) {
      onTriggerAuth();
      return;
    }

    const matchedGlobal = defaultGlobalUsers.find(u => u.username === targetName) || {
      username: targetName,
      fullName: targetName.replace('_', ' '),
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150`
    };

    const newReq: FriendRequest = {
      id: `req-${Date.now()}`,
      username: matchedGlobal.username,
      fullName: matchedGlobal.fullName,
      avatarUrl: matchedGlobal.avatarUrl,
      type: 'outgoing'
    };

    setRequests(prev => [newReq, ...prev]);
    onTriggerNotification(
      'Friend Request Sent 💌', 
      `Request transmitted to @${matchedGlobal.username}. They'll approve soon!`,
      'screening'
    );

    // Simulate auto-approval after 2.5s for pristine responsive interaction!
    setTimeout(() => {
      // Move to friends list
      setRequests(prev => prev.filter(r => r.username !== matchedGlobal.username));
      
      const newFriend: Friend = {
        id: `fr-${Date.now()}`,
        username: matchedGlobal.username,
        fullName: matchedGlobal.fullName,
        avatarUrl: matchedGlobal.avatarUrl,
        status: 'idle',
      };

      setFriends(prev => [newFriend, ...prev]);

      onTriggerNotification(
        'Connected with Friend 👑',
        `@${matchedGlobal.username} accepted your invitation! They are now in your squad.`,
        'invite'
      );
    }, 3000);
  };

  const handleCustomSearchSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    
    const term = searchVal.trim().replaceAll(' ', '_').toLowerCase();
    setLoadingSearch(true);
    
    setTimeout(() => {
      setLoadingSearch(false);
      handleSendFriendRequestDirect(term);
      setSearchSuccessId(term);
      setSearchVal('');
      setTimeout(() => setSearchSuccessId(null), 2000);
    }, 600);
  };

  const handleAcceptRequest = (id: string, reqUsername: string) => {
    const matchingReq = requests.find(r => r.id === id);
    if (!matchingReq) return;

    // Remove from request list
    setRequests(prev => prev.filter(r => r.id !== id));

    // Random choice of movie states to make connected experience cinematic
    const movieKeys = ['m1', 'm6', 'm7', 'm8'];
    const selectedId = movieKeys[Math.floor(Math.random() * movieKeys.length)];
    const matchingMovie = movies.find(m => m.id === selectedId);

    const isWatching = Math.random() > 0.3;

    const newFriend: Friend = {
      id: `fr-${Date.now()}`,
      username: matchingReq.username,
      fullName: matchingReq.fullName,
      avatarUrl: matchingReq.avatarUrl,
      status: isWatching ? 'watching' : 'idle',
      watchingMovieId: isWatching ? selectedId : undefined,
      watchingMovieTitle: isWatching && matchingMovie ? matchingMovie.title : undefined,
      watchingRoom: isWatching ? 'Room Hall ' + (Math.floor(Math.random() * 3) + 1) : undefined
    };

    setFriends(prev => [newFriend, ...prev]);
    onTriggerNotification(
      'New Friend Joined 🍿', 
      `Accepted @${reqUsername}'s invite request. Find them in their screening room!`,
      'invite'
    );
  };

  const handleDeclineRequest = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleUnfriend = (id: string, usernameStr: string) => {
    setFriends(prev => prev.filter(f => f.id !== id));
    onTriggerNotification(
      'Squad Circle Left', 
      `Removed @${usernameStr} from your active lobbies.`,
      'screening'
    );
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[380px] bg-[#0d0912]/95 backdrop-blur-2xl border-l border-white/5 z-50 flex flex-col justify-between shadow-2xl shadow-pink-950/25 animate-fade-in text-on-surface select-none">
      
      {/* 1. Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Users className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="font-display font-black text-xs uppercase tracking-widest text-[#f0e7dc]">Squad &amp; Friends</h3>
            <span className="font-mono text-[8px] text-purple-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
              <CircleDot className="h-1.5 w-1.5 fill-purple-400 animate-pulse text-purple-400" />
              <span>{friends.filter(f => f.status === 'watching').length} Active Screeners</span>
            </span>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-all cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {!isLoggedIn ? (
        /* Unauthenticated visual callout */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Lock className="h-6 w-6 stroke-2" />
          </div>
          <div className="space-y-1.5">
            <h4 className="font-display font-black text-xs uppercase tracking-widest text-[#ece0d1]">Authentication Required</h4>
            <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed max-w-[240px] lowercase">
              log in with your popcorn account to connect with active screeners, send watch party invites, and synchronize screens in real-time.
            </p>
          </div>
          <button
            onClick={() => {
              onClose();
              onTriggerAuth();
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-primary hover:from-purple-600 outline-none text-white font-sans text-[10px] font-black tracking-widest uppercase rounded-lg shadow-md duration-200 cursor-pointer"
          >
            Authenticate Profile
          </button>
        </div>
      ) : (
        /* Authenticated Workspace */
        <>
          {/* 2. Mode Tabs Control Bar */}
          <div className="flex border-b border-white/5 bg-black/10">
            {[
              { id: 'friends', label: `My Squad (${friends.length})` },
              { id: 'search', label: 'Find users' },
              { id: 'requests', label: requests.length > 0 ? `Requests (${requests.length}) 🛑` : 'Requests' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 text-center font-sans text-[9px] font-black uppercase tracking-widest cursor-pointer border-b md:text-[10px] ${
                  activeTab === tab.id
                    ? 'text-primary border-primary bg-white/[0.02]'
                    : 'text-on-surface-variant border-transparent hover:text-white hover:bg-white/[0.01]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 3. Panel Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {activeTab === 'friends' && (
              <div className="space-y-3">
                {friends.length === 0 ? (
                  <div className="py-12 text-center text-on-surface-variant border border-dashed border-white/5 rounded-2xl">
                    <Users className="h-5 w-5 mx-auto text-outline-variant opacity-40 mb-2" />
                    <span className="font-sans text-[10px] uppercase font-black tracking-widest leading-none block">Couch Squad is Empty</span>
                    <p className="font-sans text-[9px] opacity-70 mt-1 max-w-[200px] mx-auto lowercase leading-snug">use the finding wizard to discover online film critics</p>
                  </div>
                ) : (
                  friends.map((friend) => (
                    <div 
                      key={friend.id}
                      className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 duration-200 flex flex-col gap-3 group/item"
                    >
                      <div 
                        onClick={() => {
                          if (friend.status === 'watching' && friend.watchingMovieId) {
                            onJoinFriendRoom(friend.watchingMovieId);
                            onClose();
                          } else {
                            onTriggerNotification(
                              'Spectator Idle 💤',
                              `@${friend.username} is currently idle or offline and has no active screening room.`,
                              'screening'
                            );
                          }
                        }}
                        className={`flex items-center gap-3 p-1 rounded-lg transition-all duration-300 ${
                          friend.status === 'watching' && friend.watchingMovieId
                            ? 'cursor-pointer hover:bg-green-500/10 hover:shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                            : 'cursor-help hover:bg-white/5'
                        }`}
                        title={
                          friend.status === 'watching' && friend.watchingMovieId
                            ? `Click to join @${friend.username}'s active room: ${friend.watchingRoom}`
                            : `@${friend.username} is currently ${friend.status}`
                        }
                      >
                        <div className="relative shrink-0 group/tooltip cursor-pointer">
                          <img 
                            src={friend.avatarUrl} 
                            alt={friend.username} 
                            className="w-10 h-10 rounded-full object-cover border border-white/10"
                            referrerPolicy="no-referrer"
                          />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0912] ${
                            friend.status === 'watching' 
                              ? 'bg-green-500 animate-pulse' 
                              : friend.status === 'idle' 
                                ? 'bg-amber-400' 
                                : 'bg-gray-600'
                          }`} />

                          {/* Sidebar Avatar Status Hover Tooltip */}
                          <div className="absolute bottom-11 right-0 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 scale-90 group-hover/tooltip:scale-100 bg-[#161122] border border-purple-500/30 backdrop-blur-md px-3 py-2 rounded-xl shadow-2xl w-48 text-left z-50">
                            <span className="font-sans font-black text-[10px] text-white block uppercase tracking-wide leading-none">{friend.fullName}</span>
                            <p className="font-sans text-[8.5px] text-[#dac6b8] leading-normal pt-1 break-words lowercase">
                              {friend.status === 'watching' ? (
                                <>
                                  watching <strong className="text-white uppercase font-sans">{friend.watchingMovieTitle}</strong> in <strong className="text-primary">{friend.watchingRoom}</strong>
                                </>
                              ) : friend.status === 'idle' ? (
                                <>
                                  lobby corridor browsing (idle)
                                </>
                              ) : (
                                <>
                                  spectator is offline
                                </>
                              )}
                            </p>
                            <div className="absolute top-full right-3 border-4 border-transparent border-t-[#161122]" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-sans font-black text-xs text-[#ebdccb] truncate tracking-wide">
                              {friend.fullName}
                            </h4>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReportingFriendId(reportingFriendId === friend.id ? null : friend.id);
                                }}
                                className={`${reportingFriendId === friend.id ? 'opacity-100 text-red-400' : 'opacity-0 group-hover/item:opacity-100'} p-1 text-on-surface-variant hover:text-red-400 rounded transition-all cursor-pointer`}
                                title="Report user to moderator"
                              >
                                <ShieldAlert className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnfriend(friend.id, friend.username);
                                }}
                                className="opacity-0 group-hover/item:opacity-100 p-1 text-on-surface-variant hover:text-red-400 rounded transition-all cursor-pointer"
                                title="Unfriend"
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <span className="font-sans text-[10px] text-on-surface-variant block truncate">
                            @{friend.username}
                          </span>
                        </div>
                      </div>

                      {/* Discrete Report Panel Selection */}
                      {reportingFriendId === friend.id && (
                        <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/15 space-y-2 mt-1 animate-fade-in select-none">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono font-black text-red-400 uppercase tracking-widest flex items-center gap-1">
                              <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                              <span>REPORT CONDUCT VIOLATION</span>
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReportingFriendId(null);
                              }}
                              className="text-[8px] font-mono font-bold text-zinc-400 hover:text-white uppercase px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                            >
                              CANCEL
                            </button>
                          </div>
                          <p className="text-[9px] font-sans text-on-surface-variant leading-relaxed lowercase">
                            select a violation conduct category regarding @{friend.username} within private or public watching environments.
                          </p>
                          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                            {[
                              { label: 'Harassment 🚷', reason: 'Abusive language/harassment' },
                              { label: 'Spoiler Spam 🚨', reason: 'Spoiler/Chat spamming' },
                              { label: 'Room Hijack 🎭', reason: 'Sync room disruption' },
                              { label: 'NSFW Profile 🔞', reason: 'Inappropriate content/profile avatar' }
                            ].map((v) => (
                              <button
                                key={v.reason}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReportUser(friend.id, friend.username, v.reason);
                                }}
                                className="p-1.5 bg-black/40 hover:bg-red-500 hover:text-black border border-white/5 hover:border-transparent text-left font-sans text-[8px] font-black uppercase tracking-widest text-zinc-300 rounded transition-all cursor-pointer truncate"
                              >
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Watch state callout or lounge sync join helper */}
                      {friend.status === 'watching' && friend.watchingMovieId && (
                        <div className="p-2.5 rounded-lg bg-green-500/5 hover:bg-green-500/10 border border-green-500/10 flex items-center justify-between gap-2.5">
                          <div className="min-w-0">
                            <span className="font-mono text-[7.5px] font-black text-green-400 uppercase tracking-widest block leading-none">ROOM: {friend.watchingRoom}</span>
                            <span className="font-sans font-bold text-[11px] text-white block mt-1 truncate max-w-[160px]">
                              {friend.watchingMovieTitle}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              onJoinFriendRoom(friend.watchingMovieId!);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-black font-sans text-[9px] font-extrabold uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <Play className="h-2.5 w-2.5 fill-black" />
                            <span>JOIN THEM</span>
                          </button>
                        </div>
                      )}

                      {friend.status === 'idle' && (
                        <span className="font-sans text-[9px] text-amber-400/80 lowercase italic pl-1 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-amber-400" />
                          <span>browsing theater lobby corridors</span>
                        </span>
                      )}

                      {/* Quick Chat / Invite Input Module */}
                      <div className="pt-2 border-t border-white/[0.04] space-y-2">
                        <form 
                          onSubmit={(e) => handleQuickChatSubmit(e, friend.id, friend.fullName, friend.username)}
                          className="flex gap-1.5 items-center"
                        >
                          <input
                            type="text"
                            placeholder={`send message or invite...`}
                            value={chatMessages[friend.id] || ''}
                            onChange={(e) => setChatMessages(prev => ({ ...prev, [friend.id]: e.target.value }))}
                            className="flex-1 bg-black/40 hover:bg-black/60 focus:bg-black/70 border border-white/5 hover:border-purple-500/20 focus:border-primary/40 rounded-xl px-2.5 py-1.5 font-sans text-[10px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none transition-all tracking-wide"
                          />
                          <button
                            type="submit"
                            className="p-1.5 bg-purple-500/10 hover:bg-primary text-purple-400 hover:text-black rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center"
                            title="Transmit status/invite message"
                          >
                            <Send className="h-3 w-3" />
                          </button>
                        </form>

                        {/* Quick chips to send common status updates / quick invitations */}
                        <div className="flex flex-wrap gap-1">
                          {[
                            { label: 'invite 🍿', text: 'hey, want to sync screens and watch a movie together?' },
                            { label: 'buzz 👋', text: 'hey! are you free to join a screen lobby?' },
                            { label: 'sync 🎮', text: 'join my companion tv stream now!' }
                          ].map((preset, index) => (
                            <button
                              key={index}
                              onClick={() => sendPresetMessage(friend.id, friend.fullName, friend.username, preset.text)}
                              className="px-2 py-0.5 bg-white/[0.02] hover:bg-primary/20 hover:text-primary text-on-surface-variant font-sans text-[7.5px] font-bold rounded border border-white/5 transition-all cursor-pointer uppercase tracking-wider"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'search' && (
              <div className="space-y-4">
                {/* Search / Add input */}
                <form onSubmit={handleCustomSearchSend} className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant" />
                    <input
                      type="text"
                      placeholder="Type username directly..."
                      value={searchVal}
                      onChange={(e) => setSearchVal(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-white/5 rounded-xl font-sans text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-purple-400/40"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white font-sans text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                    disabled={loadingSearch}
                  >
                    {loadingSearch ? '...' : 'ADD'}
                  </button>
                </form>

                {searchSuccessId && (
                  <div className="p-2.5 bg-green-500/10 border border-green-500/20 text-center text-green-400 font-sans text-[9px] font-extrabold uppercase tracking-widest rounded-lg animate-fade-in">
                    ✔ Friend request dispatched to @{searchSuccessId}!
                  </div>
                )}

                {/* Simulated directory listings */}
                <div className="space-y-3 pt-2">
                  <span className="text-[8px] font-sans text-on-surface-variant uppercase font-black tracking-widest leading-none block pl-1">Recommended Critics</span>
                  
                  {filteredSearchUsers.length === 0 ? (
                    <div className="py-4 text-center text-on-surface-variant font-sans text-[9px] lowercase opacity-50">
                      no remaining un-friend users listed in system radar directory
                    </div>
                  ) : (
                    filteredSearchUsers.map((user) => (
                      <div 
                        key={user.username}
                        className="p-3 bg-white/[0.01] hover:bg-white/[0.03] rounded-xl border border-white/5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img 
                            src={user.avatarUrl} 
                            alt={user.username} 
                            className="w-8 h-8 rounded-full object-cover border border-white/5"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h5 className="font-sans font-black text-[11px] text-[#dac8bb] truncate">
                              {user.fullName}
                            </h5>
                            <span className="font-sans text-[9px] text-on-surface-variant block truncate">@{user.username}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSendFriendRequestDirect(user.username)}
                          className="p-2 bg-purple-500/10 hover:bg-purple-500 hover:text-white rounded-lg transition-all text-purple-400 flex items-center gap-1.5 cursor-pointer"
                          title="Send request"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-3">
                
                {/* Outgoing pending preview list if outgoing request exists */}
                {requests.filter(r => r.type === 'outgoing').length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[8px] font-sans text-on-surface-variant uppercase font-black tracking-widest">OUTGOING REQUESTS (PENDING APPROVED)</span>
                    {requests.filter(r => r.type === 'outgoing').map((r) => (
                      <div key={r.id} className="p-3 bg-white/[0.01] border border-dashed border-white/5 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <img src={r.avatarUrl} alt={r.username} className="w-7 h-7 rounded-full object-cover" />
                          <div>
                            <span className="font-sans font-bold text-xs block text-[#decabb]">@{r.username}</span>
                            <span className="font-sans text-[8px] text-on-surface-variant block tracking-wider uppercase">COMMUNAL APPROVAL PENDING</span>
                          </div>
                        </div>
                        <div className="px-2 py-1 rounded bg-[#ff4a4a]/5 border border-[#ff4a4a]/20 text-red-400 font-sans text-[7.5px] font-extrabold uppercase animate-pulse">
                          Transmitting
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2.5 pt-2">
                  <span className="text-[8px] font-sans text-on-surface-variant uppercase font-black tracking-widest">INCOMING REQUESTS</span>

                  {requests.filter(r => r.type === 'incoming').length === 0 ? (
                    <div className="py-8 text-center text-on-surface-variant border border-dashed border-white/5 rounded-2xl">
                      <Clock className="h-4.5 w-4.5 mx-auto text-outline-variant opacity-30 mb-2" />
                      <span className="font-sans text-[9px] uppercase font-black tracking-widest">No pending proposals</span>
                    </div>
                  ) : (
                    requests.filter(r => r.type === 'incoming').map((req) => (
                      <div 
                        key={req.id}
                        className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 flex flex-col gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={req.avatarUrl} 
                            alt={req.username} 
                            className="w-8 h-8 rounded-full border border-white/5 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h5 className="font-sans font-extrabold text-[#ede2d6] text-[11px] leading-tight">{req.fullName}</h5>
                            <span className="font-sans text-[9px] text-on-surface-variant block">@{req.username} wants to buddy</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(req.id, req.username)}
                            className="flex-1 py-1 px-3 bg-purple-500 hover:bg-purple-600 text-white font-sans text-[9px] font-black uppercase tracking-widest rounded-lg cursor-pointer transition-colors text-center"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(req.id)}
                            className="py-1 px-3 bg-white/5 hover:bg-white/10 text-on-surface-variant font-sans text-[9px] font-black uppercase tracking-widest rounded-lg cursor-pointer transition-colors text-center"
                          >
                            Ignore
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

          </div>

          {/* 4. Footer info */}
          <div className="p-4 border-t border-white/5 bg-black/40 text-center text-[8.5px] font-sans text-[#b8ab9a] lowercase leading-snug">
            buddy matching sync is globally secure. send invites to synchronise playback times flawlessly.
          </div>
        </>
      )}

    </div>
  );
}
