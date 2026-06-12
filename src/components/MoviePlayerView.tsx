/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, 
  Users, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  Settings, 
  Maximize, 
  Send, 
  MessageSquare, 
  Eye, 
  EyeOff, 
  ChevronLeft, 
  Lock,
  Shield,
  ShieldAlert,
  Flag,
  VolumeX,
  Ban,
  Check,
  Zap,
  Info,
  Star,
  Flame,
  HelpCircle,
  Radio,
  Pin,
  Award,
  Crown,
  Sparkles,
  SlidersHorizontal,
  X,
  Tv,
  Film
} from 'lucide-react';
import { Movie, ChatMessage } from '../types';
import { motion } from 'motion/react';
import { MOCK_CHAT } from '../data';
import RatingBadge from './RatingBadge';
import { addMovieReview } from '../utils/reviewUtils';

interface MoviePlayerViewProps {
  movie: Movie;
  onBack: () => void;
  viewerCount?: number;
  isWatchParty?: boolean;
  watchPartyRoomName?: string;
  friends?: any[];
  isDyslexiaFontActive?: boolean;
  isQuietModeActive?: boolean;
  isCinemaAmbientSoundActive?: boolean;
  onAwardBadge?: (badgeName: string) => void;
  disableReactionsAndAnimations?: boolean;
  onTriggerSupport?: (info?: {
    movieTitle?: string | null;
    roomId?: string | null;
    playbackState?: string | null;
  }) => void;
  isPip?: boolean;
  onTogglePip?: () => void;
}

