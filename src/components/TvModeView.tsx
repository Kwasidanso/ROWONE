import React, { useState, useEffect, useRef } from 'react';
import { 
  Tv, 
  Play, 
  CornerDownLeft, 
  Smartphone, 
  Crown, 
  Power, 
  Sparkles, 
  Check, 
  ExternalLink,
  MessageSquare,
  Volume2,
  VolumeX,
  Users,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  Plus
} from 'lucide-react';
import { Movie, StudioScreening, ChatMessage } from '../types';

interface TvModeViewProps {
  movies: Movie[];
  onExitTvMode: () => void;
  onAwardBadge?: (badgeName: string) => void;
  isLoggedIn: boolean;
  username: string;
}

export default function TvModeView({ 
  movies, 
  onExitTvMode, 
  onAwardBadge,
  isLoggedIn,
  username
}: TvModeViewProps) {
  // Navigation grid sections: 'menu' (top header bar), 'movies' (main body), 'detail' (movie sheet), 'player' (active playback)
  const [navSection, setNavSection] = useState<'menu' | 'movies' | 'detail' | 'player'>('movies');
  const [focusedMenuIdx, setFocusedMenuIdx] = useState(0); // 0: Home, 1: Pair Companion, 2: Exit
  const [focusedMovieIdx, setFocusedMovieIdx] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  
  // Movie Detail Focus Indices: 0: Play/Enter Cinema, 1: Pair Phone Companion, 2: Back to Grid, 3: Next Movie
  const [focusedDetailBtnIdx, setFocusedDetailBtnIdx] = useState(0);

  // Active TV view states
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration] = useState(7200); // 2 hours
  const [isMuted, setIsMuted] = useState(false);
  const [tvVolume, setTvVolume] = useState(75);

  // TV Chat state (subtle overlay on the bottom like YouTube TV chat widget)
  const [tvChat, setTvChat] = useState<ChatMessage[]>(() => [
    { id: 'tv-1', username: 'CineLover_TV', text: 'This looks stunning in 4K HDR! 🍿', timestamp: '9:30 PM' },
    { id: 'tv-2', username: 'GamerGuy_90', text: 'Is the showrunner answering Q&A? 🎙️', timestamp: '9:31 PM' },
    { id: 'tv-3', username: 'Director_Fan', text: 'Stunning opening credits!', timestamp: '9:32 PM' },
    { id: 'tv-4', username: 'ROWONE_Chef', text: 'Virtual butter is extra salty tonight!', timestamp: '9:32 PM' },
    { id: 'tv-5', username: 'NightOwler', text: 'Anyone else scanning from their sofa?', timestamp: '9:33 PM' }
  ]);
  const [newChatText, setNewChatText] = useState('');

  // Mobile Pairing state
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [showVirtualPhone, setShowVirtualPhone] = useState(false); 
  const [phoneSynced, setPhoneSynced] = useState(false);
  const [selectedCompanionSeat, setSelectedCompanionSeat] = useState<string | null>(null);
  const [customInviteName, setCustomInviteName] = useState('');
  const [invitedGuestsList, setInvitedGuestsList] = useState<string[]>(['Jane Doe', 'Julian (Star Cast)']);
  const [companionNotification, setCompanionNotification] = useState<string | null>(null);
  const [companionChatMsg, setCompanionChatMsg] = useState('');

  // Active notifications shown on the TV screen
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filterMovies = movies.slice(0, 6); // Top curated movies for TV display row

  // Helper to show automated feedback on TV screen
  const showTvToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Staggered countdown helper
  useEffect(() => {
    if (isPlaying) {
      const timer = setInterval(() => {
        setVideoTime(prev => {
          if (prev >= videoDuration) {
            setIsPlaying(false);
            if (onAwardBadge) {
              onAwardBadge(`Big Screen Ambassador: ${selectedMovie?.title || 'Premiere'}`);
            }
            return videoDuration;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isPlaying, selectedMovie, onAwardBadge]);

  // Automated TV chat scroller (adds simulated messages for visual life)
  useEffect(() => {
    if (isPlaying) {
      const chatterTimer = setInterval(() => {
        const simulatedSpam = [
          "OMGG 👑",
          "This sequence is perfect",
          "The score is incredible! 🔊",
          "What format is this airing in?",
          "TV mode feels so immersive!!",
          "Awesome projection quality!",
          "Wow look at that detail!",
          "ROWONE pass came in clutch!"
        ];
        const randomUser = ["CouchTheater", "LazyPro", "PixelPerfect", "GigaWatch", "CinematicSofa"][Math.floor(Math.random() * 5)];
        const text = simulatedSpam[Math.floor(Math.random() * simulatedSpam.length)];
        
        setTvChat(prev => [
          ...prev.slice(-12), // Keep performance pristine
          { id: `auto-tv-${Date.now()}`, username: randomUser, text, timestamp: 'Now' }
        ]);
      }, 5500);

      return () => clearInterval(chatterTimer);
    }
  }, [isPlaying]);

  // Keyboard navigation handler for remote feeling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user typing in pairing input, ignore key catches
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onTvNavigate('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onTvNavigate('down');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onTvNavigate('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onTvNavigate('right');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onTvNavigate('select');
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        onTvNavigate('back');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navSection, focusedMenuIdx, focusedMovieIdx, focusedDetailBtnIdx, selectedMovie, isPlaying]);

  // Actual dispatch action matching Arrow controls
  const onTvNavigate = (direction: 'up' | 'down' | 'left' | 'right' | 'select' | 'back') => {
    if (isPlaying) {
      if (direction === 'back') {
        setIsPlaying(false);
        showTvToast('Playback paused. Returned to film sheet.');
      } else if (direction === 'select') {
        setIsMuted(prev => !prev);
        showTvToast(isMuted ? 'Volume Unmuted 🔊' : 'Volume Muted 🔇');
      }
      return;
    }

    if (direction === 'back') {
      if (selectedMovie) {
        setSelectedMovie(null);
        setNavSection('movies');
      } else {
        showTvToast("Press 'EXIT TV' or Power to return to web display.");
      }
      return;
    }

    if (navSection === 'menu') {
      if (direction === 'down') {
        setNavSection('movies');
      } else if (direction === 'left') {
        setFocusedMenuIdx(prev => Math.max(0, prev - 1));
      } else if (direction === 'right') {
        setFocusedMenuIdx(prev => Math.min(2, prev + 1));
      } else if (direction === 'select') {
        triggerMenuAction(focusedMenuIdx);
      }
    } 
    else if (navSection === 'movies') {
      if (direction === 'up') {
        setNavSection('menu');
      } else if (direction === 'left') {
        setFocusedMovieIdx(prev => Math.max(0, prev - 1));
      } else if (direction === 'right') {
        setFocusedMovieIdx(prev => Math.min(filterMovies.length - 1, prev + 1));
      } else if (direction === 'select') {
        setSelectedMovie(filterMovies[focusedMovieIdx]);
        setNavSection('detail');
        setFocusedDetailBtnIdx(0);
      }
    } 
    else if (navSection === 'detail') {
      if (direction === 'left') {
        setFocusedDetailBtnIdx(prev => Math.max(0, prev - 1));
      } else if (direction === 'right') {
        setFocusedDetailBtnIdx(prev => Math.min(3, prev + 1));
      } else if (direction === 'select') {
        triggerDetailAction(focusedDetailBtnIdx);
      } else if (direction === 'up' || direction === 'down') {
        // bounce focus indicators
      }
    }
  };

  const triggerMenuAction = (idx: number) => {
    if (idx === 0) {
      setNavSection('movies');
      setSelectedMovie(null);
      showTvToast('Navigating: Home Showcase Grid active.');
    } else if (idx === 1) {
      setShowPairingModal(true);
      setShowVirtualPhone(true);
      showTvToast('Opening phone companion integration...');
    } else if (idx === 2) {
      onExitTvMode();
    }
  };

  const triggerDetailAction = (idx: number) => {
    if (!selectedMovie) return;
    if (idx === 0) {
      setIsPlaying(true);
      showTvToast(`Now Broadcasting: ${selectedMovie.title} (TV 4K Mode)`);
    } else if (idx === 1) {
      setShowPairingModal(true);
      setShowVirtualPhone(true);
    } else if (idx === 2) {
      setSelectedMovie(null);
      setNavSection('movies');
    } else if (idx === 3) {
      // Loop to next movie
      const curIndex = filterMovies.findIndex(m => m.id === selectedMovie.id);
      const nextIdx = (curIndex + 1) * 1 % filterMovies.length;
      setSelectedMovie(filterMovies[nextIdx]);
      setFocusedDetailBtnIdx(0);
    }
  };

  // Companion remote features
  const handleCompanionSeatSelect = (seatNum: string) => {
    setSelectedCompanionSeat(seatNum);
    setPhoneSynced(true);
    showTvToast(`🛋️ Mobile Synced: Reserved Row Marker [${seatNum}] on TV!`);
    triggerCompanionFeedback(`Seat ${seatNum} confirmed! Watch Live stream on your TV screen.`);
  };

  const handleCompanionInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInviteName.trim()) return;
    setInvitedGuestsList(prev => [...prev, customInviteName]);
    showTvToast(`✉️ Synced App: Invited ${customInviteName} via phone!`);
    triggerCompanionFeedback(`Invitation dispatched instantly on TV!`);
    setCustomInviteName('');
  };

  const handleCompanionChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companionChatMsg.trim()) return;
    const newMsg: ChatMessage = {
      id: `phone-${Date.now()}`,
      username: username ? `${username} (Phone 📱)` : 'Guest Companion 📱',
      text: companionChatMsg,
      timestamp: 'Now'
    };
    setTvChat(prev => [...prev, newMsg]);
    setCompanionChatMsg('');
    showTvToast(`💬 Message parsed from synched smartphone!`);
  };

  const triggerCompanionFeedback = (msg: string) => {
    setCompanionNotification(msg);
    setTimeout(() => {
      setCompanionNotification(null);
    }, 4500);
  };

  // Format second helper
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full min-h-screen bg-[#070505] text-[#fbfbf9] flex flex-col items-center p-3 sm:p-6 overflow-x-hidden font-sans select-none border-t-4 border-yellow-500 shadow-[inset_0_4px_30px_rgba(245,158,11,0.25)]">
      
      {/* 📺 Outer Living Room Bezel Simulation Decorator */}
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 relative z-10">
        
        {/* Dynamic Warning Notification Strip */}
        {toastMessage && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 py-3.5 px-6 bg-yellow-500 text-black rounded-2xl border-2 border-yellow-400 font-sans text-xs font-black uppercase tracking-wider shadow-2xl flex items-center gap-2 animate-bounce">
            <span className="text-base">📺</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Global Control Header bar of Smart TV layout */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <span className="bg-yellow-500 text-black px-3 py-1 text-[10px] sm:text-xs font-black rounded-lg uppercase tracking-widest flex items-center gap-1">
              <Tv className="w-3.5 h-3.5 animate-pulse" />
              POPCORN SMART TV OS
            </span>
            <div className="text-left">
              <h1 className="text-sm font-sans font-black tracking-widest text-[#dac6a8] uppercase">LARGE SCREEN CALIBRATION</h1>
              <p className="text-[10px] text-white/50 lowercase leading-none">optimized presentation layout specifically scaled for massive 55"+ tv viewing</p>
            </div>
          </div>

          {/* Interactive Menu Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-neutral-900/90 border border-white/5 p-1.5 rounded-2xl">
            <button
              onClick={() => { setNavSection('menu'); setFocusedMenuIdx(0); }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-mono tracking-widest uppercase transition-all flex items-center gap-1.5 ${
                navSection === 'menu' && focusedMenuIdx === 0 
                  ? 'bg-white text-black font-extrabold scale-102 shadow-glow' 
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              👑 Home Grid
            </button>
            <button
              onClick={() => { setNavSection('menu'); setFocusedMenuIdx(1); setShowPairingModal(true); setShowVirtualPhone(true); }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-mono tracking-widest uppercase transition-all flex items-center gap-1.5 ${
                navSection === 'menu' && focusedMenuIdx === 1 
                  ? 'bg-yellow-500 text-black font-extrabold scale-102' 
                  : 'text-[#dac6a8] hover:text-white'
              }`}
            >
              <Smartphone className="w-3 h-3 animate-bounce" />
              Pair Companion App
            </button>
            <button
              onClick={onExitTvMode}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-mono tracking-widest uppercase bg-rose-500/10 hover:bg-rose-500 hover:text-white transition-all text-red-400 ${
                navSection === 'menu' && focusedMenuIdx === 2
                  ? 'bg-rose-500 text-white font-extrabold'
                  : ''
              }`}
            >
              <Power className="w-3.5 h-3.5 inline mr-1" />
              Exit TV Mode
            </button>
          </div>
        </div>

        {/* Main Interface Split Screen: left is simulation canvas, right is on-screen remote */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* TV CANVAS CONTAINER AREA (scales perfectly into huge sizes) */}
          <div className="lg:col-span-9 bg-neutral-950 border-4 border-neutral-900 rounded-3xl p-4 sm:p-8 min-h-[580px] shadow-2xl relative flex flex-col justify-between overflow-hidden">
            
            {/* Soft backdrop background light reflection simulation */}
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[200px] pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-[300px] h-[300px] bg-[#9d174d]/5 rounded-full blur-[180px] pointer-events-none" />

            {/* --- ACTIVE MEDIA PLAYER STATE STREAMING --- */}
            {isPlaying && selectedMovie ? (
              <div className="w-full h-full flex flex-col justify-between z-10 animate-fade-in relative">
                
                {/* Upper banner controls showing 4K rating */}
                <div className="flex justify-between items-center bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/5">
                  <div className="text-left space-y-1">
                    <span className="font-mono text-[9px] text-yellow-400 font-extrabold uppercase tracking-widest flex items-center gap-1 animate-pulse">
                      <Sparkles className="h-3 w-3" />
                      COMMUNAL PREMIERE BROADCAST ACTIVE
                    </span>
                    <h2 className="text-xl sm:text-2xl font-serif text-[#F5EFEB] leading-none uppercase">{selectedMovie.title}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-yellow-500 text-black px-2.5 py-0.5 text-[8px] font-sans font-black tracking-widest uppercase rounded">
                      4K HDR CINEMA
                    </span>
                    <span className="font-mono text-xs text-white/50">{formatTime(videoTime)} / {formatTime(videoDuration)}</span>
                  </div>
                </div>

                {/* Sub-Screen Mock Video Canvas area */}
                <div className="relative w-full aspect-video md:h-[300px] bg-neutral-900 rounded-2xl border border-yellow-500/20 my-4 overflow-hidden flex items-center justify-center">
                  
                  {/* Atmospheric static/video placeholder banner */}
                  <img 
                    src={selectedMovie.imageUrl} 
                    alt={selectedMovie.title} 
                    className="absolute inset-0 w-full h-full object-cover opacity-35 filter blur-md"
                    referrerPolicy="no-referrer"
                  />

                  {/* High visual simulated cinema stream overlay */}
                  <div className="relative z-10 flex flex-col items-center gap-3 bg-black/75 p-6 rounded-2xl border border-white/5 max-w-md mx-auto text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin flex items-center justify-center text-yellow-400 font-black text-xl">
                      🍿
                    </div>
                    <div className="space-y-1 text-center">
                      <span className="font-mono text-[8px] text-[#dac6a8] font-bold uppercase tracking-widest block">STREAMING AUDIO LOOPING</span>
                      <p className="font-sans text-[11px] text-[#eee] capitalize leading-snug">Cinema projectors active. Adjust stream using on-screen virtual remote clickers or your keyboard.</p>
                    </div>
                  </div>

                  {/* 💬 SUBTLE TV CHAT OVERLAY AT THE BOTTOM (YouTube TV layout) */}
                  <div className="absolute bottom-4 left-4 right-4 z-20 overflow-hidden h-[120px] select-none flex flex-col justify-end">
                    <div className="flex items-center gap-1 bg-black/65 py-1 px-3.5 backdrop-blur-lg border border-white/10 rounded-full w-max text-[8px] font-sans font-black text-yellow-400 uppercase tracking-widest mb-2 gap-1.5 pl-2.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                      </span>
                      <span>LIVE SOFA COMMENTS OVERLAY ACTIVE</span>
                    </div>

                    {/* Left/Right scroller flow simulated for television overlay */}
                    <div className="flex gap-3 overflow-x-auto scrollbar-none py-1 h-[65px] items-stretch pr-28">
                      {tvChat.map((msg, index) => (
                        <div 
                          key={`tc-${msg.id}-${index}`}
                          className="bg-neutral-950/90 border border-yellow-500/20 rounded-2xl p-2.5 flex items-center gap-3 drop-shadow-xl shrink-0 min-w-[210px] max-w-[260px] animate-fade-in"
                        >
                          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-500 text-black flex items-center justify-center shadow font-serif text-sm font-black text-center shrink-0">
                            🍿
                          </div>
                          <div className="min-w-0 text-left">
                            <span className="font-sans text-[9px] font-black text-yellow-400 block truncate">@{msg.username}</span>
                            <p className="font-sans text-[10px] text-white/90 truncate leading-snug">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Simulated Player Controls Strip */}
                <div className="bg-black/80 p-4 border border-white/10 rounded-3xl flex justify-between items-center gap-3 text-left">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-3.5 bg-yellow-500 hover:scale-[1.02] text-black font-semibold rounded-2xl shadow-glow cursor-pointer transition-transform"
                      title="Pause Cinema"
                    >
                      {isPlaying ? '⏸️ PAUSE' : '▶️ PLAY'}
                    </button>
                    <div>
                      <span className="font-mono text-[8px] text-white/50 block">TV FORMAT MODE</span>
                      <span className="font-sans text-xs font-black uppercase text-yellow-400">{selectedMovie.format} ULTRA ENHANCED</span>
                    </div>
                  </div>

                  {/* Volume Calibration */}
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4.5 w-4.5 text-yellow-400" />
                    <div className="w-24 bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-yellow-500 h-full" style={{ width: `${tvVolume}%` }} />
                    </div>
                    <span className="font-mono text-[9px] text-[#dac6a8] font-black uppercase">{tvVolume}%</span>
                  </div>
                </div>

              </div>
            ) : selectedMovie ? (
              
              /* --- MOVIE SHEET DETAIL PRESENTATION DISPLAY --- */
              <div className="w-full flex-grow flex flex-col justify-between z-10 animate-fade-in text-left">
                
                {/* Back Link Row */}
                <div className="pb-4">
                  <button
                    onClick={() => { setSelectedMovie(null); setNavSection('movies'); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-mono text-xs text-white font-black uppercase cursor-pointer"
                  >
                    <span>◀ back to selection grid</span>
                  </button>
                </div>

                {/* Giant detailed showcase grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center md:items-stretch py-4">
                  
                  {/* Poster Thumbnail element */}
                  <div className="md:col-span-4 rounded-3xl overflow-hidden border-4 border-yellow-500/30 shadow-[0_0_40px_rgba(245,158,11,0.1)] relative">
                    <img 
                      src={selectedMovie.imageUrl} 
                      alt={selectedMovie.title} 
                      className="w-full h-full object-cover aspect-[2/3] scale-102"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 bg-yellow-500 text-black px-3 py-1 text-[8.5px] font-mono tracking-widest font-black uppercase rounded-lg shadow-lg">
                      {selectedMovie.rating} Rated
                    </div>
                  </div>

                  {/* Metadata display column */}
                  <div className="md:col-span-8 flex flex-col justify-between space-y-4">
                    <div className="space-y-3.5">
                      <div className="inline-flex gap-2 items-center">
                        <span className="font-mono text-[9px] text-yellow-400 font-extrabold tracking-widest uppercase bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full">
                          ⭐ {selectedMovie.ratingScore || '4.9'} ROWONE Rating
                        </span>
                        <span className="text-[9px] text-white/50">{selectedMovie.runtime} • {selectedMovie.format}</span>
                      </div>

                      <h2 className="font-serif text-3xl sm:text-5xl font-black text-white leading-tight uppercase tracking-tight">
                        {selectedMovie.title}
                      </h2>

                      <p className="font-sans text-xs sm:text-sm text-[#dac6a8]/90 max-w-xl leading-relaxed capitalize">
                        {selectedMovie.synopsis}
                      </p>

                      {/* Studio casting preview bar */}
                      <div className="pt-2">
                        <span className="font-mono text-[8px] text-[#dac6a8] font-bold block uppercase tracking-widest mb-1">STARRING STARS PREVIEW</span>
                        <div className="flex gap-2 overflow-x-auto scrollbar-none">
                          {selectedMovie.cast?.slice(0, 3).map((c, i) => (
                            <span key={i} className="text-[10px] bg-white/5 text-stone-300 py-1 px-3 rounded-lg border border-white/5 shrink-0 block lowercase">
                              👨‍🎤 {c.name} (as {c.character})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* QR Code pairing preview block */}
                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 bg-white p-1 rounded-xl shrink-0 border border-yellow-440 flex items-center justify-center relative overflow-hidden">
                          {/* CSS Drawn Vector QR code */}
                          <div className="grid grid-cols-5 gap-0.5 w-11 h-11 bg-white">
                            {[1,1,0,1,1, 1,0,1,0,1, 0,1,1,1,0, 1,0,0,1,1, 1,1,1,0,1].map((b, i) => (
                              <div key={i} className={`w-full h-full ${b ? 'bg-black' : 'bg-white'}`} />
                            ))}
                          </div>
                        </div>

                        <div className="text-left">
                          <span className="font-mono text-[9px] text-[#dac6a8] font-bold block uppercase tracking-wider">SMARTPHONE CONTROL LINK</span>
                          <span className="text-xs text-white/90 font-black uppercase">SCAN QR WITH YOUR CAMERA</span>
                          <p className="text-[9px] text-white/40 leading-none mt-1">manage booking seats, watchlists, & invite coworkers directly from couch</p>
                        </div>
                      </div>

                      <button
                        onClick={() => { setShowPairingModal(true); setShowVirtualPhone(true); }}
                        className="py-2.5 px-4 bg-yellow-500 text-black font-sans text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-101 active:scale-95 shadow-glow leading-none cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Pair Phone Remote</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* Detail Page CTAs */}
                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-3 select-none">
                  <button 
                    onClick={() => { setIsPlaying(true); showTvToast('Broadcasting film inside custom TV canvas.'); }}
                    className={`py-3.5 px-6 rounded-2xl font-sans text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
                      focusedDetailBtnIdx === 0 
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-glow font-extrabold scale-102' 
                        : 'bg-white text-black'
                    }`}
                  >
                    <Play className="h-4 w-4 fill-current mr-1" />
                    Enter Cinema Stream 🎟️
                  </button>
                  <button 
                    onClick={() => { setShowPairingModal(true); setShowVirtualPhone(true); }}
                    className={`py-3.5 px-6 bg-neutral-900 border rounded-2xl font-sans text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                      focusedDetailBtnIdx === 1 
                        ? 'border-yellow-400 text-yellow-400 shadow-lg scale-102' 
                        : 'border-white/10 text-[#dac6a8]'
                    }`}
                  >
                    Sync Mobile Pairing 📱
                  </button>
                  <button 
                    onClick={() => { setSelectedMovie(null); setNavSection('movies'); }}
                    className={`py-3.5 px-5 bg-neutral-900 border rounded-2xl font-sans text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                      focusedDetailBtnIdx === 2
                        ? 'border-white text-white scale-102' 
                        : 'border-white/5 text-white/60'
                    }`}
                  >
                    Go back to grid
                  </button>
                </div>

              </div>
            ) : (
              
              /* --- EXQUISITE CAROUSEL MOVIE GRID FOR SMART TV --- */
              <div className="w-full flex-grow flex flex-col justify-between z-10 animate-fade-in text-left">
                
                <div className="space-y-1.5 select-none">
                  <span className="font-mono text-[#dac6a8] text-[9px] font-bold tracking-[0.2em] uppercase bg-white/5 border border-white/10 px-3 py-1 rounded-full w-max inline-block">
                    📢 ACTIVE NOW: Tonight Curated streams list
                  </span>
                  <h2 className="font-serif text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">Featured On Screen</h2>
                  <p className="font-sans text-xs text-[#dac6a8]/90 max-w-xl lowercase">
                    navigate using keyboard arrows (UP / DOWN / LEFT / RIGHT) to scroll movies card list. press ENTER to trigger high-fidelity film info card sheets.
                  </p>
                </div>

                {/* Curved Multi-movie carousel shelf */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 py-8 select-none">
                  {filterMovies.map((movie, idx) => {
                    const isFocused = navSection === 'movies' && focusedMovieIdx === idx;
                    return (
                      <div
                        key={`tv-card-${movie.id}`}
                        onClick={() => { setSelectedMovie(movie); setNavSection('detail'); setFocusedMovieIdx(idx); }}
                        className={`aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer relative transition-all duration-300 ${
                          isFocused 
                            ? 'border-4 border-yellow-400 scale-105 shadow-[0_0_35px_rgba(250,204,21,0.5)] z-20' 
                            : 'border border-white/5 brightness-75 hover:brightness-100 hover:scale-[1.01]'
                        }`}
                      >
                        <img 
                          src={movie.imageUrl} 
                          alt={movie.title} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent flex flex-col justify-end p-2.5">
                          <span className="font-mono text-[7px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-black uppercase tracking-wider block w-max mb-1">
                            {movie.genre}
                          </span>
                          <h4 className="font-display font-black text-[10.5px] uppercase text-[#edeae8] line-clamp-2 truncate tracking-tight">{movie.title}</h4>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Informative Help prompt on bottom */}
                <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-white/5 font-sans text-[10px] text-stone-400">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🛋️</span>
                    <span>Pair companion device to invite workspace colleagues instantly!</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[9px] text-[#dac6a8] font-bold">ARROW KEYS</span>
                    <span>Browse</span>
                    <span className="font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[9px] text-[#dac6a8] font-bold">ENTER</span>
                    <span>Select</span>
                    <span className="font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[9px] text-[#dac6a8] font-bold">BACKSPACE</span>
                    <span>Return</span>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* 🎮 TV REMOTE CONTROL SIDE PANEL CONTROLLER */}
          <div className="lg:col-span-3 flex flex-col gap-6 w-full max-w-[340px] mx-auto">
            
            {/* Beautiful styled Hardware/Software simulated TV Remote controller */}
            <div className="bg-[#141212] border-2 border-neutral-800 rounded-[35px] p-6 shadow-2xl relative overflow-hidden flex flex-col items-center gap-6">
              
              {/* Core reflective glossy texture */}
              <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-white/[0.04] to-transparent rounded-t-[35px] pointer-events-none" />
              
              {/* Brand label & Power button */}
              <div className="w-full flex justify-between items-center text-[#dac6a8] border-b border-white/5 pb-3">
                <span className="font-display font-black tracking-widest text-[9.5px]">POPCORN TV CONSOLE</span>
                {/* Physical Click power button */}
                <button
                  onClick={onExitTvMode}
                  className="w-10 h-10 rounded-full bg-red-600/20 text-red-400 border border-red-500/25 flex items-center justify-center hover:bg-red-500 hover:text-white hover:scale-105 active:scale-95 duration-200 shadow-lg cursor-pointer transition-all"
                  title="Shutdown TV Mode"
                >
                  <Power className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Status Indicator Screen */}
              <div className="w-full p-3.5 bg-black rounded-2xl border border-white/5 text-center font-mono">
                <span className="text-[7.5px] text-[#8e8] font-bold tracking-widest uppercase block animate-pulse">● REMOTE CONNECTED</span>
                <span className="text-[11px] text-white/80 block mt-1 uppercase font-bold">
                  {isPlaying ? 'Watching Film' : selectedMovie ? 'Viewing Details' : 'Browsing Home'}
                </span>
                <p className="text-[8px] text-[#dac6a8]/60 mt-0.5 max-w-[190px] mx-auto leading-none lowercase">
                  interact with click buttons below to simulate physical hand remote.
                </p>
              </div>

              {/* Arrow Keys Circle (Apple TV style circular navigation pad) */}
              <div className="relative w-36 h-36 bg-neutral-900 border border-neutral-700/60 rounded-full shadow-inner flex items-center justify-center">
                
                {/* UP BUTTON */}
                <button
                  onClick={() => onTvNavigate('up')}
                  className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-8 flex items-center justify-center text-stone-400 hover:text-yellow-400 active:scale-95 cursor-pointer duration-150 transition-transform"
                  title="Navigate Up"
                >
                  <ChevronUp className="h-6 w-6" />
                </button>

                {/* DOWN BUTTON */}
                <button
                  onClick={() => onTvNavigate('down')}
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-8 flex items-center justify-center text-stone-400 hover:text-yellow-400 active:scale-95 cursor-pointer duration-150 transition-transform"
                  title="Navigate Down"
                >
                  <ChevronDown className="h-6 w-6" />
                </button>

                {/* LEFT BUTTON */}
                <button
                  onClick={() => onTvNavigate('left')}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-10 flex items-center justify-center text-stone-400 hover:text-yellow-400 active:scale-95 cursor-pointer duration-150 transition-transform"
                  title="Navigate Left"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                {/* RIGHT BUTTON */}
                <button
                  onClick={() => onTvNavigate('right')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-10 flex items-center justify-center text-stone-400 hover:text-yellow-400 active:scale-95 cursor-pointer duration-150 transition-transform"
                  title="Navigate Right"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>

                {/* CENTRE ENTER / OK INPUT BUTTON */}
                <button
                  onClick={() => onTvNavigate('select')}
                  className="w-16 h-16 bg-[#1b1717] border border-neutral-700 hover:border-yellow-400 rounded-full flex items-center justify-center text-yellow-500 font-bold hover:scale-102 active:scale-95 duration-150 shadow-md cursor-pointer text-xs transition-transform tracking-wider font-sans"
                  title="OK Select Button"
                >
                  <span>OK</span>
                </button>

              </div>

              {/* Auxiliary TV Action Rows */}
              <div className="grid grid-cols-2 gap-3.5 w-full">
                
                <button
                  onClick={() => onTvNavigate('back')}
                  className="py-3 bg-neutral-900 border border-neutral-800 hover:border-yellow-400/40 rounded-xl font-mono text-[9px] text-[#dac6a8] font-bold tracking-widest uppercase flex flex-col items-center gap-1 active:scale-95 transition-all text-center cursor-pointer"
                  title="Return / Escape"
                >
                  <CornerDownLeft className="h-4 w-4" />
                  <span>◀ RETURN</span>
                </button>

                <button
                  onClick={() => { setShowPairingModal(true); setShowVirtualPhone(true); }}
                  className="py-3 bg-neutral-900 border border-neutral-800 hover:border-yellow-400/40 rounded-xl font-mono text-[9px] text-yellow-400 font-bold tracking-widest uppercase flex flex-col items-center gap-1 active:scale-95 transition-all text-center cursor-pointer font-sans"
                  title="Scan QR Screen"
                >
                  <Smartphone className="h-4 w-4 animate-bounce" />
                  <span>📱 SYNC COMP</span>
                </button>

              </div>

              <div className="w-full flex items-center justify-between gap-3 text-stone-500 text-[8px] font-mono tracking-widest uppercase border-t border-white/5 pt-3 leading-none">
                <span>INPUT: HAW</span>
                <span>VOL: {tvVolume}%</span>
                <span>CH: 4K CH-1</span>
              </div>

            </div>

          </div>

        </div>

        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* 📱 COUPLING VIRTUAL PHONE COMPANION SCREEN DESIGN BLOCK = */}
        {/* ========================================================= */}
        {/* ========================================================= */}
        {showVirtualPhone && (
          <div className="mt-10 border-t border-white/5 pt-12 animate-fade-in text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 pb-6 border-b border-yellow-500/10 mb-8 select-none">
              <div className="space-y-1">
                <span className="font-mono text-[9px] text-yellow-500 font-bold tracking-widest uppercase bg-yellow-500/5 border border-yellow-500/15 px-3 py-1 rounded-full inline-flex items-center gap-1 leading-normal">
                  <Smartphone className="w-3.5 h-3.5" />
                  REAL-TIME PHONE PAIRING ACTIVE
                </span>
                <h2 className="font-serif text-3xl md:text-5xl font-black text-white uppercase tracking-tight">Smartphone Companion App</h2>
                <p className="font-sans text-xs text-[#dac6a8] max-w-lg leading-relaxed lowercase">
                  live multi-stream phone simulator connected to your tv session. scan code or use phone UI dashboard below to manage seats & chats synchronously.
                </p>
              </div>

              <button
                onClick={() => { setShowVirtualPhone(false); setShowPairingModal(false); }}
                className="p-2 border border-white/15 rounded-xl text-[9px] font-mono text-[#dac6a8] tracking-widest uppercase hover:text-white hover:bg-white/5 cursor-pointer leading-none"
              >
                Close phone simulation ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Explanatory QR instructions */}
              <div className="md:col-span-4 bg-neutral-900 border border-white/5 rounded-3xl p-6 space-y-4">
                <span className="font-mono text-[8.5px] text-yellow-400 font-extrabold uppercase tracking-widest block">HOW COMPANION SYNCS</span>
                <h4 className="text-sm font-sans font-black uppercase text-white">QR Code Handshake</h4>
                <p className="text-xs text-[#dac6a8] leading-relaxed lowercase">
                  smartphones paired with popcorn can input complex text, explore trailers, handle watchlists, and pay for premium tickets without using awkward arrow keyboards.
                </p>

                <div className="p-4 bg-black rounded-2xl border border-white/5 space-y-3">
                  <span className="font-mono text-[7px] text-stone-500 block">HANDSHAKE SIGNALS</span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-medium font-sans">● SYNC CHANNELS ALIGNED</span>
                    <span className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white font-mono">200 OK</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic iPhone Simulation */}
              <div className="md:col-span-8 flex justify-center">
                
                {/* Visual iPhone outer frame Bezel wrapper */}
                <div className="w-full max-w-[420px] bg-[#0c0805] rounded-[48px] border-8 border-neutral-800 p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden text-left font-sans">
                  
                  {/* Dynamic Island Pill element */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 flex items-center justify-between px-3 text-[8.5px] font-sans text-stone-400">
                    <span>🟢</span>
                    <span className="text-white text-[7.5px] font-black uppercase tracking-widest pl-1">POPCORN LINK</span>
                    <span className="text-[7.5px] font-mono tracking-tighter">LTE</span>
                  </div>

                  {/* iPhone Status header */}
                  <div className="flex justify-between items-center text-[9px] font-mono text-stone-400 pt-5 pb-4 select-none">
                    <span>11:43 am</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span>SYNCED TO TV 📺</span>
                    </span>
                  </div>

                  {/* App Content inside Virtual Phone Screen */}
                  <div className="bg-[#121010] p-4 rounded-3xl border border-white/5 space-y-4 min-h-[460px]">
                    
                    {/* Synchronized status bar */}
                    <div className="p-3 bg-yellow-500 text-black rounded-xl font-sans text-[9px] font-black uppercase tracking-wider flex justify-between items-center shadow-lg animate-pulse">
                      <span>📱 POPCORN COMPANION APP</span>
                      <span className="bg-black text-[7.5px] text-[#8e8] py-0.5 px-1.5 rounded uppercase">Connected</span>
                    </div>

                    {companionNotification && (
                      <div className="p-2.5 bg-emerald-500 text-black font-sans text-[9.5px] font-black uppercase tracking-wide rounded-xl animate-fade-in shadow-md">
                        {companionNotification}
                      </div>
                    )}

                    {/* Interactive Mobile Seating arrangement Selector */}
                    <div className="space-y-2 bg-black/40 border border-white/5 p-3.5 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[8px] text-[#dac6a8] font-bold block uppercase tracking-wider">M-SESSION Couch RESERVATIONS</span>
                        <RatingBadge rating={selectedMovie?.rating || 'PG-13'} />
                      </div>
                      
                      <div className="pt-2">
                        <span className="text-[9.5px] font-sans font-black text-white uppercase tracking-wider block">Tap to reservation seat on TV Layout</span>
                        <div className="grid grid-cols-4 gap-2 mt-2 select-none">
                          {['A1', 'A2', 'Row-B3', 'Row-B4', 'VIP-C1', 'VIP-C2', 'VIP-Salsa', 'Box-Elite'].map((seat) => {
                            const isSelected = selectedCompanionSeat === seat;
                            return (
                              <button
                                key={seat}
                                onClick={() => handleCompanionSeatSelect(seat)}
                                className={`p-2 rounded-xl text-[9px] font-mono font-bold uppercase transition-all flex flex-col items-center gap-1 border cursor-pointer ${
                                  isSelected 
                                    ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black border-yellow-400 scale-102 font-black shadow-glow' 
                                    : 'bg-white/[0.02] hover:bg-white/5 border-white/5 text-[#ccc]'
                                }`}
                              >
                                <span className="text-[14px]">🛋️</span>
                                <span>{seat}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Invite guests input block */}
                    <div className="bg-black/40 border border-white/5 p-3.5 rounded-2xl text-left">
                      <span className="font-mono text-[8px] text-[#dac6a8] font-bold block uppercase tracking-wider mb-2">Complicit dispatch (Invite coworker)</span>
                      
                      <form onSubmit={handleCompanionInviteSubmit} className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Type colleague name..."
                          value={customInviteName}
                          onChange={(e) => setCustomInviteName(e.target.value)}
                          className="flex-grow bg-[#151212] border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-yellow-400 placeholder:text-stone-500"
                        />
                        <button
                          type="submit"
                          className="py-2 px-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-sans text-[8.5px] font-bold uppercase rounded-xl tracking-widest leading-none cursor-pointer flex items-center justify-center"
                        >
                          <Plus className="h-3 w-3 inline mr-1" /> INVITE
                        </button>
                      </form>

                      {/* Sync Invites list preview */}
                      <div className="mt-3 flex flex-wrap gap-1.5 select-none text-[8.5px] font-mono text-stone-400">
                        <span className="mr-1 py-0.5 font-bold uppercase">GUEST COHORT:</span>
                        {invitedGuestsList.map((g, idx) => (
                          <span key={idx} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[8px] text-[#ecbc7d]">
                            ✨ {g}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Live TV Comments dispatch block */}
                    <div className="bg-black/40 border border-white/5 p-3.5 rounded-2xl text-left">
                      <span className="font-mono text-[8px] text-[#dac6a8] font-bold block uppercase tracking-wider mb-2">Broadcaster Chats dispatch (Sofa Input)</span>
                      
                      <form onSubmit={handleCompanionChatSend} className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Type scrolling chat to overlay on TV..."
                          value={companionChatMsg}
                          onChange={(e) => setCompanionChatMsg(e.target.value)}
                          className="flex-grow bg-[#151212] border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-yellow-400 placeholder:text-stone-500"
                        />
                        <button
                          type="submit"
                          className="py-2 px-3 bg-yellow-500 text-black font-sans text-[8.5px] font-bold uppercase rounded-xl tracking-widest cursor-pointer inline-flex items-center gap-1 text-center"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>SEND</span>
                        </button>
                      </form>
                      <span className="text-[7.5px] text-stone-500 leading-none mt-1.5 block lowercase">
                        *comment is paired instantly with live stream television chat overlays above
                      </span>
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

// Micro internal components duplication to avoid compilation gaps
function RatingBadge({ rating }: { rating: string }) {
  return (
    <span className="bg-white/5 border border-white/10 text-on-surface px-2.5 py-0.5 rounded-lg text-[8px] font-sans font-extrabold uppercase tracking-wider block w-max">
      {rating}
    </span>
  );
}