export default function MoviePlayerView({ 
  movie, 
  onBack, 
  viewerCount = 432,
  isWatchParty = false,
  watchPartyRoomName = '',
  friends = [],
  isDyslexiaFontActive = false,
  isQuietModeActive = false,
  isCinemaAmbientSoundActive = false,
  onAwardBadge,
  disableReactionsAndAnimations = false,
  onTriggerSupport,
  isPip = false,
  onTogglePip
}: MoviePlayerViewProps) {
  // Pre-show lobby states
  const [inLobby, setInLobby] = useState(true);
  const [countdownSeconds, setCountdownSeconds] = useState(115);
  const [hypeLevel, setHypeLevel] = useState(72);
  const [ambientAudioActive, setAmbientAudioActive] = useState(false);
  const [selectedTriviaAnswer, setSelectedTriviaAnswer] = useState<string | null>(null);
  const [showTriviaExplanation, setShowTriviaExplanation] = useState(false);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambienceGainNodeRef = useRef<GainNode | null>(null);
  const playbackAmbienceCtxRef = useRef<AudioContext | null>(null);
  const playbackAmbienceGainRef = useRef<GainNode | null>(null);

  // Poll configuration dynamically based on movie.id
  const moviePolls: Record<string, { title: string; options: string[] }> = {
    'm1': {
      title: "Who's your favourite character in NEON ECHOES?",
      options: ['Kaelen (Netrunner)', 'Nova (Syndicate Defector)', 'Cipher (A.I. Drone)', 'Dr. Vane (Underground Doc)']
    },
    'm2': {
      title: "Who's your favourite character in THE LAST REEL?",
      options: ['Arthur (Old Projectionist)', 'Clara (The Film Archivist)', 'Young Sam (The Runaway)', 'The Projectionist Phantom']
    },
    'default': {
      title: 'Who is your archetype choice for this cinematic run?',
      options: ['The Rogue Protagonist', 'The Wise Mentor Figure', 'The Loyal Sidekick Spacer', 'The Masked Stranger']
    }
  };

  const currentPoll = moviePolls[movie.id] || moviePolls['default'];
  const [pollVotes, setPollVotes] = useState<Record<string, number>>(() => ({
    [currentPoll.options[0]]: 18,
    [currentPoll.options[1]]: 32,
    [currentPoll.options[2]]: 9,
    [currentPoll.options[3]]: 21,
  }));
  const [userVotedOption, setUserVotedOption] = useState<string | null>(null);

  const lobbyFriends = friends && friends.length > 0 ? friends : [
    { username: 'cyber_clara', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150' },
    { username: 'net_scrawler', avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150' }
  ];

  // Trivia configuration dynamically based on movie.id
  const movieTrivia: Record<string, { question: string; options: string[]; correctAnswer: string; explanation: string }> = {
    'm1': {
      question: 'Which vintage synthesizer model was used to create the electronic score of Neo-Seoul?',
      options: ['Yamaha DX7', 'Roland Juno-106', 'Moog Sub 37', 'Korg MS-20'],
      correctAnswer: 'Yamaha DX7',
      explanation: 'The composer picked a vintage Yamaha DX7 to render the nostalgic chime and brass synth pads of the cyber-city!'
    },
    'm2': {
      question: 'What gauge of physical film did Arthur restore in Hall 4 for the secret screening room?',
      options: ['16mm', '35mm', '70mm', 'Super 8'],
      correctAnswer: '35mm',
      explanation: 'Arthur meticulously cleaned a dusty 1950s 35mm print to recreate the authentic golden-age warmth.'
    },
    'default': {
      question: 'What is the cinematic frame-rate standard used to capture true anamorphic widescreen depth?',
      options: ['24 frames per second', '30 frames per second', '60 frames per second', '12 frames per second'],
      correctAnswer: '24 frames per second',
      explanation: '24fps provides that organic motion blur we associate with silver-screen cinema magic!'
    }
  };

  const currentTrivia = movieTrivia[movie.id] || movieTrivia['default'];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showInvitePopover, setShowInvitePopover] = useState(false);
  const [invitedFriendUsernames, setInvitedFriendUsernames] = useState<Record<string, boolean>>({});
  const [videoDuration, setVideoDuration] = useState(7180);

  const [isPlaying, setIsPlaying] = useState(false); // starts as false in lobby
  const [currentTime, setCurrentTime] = useState(0); // starts movie at beginning (0s) when pre-show finishes
  const [volume, setVolume] = useState(75);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const SPOILER_WORDS = ["dies", "ending", "twist", "spoil", "climax", "murder", "reveal", "killer", "dead", "die"];
    return MOCK_CHAT.map(msg => ({
      ...msg,
      isSpoiler: msg.isSpoiler || SPOILER_WORDS.some(word => msg.text.toLowerCase().includes(word)) || msg.text.toLowerCase().includes('spoiler')
    }));
  });
  const [inputVal, setInputVal] = useState('');
  const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  // --- STUDIO PREMIERE EVENT STATES ---
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "sys-ann-1",
        username: "STUDIO_CENTRAL 🎙️",
        timestamp: "LOBBY LIVE",
        text: "🚨 HOST ANNOUNCEMENT: Star Cast Q&A is now active! Type #ask with your question. Use the compose checkboxes below to broadcast official messages.",
        isPinned: true,
        isAnnouncement: true,
        isHost: true
      }
    ];
  });
  const [postAsAnnouncement, setPostAsAnnouncement] = useState(false);
  const [postAsPinned, setPostAsPinned] = useState(false);

  // Post-Watch Review Prompt States
  const [showPostWatchReview, setShowPostWatchReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewScreeningName, setReviewScreeningName] = useState(() => {
    if (isWatchParty) return 'Private Squad Lounge Sync Session';
    if (movie.screenings && movie.screenings.length > 0) {
      return `${movie.screenings[0].hallName} @ ${movie.screenings[0].time}`;
    }
    return 'Digital Catalogue Room Watch';
  });
  const [isMomentAnchored, setIsMomentAnchored] = useState(true);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Robust Chat Moderation States
  const [warnNotification, setWarnNotification] = useState<string | null>(null);
  const warnTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showWarnBanner = (message: string) => {
    setWarnNotification(message);
    if (warnTimeoutRef.current) clearTimeout(warnTimeoutRef.current);
    warnTimeoutRef.current = setTimeout(() => {
      setWarnNotification(null);
    }, 4500);
  };

  const [mutedUsers, setMutedUsers] = useState<Record<string, boolean>>({});
  const [removedUsers, setRemovedUsers] = useState<Record<string, boolean>>({});
  const [reportedCommentIds, setReportedCommentIds] = useState<Record<string, boolean>>({});
  const [slowModeEnabled, setSlowModeEnabled] = useState<boolean>(false);
  const [isHostMode, setIsHostMode] = useState<boolean>(true);
  const [lastMessageTimes, setLastMessageTimes] = useState<Record<string, number>>({});
  const [userLastMatches, setUserLastMatches] = useState<Record<string, string>>({});

  const OFFENSIVE_KEYWORDS = [
    'jerk', 'moron', 'asshole', 'bitch', 'loser', 'scam', 'sh*t', 'f*ck', 'idiot', 'damn', 'bullshit', 'crap', 'slush', 'trash'
  ];
  const SPOILER_KEYWORDS = [
    'dies', 'ending', 'twist', 'spoil', 'climax', 'murder', 'reveal', 'killer', 'dead', 'die'
  ];
  
  // Interactive control overlays state
  const [showControls, setShowControls] = useState(true);
  
  // Collapsible chat sidebar state
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // Mobile swipeable height state ('collapsed' / 'compact' / 'expanded')
  const [mobileChatState, setMobileChatState] = useState<'collapsed' | 'compact' | 'expanded'>('compact');
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = touchStartY.current - currentY; // positive means swipe UP

    if (diff > 50) {
      setMobileChatState('expanded');
      touchStartY.current = null;
    } else if (diff < -50) {
      if (mobileChatState === 'expanded') {
        setMobileChatState('compact');
      } else if (mobileChatState === 'compact') {
        setMobileChatState('collapsed');
        setIsChatCollapsed(true);
      }
      touchStartY.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  // Keep manual tab triggers in sync with swipe heights
  useEffect(() => {
    if (isChatCollapsed) {
      setMobileChatState('collapsed');
    } else if (mobileChatState === 'collapsed') {
      setMobileChatState('compact');
    }
  }, [isChatCollapsed]);

  useEffect(() => {
    if (mobileChatState === 'collapsed') {
      setIsChatCollapsed(true);
    } else {
      setIsChatCollapsed(false);
    }
  }, [mobileChatState]);
  
  // Spoiler protection states
  const [isSpoilerBlurActive, setIsSpoilerBlurActive] = useState(false);
  const [showMiniMenu, setShowMiniMenu] = useState(true);
  const [revealedCommentIds, setRevealedCommentIds] = useState<Record<string, boolean>>({});
  
  // Auto scroll pauses on comment section hover state
  const [isChatHovered, setIsChatHovered] = useState(false);

  // Quick caption controls popover state
  const [showCaptionMenu, setShowCaptionMenu] = useState(false);

  // --- CINEMATIC PRESETS / COLOR GRADING STATES ---
  const [cinematicPreset, setCinematicPreset] = useState<'standard' | 'vintage' | 'cyberpunk' | 'contrast'>('standard');
  const [showPresetMenu, setShowPresetMenu] = useState<boolean>(false);

  const getPresetFilterClass = (preset: 'standard' | 'vintage' | 'cyberpunk' | 'contrast') => {
    switch (preset) {
      case 'vintage':
        return 'contrast-[1.25] saturate-0 sepia-[10%] brightness-95';
      case 'cyberpunk':
        return 'saturate-[2.1] hue-rotate-[315deg] contrast-[1.15] brightness-105';
      case 'contrast':
        return 'contrast-[1.4] brightness-[0.85] saturate-[1.1] shadow-2xl';
      case 'standard':
      default:
        return '';
    }
  };

  // --- ANTI-PIRACY SCREEN RECORDING GUARD STATES ---
  const [isGuardActive, setIsGuardActive] = useState<boolean>(true);
  const [isRecordingViolation, setIsRecordingViolation] = useState<boolean>(false);
  const [violationType, setViolationType] = useState<'blur' | 'screenshot' | 'print' | 'simulator' | 'display'>('screenshot');
  const [hasActiveWatermark, setHasActiveWatermark] = useState<boolean>(false);
  const [watermarkPos, setWatermarkPos] = useState({ x: 20, y: 35 });
  const [guardLogs, setGuardLogs] = useState<Array<{ id: string; time: string; event: string; status: 'warning' | 'info' | 'blocked' }>>([
    { id: 'log-1', time: '13:19:58', event: 'ROWONE Core DRM Shield initialized', status: 'info' },
    { id: 'log-2', time: '13:20:01', event: 'Watermark tracking token injected into active container', status: 'info' },
    { id: 'log-3', time: '13:20:05', event: 'Display state security hooks active (DRM Armed) 🛡️', status: 'info' }
  ]);
  const [showGuardPanel, setShowGuardPanel] = useState<boolean>(false);

  // Direct violation handler
  const triggerViolation = (type: 'blur' | 'screenshot' | 'print' | 'simulator' | 'display') => {
    setIsRecordingViolation(true);
    setViolationType(type);
    setIsPlaying(false); // Pause instantly

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const typeLabelMap = {
      blur: 'Window focus lost (potential screen capturer active)',
      screenshot: 'Screen capture shortcut / PrintScreen key intercepted',
      print: 'Print media command / PDF draft generation blocked',
      simulator: 'Manual DRM Protection sandbox simulation triggered',
      display: 'Suspicious device telemetry/inspector connection detected'
    };

    const newLog = {
      id: `log-${Date.now()}`,
      time: timeStr,
      event: `SEC-WARN: ${typeLabelMap[type]}`,
      status: 'blocked' as const
    };

    setGuardLogs(prev => [newLog, ...prev]);
  };

  // Move the Dynamic Watermark randomly around the screen to block crop-recorders
  useEffect(() => {
    if (!hasActiveWatermark) return;
    const interval = setInterval(() => {
      const rx = Math.floor(Math.random() * 60) + 12; // 12% to 72%
      const ry = Math.floor(Math.random() * 45) + 15; // 15% to 60%
      setWatermarkPos({ x: rx, y: ry });
    }, 5500);
    return () => clearInterval(interval);
  }, [hasActiveWatermark]);

  // General keystroke, print, and blur listeners to prevent unauthorized screencasts
  useEffect(() => {
    if (!isGuardActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (key === 'PrintScreen' || key === 'PrtScn') {
        e.preventDefault();
        triggerViolation('screenshot');
      }

      if (ctrl && key.toLowerCase() === 'p') {
        e.preventDefault();
        triggerViolation('print');
      }

      if (ctrl && shift && (key === '3' || key === '4' || key === '5' || key === 's' || key.toLowerCase() === 's')) {
        e.preventDefault();
        triggerViolation('screenshot');
      }

      if (key === 'F12' || (ctrl && shift && (key.toLowerCase() === 'i' || key.toLowerCase() === 'j' || key.toLowerCase() === 'c'))) {
        triggerViolation('display');
      }
    };

    const handleBlur = () => {
      triggerViolation('blur');
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isGuardActive]);


  // Subtitle & Closed Caption States
  const [pipCloseConfirm, setPipCloseConfirm] = useState(false);

  // No automatic timeout for the full dialog confirmation overlay

  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitleFontSize, setSubtitleFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [subtitleContrast, setSubtitleContrast] = useState<'white' | 'yellow' | 'outlined'>('white');
  const [audioDescriptionEnabled, setAudioDescriptionEnabled] = useState(false);
  const [chatTextSize, setChatTextSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  // Volume normalization (Audio Boost) variables and Web Audio configuration
  const [audioBoostEnabled, setAudioBoostEnabled] = useState(false);
  const videoAudioCtxRef = useRef<AudioContext | null>(null);
  const videoSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const videoCompressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const videoGainNodeRef = useRef<GainNode | null>(null);

  // Clean up Web Audio Context for video on unmount
  useEffect(() => {
    return () => {
      if (videoAudioCtxRef.current) {
        try {
          videoAudioCtxRef.current.close();
        } catch (e) {
          console.warn("Error closing video audio context:", e);
        }
      }
    };
  }, []);

  // Subtitle cue generator based on playback duration
  const getSubtitlesForTime = (time: number, title: string) => {
    const cycle = time % 120;
    if (cycle < 4) return `[Deep rhythmic space synth hum intensifies as "${title.toUpperCase()}" continues]`;
    if (cycle < 8) return "They said the city never sleeps. But they were wrong.";
    if (cycle < 12) return "It just sleeps with one eye open, watching.";
    if (cycle < 16) return "Nova: \"Do you hear that? The patrol sweep is early tonight.\"";
    if (cycle < 20) return "Kaelen: \"Doesn't matter. They're scanning the upper grid, not our channel.\"";
    if (cycle < 24) return "[Sound of wet rain pattering on neon-lit street facade]";
    if (cycle < 28) return "Kaelen: \"Look closely at that billboard. The glitch is rhythmic.\"";
    if (cycle < 32) return "Nova: \"It's a tracking watermark... they've targeted our node!\"";
    if (cycle < 36) return "Kaelen: \"Then we've got exactly ninety seconds to extract.\"";
    if (cycle < 40) return "[Siren wailing in the distance, followed by hydraulic brakes screeching]";
    if (cycle < 44) return "Security Dispatch: \"All units, respond to sector seven breach!\"";
    if (cycle < 48) return "Nova: \"Kael, they're boxing us in. We have to override the canal gate!\"";
    if (cycle < 52) return "Kaelen: \"I'm overriding it now... give me five seconds!\"";
    if (cycle < 56) return "[Keyboards clack furiously under virtual projections]";
    if (cycle < 60) return "Cipher: \"Access granted. Go, go!\"";
    if (cycle < 64) return "[Pulsing futuristic synthesizer beats drop into a cinematic groove]";
    if (cycle < 68) return "Nova: \"We made it. But they are going to trace that bypass soon.\"";
    if (cycle < 72) return "Kaelen: \"Let them try. We're already ghosts in the system.\"";
    if (cycle < 76) return "Nova: \"What's our next stop then?\"";
    if (cycle < 80) return "Kaelen: \"We head straight to the core of the lower sectors.\"";
    if (cycle < 84) return "[Steam hissing from heavy industrial vent pipes]";
    if (cycle < 88) return "Kaelen: \"Keep your flashlight low. Sensor arrays are everywhere.\"";
    if (cycle < 92) return "Nova: \"Wait. I see something... a door with a manual lock.\"";
    if (cycle < 96) return "Kaelen: \"Excellent. Old tech is safe tech. Direct wire connection coming up.\"";
    if (cycle >= 96 && cycle < 101) return "[Heavy thuds of magnetic locks disengaging]";
    return "";
  };

  // Audio description cue generator
  const getAudioDescriptionForTime = (time: number, title: string) => {
    const cycle = time % 120;
    if (cycle >= 2 && cycle < 6) return "A slow, atmospheric tracking shot moves over the rain-soaked pavement of a dimly lit neon alleyway.";
    if (cycle >= 14 && cycle < 18) return "Nova shifts her weight, her neon-lined leather jacket reflecting flickering cyan streetlights as she gazes up.";
    if (cycle >= 24 && cycle < 28) return "Heaps of moisture collect on the glowing red utility grid pipes running down the brick walls.";
    if (cycle >= 38 && cycle < 42) return "A spherical patrol drone sweeps a conical amber beam across the trash bins, casting long shadows.";
    if (cycle >= 46 && cycle < 51) return "Nova grabs a rusted safety bar, pulling herself into a shadowy recess as a searchlight grazes the spot.";
    if (cycle >= 54 && cycle < 59) return "Kaelen's fingers fly across a hovering transparent keyboard projection, glowing digits reflecting in his dark lenses.";
    if (cycle >= 64 && cycle < 69) return "A massive metal sluice gate slowly slides upward, throwing bright white light into the wet dark tunnels.";
    if (cycle >= 84 && cycle < 89) return "Thick clouds of warm white steam plume from floor grates, briefly obscuring the characters.";
    if (cycle >= 94 && cycle < 98) return "Nova gestures toward a heavy solid steel bulkhead door with physical dial pads.";
    return "";
  };

  // Web Speech Synthesis handler for Audio Description narrates live context
  const lastSpokenTextRef = useRef('');
  useEffect(() => {
    if (audioDescriptionEnabled && isPlaying && !inLobby) {
      const desc = getAudioDescriptionForTime(currentTime, movie.title);
      if (desc && desc !== lastSpokenTextRef.current) {
        lastSpokenTextRef.current = desc;
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(desc);
          utterance.rate = 1.05;
          window.speechSynthesis.speak(utterance);
        }
      }
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [currentTime, audioDescriptionEnabled, isPlaying, inLobby, movie.title]);

  // Clean speech synthesis if the component unmounts
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Hand raise state and toast indicator
  const [handRaiseToast, setHandRaiseToast] = useState<{ id: string; text: string } | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const totalDuration = videoDuration;

  // React onTimeUpdate and metadata sync methods for custom video file support
  const handleVideoTimeUpdate = () => {
    if (videoRef.current && isPlaying) {
      setCurrentTime(Math.floor(videoRef.current.currentTime));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = Math.floor(videoRef.current.duration);
      if (dur && dur > 0) {
        setVideoDuration(dur);
      }
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(err => console.log('Video play error:', err));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 1.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Synchronize audio booster & volume levels on the video element
  useEffect(() => {
    if (videoRef.current) {
      const el = videoRef.current;
      
      // Initialize/Update nodes if Audio Boost is toggled ON
      if (audioBoostEnabled) {
        try {
          if (!videoAudioCtxRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const ctx = new AudioContextClass();
              videoAudioCtxRef.current = ctx;
              
              const source = ctx.createMediaElementSource(el);
              videoSourceNodeRef.current = source;
              
              const compressor = ctx.createDynamicsCompressor();
              videoCompressorNodeRef.current = compressor;
              
              const boostGainVal = ctx.createGain();
              videoGainNodeRef.current = boostGainVal;
              
              source.connect(compressor);
              compressor.connect(boostGainVal);
              boostGainVal.connect(ctx.destination);
            }
          }
          
          // Apply normalization settings
          const ctx = videoAudioCtxRef.current;
          if (ctx) {
            if (ctx.state === 'suspended') {
              ctx.resume();
            }
            if (videoCompressorNodeRef.current && videoGainNodeRef.current) {
              // Threshold: compress louder sounds (-24dB is standard compression knee)
              videoCompressorNodeRef.current.threshold.setValueAtTime(-24, ctx.currentTime);
              videoCompressorNodeRef.current.knee.setValueAtTime(30, ctx.currentTime);
              videoCompressorNodeRef.current.ratio.setValueAtTime(12, ctx.currentTime);
              videoCompressorNodeRef.current.attack.setValueAtTime(0.003, ctx.currentTime);
              videoCompressorNodeRef.current.release.setValueAtTime(0.25, ctx.currentTime);
              
              // Boost: high-gain amplification to bring quiet levels up (2.2x amp multiplier)
              videoGainNodeRef.current.gain.setValueAtTime(2.2, ctx.currentTime);
            }
          }
        } catch (err) {
          console.warn("Failed to apply Web Audio normalization, falling back on programmatic scaling:", err);
        }
      } else {
        // Disabled boost/normalization: return Web Audio parameters to transparent if initialized
        if (videoAudioCtxRef.current && videoCompressorNodeRef.current && videoGainNodeRef.current) {
          const ctx = videoAudioCtxRef.current;
          videoCompressorNodeRef.current.threshold.setValueAtTime(-0.5, ctx.currentTime);
          videoCompressorNodeRef.current.ratio.setValueAtTime(1.0, ctx.currentTime);
          videoGainNodeRef.current.gain.setValueAtTime(1.0, ctx.currentTime);
        }
      }

      // Standard volume control. If Web Audio fails, programmatic scaling serves as fallback
      const boostMultiplier = audioBoostEnabled ? 1.5 : 1.0;
      el.volume = Math.min(1.0, (volume / 100) * boostMultiplier);
    }
  }, [volume, audioBoostEnabled]);

  // --- AUDIO MUTE AND FULLSCREEN TOGGLE SERVICES ---
  const prevVolumeRef = useRef<number>(75);

  const toggleMute = () => {
    setVolume(prev => {
      if (prev > 0) {
        prevVolumeRef.current = prev;
        return 0;
      } else {
        return prevVolumeRef.current || 75;
      }
    });
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error("Error activating fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("Error exiting fullscreen:", err);
      });
    }
  };

  // --- GLOBAL KEYBOARD SHORTCUTS LISTENER ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger actions if the user is typing in form controls
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        (activeEl instanceof HTMLElement && activeEl.isContentEditable)
      )) {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMute();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Web Audio Procedural Playback Ambient Sound effect ("Cinema Room" airflow and rumbles)
  const startPlaybackAmbienceSynth = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      playbackAmbienceCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      // Keep it extremely subtle / quiet as it plays DURING playback!
      masterGain.gain.setValueAtTime(0.045, ctx.currentTime);
      masterGain.connect(ctx.destination);
      playbackAmbienceGainRef.current = masterGain;

      // 1. Cozy Cinema HVAC Air/Ventilation Rumble
      // Deep low-frequency noise
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const hvacNoiseNode = ctx.createBufferSource();
      hvacNoiseNode.buffer = noiseBuffer;
      hvacNoiseNode.loop = true;

      const hvacFilter = ctx.createBiquadFilter();
      hvacFilter.type = 'lowpass';
      hvacFilter.frequency.setValueAtTime(110, ctx.currentTime); // Low deep air-flow frequency
      hvacFilter.Q.setValueAtTime(1.0, ctx.currentTime);

      const hvacGain = ctx.createGain();
      hvacGain.gain.setValueAtTime(0.035, ctx.currentTime);

      hvacNoiseNode.connect(hvacFilter);
      hvacFilter.connect(hvacGain);
      hvacGain.connect(masterGain);
      hvacNoiseNode.start();

      // Slow modulating AC airflow fluctuation
      const acOsc = ctx.createOscillator();
      acOsc.type = 'sine';
      acOsc.frequency.setValueAtTime(0.08, ctx.currentTime); // very slow cycle (12.5 seconds)
      const acOscGain = ctx.createGain();
      acOscGain.gain.setValueAtTime(0.012, ctx.currentTime);
      acOsc.connect(acOscGain);
      acOscGain.connect(hvacGain.gain);
      acOsc.start();

      // Deep 48Hz room resonance hum (ground node)
      const roomHumOsc = ctx.createOscillator();
      roomHumOsc.type = 'sine';
      roomHumOsc.frequency.setValueAtTime(48, ctx.currentTime);
      const roomHumGain = ctx.createGain();
      roomHumGain.gain.setValueAtTime(0.025, ctx.currentTime);
      roomHumOsc.connect(roomHumGain);
      roomHumGain.connect(masterGain);
      roomHumOsc.start();

      // 2. Randomized, ultra-quiet, cozy interactive room elements (Seat creaking, snack bag rustling)
      // Since it's during playing, they must be sporadic and extremely quiet so it is pleasant
      const playSnackCrackle = () => {
        if (!playbackAmbienceCtxRef.current || playbackAmbienceCtxRef.current.state === 'closed') return;
        const popSource = ctx.createBufferSource();
        popSource.buffer = noiseBuffer;

        const popFilter = ctx.createBiquadFilter();
        popFilter.type = 'bandpass';
        popFilter.frequency.setValueAtTime(3200 + Math.random() * 1400, ctx.currentTime);
        popFilter.Q.setValueAtTime(4.0, ctx.currentTime);

        const popGainNode = ctx.createGain();
        popGainNode.gain.setValueAtTime(0, ctx.currentTime);
        // Very quiet, gentle snack paper touch
        popGainNode.gain.linearRampToValueAtTime(0.006 + Math.random() * 0.005, ctx.currentTime + 0.005);
        popGainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04 + Math.random() * 0.05);

        popSource.connect(popFilter);
        popFilter.connect(popGainNode);
        popGainNode.connect(masterGain);

        popSource.start();
        popSource.stop(ctx.currentTime + 0.15);

        // Schedule next soft snack movement (every 14 to 28 seconds)
        const nextCrackle = 14000 + Math.random() * 14000;
        (ctx as any).snackTimer = setTimeout(playSnackCrackle, nextCrackle);
      };

      const playSoftSeatShuffle = () => {
        if (!playbackAmbienceCtxRef.current || playbackAmbienceCtxRef.current.state === 'closed') return;
        const seatSource = ctx.createBufferSource();
        seatSource.buffer = noiseBuffer;

        const seatFilter = ctx.createBiquadFilter();
        seatFilter.type = 'bandpass';
        // Low warm resonance of a leather or velvet cushion seat shifting
        seatFilter.frequency.setValueAtTime(140 + Math.random() * 60, ctx.currentTime);
        seatFilter.Q.setValueAtTime(2.0, ctx.currentTime);

        const seatGainNode = ctx.createGain();
        seatGainNode.gain.setValueAtTime(0, ctx.currentTime);
        // Very slow attack, smooth shuffle
        seatGainNode.gain.linearRampToValueAtTime(0.01 + Math.random() * 0.006, ctx.currentTime + 0.08);
        seatGainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4 + Math.random() * 0.3);

        seatSource.connect(seatFilter);
        seatFilter.connect(seatGainNode);
        seatGainNode.connect(masterGain);

        seatSource.start();
        seatSource.stop(ctx.currentTime + 0.8);

        // Schedule next soft seat shuffle (every 22 to 50 seconds)
        const nextShuffle = 22000 + Math.random() * 28000;
        (ctx as any).seatTimer = setTimeout(playSoftSeatShuffle, nextShuffle);
      };

      // Kick off sporadic events after 3-5s initial padding
      (ctx as any).snackTimer = setTimeout(playSnackCrackle, 4000 + Math.random() * 6000);
      (ctx as any).seatTimer = setTimeout(playSoftSeatShuffle, 8000 + Math.random() * 12000);

      // Keep refs so we can stop them
      (ctx as any).hvacNoiseNode = hvacNoiseNode;
      (ctx as any).acOsc = acOsc;
      (ctx as any).roomHumOsc = roomHumOsc;

    } catch (e) {
      console.warn("Could not play subtle playback room acoustics:", e);
    }
  };

  const stopPlaybackAmbienceSynth = () => {
    const ctx = playbackAmbienceCtxRef.current;
    const gain = playbackAmbienceGainRef.current;
    if (ctx && gain) {
      try {
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        // Fade out nicely over 1.5 seconds
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.5);

        setTimeout(() => {
          if ((ctx as any).snackTimer) clearTimeout((ctx as any).snackTimer);
          if ((ctx as any).seatTimer) clearTimeout((ctx as any).seatTimer);
          try { (ctx as any).hvacNoiseNode?.stop(); } catch(e){}
          try { (ctx as any).acOsc?.stop(); } catch(e){}
          try { (ctx as any).roomHumOsc?.stop(); } catch(e){}
          ctx.close();
          playbackAmbienceCtxRef.current = null;
          playbackAmbienceGainRef.current = null;
        }, 1600);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  useEffect(() => {
    if (isCinemaAmbientSoundActive && isPlaying && !inLobby) {
      startPlaybackAmbienceSynth();
    } else {
      stopPlaybackAmbienceSynth();
    }

    return () => {
      // Clean up when unmounting
      if (playbackAmbienceCtxRef.current) {
        const ctx = playbackAmbienceCtxRef.current;
        if ((ctx as any).snackTimer) clearTimeout((ctx as any).snackTimer);
        if ((ctx as any).seatTimer) clearTimeout((ctx as any).seatTimer);
        try { (ctx as any).hvacNoiseNode?.stop(); } catch(e){}
        try { (ctx as any).acOsc?.stop(); } catch(e){}
        try { (ctx as any).roomHumOsc?.stop(); } catch(e){}
        try { ctx.close(); } catch(e){}
        playbackAmbienceCtxRef.current = null;
        playbackAmbienceGainRef.current = null;
      }
    };
  }, [isCinemaAmbientSoundActive, isPlaying, inLobby]);

  // Web Audio Procedural Cinema Atmosphere Sound (popcorn, chatter)
  const startAmbienceSynth = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.25, ctx.currentTime);
      masterGain.connect(ctx.destination);
      ambienceGainNodeRef.current = masterGain;
      
      // 1. Create a soft hum/chatter base (low-pass white noise with sweeping filter)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(220, ctx.currentTime);
      filter.Q.setValueAtTime(1.2, ctx.currentTime);
      
      // Sweep the chatter bandpass to simulate voices rising/falling gently
      const sweepOsc = ctx.createOscillator();
      sweepOsc.type = 'sine';
      sweepOsc.frequency.setValueAtTime(0.14, ctx.currentTime); // slow sweep
      
      const sweepGain = ctx.createGain();
      sweepGain.gain.setValueAtTime(60, ctx.currentTime);
      
      sweepOsc.connect(sweepGain);
      sweepGain.connect(filter.frequency);
      
      noiseNode.connect(filter);
      
      // Add general low frequency sine wave hum
      const humOsc1 = ctx.createOscillator();
      humOsc1.type = 'sine';
      humOsc1.frequency.setValueAtTime(55, ctx.currentTime); // 55Hz room resonance
      const humGain1 = ctx.createGain();
      humGain1.gain.setValueAtTime(0.12, ctx.currentTime);
      humOsc1.connect(humGain1);
      humGain1.connect(masterGain);
      humOsc1.start();
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, ctx.currentTime);
      filter.connect(noiseGain);
      noiseGain.connect(masterGain);
      
      sweepOsc.start();
      noiseNode.start();
      
      // 2. Vintage Projector Engine: Continuous motor hum & mechanical fan whirr
      const projMotorOsc = ctx.createOscillator();
      projMotorOsc.type = 'triangle';
      projMotorOsc.frequency.setValueAtTime(88, ctx.currentTime); // 88Hz vintage belt-driven motor hum
      
      const projMotorGain = ctx.createGain();
      projMotorGain.gain.setValueAtTime(0.05, ctx.currentTime); // Subtle belt rotation presence
      
      // Modulate the motor slightly with an LFO to simulate mechanical flutter / belt slip
      const flutterOsc = ctx.createOscillator();
      flutterOsc.type = 'sine';
      flutterOsc.frequency.setValueAtTime(14.5, ctx.currentTime); // 14.5 Hz rotation speed
      
      const flutterGain = ctx.createGain();
      flutterGain.gain.setValueAtTime(3, ctx.currentTime); // Subtle frequency flutter
      
      flutterOsc.connect(flutterGain);
      flutterGain.connect(projMotorOsc.frequency);
      
      projMotorOsc.connect(projMotorGain);
      projMotorGain.connect(masterGain);
      
      projMotorOsc.start();
      flutterOsc.start();

      // Mechanical fan whirr (higher frequency spinning blade sound through bandpass filter)
      const fanNoiseSource = ctx.createBufferSource();
      fanNoiseSource.buffer = noiseBuffer;
      fanNoiseSource.loop = true;
      
      const fanFilter = ctx.createBiquadFilter();
      fanFilter.type = 'bandpass';
      fanFilter.frequency.setValueAtTime(450, ctx.currentTime);
      fanFilter.Q.setValueAtTime(0.8, ctx.currentTime);
      
      const fanGain = ctx.createGain();
      fanGain.gain.setValueAtTime(0.015, ctx.currentTime);
      
      fanNoiseSource.connect(fanFilter);
      fanFilter.connect(fanGain);
      fanGain.connect(masterGain);
      fanNoiseSource.start();

      // 3. Vintage Projector Shutter Flap & Sprocket Clicker
      // Recursive timer for film gate mechanical clicks at 24 frames/sec (~41.7 ms interval)
      let projectorTimer: any;
      const playProjectorFlap = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
        
        // click/flap 1 (shutter blade transit)
        const flapSource = ctx.createBufferSource();
        flapSource.buffer = noiseBuffer;
        
        const flapFilter = ctx.createBiquadFilter();
        flapFilter.type = 'bandpass';
        // Classic acoustic resonance of film gate structure
        flapFilter.frequency.setValueAtTime(260 + Math.random() * 40, ctx.currentTime);
        flapFilter.Q.setValueAtTime(3.5, ctx.currentTime);
        
        const flapGainNode = ctx.createGain();
        flapGainNode.gain.setValueAtTime(0, ctx.currentTime);
        // Extremely fast decay to sound like physical clicks
        flapGainNode.gain.linearRampToValueAtTime(0.07 + Math.random() * 0.04, ctx.currentTime + 0.001);
        flapGainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.012 + Math.random() * 0.006);
        
        flapSource.connect(flapFilter);
        flapFilter.connect(flapGainNode);
        flapGainNode.connect(masterGain);
        
        flapSource.start();
        flapSource.stop(ctx.currentTime + 0.05);

        // Subtle sprocket click (high-frequency celluloid tooth scraping)
        const sprocketSource = ctx.createBufferSource();
        sprocketSource.buffer = noiseBuffer;
        
        const sprockFilter = ctx.createBiquadFilter();
        sprockFilter.type = 'highpass';
        sprockFilter.frequency.setValueAtTime(6500, ctx.currentTime);
        
        const sprockGainNode = ctx.createGain();
        sprockGainNode.gain.setValueAtTime(0, ctx.currentTime);
        sprockGainNode.gain.setValueAtTime(0.008, ctx.currentTime + 0.004);
        sprockGainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.014);
        
        sprocketSource.connect(sprockFilter);
        sprockFilter.connect(sprockGainNode);
        sprockGainNode.connect(masterGain);
        
        sprocketSource.start(ctx.currentTime + 0.004);
        sprocketSource.stop(ctx.currentTime + 0.03);
        
        // Jitter adds gorgeous warmth/analog charm simulating sprocket hole mechanical variations
        const frameInterval = 41.67 + (Math.random() * 2.2 - 1.1); 
        projectorTimer = setTimeout(playProjectorFlap, frameInterval);
      };
      
      playProjectorFlap();
      
      // 4. Popcorn Rustling: Random gentle high-pitched crackles (every 120-280ms)
      let popcornTimer: any;
      const playPopcornCrackle = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
        
        const popcornSource = ctx.createBufferSource();
        popcornSource.buffer = noiseBuffer;
        
        const popFilter = ctx.createBiquadFilter();
        popFilter.type = 'bandpass';
        popFilter.frequency.setValueAtTime(3600 + Math.random() * 1100, ctx.currentTime);
        popFilter.Q.setValueAtTime(5.0, ctx.currentTime);
        
        const popGain = ctx.createGain();
        popGain.gain.setValueAtTime(0, ctx.currentTime);
        popGain.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.05, ctx.currentTime + 0.002);
        popGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03 + Math.random() * 0.04);
        
        popcornSource.connect(popFilter);
        popFilter.connect(popGain);
        popGain.connect(masterGain);
        
        popcornSource.start();
        popcornSource.stop(ctx.currentTime + 0.1);
        
        const nextTime = 120 + Math.random() * 250;
        popcornTimer = setTimeout(playPopcornCrackle, nextTime);
      };
      
      playPopcornCrackle();
      
      // Store on context object to clean up later
      (ctx as any).popcornTimer = popcornTimer;
      (ctx as any).projectorTimer = projectorTimer;
      (ctx as any).sweepOsc = sweepOsc;
      (ctx as any).noiseNode = noiseNode;
      (ctx as any).humOsc = humOsc1;
      (ctx as any).projMotorOsc = projMotorOsc;
      (ctx as any).flutterOsc = flutterOsc;
      (ctx as any).fanNoiseSource = fanNoiseSource;
      
      setAmbientAudioActive(true);
    } catch (err) {
      console.warn("Could not launch procedurally synthesized foyer room ambience sound:", err);
    }
  };

  const fadeAndStopAmbience = () => {
    const ctx = audioContextRef.current;
    const gain = ambienceGainNodeRef.current;
    if (ctx && gain) {
      try {
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 2.0); // Fades completely over 2s
        
        setTimeout(() => {
          if ((ctx as any).popcornTimer) clearTimeout((ctx as any).popcornTimer);
          if ((ctx as any).projectorTimer) clearTimeout((ctx as any).projectorTimer);
          try { (ctx as any).sweepOsc?.stop(); } catch(e){}
          try { (ctx as any).noiseNode?.stop(); } catch(e){}
          try { (ctx as any).humOsc?.stop(); } catch(e){}
          try { (ctx as any).projMotorOsc?.stop(); } catch(e){}
          try { (ctx as any).flutterOsc?.stop(); } catch(e){}
          try { (ctx as any).fanNoiseSource?.stop(); } catch(e){}
          ctx.close();
          audioContextRef.current = null;
          ambienceGainNodeRef.current = null;
          setAmbientAudioActive(false);
        }, 2200);
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const toggleAmbientAudio = () => {
    if (ambientAudioActive) {
      fadeAndStopAmbience();
    } else {
      startAmbienceSynth();
    }
  };

  const handleStartFilm = () => {
    fadeAndStopAmbience();
    setInLobby(false);
    setIsPlaying(true);
    setCurrentTime(0); // Starts the movie from the absolute beginning!
  };

  // Track unique participating in premiere room when player starts
  useEffect(() => {
    if (movie.isPremiere) {
      try {
        const key = `rowone-premiere-participated-${movie.id}`;
        const alreadyTracked = localStorage.getItem(key) === 'true';
        if (!alreadyTracked) {
          localStorage.setItem(key, 'true');
          const savedCount = localStorage.getItem('rowone-premiere-attendance-count');
          const count = savedCount ? parseInt(savedCount, 10) : 0;
          const newCount = count + 1;
          localStorage.setItem('rowone-premiere-attendance-count', String(newCount));
          
          if (newCount >= 5 && onAwardBadge) {
            onAwardBadge('Vanguard Spectator 🎬');
          }
        }
      } catch (e) {}
    }
  }, [movie.isPremiere, movie.id, onAwardBadge]);

  // Lobby Timer tick
  useEffect(() => {
    if (!inLobby) return;
    const interval = setInterval(() => {
      // Increment total lobby duration in seconds spent
      try {
        const saved = localStorage.getItem('rowone-lobby-time-spent-seconds');
        const count = saved ? parseInt(saved, 10) : 0;
        const newCount = count + 1;
        localStorage.setItem('rowone-lobby-time-spent-seconds', String(newCount));
        if (newCount >= 10800 && onAwardBadge) {
          onAwardBadge('Lobby Legend 🕰️');
        }
      } catch (e) {}

      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          handleStartFilm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [inLobby, movie.id, onAwardBadge]);

  // Pre-show Lobby Comments & newcomers Join Simulator
  useEffect(() => {
    if (!inLobby) return;

    const lobbyComments = [
      { username: 'popcorn_queen', text: 'Who did the trivia question? Yamaha DX7 is a legendary FM synthesizer! 🎹' },
      { username: 'foyer_phil', text: 'Prespawned in Hall A! Foyer lighting and poster design are stunning.' },
      { username: 'couch_potato_99', text: 'The ambient acoustics are cozy. Turn on the atmospheric foyer volume control! 🍿' },
      { username: 'retro_screener', text: 'Our lobby hype index is 75%. Let us click that HYPE generator! 🔥' },
      { username: 'clara_fan_club', text: 'Voted Clara in character poll. Absolute certified cinephile 👑' },
      { username: 'neon_rider', text: 'Waiting for this screening to launch! Countdown is ticking down.' },
      { username: 'sound_geek', text: 'Dolby Atmos is fully dialed. Soft crowd rustles sound too realistic.' },
      { username: 'snack_shack', text: '*grabs fresh caramel and cheddar popcorn mix*' },
      { username: 'screen_surfer', text: 'Who configured luxury recliners?' }
    ];

    const interval = setInterval(() => {
      const isNewcomer = Math.random() < 0.35;
      if (isNewcomer) {
        const newcomers = ['cinematrix', 'hall_guide_bob', 'retro_reel_fan', 'pixel_critic', 'projection_boss', 'couch_coop'];
         const randomName = newcomers[Math.floor(Math.random() * newcomers.length)];
        
        setChatMessages((prev) => [
          ...prev,
          {
            id: `join-${Date.now()}`,
            username: 'SYSTEM',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `👋 @${randomName} entered the pre-show lounge foyer, ready for the reels.`,
          }
        ]);
        
        setHypeLevel(prev => Math.min(100, prev + Math.floor(Math.random() * 4) + 3));
      } else {
        const idx = Math.floor(Math.random() * lobbyComments.length);
         const comment = lobbyComments[idx];
        setChatMessages((prev) => [
          ...prev,
          {
            id: `lobby-sim-${Date.now()}`,
            username: comment.username,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: comment.text,
          }
        ]);
      }
    }, 7000);

    return () => clearInterval(interval);
  }, [inLobby]);

  // Format MM:SS for countdown timer remaining
  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto clean up audio context if user backs out of player early
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {}
      }
    };
  }, []);

  // Disappear hand raise toasts
  useEffect(() => {
    if (handRaiseToast) {
      const timer = setTimeout(() => {
        setHandRaiseToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [handRaiseToast]);

  // Autoscroll chat unless user is hovering
  useEffect(() => {
    if (!isChatHovered) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatHovered]);

  // Hide controls overlay if video is playing and user is idle for 3 seconds
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    if (isPlaying) {
      checkInterval = setInterval(() => {
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity > 3000) {
          setShowControls(false);
        }
      }, 1000);
    } else {
      setShowControls(true);
    }

    return () => {
      clearInterval(checkInterval);
    };
  }, [isPlaying]);

  const handleActivity = () => {
    lastActivityRef.current = Date.now();
    if (!showControls) {
      setShowControls(true);
    }
  };

  // Video track update tick simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            setShowPostWatchReview(true);
            if (movie.isPremiere && onAwardBadge) {
              onAwardBadge(`Opening Night Elite: ${movie.title} 🎖️`);
            }
            return totalDuration;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, movie.isPremiere, movie.title, onAwardBadge]);

  // Mock comments generator with full moderation filter
  useEffect(() => {
    if (!isPlaying) return;

    const simulatedComments = [
      { username: 'neo_wanderer', text: 'Wait! Look at the shadow in the back! 👤' },
      { username: 'cyber_junkie', text: 'The soundtrack on this Dolby system is crazy.' },
      { username: 'popcorn_king', text: 'This part always makes me cry 😭😭' },
      { username: 'revelation_90', text: 'Wait, Clara dies around the ending twist! 😭 Spoiler alert!' },
      { username: 'midnight_runner', text: 'The projector\'s light reveals so many secrets.' },
      { username: 'film_critic_jane', text: 'The pacing in Act 2 is flawless.' },
      { username: 'squad_leader', text: 'Communal playback synced so well! 🚀' },
      { username: 'cozy_night', text: '✋ Raising hand for the movie trivia crew' },
    ];

    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * simulatedComments.length);
      const comment = simulatedComments[idx];

      // Block if sender is muted or removed
      if (mutedUsers[comment.username] || removedUsers[comment.username]) {
        return;
      }

      // Check offensive content
      const hasSlur = OFFENSIVE_KEYWORDS.some(word => comment.text.toLowerCase().includes(word));
      if (hasSlur) {
        return;
      }

      const id = `sim-${Date.now()}-${Math.random()}`;
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Run automatic spoiler detection
      const isSpoiler = SPOILER_KEYWORDS.some(word => comment.text.toLowerCase().includes(word)) || comment.text.toLowerCase().includes('spoiler');

      if (comment.text.includes('✋')) {
        simulateHandRaise(comment.username);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id,
            username: comment.username,
            timestamp,
            text: comment.text,
            isSpoiler
          }
        ]);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isPlaying, mutedUsers, removedUsers]);

  // Formatter for time
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const remainingTime = totalDuration - currentTime;

  const triggerHandRaiseAction = () => {
    handleActivity();
    // Local user raises hand
    triggerHandRaise('cinephile_99');
  };

  const simulateHandRaise = (username: string) => {
    triggerHandRaise(username);
  };

  const triggerHandRaise = (name: string) => {
    // 1. Trigger floating emoji of raised hand
    triggerReaction('✋');

    // 2. Set hand raise toast notification
    setHandRaiseToast({
      id: `raise-${Date.now()}-${Math.random()}`,
      text: `@${name} raised their hand! ✋`,
    });

    // 3. Append to chat
    const id = `chat-raise-${Date.now()}-${Math.random()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [
      ...prev,
      {
        id,
        username: name,
        timestamp,
        text: 'Raised their hand ✋',
      },
    ]);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const text = inputVal.trim();

    // 1. Check if the user is currently muted
    if (mutedUsers['cinephile_99']) {
      showWarnBanner("You have been muted by the host.");
      return;
    }

    // 2. Check if the user is currently removed from chat
    if (removedUsers['cinephile_99']) {
      showWarnBanner("You have been removed from this chat room.");
      return;
    }

    // 3. Spam / Throttling (Slow-mode has 10 seconds limit, normal has 1.5s limit)
    const now = Date.now();
    const lastSendTime = lastMessageTimes['cinephile_99'] || 0;
    const cooldownPeriod = slowModeEnabled ? 10000 : 1500;

    if (now - lastSendTime < cooldownPeriod) {
      const remainingSeconds = Math.ceil((cooldownPeriod - (now - lastSendTime)) / 1000);
      showWarnBanner(
        slowModeEnabled
          ? `Slow Mode active. Wait ${remainingSeconds}s before sending.`
          : "Please slow down! Message typing limit active."
      );
      return;
    }

    // 4. Repeated identical comments check
    const lastMessage = userLastMatches['cinephile_99'] || '';
    if (text.toLowerCase() === lastMessage.toLowerCase()) {
      showWarnBanner("⚠️ Identical message duplicate blocked.");
      return;
    }

    // 5. Excessive caps check (blocking when letter-ratio > 65% on > 5 letters)
    const alphabeticOnly = text.replace(/[^a-zA-Z]/g, '');
    if (alphabeticOnly.length >= 5) {
      const capsOnly = alphabeticOnly.replace(/[^A-Z]/g, '');
      if (capsOnly.length / alphabeticOnly.length > 0.65) {
        showWarnBanner("⚠️ CAPS LOCK filter active. Keep your voice down.");
        return;
      }
    }

    // 6. Slurs auto-filter block rule
    const containsSlur = OFFENSIVE_KEYWORDS.some(word => text.toLowerCase().includes(word));
    if (containsSlur) {
      showWarnBanner("❌ Text blocked. Please maintain respectful conversation.");
      return;
    }

    // Passed all validation stages! Update timestamps and previous inputs
    setLastMessageTimes(prev => ({ ...prev, 'cinephile_99': now }));
    setUserLastMatches(prev => ({ ...prev, 'cinephile_99': text }));

    const id = `chat-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (text === '✋' || text.toLowerCase().includes('raise') || text.toLowerCase().includes('hand')) {
      triggerHandRaise('cinephile_99');
    } else {
      // 7. Spoiler detection checking
      const isSpoiler = SPOILER_KEYWORDS.some(word => text.toLowerCase().includes(word)) || text.toLowerCase().includes('spoiler');

      const newMsg: ChatMessage = {
        id,
        username: isHostMode ? 'STUDIO_DIRECTOR 📽️' : 'cinephile_99',
        timestamp,
        text,
        isSpoiler,
        isHost: isHostMode,
        isAnnouncement: movie.isPremiere ? postAsAnnouncement : false,
        isPinned: movie.isPremiere ? postAsPinned : false
      };

      setChatMessages((prev) => [...prev, newMsg]);

      if (movie.isPremiere && postAsPinned) {
        setPinnedMessages((prev) => [...prev, newMsg]);
      }

      // Reset compose state checkboxes
      setPostAsAnnouncement(false);
      setPostAsPinned(false);

      // Trigger reaction
      if (text.match(/🔥|❤️|😮|🍿|😭|👏|✋/)) {
        triggerReaction(text);
      }
    }

    setInputVal('');
  };

  const triggerReaction = (emoji: string) => {
    if (disableReactionsAndAnimations) return;
    const id = `rec-${Date.now()}-${Math.random()}`;
    const xOffset = Math.random() * 200 - 100; // randomized float offset
    setReactions((prev) => [...prev, { id, emoji, x: xOffset }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  if (showPostWatchReview) {
    const handleAddUserReview = (e: React.FormEvent) => {
      e.preventDefault();
      const momentStr = isMomentAnchored ? formatTime(currentTime) : undefined;
      addMovieReview(
        movie.id,
        movie.title,
        reviewScreeningName,
        'cinephile_99',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        reviewRating,
        reviewText,
        momentStr
      );
      setReviewSubmitted(true);
    };

    const ratingDescriptions = [
      'Terrible experience 🍿',
      'Mediocre view 🍿🍿',
      'Good and entertaining 🍿🍿🍿',
      'Great cinematic show! 🍿🍿🍿🍿',
      'An absolute masterpiece! 🍿🍿🍿🍿🍿'
    ];

    return (
      <div className="fixed inset-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 overflow-y-auto text-on-surface">
        <div className="w-full max-w-xl bg-[#121212] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative animate-fade-in">
          
          <div className="absolute top-4 right-4">
            <button 
              onClick={onBack}
              className="px-3.5 py-1.5 bg-white/5 hover:bg-white/15 text-on-surface text-[10px] font-black tracking-widest uppercase rounded-xl transition-all cursor-pointer border border-white/10"
            >
              Exit Player ➔
            </button>
          </div>

          {!reviewSubmitted ? (
            <form onSubmit={handleAddUserReview} className="space-y-6">
              <div className="space-y-1.5 select-none text-left">
                <span className="font-mono text-[9px] text-[#dda75f] font-black tracking-widest uppercase bg-[#dda75f]/10 border border-[#dda75f]/25 px-2.5 py-1 rounded-full">
                  Post-Watch Screening Prompt 🎟️
                </span>
                <h2 className="font-display font-medium text-2xl text-white pt-2">
                  Rate your Screening of <span className="text-secondary font-black">{movie.title}</span>
                </h2>
                <p className="font-sans text-xs text-on-surface-variant leading-relaxed lowercase">
                  Share your thoughts immediately with the couch squad circle. Reviews are permanently anchored to this specific session hall and momento.
                </p>
              </div>

              {/* 1-5 Popcorn Star Ratings */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                <label className="block text-left font-sans text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  CINEMATIC RATING (1-5 STARS)
                </label>
                <div className="flex items-center gap-3 py-1">
                  {[1, 2, 3, 4, 5].map((starValue) => (
                    <button
                      key={`star-${starValue}`}
                      type="button"
                      onClick={() => setReviewRating(starValue)}
                      className="group p-1 transition-all hover:scale-110 active:scale-95 cursor-pointer pb-2"
                      title={`Rate ${starValue} Stars`}
                    >
                      <Star 
                        className={`h-8 w-8 transition-colors ${
                          starValue <= reviewRating 
                            ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' 
                            : 'text-white/20 hover:text-white/40'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-left font-sans text-xs font-semibold text-amber-300">
                  {ratingDescriptions[reviewRating - 1]}
                </p>
              </div>

              {/* Screening Selection Context */}
              <div className="bg-[#181818] border border-white/5 rounded-2xl p-4 space-y-3 text-left">
                <label className="block font-sans text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-none">
                  Which Screening Session did you watch?
                </label>
                <div className="flex flex-col gap-2 mt-2">
                  {[
                    isWatchParty ? 'Private Couch Squad Sync Room' : 'Live Premier Screening Hall Z',
                    'Grand Hall 1 Dolby Atmos • Laser IMAX @ 21:30',
                    'The Red Room Luxury Lounger Suite @ 22:00',
                    'Digital Cinema Lounge catalogue Watch'
                  ].map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setReviewScreeningName(name)}
                      className={`w-full text-left p-3 rounded-xl border font-sans text-xs transition-colors duration-200 cursor-pointer ${
                        reviewScreeningName === name
                          ? 'bg-secondary/15 text-secondary-fixed border-secondary/40 font-bold'
                          : 'bg-black/20 text-on-surface-variant border-white/5 hover:border-white/10 hover:text-white'
                      }`}
                    >
                      🍿 {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Movie Moment Anchor */}
              <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-2xl p-4.5 select-none text-left">
                <div className="space-y-0.5">
                  <span className="font-sans text-[10px] font-bold text-white block uppercase tracking-wider">
                    Anchor review to movie minute
                  </span>
                  <span className="font-mono text-[9px] text-[#b6a090] block lowercase leading-none">
                    Ties comment timeline directly to playback head at <strong className="text-primary">{formatTime(currentTime)}</strong>
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsMomentAnchored(!isMomentAnchored)}
                  className={`w-11 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer duration-300 transition-all ${
                    isMomentAnchored ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <div
                    className={`bg-black w-4.5 h-4.5 rounded-full shadow-md transform duration-300 transition-all ${
                      isMomentAnchored ? 'translate-x-[22px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Written commentary review input */}
              <div className="space-y-2 text-left">
                <label className="block font-sans text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Written Review
                </label>
                <textarea
                  required
                  rows={3}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="The scene with Clara and the renegade drone was stunning! Detail your review here..."
                  className="w-full bg-[#161616] border border-white/10 focus:border-primary/50 text-white rounded-xl p-3 text-xs focus:ring-0 focus:outline-none transition-colors font-sans leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-[#fff] font-sans text-[10px] font-black tracking-widest uppercase rounded-xl transition-all cursor-pointer border border-white/5"
                >
                  Skip Review
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-primary text-on-primary font-sans text-[10px] font-black tracking-widest uppercase rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-primary/20"
                >
                  Publish My Review ✍️
                </button>
              </div>
            </form>
          ) : (
            <div className="py-8 text-center space-y-6 animate-fade-in select-none">
              <div className="w-16 h-16 bg-[#dda75f]/15 border border-[#dda75f]/35 text-[#dda75f] rounded-full flex items-center justify-center mx-auto shadow-xl animate-bounce">
                <Star className="h-8 w-8 fill-[#dda75f]" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-black text-2xl text-white uppercase tracking-wider">Review Locked In!</h3>
                <p className="font-sans text-xs text-on-surface-variant px-6 max-w-sm mx-auto leading-relaxed lowercase">
                  thank you! your review of <strong className="text-white">{movie.title}</strong> was successfully calculated into the live premiere popcorn score.
                </p>
              </div>
              
              <button
                onClick={onBack}
                className="py-3 px-8 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-neutral-950 font-sans text-[10px] font-black tracking-widest uppercase rounded-xl transition-transform hover:scale-[1.02] cursor-pointer shadow-lg inline-block"
              >
                Return to Cinema Lounge ➔
              </button>
            </div>
          )}

        </div>
      </div>
    );
  }

  // --- CONDITIONAL PICTURE-IN-PICTURE MINIMALIST RENDER CONTROL ---
  if (isPip) {
    return (
      <div 
        className={`w-full h-full relative bg-black select-none overflow-hidden flex flex-col justify-end text-white ${isDyslexiaFontActive ? 'font-dyslexic' : ''} ${isQuietModeActive ? 'quiet-mode' : ''} group`}
        onClick={() => {
          if (!isRecordingViolation) {
            setIsPlaying(!isPlaying);
          }
        }}
        id="pip-container-window"
      >


        {/* Floating security label indicator */}
        <div className="absolute top-2 left-2 z-30 pointer-events-none bg-black/60 backdrop-blur-md border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1.5 shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[7.5px] text-emerald-400 font-extrabold uppercase tracking-wide">
            {isGuardActive ? 'DRM ACTIVE' : 'UNPROTECTED'}
          </span>
        </div>

        {/* Dynamic moving preview frame */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <img
            src={movie.heroImageUrl || movie.imageUrl}
            alt="PiP Active Screening Frame"
            className={`w-full h-full object-cover transition-all duration-[600ms] ${
              isRecordingViolation && isGuardActive
                ? 'blur-3xl saturate-0 scale-110 brightness-[0.04]'
                : (isPlaying ? `scale-100 brightness-[0.75] ${getPresetFilterClass(cinematicPreset)}` : `scale-105 brightness-50 ${getPresetFilterClass(cinematicPreset)}`)
            }`}
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent"></div>
        </div>

        {/* Subtitles Overlay Layer for PiP (compact & clean) */}
        {subtitlesEnabled && !inLobby && getSubtitlesForTime(currentTime, movie.title) && !isRecordingViolation && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center px-4 w-11/12 animate-fade-in">
            <span className="inline-block bg-black/85 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] md:text-[11px] font-sans font-bold text-white shadow-xl tracking-tight leading-normal">
              {getSubtitlesForTime(currentTime, movie.title)}
            </span>
          </div>
        )}

        {/* Interactive Playback Progress bar */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const percentage = (e.clientX - rect.left) / rect.width;
            setCurrentTime(Math.floor(percentage * totalDuration));
          }}
          className="absolute bottom-10 left-0 right-0 h-1 bg-white/20 hover:h-1.5 transition-all cursor-pointer z-20"
        >
          <div 
            style={{ width: `${(currentTime / totalDuration) * 100}%` }}
            className="h-full bg-gradient-to-r from-[#dda75f] to-amber-500"
          />
        </div>

        {/* Hover/Show Mini Overlay Controls Panel */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent px-3 py-2 flex justify-between items-center z-30 transition-all duration-300 opacity-0 group-hover:opacity-100 select-none pb-2 h-11"
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
              id="pip-play-pause-btn"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white" />}
            </button>
            <span className="font-sans text-[9px] font-bold text-neutral-300 tracking-tight">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mute/Unmute Quick Volume Control */}
            <button
              onClick={toggleMute}
              className={`p-1 rounded cursor-pointer transition-all ${volume === 0 ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'text-white bg-white/10 hover:bg-white/20'}`}
              title={volume === 0 ? 'Unmute' : 'Mute'}
              id="pip-volume-mute-btn"
            >
              {volume === 0 ? <VolumeX className="h-3.5 w-3.5 text-red-500" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>

            {/* DRM Indicator Toggle check */}
            <button
              onClick={() => setIsGuardActive(!isGuardActive)}
              className={`p-1 rounded cursor-pointer transition-all ${isGuardActive ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-red-400 bg-red-500/10 hover:bg-red-500/20'}`}
              title={isGuardActive ? 'DRM Shield Armed' : 'DRM Shield Disarmed'}
              id="pip-drm-toggle-btn"
            >
              <Shield className="h-3.5 w-3.5" />
            </button>

            {/* Cinematic Filter Cycle Preset Toggler */}
            <button
              onClick={() => {
                const cycle = { standard: 'vintage', vintage: 'cyberpunk', cyberpunk: 'contrast', contrast: 'standard' } as const;
                setCinematicPreset(cycle[cinematicPreset] as any);
              }}
              className="p-1 rounded bg-[#dda75f]/20 hover:bg-[#dda75f]/35 text-[#dda75f] cursor-pointer transition-all"
              title={`Color Grading: ${cinematicPreset.toUpperCase()} (Click to Cycle Profile)`}
              id="pip-preset-toggle-btn"
            >
              <Film className="h-3.5 w-3.5" />
            </button>

            {/* Restore Full Screen Toggler */}
            {onTogglePip && (
              <button
                onClick={onTogglePip}
                className="p-1 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                title="Exit Picture-in-Picture"
                id="pip-restore-btn"
              >
                <Maximize className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Stop screening play - triggers confirmation prompt overlay */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPipCloseConfirm(true);
              }}
              className="p-1.5 rounded cursor-pointer transition-all duration-200 flex items-center gap-1 bg-red-500/20 hover:bg-red-500/35 text-red-400"
              title="Close Watch Session"
              id="pip-close-btn"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Security Violation Overlay within micro player (re-uses existing state) */}
        {isRecordingViolation && isGuardActive && (
          <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-sm flex flex-col justify-center items-center p-4 text-center space-y-2 select-none animate-fade-in" id="pip-security-overlay">
            <ShieldAlert className="h-7 w-7 text-[#ff1a40] animate-pulse" />
            <h4 className="font-display font-medium text-[10px] text-white uppercase tracking-wider">
              DRM VIOLATION TRIGGERED
            </h4>
            <p className="font-sans text-[8.5px] text-[#dac8bb] leading-normal max-w-[220px]">
              Display capture attempt detected. Click to verify identity and resume screening.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRecordingViolation(false);
              }}
              className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-sans text-[8px] font-black uppercase rounded-lg tracking-widest cursor-pointer hover:scale-[1.02] shadow-lg shadow-emerald-500/10"
              id="pip-security-resolve-btn"
            >
              Verify & Play ➔
            </button>
          </div>
        )}

        {/* Accidental Close Confirmation Prompt Overlay */}
        {pipCloseConfirm && (
          <div 
            className="absolute inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col justify-center items-center p-3 text-center space-y-1.5 select-none animate-fade-in" 
            id="pip-close-confirm-overlay"
            onClick={(e) => {
              // Capture click so it doesn't background toggle play/pause
              e.stopPropagation();
            }}
          >
            <ShieldAlert className="h-5 w-5 text-red-500 animate-pulse" />
            <h4 className="font-display font-medium text-[9px] text-white uppercase tracking-wider">
              Terminate Watch Session?
            </h4>
            <p className="font-sans text-[8px] text-neutral-400 leading-normal max-w-[220px]">
              You will lose synchronization and exit the active screening.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPipCloseConfirm(false);
                }}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white font-sans text-[7.5px] font-black uppercase rounded-lg tracking-widest cursor-pointer transition-all active:scale-95"
                id="pip-cancel-btn"
              >
                No, Keep
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPipCloseConfirm(false);
                  onBack();
                }}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-sans text-[7.5px] font-black uppercase rounded-lg tracking-widest cursor-pointer transition-all active:scale-95 shadow-md shadow-red-500/20"
                id="pip-confirm-terminate-btn"
              >
                Yes, Terminate
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={playerContainerRef}
      onMouseMove={handleActivity}
      onClick={handleActivity}
      onKeyDown={handleActivity}
      className={`flex flex-col md:flex-row h-screen w-screen bg-black overflow-hidden fixed inset-0 z-50 text-on-surface ${isDyslexiaFontActive ? 'font-dyslexic' : ''} ${isQuietModeActive ? 'quiet-mode' : ''}`}
    >
      
      {/* Immersive HUD Overlay header */}
      <motion.div 
        initial={false}
        animate={{
          opacity: showControls ? 1 : 0,
          y: showControls ? 0 : -20,
        }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 26
        }}
        className={`absolute top-0 left-0 w-full z-20 flex justify-between items-center p-6 ${
          showControls ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-black/60 border border-white/5 text-on-surface hover:text-primary transition-colors cursor-pointer shrink-0"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setShowPostWatchReview(true);
            }}
            className="h-10 px-4.5 flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-neutral-950 font-sans text-[10px] font-black tracking-widest uppercase transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] cursor-pointer shadow-lg shadow-amber-500/20"
            title="End screening and rate the movie"
          >
            <span>Finish & Review 🍿</span>
          </button>
          
          <div className="hidden sm:flex flex-col select-none">
            <span className="font-display font-medium text-xs tracking-tight text-white leading-none flex items-center gap-2">
              {movie.title}
              <RatingBadge rating={movie.rating} className="scale-90" />
            </span>
            <span className="font-sans text-[8px] text-[#dac6a8] tracking-widest uppercase mt-1">
              COMMUNAL THEATER LIVE
            </span>
          </div>
        </div>

        {/* Minimalist Subtile Viewer Count Indicator (Stand-alone Top Corner) */}
        <div className="pointer-events-auto px-4 py-1.5 rounded-full bg-black/70 border border-white/10 flex items-center gap-2 select-none shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_#ff0000]" />
          <span className="font-sans text-[10px] font-bold tracking-widest text-[#ffe2ab] uppercase">
            {viewerCount} watching
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 select-none h-10">
          <button className="h-10 w-10 flex items-center justify-center rounded-full bg-black/60 border border-white/5 text-on-surface hover:text-primary transition-colors">
            <Settings className="h-4 w-4" />
          </button>
          
          {onTriggerSupport && (
            <button 
              onClick={() => onTriggerSupport({
                movieTitle: movie.title,
                roomId: isWatchParty ? (watchPartyRoomName || 'LOBBY-ROOM') : 'SOLO-ROOM',
                playbackState: inLobby 
                  ? `Pre-show Lobby Countdown (${countdownSeconds}s remaining)` 
                  : (isPlaying ? `PLAYING (${Math.floor(currentTime)}s)` : `PAUSED (${Math.floor(currentTime)}s)`)
              })}
              className="h-10 px-3 flex items-center justify-center gap-1.5 rounded-full bg-black/60 border border-white/5 text-on-surface hover:text-[#ff1a40] hover:border-[#ff1a40]/30 transition-all cursor-pointer"
              title="Open Cinema Support Center"
            >
              <HelpCircle className="h-4.5 w-4.5 text-[#ff1a40] animate-pulse" />
              <span className="font-sans text-[8px] font-black tracking-widest uppercase text-white hidden sm:inline">Support center</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Floating Raise Hand notification toast overlay */}
      {handRaiseToast && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none animate-fade-in">
          <div className="bg-gradient-to-r from-secondary-container to-surface-container bg-opacity-95 border border-secondary/30 backdrop-blur-md px-5 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-[0_0_25px_rgba(255,179,26,0.2)]">
            <span className="text-lg animate-bounce">✋</span>
            <span className="font-sans text-xs font-black tracking-widest text-[#fff] uppercase whitespace-nowrap">
              {handRaiseToast.text}
            </span>
          </div>
        </div>
      )}

      {/* Cinematic Theater Video Screen (Left Panel) or Cinema Lobby Foyer */}
      {inLobby ? (
        <div 
          className={`flex-1 relative bg-[#09090b] overflow-y-auto flex flex-col justify-start transition-all duration-300 p-4 md:p-8 space-y-6 md:space-y-8 select-none text-left ${
            mobileChatState === 'collapsed' ? 'h-full md:h-full' :
            mobileChatState === 'compact' ? 'h-[58vh] md:h-full' : 'h-[22vh] md:h-full'
          }`}
          style={{ backgroundImage: `radial-gradient(circle at top, rgba(221, 167, 95, 0.08) 0%, rgba(0,0,0,0) 80%)` }}
        >
          {/* Subtle Ambient Foyer Backdrop poster glow */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-20 filter blur-3xl overflow-hidden scale-110">
            <img src={movie.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>

          <div className="relative z-10 w-full max-w-5xl mx-auto pt-16 pb-6 space-y-6">
            
            {/* Lobby Banner: Cinema Foyer Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] border border-white/5 rounded-3xl p-5 md:p-6 backdrop-blur-md">
              <div className="space-y-1">
                <span className="font-mono text-[9px] text-[#dda75f] font-black tracking-widest uppercase bg-[#dda75f]/15 border border-[#dda75f]/25 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm animate-pulse mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  PRE-SHOW CINEMA FOYER ACTIVE
                </span>
                <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white uppercase leading-none">
                  Lobby Waiting Lounge
                </h1>
                <p className="font-sans text-[11px] text-[#dac6a8]/70 max-w-lg lowercase">
                  take your digital seats, vote on characters, solve movie trivia, and enjoy the ambient foyer chatter before the cinema reels start spinning!
                </p>
              </div>

              {/* Countdown section */}
              <div className="bg-neutral-950/70 border border-[#dda75f]/25 px-6 py-4 rounded-2xl flex flex-col items-center md:items-end justify-center shrink-0 shadow-lg min-w-[170px]">
                <span className="font-sans text-[8px] text-[#dac6a8] font-black uppercase tracking-widest block mb-0.5">
                  SCREENING STARTS IN
                </span>
                <span className="font-mono text-3xl font-black text-[#dda75f] leading-none tracking-wider">
                  {formatCountdown(countdownSeconds)}
                </span>
                <button 
                  onClick={handleStartFilm}
                  className="mt-2.5 w-full bg-[#dda75f] hover:bg-[#dda75f]/90 text-neutral-950 font-sans text-[9px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  Start Film Now 🎬
                </button>
              </div>
            </div>

            {/* "Your friends are here" lobby banner */}
            <div className="bg-gradient-to-r from-[#dda75f]/8 to-transparent border-l-4 border-[#dda75f] px-5 py-3.5 rounded-r-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  {lobbyFriends.map((f, idx) => (
                    <img 
                      key={`lf-${idx}-${f.username}`}
                      src={f.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80'} 
                      alt={f.username} 
                      className="w-7 h-7 rounded-full border-2 border-neutral-950 object-cover container-fit"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
                <div className="text-left text-[11px] font-sans">
                  <span className="text-white font-bold block">
                    Your friends are checked-in in this same lobby!
                  </span>
                  <span className="text-on-surface-variant">
                    {lobbyFriends.map(f => `@${f.username}`).join(' and ')} are chewing popcorn in Hall A.
                  </span>
                </div>
              </div>
              
              {/* Sound activator component inside the same banner */}
              <button 
                onClick={toggleAmbientAudio}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-sans font-extrabold tracking-wider uppercase border transition-all cursor-pointer ${
                  ambientAudioActive 
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                    : 'bg-white/5 hover:bg-[#dda75f]/15 hover:text-[#dda75f] text-[#dac6a8] border-white/5'
                }`}
                title="Procedurally synthesized cinema chatter & rustling"
              >
                <Radio className={`h-2.5 w-2.5 ${ambientAudioActive ? 'animate-pulse' : ''}`} />
                <span>
                  {ambientAudioActive ? '🔊 Vibe: Playing' : '🔇 Muted: Ambience Sound'}
                </span>
              </button>
            </div>

            {/* Split Grid for Foyer Elements */}
            <div className="grid gap-6 md:grid-cols-12 text-left">
              
              {/* Poster Column and Hype Card */}
              <div className="md:col-span-5 space-y-6">
                
                {/* Poster Card */}
                <div className="bg-[#121214] border border-white/5 rounded-3xl p-5 flex gap-4 items-start shadow-2xl relative overflow-hidden group">
                  <img 
                    src={movie.imageUrl} 
                    alt={movie.title} 
                    className="w-24 rounded-2xl border border-white/10 shadow-lg object-cover shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="space-y-2 text-left">
                    <span className="text-[9px] bg-white/10 text-white font-sans px-2.5 py-0.5 rounded-full font-bold">
                      {movie.format || 'IMAX 3D'}
                    </span>
                    <h2 className="font-display font-extrabold text-base text-white leading-tight uppercase">
                      {movie.title}
                    </h2>
                    <p className="font-sans text-[10px] text-on-surface-variant line-clamp-3 leading-relaxed">
                      {movie.synopsis}
                    </p>
                    <div className="flex items-center gap-2 pt-1 font-sans text-[10px] text-[#dac6a8]">
                      <span>{movie.genre}</span>
                      <span>•</span>
                      <span>{movie.runtime}</span>
                    </div>
                  </div>
                </div>

                {/* Hype Meter Card */}
                <div className="bg-[#121214] border border-white/5 rounded-3xl p-5 space-y-3.5 shadow-2l">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                      <span className="font-sans font-black uppercase tracking-wider text-white text-[11px]">
                        Lobby Hype Meter
                      </span>
                    </div>
                    <span className="font-mono text-[#dda75f] font-extrabold">
                      {hypeLevel}% Complete
                    </span>
                  </div>

                  {/* Progress track */}
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      style={{ width: `${hypeLevel}%` }}
                      className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                    />
                  </div>

                  <p className="font-sans text-[9px] text-[#b6a090] text-left lowercase leading-relaxed">
                    the meter climbs as users stream in! trigger a cheer to push the crowd hype over the edge.
                  </p>

                  <button 
                    onClick={() => {
                      setHypeLevel(prev => Math.min(100, prev + 5));
                      const emojis = ['🍿', '🔥', '🙌', '🎬', '🍿', '🔥', '😮'];
                      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                      setReactions(prev => [
                        ...prev,
                        { id: `reaction-${Date.now()}-${Math.random()}`, emoji: randomEmoji, x: -Math.floor(Math.random() * 200) - 20 }
                      ]);
                    }}
                    className="w-full py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:brightness-110 active:scale-95 text-white font-sans text-[10px] font-black tracking-widest uppercase rounded-xl transition-all shadow-lg shadow-orange-600/10 cursor-pointer"
                  >
                    🔥 Send Lobby Hype Cheer!
                  </button>
                </div>

              </div>

              {/* Poll & Trivia Column */}
              <div className="md:col-span-7 space-y-6">
                
                {/* Poll Card */}
                <div className="bg-[#121214] border border-white/5 rounded-3xl p-5 space-y-3 shadow-2xl text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="block text-base">📊</span>
                    <h3 className="font-display font-extrabold text-[11px] text-white uppercase tracking-wider">
                      Lobby Foyer Fan Poll
                    </h3>
                  </div>
                  <p className="font-sans text-[11px] text-white tracking-tight mb-2">
                    {currentPoll.title}
                  </p>

                  {/* Options */}
                  <div className="space-y-2">
                    {currentPoll.options.map((option) => {
                      const totalVotes = Object.values(pollVotes).reduce((a: any, b: any) => (a as number) + (b as number), 0) as number;
                      const optionVotes = (pollVotes[option] as number) || 0;
                      const percent = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                      const hasVotedThis = userVotedOption === option;

                      return (
                        <button
                          key={option}
                          disabled={!!userVotedOption}
                          onClick={() => {
                            if (userVotedOption) return;
                            setUserVotedOption(option);
                            setPollVotes(prev => ({
                              ...prev,
                              [option]: prev[option] + 1
                            }));
                            setHypeLevel(prev => Math.min(100, prev + 8));
                          }}
                          className={`w-full text-left p-3 rounded-xl border font-sans text-[11px] flex justify-between items-center relative overflow-hidden transition-all duration-300 ${
                            userVotedOption 
                              ? hasVotedThis 
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold' 
                                : 'bg-white/[0.01] border-white/5 text-on-surface-variant' 
                              : 'bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#dda75f]/30 border-white/5 text-white active:scale-[0.99] cursor-pointer'
                          }`}
                        >
                          {userVotedOption && (
                            <div 
                              style={{ width: `${percent}%` }}
                              className={`absolute left-0 top-0 bottom-0 z-0 opacity-10 transition-all duration-700 ${
                                hasVotedThis ? 'bg-[#dda75f]' : 'bg-white'
                              }`}
                            />
                          )}

                          <span className="relative z-10 font-medium flex items-center gap-2">
                            {hasVotedThis && <span className="text-amber-400">✓</span>}
                            {option}
                          </span>
                          
                          <span className="relative z-10 font-mono text-[10px] text-[#dda75f] font-bold">
                            {userVotedOption ? `${percent}%` : 'vote'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trivia Card */}
                <div className="bg-[#121214] border border-white/5 rounded-3xl p-5 space-y-3 shadow-2xl text-left">
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-[#dda75f]" />
                    <h3 className="font-display font-extrabold text-[11px] text-white uppercase tracking-wider">
                      Cinephile Trivia Challenge
                    </h3>
                  </div>

                  <p className="font-sans text-[11px] text-white leading-relaxed">
                    {currentTrivia.question}
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {currentTrivia.options.map((option) => {
                      const isCorrect = option === currentTrivia.correctAnswer;
                      const isOptionSelected = selectedTriviaAnswer === option;
                      let btnStyle = 'bg-white/[0.02] border-white/5 text-white hover:bg-white/[0.05]';
                      
                      if (selectedTriviaAnswer) {
                        if (isCorrect) {
                          btnStyle = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400';
                        } else if (isOptionSelected) {
                          btnStyle = 'bg-red-500/15 border-red-500/40 text-red-400';
                        } else {
                          btnStyle = 'bg-white/[0.01] border-white/5 text-on-surface-variant opacity-60';
                        }
                      }

                      return (
                        <button
                          key={option}
                          disabled={!!selectedTriviaAnswer}
                          onClick={() => {
                            setSelectedTriviaAnswer(option);
                            setShowTriviaExplanation(true);
                            setHypeLevel(prev => Math.min(100, prev + (isCorrect ? 10 : 3)));
                          }}
                          className={`text-left p-2.5 rounded-xl border font-sans text-[11px] transition-all select-none active:scale-[0.98] ${btnStyle} ${!selectedTriviaAnswer ? 'cursor-pointer' : ''}`}
                        >
                          <span className="font-medium">{option}</span>
                        </button>
                      );
                    })}
                  </div>

                  {showTriviaExplanation && (
                    <div className="p-3 bg-neutral-900 border border-white/5 rounded-xl text-[10px] font-sans leading-relaxed text-on-surface-variant space-y-1">
                      <span className="block font-bold text-white uppercase text-[8px] tracking-wide">
                        {selectedTriviaAnswer === currentTrivia.correctAnswer ? '🎉 Correct Answer!' : '❌ Incorrect Answer!'}
                      </span>
                      <span>{currentTrivia.explanation}</span>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>

        </div>
      ) : (
        <div 
          className={`flex-1 relative bg-surface-container-lowest overflow-hidden flex flex-col justify-end transition-all duration-300 ${
            mobileChatState === 'collapsed' ? 'h-full md:h-full' :
            mobileChatState === 'compact' ? 'h-[58vh] md:h-full' : 'h-[22vh] md:h-full'
          }`}
          onClick={() => {
            if (showControls && !isRecordingViolation) {
              setIsPlaying(!isPlaying);
            }
          }}
        >
          
          {/* Placeholder movie background frame */}
          <div className="absolute inset-0 z-0">
            {movie.videoBlobUrl ? (
              <video
                ref={videoRef}
                src={movie.videoBlobUrl}
                className={`w-full h-full object-cover transition-all duration-[600ms] ${
                  isRecordingViolation && isGuardActive
                    ? 'blur-3xl saturate-0 scale-110 brightness-[0.04]'
                    : `brightness-[0.9] ${getPresetFilterClass(cinematicPreset)}`
                }`}
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                playsInline
              />
            ) : (
              <img
                src={movie.heroImageUrl || movie.imageUrl}
                alt="Current Screen Frame"
                className={`w-full h-full object-cover transition-all duration-[600ms] ${
                  isRecordingViolation && isGuardActive
                    ? 'blur-3xl saturate-0 scale-110 brightness-[0.04]'
                    : (isPlaying ? `scale-100 brightness-[0.7] ${getPresetFilterClass(cinematicPreset)}` : `scale-105 brightness-50 ${getPresetFilterClass(cinematicPreset)}`)
                }`}
                referrerPolicy="no-referrer"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/30 to-transparent pointer-events-none"></div>
          </div>



          {/* Piracy Guard / Violation Block Alert Overlay */}
          {isRecordingViolation && isGuardActive && (
            <div className="absolute inset-0 z-30 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in select-none text-left">
              <div className="w-full max-w-md bg-gradient-to-b from-[#1a1112] to-[#0c0c0e] border border-[#ff1a40]/35 rounded-3xl p-6 shadow-2xl shadow-[#ff1a40]/5 relative overflow-hidden">
                {/* Background radar sweep glow */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/5 rounded-full blur-3xl" />
                
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#ff1a40]/10 border border-[#ff1a40]/35 text-[#ff1a40] flex items-center justify-center shrink-0">
                    <ShieldAlert className="h-5.5 w-5.5 animate-pulse" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-mono text-[7px] text-[#ff1a40] font-black tracking-widest uppercase border border-[#ff1a40]/25 bg-[#ff1a40]/5 px-2 py-0.5 rounded-full inline-block">
                      POPCORN_DRM_PROTECTION_ARMOR
                    </span>
                    <h3 className="font-display font-medium text-base text-white pt-1">
                      Stream Paused: Capture Signal Intercepted
                    </h3>
                  </div>
                </div>

                <div className="mt-4 bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2.5">
                  <p className="font-sans text-[11px] text-[#dac8bb] leading-relaxed">
                    Our automated display trust engine has triggered an instant security blur. Screen recorders, capture software (such as OBS Studio/QuickTime), metadata sniffers, or frame transfers are restricted to protect digital copyrights.
                  </p>
                  
                  <div className="text-[9px] font-mono border-t border-white/5 pt-2 flex justify-between items-center text-on-surface-variant">
                    <span>SECURITY STATUS TRIGGER:</span>
                    <strong className="text-[#ff1a40] uppercase">
                      {violationType === 'blur' && 'WINDOW_FOCUS_LOST'}
                      {violationType === 'screenshot' && 'SCREEN_CAPTURE_KEY'}
                      {violationType === 'print' && 'PRINT_DRAFT_BLOCK'}
                      {violationType === 'simulator' && 'MANUAL_DRM_SIMULATED'}
                      {violationType === 'display' && 'DEVICE_INSPECTION_HOOK'}
                    </strong>
                  </div>
                </div>

                <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={() => {
                      setIsRecordingViolation(false);
                      const now = new Date();
                      const timeStr = now.toTimeString().split(' ')[0];
                      setGuardLogs(prev => [{
                        id: `log-${Date.now()}`,
                        time: timeStr,
                        event: 'Session security re-verified. Player restored.',
                        status: 'info' as const
                      }, ...prev]);
                    }}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-neutral-950 font-sans text-[10px] font-black tracking-widest uppercase transition-transform hover:scale-[1.02] cursor-pointer text-center"
                  >
                    Re-Verify Security & Play ➔
                  </button>
                  
                  <button
                    onClick={() => {
                      if (onTriggerSupport) {
                        onTriggerSupport({
                          movieTitle: movie.title,
                          roomId: isWatchParty ? 'SQUAD-SYNC' : 'SOLO-LOBBY',
                          playbackState: `BLOCKED (DRM violation: ${violationType})`
                        });
                      }
                    }}
                    className="py-2 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-sans text-[10px] font-black tracking-widest uppercase rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Report Alert
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subtitles Overlay Layer */}
          {subtitlesEnabled && !inLobby && getSubtitlesForTime(currentTime, movie.title) && (
            <div className="absolute bottom-28 left-1/2 -track-x-1/2 -translate-x-1/2 z-20 pointer-events-none text-center px-6 w-full max-w-3xl select-none animate-fade-in">
              <span className={`inline-block font-sans rounded-xl font-bold py-2 px-5 text-center leading-relaxed tracking-wide ${
                subtitleFontSize === 'sm' ? 'text-xs md:text-sm' :
                subtitleFontSize === 'lg' ? 'text-xl md:text-2xl pet-3' :
                'text-base md:text-lg'
              } ${
                subtitleContrast === 'yellow' ? 'text-yellow-400 bg-black/85 border border-yellow-400/30' :
                subtitleContrast === 'outlined' ? 'text-white font-extrabold [text-shadow:_2px_2px_0_#000,-2px_-2px_0_#000,-2px_2px_0_#000,_2px_-2px_0_#000]' :
                'text-white bg-black/80 border border-white/5 shadow-2xl'
              }`}>
                {getSubtitlesForTime(currentTime, movie.title)}
              </span>
            </div>
          )}

          {/* Audio Description Visual Status Overlay */}
          {audioDescriptionEnabled && !inLobby && getAudioDescriptionForTime(currentTime, movie.title) && (
            <div className="absolute top-20 left-6 z-20 max-w-sm pointer-events-none bg-yellow-400/10 border border-yellow-400/20 backdrop-blur-md px-4 py-3 rounded-2xl flex gap-2.5 items-start select-none animate-fade-in text-left">
              <span className="material-symbols-outlined text-yellow-400 font-light shrink-0 !text-[20px]">audio_description</span>
              <div className="space-y-0.5">
                <span className="font-sans text-[8.5px] font-black text-yellow-400 tracking-wider uppercase block">Narrative Description</span>
                <p className="font-sans text-[10.5px] text-[#eedcb8] leading-relaxed">
                  {getAudioDescriptionForTime(currentTime, movie.title)}
                </p>
              </div>
            </div>
          )}

          {/* Big play/pause indicator overlay when controls are hidden or shown */}
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            {!isPlaying && (
              <div className="w-20 h-20 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-primary shadow-2xl animate-pulse">
                <Play className="h-8 w-8 ml-1 text-primary fill-primary" />
              </div>
            )}
          </div>

          {/* Video Scrubber & Play Controls Layer */}
          <motion.div 
            onClick={(e) => e.stopPropagation()} // Prevent play/pause toggling upon control clicks
            initial={false}
            animate={{
              opacity: showControls ? 1 : 0,
              y: showControls ? 0 : 20,
            }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 26
            }}
            className={`relative z-10 p-6 md:p-8 space-y-4 bg-gradient-to-t from-black/95 via-black/50 to-transparent ${
              showControls ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            
            {/* Synchronized indicator status label tag */}
            <div className="flex items-center gap-2 select-none">
              <div className="bg-black/65 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/5">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-sans text-[10px] font-black tracking-widest text-[#ffe2ab] uppercase">
                  Synchronized with Host
                </span>
              </div>
            </div>

            <div className="space-y-1 text-left">
              <h1 className="font-display font-black text-2xl md:text-3xl lg:text-4xl leading-tight text-white uppercase">
                {movie.title === 'NEON ECHOES' ? 'Midnight in Neo-Seoul' : movie.title}
              </h1>
              <p className="font-sans text-[11px] text-on-surface-variant uppercase tracking-wider font-bold">
                Episode 4 • The Neon Ghost • {formatTime(remainingTime)} remaining
              </p>
            </div>

            {/* seekbar tracker progress controls slider */}
            <div 
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  setCurrentTime(prev => Math.min(totalDuration, prev + 10));
                } else if (e.key === 'ArrowLeft') {
                  setCurrentTime(prev => Math.max(0, prev - 10));
                } else if (e.key === 'Enter' || e.key === ' ') {
                  setIsPlaying(prev => !prev);
                }
              }}
              className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer group focus-visible:ring-2 focus-visible:ring-[#dda75f] focus-visible:outline-none"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = (e.clientX - rect.left) / rect.width;
                setCurrentTime(Math.floor(percentage * totalDuration));
              }}
              aria-label="Movie playback seeking slider"
              role="slider"
              aria-valuenow={currentTime}
              aria-valuemin={0}
              aria-valuemax={totalDuration}
            >
              <div 
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary-container to-primary rounded-full relative"
              >
                <div className="absolute -right-2 -top-1 w-4.5 h-4.5 bg-primary rounded-full border-2 border-white/25 shadow-xl shadow-primary/40 group-hover:scale-125 transition-transform"></div>
              </div>
            </div>

            {/* player buttons HUD row */}
            <div className="flex justify-between items-center text-on-surface">
              <div className="flex items-center gap-5">
                <button 
                  className="text-on-surface hover:text-[#dda75f] active:scale-90 transition-all cursor-pointer focus-visible:ring-1 focus-visible:ring-[#dda75f] focus-visible:outline-none rounded"
                  onClick={() => setCurrentTime(prev => Math.max(0, prev - 10))}
                  aria-label="Seek backward 10 seconds"
                >
                  <SkipBack className="h-5 w-5" />
                </button>

                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 rounded-full bg-[#dda75f] text-neutral-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                  aria-label={isPlaying ? 'Pause movie' : 'Play movie'}
                >
                  {isPlaying ? <Pause className="h-5 w-5 fill-neutral-950 text-neutral-950" /> : <Play className="h-5 w-5 fill-neutral-950 text-neutral-950 ml-0.5" />}
                </button>

                <button 
                  className="text-on-surface hover:text-[#dda75f] active:scale-90 transition-all cursor-pointer focus-visible:ring-1 focus-visible:ring-[#dda75f] focus-visible:outline-none rounded"
                  onClick={() => setCurrentTime(prev => Math.min(totalDuration, prev + 10))}
                  aria-label="Seek forward 10 seconds"
                >
                  <SkipForward className="h-5 w-5" />
                </button>

                <div className="hidden sm:flex items-center gap-3 select-none">
                  <button
                    onClick={toggleMute}
                    className="text-on-surface-variant hover:text-[#dda75f] cursor-pointer transition-colors p-1 rounded-md focus-visible:ring-1 focus-visible:ring-[#dda75f] flex items-center justify-center shrink-0"
                    title={volume === 0 ? "Unmute (M)" : "Mute (M)"}
                    id="volume-display-toggle-btn"
                  >
                    {volume === 0 ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-20 accent-[#dda75f] h-1 bg-white/20 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#dda75f]"
                    aria-label="Adjust volume slider"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Highlighted Raise Hand Button inside overlay player buttons */}
                <button 
                  onClick={triggerHandRaiseAction}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-secondary text-black hover:bg-white hover:text-black hover:scale-105 active:scale-90 transition-all font-sans text-[10px] font-black tracking-widest uppercase cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                  title="Raise Hand"
                >
                  <span>✋ Raise Hand</span>
                </button>

                {/* Invite Friends Button & Popover */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setShowInvitePopover(!showInvitePopover);
                      setShowGuardPanel(false);
                      setShowCaptionMenu(false);
                      setShowPresetMenu(false);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-on-primary hover:bg-white hover:text-black hover:scale-105 active:scale-90 transition-all font-sans text-[10px] font-black tracking-widest uppercase cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    title="Invite Friends to Watch Live"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>👥 Invite Friends</span>
                  </button>

                  {showInvitePopover && (
                    <div className="absolute bottom-12 right-0 bg-neutral-950/95 border border-white/10 backdrop-blur-md rounded-2xl p-4 w-72 shadow-2xl z-50 text-left space-y-3 animate-fade-in text-xs font-sans">
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <h4 className="font-display font-extrabold text-[#dda75f] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          <span>Squad Watch Lounge</span>
                        </h4>
                        <button 
                          onClick={() => setShowInvitePopover(false)} 
                          className="text-on-surface-variant hover:text-white cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-on-surface-variant lowercase leading-relaxed">
                        Authorize other cinephiles to watch this uploaded film live with you. Synchronization is automatic!
                      </p>
                      
                      {/* Copy link */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider block">Lobby Sync URL</label>
                        <div className="flex gap-1.5">
                          <input 
                            type="text" 
                            readOnly 
                            value={`https://popcorn-cinema.app/room/${movie.id}?sync=true`}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-on-surface truncate flex-1 font-mono focus:outline-none"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`https://popcorn-cinema.app/room/${movie.id}?sync=true`);
                              alert("Sync lounge invitation coordinates copied to clipboard!");
                            }}
                            className="px-2.5 py-1 bg-[#dda75f] hover:bg-white hover:text-black text-black font-semibold rounded-lg text-[9px] font-black uppercase cursor-pointer"
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      {/* Online buddies */}
                      <div className="space-y-1.5 pt-1.5">
                        <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider block">Send Direct Co-op Invites</label>
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                          {((friends && friends.length > 0) ? friends : [
                            { username: 'cyber_junkie', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100' },
                            { username: 'movie_buff_99', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100' },
                            { username: 'director_sam', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100' }
                          ]).map((friend: any) => {
                            const isInvited = invitedFriendUsernames[friend.username];
                            return (
                              <div key={friend.username} className="flex items-center justify-between bg-white/[0.02] border border-white/5 px-2.5 py-1.5 rounded-xl">
                                <div className="flex items-center gap-2">
                                  <img src={friend.avatarUrl} className="w-5 h-5 rounded-full object-cover" />
                                  <span className="font-semibold text-[11px] text-white">@{friend.username}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInvitedFriendUsernames(prev => ({ ...prev, [friend.username]: true }));
                                    alert(`Direct co-watch invitation dispatched to @${friend.username}!`);
                                  }}
                                  disabled={isInvited}
                                  className={`px-2 py-0.5 text-[8px] font-black uppercase rounded cursor-pointer ${
                                    isInvited 
                                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                      : 'bg-[#dda75f] text-black font-bold hover:bg-white hover:text-black'
                                  }`}
                                >
                                  {isInvited ? 'Sent ✓' : 'Invite'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* DRM Security Status Indicator/Icon */}
                <div 
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border select-none transition-all duration-300 ${
                    isGuardActive 
                      ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400' 
                      : 'bg-red-500/10 border-red-500/35 text-red-400'
                  }`}
                  title={isGuardActive ? "DRM Security Active - Screen Recording Protected" : "DRM Disabled - Stream Vulnerable"}
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    {isGuardActive && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isGuardActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  </span>
                  {isGuardActive ? <Shield className="h-3.5 w-3.5 text-emerald-400 animate-pulse-gentle" /> : <ShieldAlert className="h-3.5 w-3.5 text-red-400" />}
                  <span className="font-mono text-[8.5px] font-black uppercase tracking-wider hidden md:inline">
                    {isGuardActive ? 'DRM SECURE' : 'DRM UNPROTECTED'}
                  </span>
                </div>

                {/* DRM Protection & Screen Recording Preventer Panel */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setShowGuardPanel(!showGuardPanel);
                      setShowCaptionMenu(false); // Close caption menu to avoid overlap
                      setShowPresetMenu(false);  // Close preset menu to avoid overlap
                    }}
                    className={`transition-all duration-300 cursor-pointer p-1.5 rounded-lg border flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#ff1a40] focus-visible:outline-none ${
                      isGuardActive
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/35 hover:bg-emerald-500/20'
                        : 'text-neutral-400 bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                    title="ROWONE DRM Shield & Anti-Recording Block Console"
                    aria-haspopup="true"
                    aria-expanded={showGuardPanel}
                  >
                    <Shield className="h-4.5 w-4.5" />
                  </button>

                  {showGuardPanel && (
                    <div className="absolute bottom-14 right-0 bg-neutral-950/98 border border-white/10 backdrop-blur-xl rounded-2xl p-4.5 w-80 shadow-2xl z-50 text-left space-y-4 animate-fade-in text-xs font-sans">
                      <div className="flex justify-between items-center select-none pb-2 border-b border-white/10">
                        <span className="font-sans text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5 text-[#ff1a40] animate-pulse" />
                          <span>DRM Shield Security Console</span>
                        </span>
                        <button 
                          onClick={() => setShowGuardPanel(false)}
                          className="text-[9px] font-bold text-[#ff1a40] hover:text-white uppercase transition-colors shrink-0"
                        >
                          Close
                        </button>
                      </div>

                      {/* Video Guard Enable Block */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <div className="space-y-0.5">
                            <span className="font-bold text-white block">Anti-Recording Shield</span>
                            <span className="text-[8.5px] text-on-surface-variant block leading-dense">Blocks screenshots, blur focus, F12 inspector hooks.</span>
                          </div>
                          <button
                            onClick={() => {
                              const nextState = !isGuardActive;
                              setIsGuardActive(nextState);
                              const now = new Date();
                              const timeStr = now.toTimeString().split(' ')[0];
                              setGuardLogs(prev => [{
                                id: `log-${Date.now()}`,
                                time: timeStr,
                                event: `Anti-Recording Shield toggled ${nextState ? 'ON (ARMED)' : 'OFF (DISARMED)'}`,
                                status: nextState ? 'info' : 'warning'
                              }, ...prev]);
                            }}
                            className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                              isGuardActive 
                                ? 'bg-emerald-500 text-neutral-950 font-black' 
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {isGuardActive ? 'ACTIVE 🛡️' : 'OFF ⚠️'}
                          </button>
                        </div>
                      </div>



                      {/* Simulate Screen Recording Interception Button */}
                      {isGuardActive && (
                        <div className="pt-2 border-t border-white/10 space-y-2">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block">Sandbox Simulator Controls</span>
                            <span className="text-[8px] text-on-surface-variant leading-relaxed">Emulates how external OBS hook or print capture vectors are neutralized instantly:</span>
                          </div>
                          <button
                            onClick={() => {
                              setShowGuardPanel(false);
                              triggerViolation('simulator');
                            }}
                            className="w-full py-1.5 bg-[#ff1a40]/15 hover:bg-[#ff1a40]/25 text-[#ff1a40] rounded border border-[#ff1a40]/30 text-[9.5px] font-black uppercase tracking-widest cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] text-center"
                          >
                            ⚡ Simulate Capture Threat
                          </button>
                        </div>
                      )}

                      {/* Live Security Monitor Logging terminal console */}
                      <div className="space-y-1 pt-2 border-t border-white/5 select-none text-left">
                        <span className="text-[8px] text-on-surface-variant font-bold uppercase tracking-widest block mb-1">Live Real-Time ARMOR-LOGS:</span>
                        <div className="bg-black/70 border border-white/5 rounded-lg p-2 h-20 overflow-y-auto font-mono text-[8px] space-y-1 text-neutral-400">
                          {guardLogs.map(log => (
                            <div key={log.id} className="flex gap-2.5 leading-snug">
                              <span className="text-neutral-600 shrink-0">{log.time}</span>
                              <span className={
                                log.status === 'blocked' ? 'text-red-400 font-bold' :
                                log.status === 'warning' ? 'text-yellow-400' :
                                'text-emerald-400/95 font-medium'
                              }>
                                {log.event}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cinematic Color Grading Presets Panel */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setShowPresetMenu(!showPresetMenu);
                      setShowCaptionMenu(false); // Close caption menu to avoid overlap
                      setShowGuardPanel(false); // Close guard panel to avoid overlap
                    }}
                    className={`transition-all duration-300 cursor-pointer p-1.5 rounded-lg border flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#dda75f] focus-visible:outline-none ${
                      cinematicPreset !== 'standard'
                        ? 'text-[#dda75f] bg-[#dda75f]/10 border-[#dda75f]/30 hover:bg-[#dda75f]/20'
                        : 'text-neutral-400 bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                    title="Cinematic Color Grading Presets"
                    aria-haspopup="true"
                    aria-expanded={showPresetMenu}
                    id="cinematic-preset-trigger-btn"
                  >
                    <Film className="h-4.5 w-4.5" />
                  </button>

                  {showPresetMenu && (
                    <div className="absolute bottom-14 right-0 bg-neutral-950/98 border border-white/10 backdrop-blur-xl rounded-2xl p-4.5 w-72 shadow-2xl z-50 text-left space-y-3.5 animate-fade-in text-xs font-sans">
                      <div className="flex justify-between items-center select-none pb-2 border-b border-white/10">
                        <span className="font-sans text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                          <Film className="h-3.5 w-3.5 text-[#dda75f]" />
                          <span>Cinematic Presets</span>
                        </span>
                        <button 
                          onClick={() => setShowPresetMenu(false)}
                          className="text-[9px] font-bold text-[#dda75f] hover:text-white uppercase transition-colors shrink-0"
                        >
                          Done
                        </button>
                      </div>

                      <div className="space-y-1.5 overflow-hidden">
                        <span className="text-[8.5px] font-bold text-on-surface-variant uppercase tracking-wider block">Select Color Grading Profile</span>
                        <div className="flex flex-col gap-2">
                          {[
                            { id: 'standard', name: 'Original / Standard', desc: 'No modifications to theatrical feed.', accent: 'bg-neutral-500' },
                            { id: 'vintage', name: 'Vintage Noir 🎞️', desc: 'High-contrast monochrome black & white elegance.', accent: 'bg-amber-100' },
                            { id: 'cyberpunk', name: 'Neon Cyberpunk ⚡', desc: 'Saturated magenta/cyan grade with sci-fi energy.', accent: 'bg-fuchsia-500' },
                            { id: 'contrast', name: 'High Contrast HDR 🎬', desc: 'Deeper blacks and amplified peak range.', accent: 'bg-emerald-500' }
                          ].map(presetItem => {
                            const active = cinematicPreset === presetItem.id;
                            return (
                              <button
                                key={presetItem.id}
                                onClick={() => {
                                  setCinematicPreset(presetItem.id as any);
                                  const now = new Date();
                                  const timeStr = now.toTimeString().split(' ')[0];
                                  setGuardLogs(prev => [{
                                    id: `log-${Date.now()}`,
                                    time: timeStr,
                                    event: `Cinematic grading updated: '${presetItem.name}' file feed.`,
                                    status: 'info' as const
                                  }, ...prev]);
                                }}
                                className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 text-left cursor-pointer transition-all duration-200 ${
                                  active 
                                    ? 'bg-[#dda75f]/10 border-[#dda75f] text-[#dda75f]' 
                                    : 'bg-white/[0.02] border-white/5 text-[#dac8bb] hover:bg-white/[0.05] hover:border-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-2 w-full justify-between">
                                  <span className="font-bold text-[11px] block text-white">{presetItem.name}</span>
                                  <span className={`w-2 h-2 rounded-full ${presetItem.accent} ${active ? 'ring-2 ring-offset-2 ring-offset-black ring-[#dda75f]' : ''}`} />
                                </div>
                                <span className="text-[9px] text-on-surface-variant leading-dense block">{presetItem.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Calibration alert footnote and info */}
                      <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center gap-2 text-[8px] text-on-surface-variant leading-relaxed">
                        <Sparkles className="h-3.5 w-3.5 text-[#dda75f] shrink-0" />
                        <span>Dynamic profiles process procedurally inside the WebGL shader wrapper to minimize latency.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Closed Caption & Accessibility Control Menu */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setShowCaptionMenu(!showCaptionMenu);
                      setShowGuardPanel(false); // Close guard panel to avoid overlap
                      setShowPresetMenu(false); // Close preset menu to avoid overlap
                    }}
                    className={`transition-colors cursor-pointer p-1.5 rounded-lg border focus-visible:ring-2 focus-visible:ring-[#dda75f] focus-visible:outline-none ${
                      subtitlesEnabled || audioDescriptionEnabled
                        ? 'text-primary bg-primary/10 border-primary/25'
                        : 'text-on-surface bg-white/5 border-white/10'
                    }`}
                    title="Subtitles & Audio Descriptions (CC)"
                    aria-haspopup="true"
                    aria-expanded={showCaptionMenu}
                  >
                    <span className="material-symbols-outlined font-light !text-[20px] block">closed_caption</span>
                  </button>

                  {showCaptionMenu && (
                    <div className="absolute bottom-14 right-0 bg-neutral-950/95 border border-white/10 backdrop-blur-md rounded-2xl p-4 w-72 shadow-2xl z-50 text-left space-y-4 animate-fade-in text-xs font-sans">
                      <div className="flex justify-between items-center select-none pb-1.5 border-b border-white/10">
                        <span className="font-sans text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-1">
                          <span className="material-symbols-outlined font-light !text-[16px] text-[#dda75f]">settings_accessibility</span>
                          <span>CC &amp; Audio Accessibility</span>
                        </span>
                        <button 
                          onClick={() => setShowCaptionMenu(false)}
                          className="text-[9px] font-bold text-[#dda75f] hover:text-white uppercase transition-colors shrink-0"
                        >
                          Done
                        </button>
                      </div>

                      {/* Subtitles Toggle */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white">Captions / Subtitles</span>
                          <button
                            onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                            className={`px-2.5 py-1 rounded text-[9.5px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                              subtitlesEnabled 
                                ? 'bg-primary text-black' 
                                : 'bg-white/5 text-on-surface-variant border border-white/5'
                            }`}
                          >
                            {subtitlesEnabled ? 'ON ✅' : 'OFF'}
                          </button>
                        </div>
                      </div>

                      {/* Subtitle Font Size */}
                      {subtitlesEnabled && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block">Font Size</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['sm', 'md', 'lg'] as const).map((sz) => (
                              <button
                                key={sz}
                                onClick={() => setSubtitleFontSize(sz)}
                                className={`py-1 rounded text-[9.5px] font-bold uppercase tracking-wider border cursor-pointer ${
                                  subtitleFontSize === sz
                                    ? 'bg-[#dda75f] border-[#dda75f] text-black font-extrabold'
                                    : 'bg-white/5 border-white/5 text-[#dac8bb] hover:bg-white/10'
                                }`}
                              >
                                {sz === 'sm' ? 'Small' : sz === 'md' ? 'Medium' : 'Large'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Color Contrast */}
                      {subtitlesEnabled && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block">Contrast Palette</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['white', 'yellow', 'outlined'] as const).map((cc) => (
                              <button
                                key={cc}
                                onClick={() => setSubtitleContrast(cc)}
                                className={`py-1 rounded text-[9.5px] font-bold uppercase tracking-wider border cursor-pointer ${
                                  subtitleContrast === cc
                                    ? 'bg-[#dda75f] border-[#dda75f] text-black font-extrabold'
                                    : 'bg-white/5 border-white/5 text-[#dac8bb] hover:bg-white/10'
                                }`}
                              >
                                {cc === 'white' ? 'White' : cc === 'yellow' ? 'Yellow' : 'Outlined'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Audio Description Toggle */}
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <div className="text-left font-sans mr-2">
                            <span className="font-bold text-white block">Audio Descriptions</span>
                            <span className="text-[8.5px] text-on-surface-variant block leading-tight lowercase">speaks visual narrative aloud for blind users</span>
                          </div>
                          <button
                            onClick={() => setAudioDescriptionEnabled(!audioDescriptionEnabled)}
                            className={`px-2.5 py-1 rounded text-[9.5px] font-black uppercase tracking-wider shrink-0 cursor-pointer transition-all ${
                              audioDescriptionEnabled 
                                ? 'bg-[#dda75f] text-black font-extrabold' 
                                : 'bg-white/5 text-on-surface-variant border border-white/5'
                            }`}
                          >
                            {audioDescriptionEnabled ? 'ON 🔊' : 'OFF'}
                          </button>
                        </div>
                      </div>

                      {/* Audio Boost / Volume Normalization Toggle */}
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <div className="text-left font-sans mr-2">
                            <span className="font-bold text-white block">Audio Boost 🔊</span>
                            <span className="text-[8.5px] text-on-surface-variant block leading-tight lowercase">Normalize stream levels & boost quiet dialogues to optimal movie theater dynamics</span>
                          </div>
                          <button
                            onClick={() => setAudioBoostEnabled(!audioBoostEnabled)}
                            className={`px-2.5 py-1 rounded text-[9.5px] font-black uppercase tracking-wider shrink-0 cursor-pointer transition-all ${
                              audioBoostEnabled 
                                ? 'bg-[#dda75f] text-black font-extrabold' 
                                : 'bg-white/5 text-on-surface-variant border border-white/5'
                            }`}
                          >
                            {audioBoostEnabled ? 'ON ⚡' : 'OFF'}
                          </button>
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* Live Chat Collapse Toggler Button */}
                <button 
                  onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                  className={`transition-all duration-300 p-1.5 rounded-lg border cursor-pointer hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#dda75f] focus-visible:outline-none ${
                    !isChatCollapsed 
                      ? 'text-primary bg-primary/10 border-primary/20' 
                      : 'text-on-surface bg-white/5 border-white/10'
                  }`}
                  title={isChatCollapsed ? 'Expand Chat Panel' : 'Collapse Chat Panel'}
                >
                  <MessageSquare className="h-4.5 w-4.5" />
                </button>

                {onTogglePip && (
                  <button 
                    onClick={onTogglePip}
                    className="text-on-surface hover:text-[#dda75f] hover:bg-white/5 transition-all cursor-pointer p-1.5 rounded-lg flex items-center justify-center shrink-0"
                    title="Minimize to Picture-in-Picture mode"
                    id="trigger-pip-mode-btn"
                  >
                    <Tv className="h-4.5 w-4.5" />
                  </button>
                )}

                <button 
                  onClick={toggleFullscreen}
                  className="text-on-surface hover:text-primary transition-colors cursor-pointer"
                  title="Toggle Fullscreen (F)"
                  id="fullscreen-toggle-btn"
                >
                  <Maximize className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Floating Emojis floating container layer - dims/mutes animations if Quiet Mode or Disable Reactions and Animations is active */}
      <div className={`absolute right-0 bottom-40 w-full md:w-96 h-96 z-40 overflow-hidden pointer-events-none transition-all duration-500 ${(isQuietModeActive || disableReactionsAndAnimations) ? 'opacity-0 scale-50 transition-opacity' : 'opacity-100'}`}>
        {!(isQuietModeActive || disableReactionsAndAnimations) && reactions.map((r) => (
          <div
            key={r.id}
            style={{ 
              transform: `translateX(${r.x}px)`,
              right: '24px'
            }}
            className="absolute bottom-4 text-4xl select-none"
          >
            <div className="animate-emoji-float">
              {r.emoji}
            </div>
          </div>
        ))}
      </div>

      {/* Live Chat sidebar widget panel (Right Panel) */}
      <aside 
        className={`bg-surface-container-low border-white/5 flex flex-col relative z-25 transition-all duration-300 ease-out overflow-hidden ${
          isChatCollapsed 
            ? 'w-0 h-0 md:w-0 md:h-full border-none hidden md:hidden' 
            : `w-full md:w-96 border-t md:border-t-0 md:border-l ${
                mobileChatState === 'collapsed' ? 'h-0 hidden' :
                mobileChatState === 'compact' ? 'h-[42vh] md:h-full' : 'h-[78vh] md:h-full'
              }`
        }`}
      >
        {/* Mobile Swipe-up / Swipe-down Handle Bar indicator */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="md:hidden flex flex-col items-center justify-center py-2 bg-black/40 border-b border-white/5 cursor-row-resize select-none shrink-0"
        >
          <div className="w-12 h-1 rounded-full bg-white/20 mb-1" />
          <span className="font-sans text-[7px] font-bold text-white/30 tracking-widest uppercase pb-[1px]">
            {mobileChatState === 'expanded' ? 'Swipe down to collapse' : 'Swipe up to expand chat'}
          </span>
        </div>
        <div className="p-4 md:p-6 border-b border-white/5 flex flex-col gap-3 select-none">
          <div className="flex justify-between items-center">
            <h2 className="font-display font-medium text-lg text-on-surface flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span>Live Chat</span>
            </h2>
            
            <div className="flex items-center gap-2">
              <span className="font-sans text-[9px] font-black tracking-widest text-on-surface-variant bg-white/5 px-2 py-0.5 rounded-full uppercase">
                {chatMessages.length} MSGS
              </span>
              
              {/* Settings / Controls visibility toggler button */}
              <button 
                onClick={() => setShowMiniMenu(!showMiniMenu)}
                className={`p-1 hover:bg-white/5 rounded transition-all cursor-pointer ${
                  showMiniMenu ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-white'
                }`}
                title={showMiniMenu ? "Hide Chat Controls" : "Show Chat Controls"}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              
              {/* Collapse button on chat top header */}
              <button 
                onClick={() => setIsChatCollapsed(true)}
                className="p-1 hover:bg-white/5 rounded text-on-surface-variant hover:text-white transition-all cursor-pointer"
                title="Collapse chat pane"
              >
                <ChevronLeft className="h-4.5 w-4.5 rotate-180" />
              </button>
            </div>
          </div>

          {isWatchParty && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="h-4 w-4 text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <span className="font-sans font-black text-[9px] text-purple-400 uppercase tracking-widest block leading-none">WATCH PARTY LOCKED</span>
                  <span className="font-sans text-[9.5px] text-[#f4ebdf] block mt-1 truncate">
                    {watchPartyRoomName || "Synchronized lobby synced with squad circle"}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-sans text-[7px] font-black tracking-wider uppercase shrink-0">
                SECURE
              </span>
            </div>
          )}

          {showMiniMenu && (
            <div className="flex flex-col gap-3 animate-fade-in mt-1">
              {/* Spoiler Protection Master Toggle Switch */}
              <div className="flex items-center justify-between bg-black/35 rounded-xl px-3.5 py-2.5 border border-white/5">
                <div className="flex items-center gap-2">
                  {isSpoilerBlurActive ? (
                    <EyeOff className="h-4 w-4 text-secondary" />
                  ) : (
                    <Eye className="h-4 w-4 text-on-surface-variant" />
                  )}
                  <span className="font-sans text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Blur All Comments
                  </span>
                </div>
                
                <button
                  onClick={() => setIsSpoilerBlurActive(!isSpoilerBlurActive)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer duration-300 transition-all ${
                    isSpoilerBlurActive ? 'bg-secondary' : 'bg-surface-container-highest'
                  }`}
                >
                  <div
                    className={`bg-black w-4.5 h-4.5 rounded-full shadow-md transform duration-300 transition-all ${
                      isSpoilerBlurActive ? 'translate-x-5.5 bg-on-secondary' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Slow Mode Toggle Switch */}
              <div className="flex items-center justify-between bg-black/35 rounded-xl px-3.5 py-2 border border-white/5">
                <div className="flex items-center gap-2">
                  <Zap className={`h-4 w-4 shrink-0 transition-colors ${slowModeEnabled ? 'text-amber-500' : 'text-on-surface-variant'}`} />
                  <div className="text-left font-sans">
                    <span className="text-[10px] font-bold text-white block uppercase tracking-wider leading-none">Slow Mode [10s]</span>
                    <span className="text-[7.5px] text-on-surface-variant block mt-0.5">Limit comments to 1 per 10s</span>
                  </div>
                </div>
                
                <button
                  onClick={() => setSlowModeEnabled(!slowModeEnabled)}
                  className={`w-11 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer duration-300 transition-all ${
                    slowModeEnabled ? 'bg-amber-500' : 'bg-surface-container-highest'
                  }`}
                  title="Toggle Slow Mode"
                >
                  <div
                    className={`bg-black w-4.5 h-4.5 rounded-full shadow-md transform duration-300 transition-all ${
                      slowModeEnabled ? 'translate-x-[22px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Administrator / Host Controls Toggle Switch */}
              <div className="flex items-center justify-between bg-black/35 rounded-xl px-3.5 py-2 border border-white/5">
                <div className="flex items-center gap-2">
                  <Shield className={`h-4 w-4 shrink-0 transition-colors ${isHostMode ? 'text-primary' : 'text-on-surface-variant'}`} />
                  <div className="text-left font-sans">
                    <span className="text-[10px] font-bold text-white block uppercase tracking-wider leading-none">Host / Admin Panel</span>
                    <span className="text-[7.5px] text-on-surface-variant block mt-0.5">Unlocks mute/remove tools</span>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsHostMode(!isHostMode)}
                  className={`w-11 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer duration-300 transition-all ${
                    isHostMode ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                  title="Toggle Creator Host Tools"
                >
                  <div
                    className={`bg-black w-4.5 h-4.5 rounded-full shadow-md transform duration-300 transition-all ${
                      isHostMode ? 'translate-x-[22px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Chat Text Size Independent Selector */}
              <div className="flex items-center justify-between bg-black/35 rounded-xl px-3.5 py-2 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px] text-on-surface-variant">format_size</span>
                  <span className="font-sans text-[10px] font-bold text-white uppercase tracking-wider">Chat Text Size</span>
                </div>
                <div className="flex gap-1 select-none">
                  {(['sm', 'base', 'lg', 'xl'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setChatTextSize(sz)}
                      className={`px-1.5 py-1 text-[9px] font-black uppercase rounded cursor-pointer transition-colors ${
                        chatTextSize === sz
                          ? 'bg-secondary text-[#0a0a0a] font-extrabold border border-secondary'
                          : 'bg-white/5 hover:bg-white/10 text-on-surface border border-white/10 font-bold'
                      }`}
                      aria-label={`Set chat text size to ${sz}`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* chat messaging feeds scrolling box - hovers will temporarily pause scrolls */}
        <div 
          onMouseEnter={() => setIsChatHovered(true)}
          onMouseLeave={() => setIsChatHovered(false)}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-none bg-surface-container-low relative"
        >
          {isChatHovered && (
            <div className="sticky top-0 left-0 right-0 z-10 text-center pointer-events-none mb-1">
              <span className="bg-secondary/20 text-secondary border border-secondary/30 backdrop-blur-md px-3 py-1 rounded-full text-[8.5px] font-black tracking-widest uppercase shadow">
                ⏸ Scroll Paused (Hovered)
              </span>
            </div>
          )}

          {/* PINNED GALA MESSAGES ROW */}
          {movie.isPremiere && pinnedMessages.length > 0 && (
            <div className="sticky top-0 z-20 space-y-1.5 mb-3 bg-[#0c0805]/95 p-2.5 rounded-xl border border-yellow-500/25 shadow-lg max-h-[120px] overflow-y-auto">
              <span className="font-mono text-[7.5px] text-yellow-400 font-extrabold tracking-widest uppercase flex items-center gap-1 leading-none mb-1.5 pb-1 border-b border-yellow-500/10">
                <Pin className="h-2 w-2 text-yellow-400 animate-pulse fill-yellow-400" />
                PINNED STUDIO INFORMATION ({pinnedMessages.length})
              </span>
              {pinnedMessages.map((pm) => (
                <div key={`pnm-${pm.id}`} className="text-left p-1.5 bg-yellow-400/5 hover:bg-yellow-400/10 border border-yellow-500/10 rounded flex justify-between items-start gap-2 animate-fade-in">
                  <div className="min-w-0 font-sans">
                    <span className="text-[7.5px] text-[#dac6a8] font-black uppercase tracking-wider block">@{pm.username}:</span>
                    <p className="text-[10px] text-yellow-101 leading-normal font-medium">{pm.text}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setPinnedMessages(prev => prev.filter(p => p.id !== pm.id));
                      showWarnBanner("Unpinned reference list.");
                    }}
                    className="text-[8px] font-sans font-bold text-yellow-400 hover:text-white shrink-0 uppercase tracking-widest leading-none cursor-pointer"
                    title="Dismiss Pin"
                  >
                    × UNPIN
                  </button>
                </div>
              ))}
            </div>
          )}

          {chatMessages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center py-2 animate-fade-in select-none">
                  <span className="font-mono text-[9px] text-[#ff8080] tracking-widest uppercase bg-red-950/40 border border-red-500/20 px-3.5 py-1 rounded-full inline-block">
                    🛡️ {msg.text}
                  </span>
                </div>
              );
            }

            const isUserBanned = removedUsers[msg.username];
            const isUserMuted = mutedUsers[msg.username];
            const isCommentReported = reportedCommentIds[msg.id];
            
            const isMessageSpoiler = msg.isSpoiler;
            const isBlurred = (isSpoilerBlurActive || isMessageSpoiler) && !revealedCommentIds[msg.id];
            
            return (
              <div key={msg.id} className="flex flex-col gap-1.5 border-b border-white/[0.04] pb-2.5 transition-all">
                <div className="flex items-center justify-between gap-2 select-none">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className={`font-sans text-[10px] font-black tracking-widest uppercase truncate ${msg.isHost ? 'text-primary' : 'text-[#ffdfa0]'}`}>
                      @{msg.username}
                    </span>
                    {msg.isHost && (
                      <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black tracking-widest uppercase rounded">
                        HOST
                      </span>
                    )}
                    {isUserMuted && (
                      <span className="px-1 inline-flex items-center bg-amber-500/15 text-amber-500 text-[7px] font-black tracking-widest uppercase rounded">
                        MUTED
                      </span>
                    )}
                    {isUserBanned && (
                      <span className="px-1 inline-flex items-center bg-red-600/15 text-red-500 text-[7px] font-black tracking-widest uppercase rounded">
                        BANNED
                      </span>
                    )}
                    {msg.timestamp && (
                      <span className="text-[9px] text-on-surface-variant font-mono">
                        {msg.timestamp}
                      </span>
                    )}
                  </div>

                  {/* Actions Area: Reported indicator, Report trigger, and Moderator controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Pin / Announcement Button (Only for Premieres) */}
                    {movie.isPremiere && (
                      <button
                        onClick={() => {
                          const alreadyPinned = pinnedMessages.some(pm => pm.id === msg.id);
                          if (alreadyPinned) {
                            setPinnedMessages(prev => prev.filter(pm => pm.id !== msg.id));
                            showWarnBanner(`Unpinned comment from reference list.`);
                          } else {
                            setPinnedMessages(prev => [...prev, { ...msg, isPinned: true }]);
                            showWarnBanner(`Pinned message to top for Q&A! 📌`);
                          }
                        }}
                        className={`p-1 rounded shrink-0 transition-all cursor-pointer ${
                          pinnedMessages.some(pm => pm.id === msg.id)
                            ? 'text-yellow-400 bg-yellow-450/20'
                            : 'text-on-surface-variant hover:text-yellow-400 hover:bg-white/5'
                        }`}
                        title="Pin this comment/announcement"
                      >
                        <Pin className="h-3 w-3" />
                      </button>
                    )}

                    {/* 1-Tap Report Button */}
                    {isCommentReported ? (
                      <span className="text-[7.5px] text-red-400 font-extrabold uppercase animate-pulse shrink-0 flex items-center gap-0.5 bg-red-500/15 px-1.5 py-0.5 rounded border border-red-500/30">
                        <Check className="h-2 w-2" /> Reported
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setReportedCommentIds(prev => ({ ...prev, [msg.id]: true }));
                          showWarnBanner(`Reported comment by @${msg.username} to studio admins.`);
                        }}
                        className="text-on-surface-variant hover:text-red-400 transition-colors shrink-0 p-1 rounded hover:bg-white/5 cursor-pointer"
                        title="Report this comment with 1 tap"
                      >
                        <Flag className="h-3 w-3" />
                      </button>
                    )}

                    {/* Creator/Host Moderation Toolkit Controls */}
                    {isHostMode && msg.username !== 'cinephile_99' && (
                      <div className="flex items-center gap-1 border-l border-white/10 pl-1">
                        {/* Mute Button */}
                        <button
                          onClick={() => {
                            const currentlyMuted = !!mutedUsers[msg.username];
                            setMutedUsers(prev => ({ ...prev, [msg.username]: !currentlyMuted }));
                            showWarnBanner(currentlyMuted ? `@${msg.username} unmuted.` : `@${msg.username} was MUTED by host.`);
                          }}
                          className={`p-1 rounded shrink-0 transition-colors cursor-pointer ${
                            isUserMuted 
                              ? 'text-amber-500 bg-amber-500/15' 
                              : 'text-on-surface-variant hover:text-amber-400 hover:bg-white/5'
                          }`}
                          title={isUserMuted ? "Unmute user" : "Mute user from chat"}
                        >
                          <VolumeX className="h-3.5 w-3.5" />
                        </button>

                        {/* Ban / Remove Button */}
                        {!isUserBanned && (
                          <button
                            onClick={() => {
                              setRemovedUsers(prev => ({ ...prev, [msg.username]: true }));
                              showWarnBanner(`User @${msg.username} removed from the chat.`);
                              
                              // Append system message
                              setChatMessages(prev => [
                                ...prev,
                                {
                                  id: `sys-remove-${Date.now()}`,
                                  username: 'SYSTEM',
                                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                  text: `@${msg.username} was removed by room host.`,
                                  isSystem: true
                                }
                              ]);
                            }}
                            className="text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 p-1 rounded shrink-0 transition-colors cursor-pointer"
                            title="Remove/Ban user from chat"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative group">
                  <p 
                    onClick={() => {
                      if (isBlurred) {
                        setRevealedCommentIds(prev => ({ ...prev, [msg.id]: true }));
                      }
                    }}
                    className={`font-sans text-on-surface p-2.5 rounded-2xl rounded-tl-none relative transition-all duration-300 ${
                      chatTextSize === 'sm' ? 'text-[10px] leading-relaxed' :
                      chatTextSize === 'base' ? 'text-xs md:text-[11.5px] leading-relaxed' :
                      chatTextSize === 'lg' ? 'text-sm md:text-sm leading-relaxed' :
                      'text-base md:text-base leading-relaxed'
                    } ${
                      msg.isHost 
                        ? 'bg-primary/5 border border-primary/25 text-primary-fixed' 
                        : isUserBanned 
                        ? 'bg-red-950/20 border border-red-500/15 text-red-400/40 line-through italic'
                        : 'bg-surface-container-high/40'
                    } ${
                      isBlurred 
                        ? 'blur-md select-none cursor-pointer text-opacity-15' 
                        : ''
                    }`}
                  >
                    {isUserBanned ? "🚫 [This message is hidden because the sender was banned]" : msg.text}
                  </p>

                  {isBlurred && !isUserBanned && (
                    <div 
                      onClick={() => {
                        setRevealedCommentIds(prev => ({ ...prev, [msg.id]: true }));
                      }}
                      className="absolute inset-0 flex items-center justify-center cursor-pointer select-none"
                    >
                      <span className="font-sans text-[8.5px] font-black tracking-widest text-[#ffe4b0] hover:text-white bg-black/95 px-3 py-1.5 rounded-xl border border-amber-500/35 uppercase animate-pulse shadow-md flex items-center gap-1.5">
                        <ShieldAlert className="h-3 w-3 text-amber-400 shrink-0" />
                        {isMessageSpoiler ? "Possible spoiler — tap to reveal ⚠️" : "Comment Blurred — Tap to Reveal 👁️"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* Reaction quick floating emitters, including Raise Hand */}
        <div className="p-4 md:p-6 pt-0 flex gap-2 overflow-x-auto scrollbar-none select-none">
          {['✋', '🔥', '❤️', '😮', '🍿', '😭', '👏'].map((emoji) => {
            const isHand = emoji === '✋';
            const isDisabled = !isHand && disableReactionsAndAnimations;
            return (
              <button
                key={emoji}
                disabled={isDisabled}
                onClick={() => {
                  if (isHand) {
                    triggerHandRaiseAction();
                  } else {
                    triggerReaction(emoji);
                  }
                }}
                className={`px-3.5 py-2 rounded-full text-base active:scale-90 transition-transform ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed grayscale bg-surface-container-low border border-outline-variant/10'
                    : isHand
                    ? 'hover:bg-secondary/20 bg-secondary/10 border border-secondary/30 text-secondary cursor-pointer'
                    : 'hover:bg-primary/10 bg-surface-container-high border border-outline-variant/30 cursor-pointer'
                }`}
                title={isDisabled ? 'Reactions muted in accessibility settings' : isHand ? 'Raise Hand' : `Send ${emoji}`}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        {/* Validation / Custom warnings toast above input */}
        {warnNotification && (
          <div className="mx-4 mb-2 p-2.5 bg-red-950/80 border border-red-500/40 text-red-100 flex items-center gap-2 text-xs font-sans rounded-xl animate-bounce justify-center select-none shadow-lg">
            <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
            <span className="tracking-wide font-black uppercase text-[9px]">{warnNotification}</span>
          </div>
        )}

        {/* Chat input form container */}
        <div className="p-4 md:p-6 border-t border-white/5 bg-surface-container-low/95">
          {movie.isPremiere && (
            <div className="flex gap-4 items-center mb-3 select-none justify-start px-1 font-sans text-[9px] text-[#dac6a8]">
              <span className="font-mono text-yellow-400 font-bold tracking-widest uppercase">🎙️ STUDIO DASH FOR PREM:</span>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                <input 
                  type="checkbox"
                  checked={postAsAnnouncement}
                  onChange={(e) => setPostAsAnnouncement(e.target.checked)}
                  className="rounded border-white/25 text-yellow-500 focus:ring-0 w-3 h-3 bg-[#111]"
                />
                <span>📢 Announcement</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                <input 
                  type="checkbox"
                  checked={postAsPinned}
                  onChange={(e) => setPostAsPinned(e.target.checked)}
                  className="rounded border-white/25 text-yellow-500 focus:ring-0 w-3 h-3 bg-[#111]"
                />
                <span>📌 Pin Q&amp;A</span>
              </label>
            </div>
          )}

          <form onSubmit={handleSendChat} className="flex items-center gap-3 bg-surface-container rounded-xl px-4 py-1.5 border border-white/5 focus-within:border-primary/50 transition-colors">
            <input
              type="text"
              placeholder={slowModeEnabled ? "Slow mode [10s] is active... write message" : "Whisper something..."}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 bg-transparent border-none text-xs md:text-sm text-on-surface focus:outline-none focus:ring-0 py-2.5 placeholder:text-surface-variant font-sans"
            />
            <button 
              type="submit"
              className="text-primary hover:text-secondary-fixed active:scale-90 transition-transform cursor-pointer"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
