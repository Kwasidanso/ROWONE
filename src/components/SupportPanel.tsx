/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  MessageSquare, 
  AlertCircle, 
  Send, 
  Search, 
  ThumbsUp, 
  ThumbsDown, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Upload, 
  Clock, 
  Sparkles,
  Ticket,
  Lock,
  CreditCard,
  Video,
  AlertTriangle,
  User,
  ChevronRight,
  LifeBuoy,
  FileText
} from 'lucide-react';

interface SupportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  isLoggedIn: boolean;
  movieTitleContext?: string | null;
  roomIdContext?: string | null;
  playbackStateContext?: string | null;
  onAddToastNotification?: (title: string, message: string, type: 'screening' | 'invite' | 'gift' | 'system') => void;
  onBackToWatching?: () => void;
}

interface ChatMsg {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

interface SubmittedTicket {
  id: string;
  type: 'screening' | 'contact';
  subject: string;
  movieTitle?: string | null;
  message: string;
  priority: 'normal' | 'urgent';
  status: 'Open' | 'In Progress' | 'Resolved';
  timestamp: string;
}

export default function SupportPanel({
  isOpen,
  onClose,
  username,
  isLoggedIn,
  movieTitleContext = null,
  roomIdContext = null,
  playbackStateContext = null,
  onAddToastNotification,
  onBackToWatching
}: SupportPanelProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'problem' | 'contact' | 'faq'>('ai');

  // --- TAB 1: AI HELP ASSISTANT (KERNEL) STATES ---
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>(() => {
    try {
      const stored = localStorage.getItem('popcorn_support_chat_history');
      if (stored) return JSON.parse(stored);
    } catch {}
    
    const greetedName = isLoggedIn && username ? username : 'movie lover';
    return [
      {
        id: 'welcome-msg',
        sender: 'bot',
        text: `Hey ${greetedName}, what can I help you with tonight? 🎟️ I'm Kernel, your personal ROWONE room sidekick. Ask me anything about tickets, billing, content locking, or synchronized screening rooms!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // --- TAB 2: PROBLEM REPORT STATES ---
  const [problemMovieTitle, setProblemMovieTitle] = useState(movieTitleContext || '');
  const [problemDateTime, setProblemDateTime] = useState('Tonight (Live)');
  const [problemType, setProblemType] = useState('Video out of sync');
  const [problemDesc, setProblemDesc] = useState('');
  const [problemScreenshot, setProblemScreenshot] = useState<File | null>(null);
  const [problemScreenshotName, setProblemScreenshotName] = useState('');
  const [problemUrgency, setProblemUrgency] = useState<'now' | 'past'>('now');
  const [isProblemDragging, setIsProblemDragging] = useState(false);
  const [formSubmittedType, setFormSubmittedType] = useState<string | null>(null);
  const [submittedTicketRef, setSubmittedTicketRef] = useState('');

  // --- TAB 3: CONTACT FORM STATES ---
  const [contactSubject, setContactSubject] = useState('Billing query');
  const [contactMessage, setContactMessage] = useState('');
  const [contactFile, setContactFile] = useState<File | null>(null);
  const [contactFileName, setContactFileName] = useState('');
  const [contactPriority, setContactPriority] = useState<'normal' | 'urgent'>('normal');

  // --- MY TICKETS TRACKER (PERSISTED IN SANDBOX) ---
  const [tickets, setTickets] = useState<SubmittedTicket[]>(() => {
    try {
      const stored = localStorage.getItem('popcorn_user_support_tickets');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'TKT-SCREEN-4911',
        type: 'screening',
        subject: 'Buffering or playback issues',
        movieTitle: 'NEON ECHOES',
        message: 'Lobby connection dropped and video lagged during climax sequence.',
        priority: 'normal',
        status: 'Resolved',
        timestamp: 'Yesterday, 14:12'
      }
    ];
  });

  // --- TAB 4: HELP CENTRE / FAQ STATES ---
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [faqFeedbacks, setFaqFeedbacks] = useState<Record<string, 'up' | 'down'>>({});

  // Restore Drafts on mount & save on change
  useEffect(() => {
    if (movieTitleContext) {
      setProblemMovieTitle(movieTitleContext);
    }
  }, [movieTitleContext]);

  useEffect(() => {
    try {
      const draftsJson = localStorage.getItem('popcorn_support_drafts');
      if (draftsJson) {
        const drafts = JSON.parse(draftsJson);
        if (drafts.problemDesc) setProblemDesc(drafts.problemDesc);
        if (drafts.problemDateTime) setProblemDateTime(drafts.problemDateTime);
        if (drafts.problemType) setProblemType(drafts.problemType);
        if (drafts.contactMessage) setContactMessage(drafts.contactMessage);
        if (drafts.contactSubject) setContactSubject(drafts.contactSubject);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const drafts = {
      problemDesc,
      problemDateTime,
      problemType,
      contactMessage,
      contactSubject
    };
    try {
      localStorage.setItem('popcorn_support_drafts', JSON.stringify(drafts));
    } catch {}
  }, [problemDesc, problemDateTime, problemType, contactMessage, contactSubject]);

  // Persist chat and tickets
  useEffect(() => {
    try {
      localStorage.setItem('popcorn_support_chat_history', JSON.stringify(chatMessages));
    } catch {}
  }, [chatMessages]);

  useEffect(() => {
    try {
      localStorage.setItem('popcorn_user_support_tickets', JSON.stringify(tickets));
    } catch {}
  }, [tickets]);

  // Auto Scroll Chat
  useEffect(() => {
    if (activeTab === 'ai') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isBotTyping, activeTab]);

  // --- KERNEL BRAIN ALGORITHMIC ACTIONS ---
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userText = chatInput;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newUserMsg: ChatMsg = {
      id: `chat-${Date.now()}-user`,
      sender: 'user',
      text: userText,
      timestamp: timeString
    };

    setChatMessages((prev) => [...prev, newUserMsg]);
    setChatInput('');
    setIsBotTyping(true);

    const isFirstUserMsg = chatMessages.filter((m) => m.sender === 'user').length === 0;

    // Simulate natural AI thinking delay
    setTimeout(() => {
      const activeContext = isFirstUserMsg && movieTitleContext ? {
        movieTitle: movieTitleContext,
        roomId: roomIdContext,
        playbackState: playbackStateContext
      } : undefined;

      const botText = answerKernelQuestion(userText, activeContext);
      const newBotMsg: ChatMsg = {
        id: `chat-${Date.now()}-bot`,
        sender: 'bot',
        text: botText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, newBotMsg]);
      setIsBotTyping(false);
    }, 1000);
  };

  const answerKernelQuestion = (
    query: string,
    context?: { movieTitle?: string | null; roomId?: string | null; playbackState?: string | null }
  ): string => {
    const text = query.toLowerCase();

    // Check query for sync, lag, buffering, stuck issues with context
    if (text.includes('sync') || text.includes('lag') || text.includes('buffer') || text.includes('slow') || text.includes('freeze') || text.includes('glitch') || text.includes('stuck') || text.includes('frame')) {
      if (context && context.movieTitle) {
        const isPaused = context.playbackState?.toUpperCase().includes('PAUSED');
        if (isPaused) {
          return `I noticed that your playback for "${context.movieTitle}" in room "${context.roomId || 'SOLO'}" is currently PAUSED (${context.playbackState}). In synchronized multi-user spaces, video frames will not advance for any viewer until someone resumes play. Try hitting the 'Play' button! If you're experiencing actual streaming delays, a quick toggle of "Quiet Mode" in Settings is recommended to lower render latency.`;
        }
        return `Regarding the buffering or sync lag on "${context.movieTitle}" in room "${context.roomId || 'SOLO'}" (Status: ${context.playbackState}): Our live frame-matching engine depends heavily on network stability. Try clicking the 'Pause' button, waiting a second, and hitting 'Play' to reset your local sync playhead. You can also toggle "Quiet Mode" in Settings to reduce the rendering costs of particles/reactions.`;
      }
      return "If your video synchronization is lagging, our cinema halls keep viewer timelines strictly aligned. Try toggling \"Quiet Mode\" in Settings to drop particle rendering overhead, or toggle the pause/play playhead controls to force a sync refresh!";
    }

    // Audio-specific help with context
    if (text.includes('audio') || text.includes('sound') || text.includes('volume') || text.includes('mute') || text.includes('hear')) {
      if (context && context.movieTitle) {
        return `For "${context.movieTitle}" (Room: ${context.roomId || 'SOLO'}), verify that your browser has WebAudio media playback permissions. Since your stream is ${context.playbackState}, you should be hearing active signals. If not, try toggling "Quiet Ambient Mode" in Settings to adjust interface sound oscillations, or perform a manual pause/play cycle to flush corrupt sound buffers.`;
      }
      return "Sound issues can usually be resolved by confirming your browser's audio permissions, or toggling 'Quiet Ambient Mode' in Settings to scale down dynamic UI sound elements. A quick pause and play will also reset any drifted audio sync buffers!";
    }

    // Subtitle-specific help with context
    if (text.includes('subtitle') || text.includes('caption') || text.includes('cc') || text.includes('text') || text.includes('language')) {
      if (context && context.movieTitle) {
        return `Subtitles for "${context.movieTitle}" are calibrated directly with your stream status (${context.playbackState}). If captions aren't showing, try turning them on via the CC button in the player control deck. You can also toggle the highly legible OpenDyslexic cinematic font from your Settings sidebar!`;
      }
      return "Subtitles and Closed Captions can be toggled using the bottom control bar during film playback. Additionally, you are welcome to toggle custom typography like the OpenDyslexic accessibility font in the Settings overlay.";
    }

    // Build standard prefix if context is present
    let prefix = "";
    if (context && context.movieTitle) {
      prefix = `I notice you are currently streaming **${context.movieTitle}** in watch lounge **'${context.roomId || 'SOLO'}'** (playback status matches: **${context.playbackState}**). `;
    }

    if (text.includes('payment') || text.includes('billing') || text.includes('premium') || text.includes('pass') || text.includes('price') || text.includes('stripe') || text.includes('checkout')) {
      return `${prefix}ROWONE Pass Premium is our unified tier that unlocks unlimited synchronized rooms, pass-only screenings, and premium audio specs! It costs $9.99/mo, securely configured through Stripe in your Settings tab under Passport Memberships.`;
    }
    if (text.includes('invite') || text.includes('link') || text.includes('code') || text.includes('share') || text.includes('friend') || text.includes('deep link')) {
      return `${prefix}To share, visit any Movie Details overlay and hit the 'Share Invitation' tab to fetch an instant synchronized deep link. Friends clicking this custom URL will automatically navigate to your active screening lounge and lock straight in!`;
    }
    if (text.includes('room') || text.includes('party') || text.includes('sync') || text.includes('watch') || text.includes('rejoin') || text.includes('lounge')) {
      return `${prefix}Cinema rooms maintain fully synchronized theatrical streaming loops. You can book custom seats, chat with active community viewers, launch a 'Rewatch Party' from tickets, and enjoy synchronized multi-user playback!`;
    }
    if (text.includes('rating') || text.includes('parental') || text.includes('lock') || text.includes('age') || text.includes('allow') || text.includes('restrict')) {
      return `${prefix}Ensure your family locks are in place! Access Settings 🛡️ to adjust the Parental Content Threshold (U, PG, 12, 15, 18). Any movies beyond your selected threshold will automatically blur and lock user entry.`;
    }
    if (text.includes('schedule') || text.includes('showtime') || text.includes('time') || text.includes('calendar') || text.includes('studio') || text.includes('tomorrow')) {
      return `${prefix}All upcoming shows are mapped into the homepage feed, or dynamically injected by studio project directors. Standard spectator passes unlock single show reserves, but ROWONE Passholders get instant 24/7 rewatch queues!`;
    }
    if (text.includes('account') || text.includes('profile') || text.includes('user') || text.includes('login') || text.includes('dyslexia') || text.includes('quiet')) {
      return `${prefix}Change your display handles in the Settings View. Here you can also toggle custom accessibility assets like the OpenDyslexic cinematic font or Quiet Ambient mode which mutes dynamic system sound oscillations.`;
    }
    if (text.includes('hello') || text.includes('hi ') || text.includes('hey') || text.includes('help')) {
      const greetedName = isLoggedIn && username ? username : 'movie lover';
      let greetingMsg = `Hey ${greetedName}! I am Kernel 🎟️, your helpful cinematic support sidekick. `;
      if (context && context.movieTitle) {
        greetingMsg += `I see you are tuned into **${context.movieTitle}** in room **'${context.roomId}'** (${context.playbackState}). `;
      }
      greetingMsg += `I can navigate queries around synced playback, room deep links, parental rating locks, and payments structure. Try asking!`;
      return greetingMsg;
    }

    if (context && context.movieTitle) {
      return `I see you're currently enjoying **${context.movieTitle}** (Room: '${context.roomId || 'SOLO'}', Sync: ${context.playbackState}). Since I'm still learning system details, I want to make sure your screening is perfect. Click the link below to immediately push a central support ticket pre-filled with this conversation and your active stream diagnostics!`;
    }

    return "I appreciate you explaining that. Since I'm still learning system details, I want to make sure your screening is perfect. Click the link below to immediately push a central support ticket pre-filled with this conversation!";
  };

  const handleEscalateToContact = () => {
    // Generate context transcript
    const transcript = chatMessages
      .map((m) => `${m.sender.toUpperCase()} (${m.timestamp}): ${m.text}`)
      .join('\n\n');
    setContactMessage(`[Escalated Conversation Transcript]\n${transcript}\n\n[Explain your additional concerns below]:\n`);
    setContactSubject('Technical problem');
    setActiveTab('contact');
  };

  // --- TAB 2: PROBLEM REPORT SUBMISSION ---
  const handleProblemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemMovieTitle.trim()) {
      alert("Please provide a movie title.");
      return;
    }
    if (!problemDesc.trim()) {
      alert("Please provide a short description.");
      return;
    }

    const ticketRef = `TKT-SCREEN-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: SubmittedTicket = {
      id: ticketRef,
      type: 'screening',
      subject: problemType,
      movieTitle: problemMovieTitle,
      message: problemDesc,
      priority: problemUrgency === 'now' ? 'urgent' : 'normal',
      status: 'Open',
      timestamp: 'Just now'
    };

    setTickets((prev) => [newTicket, ...prev]);
    setSubmittedTicketRef(ticketRef);
    setFormSubmittedType('problem');

    // Trigger instant toast notification if urgent
    if (problemUrgency === 'now' && onAddToastNotification) {
      onAddToastNotification(
        '⚠️ Emergency screening ping',
        `Live Room Issue reported for "${problemMovieTitle}". Central support team dispatched!`,
        'system'
      );
    }

    // Reset drafts
    setProblemDesc('');
    setProblemScreenshot(null);
    setProblemScreenshotName('');
  };

  const handleProblemScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProblemScreenshot(file);
      setProblemScreenshotName(file.name);
    }
  };

  // Drag and drop handlers
  const handleProblemDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsProblemDragging(true);
  };
  const handleProblemDragLeave = () => {
    setIsProblemDragging(false);
  };
  const handleProblemDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsProblemDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setProblemScreenshot(file);
      setProblemScreenshotName(file.name);
    }
  };

  // --- TAB 3: CONTACT FORM SUBMISSION ---
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) {
      alert("Please fill out the message box.");
      return;
    }

    const ticketRef = `TKT-CNT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: SubmittedTicket = {
      id: ticketRef,
      type: 'contact',
      subject: contactSubject,
      message: contactMessage,
      priority: contactPriority,
      status: 'Open',
      timestamp: 'Just now'
    };

    setTickets((prev) => [newTicket, ...prev]);
    setSubmittedTicketRef(ticketRef);
    setFormSubmittedType('contact');

    // Toast feed notification
    if (onAddToastNotification) {
      onAddToastNotification(
        '🎟️ Ticket Registered',
        `Registered general query ticket ${ticketRef}. Estimated queue holds 1-2 hours.`,
        'system'
      );
    }

    // Reset drafts
    setContactMessage('');
    setContactFile(null);
    setContactFileName('');
  };

  const handleContactFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit.");
        return;
      }
      setContactFile(file);
      setContactFileName(file.name);
    }
  };

  const handleBackToWatchingAction = () => {
    setFormSubmittedType(null);
    onClose();
    if (onBackToWatching) onBackToWatching();
  };

  // --- TAB 4: HELP CENTRE / FAQ CORPUS ---
  const faqArticles = [
    {
      id: 'gs-1',
      category: '🎬 Getting Started',
      question: 'How does ROWONE synchronization work?',
      answer: 'ROWONE utilizes server-guided millisecond ping vectors. When you enter a theatre room, your video frame is calculated against live reference timers. Chat, flying micro-reactions, and room configurations synchronize instantly without media drops.'
    },
    {
      id: 'gs-2',
      category: '🎬 Getting Started',
      question: 'Do I need age verification for 18 rated rooms?',
      answer: "Yes, standard age checks are built into individual user dashboards. Access to restricted screenings rated '15' or '18' requires profile age thresholds configured under Settings."
    },
    {
      id: 'bt-1',
      category: '🎟️ Bookings & Tickets',
      question: 'How do I book standard seats and cancels?',
      answer: 'Browse any film catalogue listing and click "Book My Seat". Booked passes instantly register dynamic barcode passes inside your History view. Cancellations refund ticket counters immediately.'
    },
    {
      id: 'bt-2',
      category: '🎟️ Bookings & Tickets',
      question: 'What is ROWONE Pass Premium tier?',
      answer: 'ROWONE Pass is our top-tier passport model that provides unlimited screening room creations, exclusive pass-only theatre runs, upgraded client audio, and custom badge triggers.'
    },
    {
      id: 'mr-1',
      category: '🎟️ Movie Rooms',
      question: 'How do I invite and share rooms with external friends?',
      answer: 'Click "Share Invitation" or "Share Invite Link" in any Movie Details overlay. This copies a direct deep-link watches URI. High-precision query parsing directs anyone directly into your live sync room.'
    },
    {
      id: 'mr-2',
      category: '🎟️ Movie Rooms',
      question: 'What are Couch Squad room guidelines?',
      answer: 'Our communal lobbies are safe social theatres. Harassment, spam comments, macro emoji flooding, and parental profile bypassing will result in automated room host blocks.'
    },
    {
      id: 'pc-1',
      category: '👨‍👩‍👧 Parental Controls',
      question: 'How do I lock restricted rooms and ratings?',
      answer: 'Inside Settings 🛡️, navigate to Parental Ratings Filter. Select the max rating (U/PG/12/15/18) allowed. Titles exceeding these classifications will be instantly blurred and locked from playback.'
    },
    {
      id: 'bi-1',
      category: '💳 Billing & Payments',
      question: 'How is Stripe security and subscription handled?',
      answer: 'Payments are handled via secure sandbox Stripe integrations. Receipts, subscription status states, and cancel buttons reside on the central billing tile in profile settings.'
    },
    {
      id: 'st-1',
      category: '🎥 Studios & Premieres',
      question: 'How can studio partners schedule showtimes?',
      answer: 'Studio account holders can access the "Studio" nav tab. Here you can upload cinematic assets, configure theatre hall availability, and auto-build virtual ticket calendars.'
    },
    {
      id: 'te-1',
      category: '🔧 Technical Issues',
      question: 'Why is my media buffering or out of scale?',
      answer: 'Make sure your WebGL and hardware acceleration is active. Drop-frame synchronization can occur under low bandwidth networks. Enable "Quiet Mode" in Settings to scale down animation rendering costs.'
    }
  ];

  const filteredFaqs = faqArticles.filter(
    (art) =>
      art.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      art.answer.toLowerCase().includes(faqSearch.toLowerCase()) ||
      art.category.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const handleFaqFeedback = (id: string, dir: 'up' | 'down') => {
    setFaqFeedbacks((prev) => ({ ...prev, [id]: dir }));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Background Dim Backdrop Layer */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity"
      />

      {/* Main Panel Container: Right Slideover on Desktop / Bottom Sheet on Mobile */}
      <div 
        className="fixed z-50 bg-[#09090b] text-[#ffe2ab] flex flex-col border-[#ff1a40]/15 shadow-[0_0_50px_rgba(255,26,64,0.15)] overflow-hidden transition-all duration-300 md:border-l
          bottom-0 left-0 w-full rounded-t-3xl h-[95vh] md:h-screen md:bottom-auto md:left-auto md:right-0 md:top-0 md:w-[480px] md:rounded-none"
      >
        {/* Header Ribbon section */}
        <div className="px-6 py-5 bg-[#121214] border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
              <LifeBuoy className="h-4.5 w-4.5 animate-spin-slow" />
            </div>
            <div className="text-left select-none">
              <span className="font-mono text-[8px] text-[#ff1a40] font-black tracking-widest uppercase">
                🛡️ POPCORN GUARDIAN
              </span>
              <h2 className="font-display font-black text-sm text-white uppercase tracking-tight leading-none mt-1">
                CINEMA SUPPORT HUB
              </h2>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-lg border border-white/5 hover:border-white/20 text-on-surface-variant hover:text-white cursor-pointer transition-all"
            title="Close support center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection Bar Layer (Red Underline Anim) */}
        <div className="bg-[#121214] px-3.5 border-b border-white/5 flex gap-1 select-none overflow-x-auto shrink-0 scrollbar-none">
          {[
            { id: 'ai', label: 'AI Help', icon: Sparkles },
            { id: 'problem', label: 'Report Issue', icon: Video },
            { id: 'contact', label: 'Contact Us', icon: FileText },
            { id: 'faq', label: 'FAQ', icon: HelpCircle }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setFormSubmittedType(null);
                  setActiveTab(tab.id as any);
                }}
                className={`flex items-center gap-1.5 px-4 py-3.5 font-sans text-[8px] sm:text-[9px] font-black tracking-widest uppercase border-b-2 relative transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'text-[#ff1a40] border-[#ff1a40]' 
                    : 'text-on-surface-variant border-transparent hover:text-white'
                }`}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Core Screen Scroll Container */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-[#09090b]">
          
          {/* TAB 1: AI HELP ASSISTANT */}
          {activeTab === 'ai' && (
            <div className="h-full flex flex-col text-left">
              {movieTitleContext && (
                <div className="mb-4 bg-gradient-to-r from-[#1c1415] to-[#121214] border border-[#ff1a40]/25 rounded-2xl p-3 shadow-md shadow-black/20 select-none animate-fade-in shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="font-mono text-[9px] text-[#ff1a40] font-black tracking-widest uppercase">
                      ACTIVE SCREENING COUCH TELEMETRY
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 border-t border-white/5 pt-2">
                    <div className="text-[10px] overflow-hidden">
                      <span className="text-[#ffe2ab]/70 block text-[7px] font-mono uppercase tracking-wider">FILM</span>
                      <strong className="text-white truncate block max-w-full font-bold">{movieTitleContext}</strong>
                    </div>
                    <div className="text-[10px] overflow-hidden">
                      <span className="text-[#ffe2ab]/70 block text-[7px] font-mono uppercase tracking-wider">LOUNGE / ROOM</span>
                      <strong className="text-[#dda75f] truncate block max-w-full font-bold">{roomIdContext || 'SOLO-ROOM'}</strong>
                    </div>
                    <div className="text-[10px] overflow-hidden">
                      <span className="text-[#ffe2ab]/70 block text-[7px] font-mono uppercase tracking-wider">SYNC STATE</span>
                      <strong className="text-emerald-400 truncate block max-w-full font-mono font-bold uppercase">{playbackStateContext || 'UNKNOWN'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Conversation Scroll Container */}
              <div className="flex-1 space-y-4 mb-4 overflow-y-auto pr-1">
                {chatMessages.map((msg) => {
                  const isBot = msg.sender === 'bot';
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 max-w-[85%] ${isBot ? 'mr-auto text-left' : 'ml-auto flex-row-reverse text-right'}`}
                    >
                      {/* Avatar design */}
                      {isBot ? (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-pink-500/20 border border-primary/30 flex items-center justify-center text-sm shrink-0 animate-pulse">
                          🍿
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-[#dda75f]/20 border border-[#dda75f]/30 flex items-center justify-center text-xs text-[#dda75f] font-sans font-black shrink-0">
                          {isLoggedIn && username ? username[0].toUpperCase() : 'M'}
                        </div>
                      )}

                      <div className="space-y-1">
                        {/* Name/Status Indicators */}
                        <div className="flex items-center gap-2 select-none">
                          <span className={`font-mono text-[8px] font-black tracking-widest uppercase ${isBot ? 'text-[#ff1a40]' : 'text-[#dda75f]'}`}>
                            {isBot ? 'Kernel 🍿' : (isLoggedIn && username ? username : 'Guest Rider')}
                          </span>
                          <span className="font-mono text-[7px] text-on-surface-variant opacity-60">
                            {msg.timestamp}
                          </span>
                        </div>

                        {/* Content bubble balloon */}
                        <div 
                          className={`p-3.5 rounded-2xl text-xs font-sans text-[#FFFdf9] font-medium leading-relaxed
                            ${isBot 
                              ? 'bg-[#1C1C1E] border border-l-3 border-[#ff1a40]/40 rounded-tl-none shadow-md shadow-black/30' 
                              : 'bg-[#1C1C1E] border border-r-3 border-[#dda75f]/40 rounded-tr-none shadow-md shadow-black/30'
                            }`}
                        >
                          {msg.text}

                          {/* Escalation Prompt injection link */}
                          {isBot && msg.text.includes('escalate') && (
                            <button
                              onClick={handleEscalateToContact}
                              className="mt-3.5 w-full py-2 bg-gradient-to-r from-purple-500 to-primary text-white font-sans text-[8.5px] font-black tracking-widest uppercase rounded-xl transition-all cursor-pointer hover:brightness-115 text-center flex items-center justify-center gap-1.5 shadow-md shadow-primary/10"
                            >
                              <FileText className="h-3 w-3" />
                              <span>Escalate to Contact Form</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Animated Typing indicators dot bubble */}
                {isBotTyping && (
                  <div className="flex gap-3 max-w-[80%] mr-auto text-left">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-pink-500/20 border border-primary/25 flex items-center justify-center text-sm shrink-0 animate-bounce">
                      🍿
                    </div>
                    <div className="space-y-1">
                      <span className="font-mono text-[8.5px] text-[#ff1a40] font-black tracking-widest uppercase">Kernel is writing...</span>
                      <div className="bg-[#1C1C1E] p-3.5 px-5 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-md shadow-black/20 w-16">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/75 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/75 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/75 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Dock Area */}
              <div className="bg-[#121214] p-3 rounded-2xl border border-white/5 flex items-center gap-2 mt-auto shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChat();
                  }}
                  placeholder="Ask Kernel a movie room question..."
                  className="flex-1 bg-transparent border-none text-[#FFFdf9] placeholder-on-surface-variant text-xs focus:ring-0 focus:outline-none px-2.5 font-sans"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || isBotTyping}
                  className="w-9 h-9 rounded-xl bg-primary hover:bg-primary-container disabled:bg-white/5 text-on-primary disabled:text-on-surface-variant flex items-center justify-center cursor-pointer transition-all shrink-0 shadow-md active:scale-95 duration-200"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: REPORT A SCREENING PROBLEM */}
          {activeTab === 'problem' && (
            <div className="space-y-6 text-left animate-fade-in text-on-surface">
              {formSubmittedType === 'problem' ? (
                /* Success feedback component */
                <div className="space-y-5 py-6 text-center select-none bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
                  <div className="w-16 h-16 bg-[#ff1a40]/15 border border-[#ff1a40]/35 text-[#ff1a40] rounded-full flex items-center justify-center mx-auto animate-bounce shadow-xl shadow-[#ff1a40]/10">
                    <Video className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display font-black text-xl text-white uppercase tracking-wider">Ticket Logs Complete!</h3>
                    <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed lowercase px-4 max-w-sm mx-auto">
                      we registered screening emergency issue <strong className="text-white">{submittedTicketRef}</strong>. our engineers are tracking this channel directly. 
                    </p>
                  </div>

                  <div className="bg-neutral-950 p-4 border border-white/5 rounded-xl font-mono text-[9px] text-[#dda75f] font-black tracking-widest uppercase">
                    Estimated support resolution: ➔ 2 Hours Priority
                  </div>

                  <button
                    onClick={handleBackToWatchingAction}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-neutral-950 font-sans text-[10px] font-black tracking-widest uppercase rounded-xl cursor-pointer shadow-lg hover:scale-101 active:scale-99 transition-transform"
                  >
                    Back to watching ➔
                  </button>
                </div>
              ) : (
                /* Report form card block */
                <form onSubmit={handleProblemSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-lg text-white">Report a Screening Obstacle</h3>
                    <p className="font-sans text-[10.5px] text-on-surface-variant leading-relaxed lowercase">
                      spotted an synchronization glitch during playback? drop details here so Couch Squad specialists can repair theater settings inside active rooms.
                    </p>
                  </div>

                  {/* Priority banner warning */}
                  {problemUrgency === 'now' && (
                    <div className="bg-red-950/45 text-[#ff667a] text-[10px] font-sans font-black tracking-wider uppercase border border-[#ff1a40]/25 rounded-xl p-3.5 flex items-start gap-2.5 animate-pulse shadow-md">
                      <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                      <span>🚨 WE ARE TREATING THIS AS URGENT — COUCH CORE NOTIFIED DISPATCH INSTANTLY!</span>
                    </div>
                  )}

                  {/* Input Fields */}
                  <div className="space-y-1.5">
                    <label className="font-sans text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Movie Title</label>
                    <input
                      type="text"
                      placeholder="e.g. NEON ECHOES"
                      value={problemMovieTitle}
                      onChange={(e) => setProblemMovieTitle(e.target.value)}
                      className="w-full bg-[#161618] border border-white/5 focus:border-primary/50 text-white rounded-xl p-3 text-xs focus:ring-0 focus:outline-none transition-colors font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-sans text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Screening Time</label>
                      <input
                        type="text"
                        placeholder="e.g. Tonight (Live)"
                        value={problemDateTime}
                        onChange={(e) => setProblemDateTime(e.target.value)}
                        className="w-full bg-[#161618] border border-white/5 focus:border-primary/50 text-white rounded-xl p-3 text-xs focus:ring-0 focus:outline-none transition-colors font-sans"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-sans text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Glitch Origin</label>
                      <select
                        value={problemType}
                        onChange={(e) => setProblemType(e.target.value)}
                        className="w-full bg-[#161618] border border-white/5 focus:border-primary/50 text-[#dda75f] font-sans font-bold rounded-xl p-3 text-xs focus:ring-0 focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="Video out of sync">Video out of sync</option>
                        <option value="Buffering or playback issues">Buffering or playback issues</option>
                        <option value="Chat not loading">Chat not loading</option>
                        <option value="Room access denied">Room access denied</option>
                        <option value="Inappropriate comment in chat">Inappropriate comment in chat</option>
                        <option value="Payment charged but no access">Payment charged but no access</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <label className="font-sans text-on-surface-variant font-bold uppercase tracking-wider block">Glitch Description</label>
                      <span className={`font-mono ${problemDesc.length > 270 ? 'text-red-500 font-bold' : 'text-on-surface-variant opacity-70'}`}>
                        {problemDesc.length}/300
                      </span>
                    </div>
                    <textarea
                      maxLength={300}
                      rows={3}
                      placeholder="Explain what buffered or shifted out of bounds (max 300 characters)..."
                      value={problemDesc}
                      onChange={(e) => setProblemDesc(e.target.value)}
                      className="w-full bg-[#161618] border border-white/5 focus:border-primary/50 text-white rounded-xl p-3 text-xs focus:ring-0 focus:outline-none transition-colors font-sans leading-relaxed resize-none"
                    />
                  </div>

                  {/* Urgency Trigger Toggle */}
                  <div className="space-y-1.5 shadow-inner">
                    <label className="font-sans text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Problem Occurrence Interval</label>
                    <div className="grid grid-cols-2 gap-3 select-none">
                      <button
                        type="button"
                        onClick={() => setProblemUrgency('now')}
                        className={`p-3 rounded-xl font-sans text-[10px] font-black tracking-wider uppercase border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          problemUrgency === 'now'
                            ? 'bg-[#ff1a40]/15 border-[#ff1a40]/40 text-[#ff1a40] shadow-md'
                            : 'bg-white/5 border-white/5 text-on-surface-variant hover:border-white/10'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${problemUrgency === 'now' ? 'bg-[#ff1a40] animate-ping' : 'bg-on-surface-variant'}`} />
                        <span>Happening right now</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setProblemUrgency('past')}
                        className={`p-3 rounded-xl font-sans text-[10px] font-black tracking-wider uppercase border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          problemUrgency === 'past'
                            ? 'bg-[#dda75f]/15 border-[#dda75f]/40 text-[#dda75f] shadow-md'
                            : 'bg-white/5 border-white/5 text-on-surface-variant hover:border-white/10'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>This already happened</span>
                      </button>
                    </div>
                  </div>

                  {/* Drag-and-drop file upload zone */}
                  <div className="space-y-1.5">
                    <label className="font-sans text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Attachment Screenshot (Optional)</label>
                    <div
                      onDragOver={handleProblemDragOver}
                      onDragLeave={handleProblemDragLeave}
                      onDrop={handleProblemDrop}
                      className={`relative rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-colors max-w-full overflow-hidden ${
                        isProblemDragging
                          ? 'border-primary bg-primary/5'
                          : 'border-white/5 hover:border-white/20 bg-white/[0.01]'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProblemScreenshotChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Upload className="h-6 w-6 text-on-surface-variant opacity-70 mb-1" />
                        <span className="font-sans text-[10px] text-[#dda75f] font-black uppercase tracking-wider">
                          {problemScreenshotName ? 'SCREENSHOT READY' : 'DRAG SCREENSHOT OR BROWSE'}
                        </span>
                        <span className="font-mono text-[8px] text-on-surface-variant truncate max-w-[340px]">
                          {problemScreenshotName ? problemScreenshotName : 'Images and screenshots (max 5MB)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-primary text-on-primary font-sans text-[10px] font-black tracking-widest uppercase rounded-xl transition-all hover:scale-101 active:scale-99 cursor-pointer shadow-lg shadow-primary/10 mt-2"
                  >
                    Submit urgent report
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: CONTACT FORM */}
          {activeTab === 'contact' && (
            <div className="space-y-6 text-left animate-fade-in text-on-surface">
              {formSubmittedType === 'contact' ? (
                /* Success screen */
                <div className="space-y-5 py-6 text-center select-none bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
                  <div className="w-16 h-16 bg-[#dda75f]/15 border border-[#dda75f]/35 text-[#dda75f] rounded-full flex items-center justify-center mx-auto animate-bounce shadow-xl shadow-[#dda75f]/10">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display font-black text-xl text-white uppercase tracking-wider">Contact Request Logged!</h3>
                    <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed lowercase px-4 max-w-sm mx-auto">
                      support ticket registered as <strong className="text-white">{submittedTicketRef}</strong>. an inbox verification was catalogued under accounts records.
                    </p>
                  </div>

                  <div className="bg-neutral-950 p-4 border border-white/5 rounded-xl font-mono text-[9px] text-[#dda75f] font-black tracking-widest uppercase">
                    Queue reply: ➔ {contactPriority === 'urgent' ? '1-2 Hours Priority' : '24 Hours max'}
                  </div>

                  <button
                    onClick={handleBackToWatchingAction}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-neutral-950 font-sans text-[10px] font-black tracking-widest uppercase rounded-xl cursor-pointer shadow-lg hover:scale-101 active:scale-99 transition-transform"
                  >
                    Back to watching ➔
                  </button>
                </div>
              ) : (
                /* Main General contact form */
                <div className="space-y-5">
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-display font-bold text-lg text-white">Contact ROWONE Crew</h3>
                      <p className="font-sans text-[10.5px] text-on-surface-variant leading-relaxed lowercase">
                        need billing support, partnership options, or general feedback assistance? draft your formal ticket vectors below.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="font-sans text-[10px] text-on-surface-variant font-bold uppercase block">Your Handle (Pre-filled)</label>
                        <div className="w-full bg-[#161618] border border-white/5 rounded-xl p-3 text-xs text-on-surface-variant font-sans select-none">
                          {isLoggedIn && username ? username : 'Guest Account'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-sans text-[10px] text-on-surface-variant font-bold uppercase block">Email Address (Sandbox)</label>
                        <div className="w-full bg-[#161618] border border-white/5 rounded-xl p-3 text-xs text-on-surface-variant font-sans select-none truncate">
                          kwasidanso05@gmail.com
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="font-sans text-[10px] text-on-surface-variant font-bold uppercase block">Subject Category</label>
                        <select
                          value={contactSubject}
                          onChange={(e) => setContactSubject(e.target.value)}
                          className="w-full bg-[#161618] border border-white/5 focus:border-primary/50 text-[#dda75f] font-sans font-bold rounded-xl p-3 text-xs focus:ring-0 focus:outline-none transition-colors cursor-pointer"
                        >
                          <option value="Billing query">Billing query</option>
                          <option value="Account issue">Account issue</option>
                          <option value="Technical problem">Technical problem</option>
                          <option value="Partnership enquiry">Partnership enquiry</option>
                          <option value="Press or media">Press or media</option>
                          <option value="General feedback">General feedback</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-sans text-[10px] text-on-surface-variant font-bold uppercase block">Priority Level</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setContactPriority('normal')}
                            className={`flex-1 p-[11px] rounded-xl font-sans text-[9px] font-black tracking-widest uppercase border transition-all cursor-pointer ${
                              contactPriority === 'normal'
                                ? 'bg-white/10 border-white/25 text-white'
                                : 'bg-[#161618] border-white/5 text-on-surface-variant hover:border-white/10'
                            }`}
                          >
                            Normal
                          </button>
                          <button
                            type="button"
                            onClick={() => setContactPriority('urgent')}
                            className={`flex-1 p-[11px] rounded-xl font-sans text-[9px] font-black tracking-widest uppercase border transition-all cursor-pointer ${
                              contactPriority === 'urgent'
                                ? 'bg-red-950/45 border-[#ff1a40]/30 text-[#ff1a40]'
                                : 'bg-[#161618] border-white/5 text-on-surface-variant hover:border-white/10'
                            }`}
                          >
                            Urgent
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <label className="font-sans text-on-surface-variant font-bold uppercase block">Query Message</label>
                        <span className={`font-mono ${contactMessage.length > 950 ? 'text-red-500 font-bold' : 'text-on-surface-variant opacity-75'}`}>
                          {contactMessage.length}/1000
                        </span>
                      </div>
                      <textarea
                        maxLength={1000}
                        rows={4}
                        placeholder="Detail your inquiry specs. If escalated from AI assistant, convo history is preloaded above..."
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        className="w-full bg-[#161618] border border-white/5 focus:border-primary/50 text-white rounded-xl p-3 text-xs focus:ring-0 focus:outline-none transition-colors font-sans leading-relaxed resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-sans text-[10px] text-on-surface-variant font-bold uppercase block">Attach File Documents (Optional)</label>
                      <div className="relative w-full bg-[#161618] hover:bg-[#1C1C20] border border-white/5 rounded-xl p-3 flex justify-between items-center cursor-pointer transition-colors">
                        <input
                          type="file"
                          onChange={handleContactFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <span className="font-mono text-[9px] text-[#dda75f] font-black uppercase truncate max-w-[280px]">
                          {contactFileName ? contactFileName : 'SELECT PDF, IMAGES OR LOGS (MAX 5MB)'}
                        </span>
                        <Upload className="h-4 w-4 text-on-surface-variant opacity-70 shrink-0" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-primary text-on-primary font-sans text-[10px] font-black tracking-widest uppercase rounded-xl transition-all hover:scale-101 active:scale-99 cursor-pointer shadow-lg shadow-primary/10 mt-1"
                    >
                      Open central ticket
                    </button>
                  </form>

                  {/* SUBMITTED TICKETS REGISTRY PORTLET */}
                  <div className="border-t border-white/5 pt-5 space-y-3 select-none">
                    <h4 className="font-display font-bold text-xs text-[#dda75f] uppercase tracking-wide flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>My active support tickets ({tickets.length})</span>
                    </h4>
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {tickets.map((t) => (
                        <div 
                          key={t.id} 
                          className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between text-left gap-4"
                        >
                          <div className="min-w-0">
                            <span className="font-mono text-[8px] text-on-surface-variant opacity-70 block">{t.id} • {t.timestamp}</span>
                            <span className="font-sans text-[10px] font-bold text-white uppercase truncate block mt-0.5">{t.subject}</span>
                            {t.movieTitle && (
                              <span className="font-mono text-[7.5px] text-[#dda75f] block leading-none mt-1 uppercase">Room: {t.movieTitle}</span>
                            )}
                          </div>

                          <div className="flex flex-col items-end shrink-0 gap-1 select-none">
                            <span className={`font-mono text-[7px] font-black px-1.5 py-0.5 rounded leading-none uppercase ${
                              t.status === 'Resolved' 
                                ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                                : t.status === 'In Progress' 
                                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' 
                                  : 'bg-[#ff1a40]/10 border border-[#ff1a40]/25 text-[#ff1a40]'
                            }`}>
                              {t.status}
                            </span>
                            <span className="font-sans text-[6.5px] text-on-surface-variant min-w-0 lowercase">
                              {t.priority === 'urgent' ? '🔴 urgency focus' : '⚪ normal lane'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HELP CENTRE / FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-5 text-left animate-fade-in text-on-surface">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-lg text-white">Self-service FAQ centre</h3>
                <p className="font-sans text-[10.5px] text-on-surface-variant leading-relaxed lowercase">
                  instantly query structural questions using our client-side matching database, compiled from community ticket experiences.
                </p>
              </div>

              {/* FAQ Instant Search input */}
              <div className="bg-[#121214] p-3 rounded-xl border border-white/5 flex items-center gap-2.5">
                <Search className="h-4 w-4 text-on-surface-variant opacity-75 shrink-0" />
                <input
                  type="text"
                  placeholder="Type commands or keywords (e.g. sync, lock, pass)..."
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="flex-1 bg-transparent border-none text-white placeholder-on-surface-variant text-xs focus:ring-0 focus:outline-none font-sans leading-none"
                />
                {faqSearch && (
                  <button
                    onClick={() => setFaqSearch('')}
                    className="font-mono text-[8px] text-on-surface-variant hover:text-white uppercase font-bold shrink-0 cursor-pointer"
                  >
                    Clear ✕
                  </button>
                )}
              </div>

              {/* Categorized collapsible items loops */}
              <div className="space-y-3.5">
                {filteredFaqs.length === 0 ? (
                  <div className="bg-white/[0.01] border-2 border-dashed border-white/5 rounded-2xl p-8 text-center select-none">
                    <p className="font-sans text-xs text-on-surface-variant font-bold uppercase tracking-wider">No matching articles found</p>
                    <button
                      onClick={() => {
                        setContactSubject('Technical problem');
                        setActiveTab('contact');
                      }}
                      className="mt-3 px-4 py-2 bg-primary/20 text-[#ff1a40] text-[8.5px] font-black tracking-widest uppercase rounded-lg border border-[#ff1a40]/30 hover:bg-primary/30"
                    >
                      Open direct ticket Instead
                    </button>
                  </div>
                ) : (
                  // Group accordion components
                  Object.entries(
                    filteredFaqs.reduce<Record<string, typeof filteredFaqs>>((acc, art) => {
                      if (!acc[art.category]) acc[art.category] = [];
                      acc[art.category].push(art);
                      return acc;
                    }, {})
                  ).map(([cat, articles]) => (
                    <div key={cat} className="space-y-2 select-none">
                      <span className="font-mono text-[8px] text-[#dda75f] font-black tracking-widest uppercase ml-1 block">{cat}</span>
                      <div className="space-y-1.5">
                        {articles.map((art) => {
                          const isExpanded = expandedFaq === art.id;
                          const feedback = faqFeedbacks[art.id];
                          return (
                            <div 
                              key={art.id}
                              className="bg-zinc-900/60 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/10"
                            >
                              {/* Header triggers expand collapse onClick */}
                              <button
                                onClick={() => setExpandedFaq(isExpanded ? null : art.id)}
                                className="w-full p-4 flex justify-between items-start text-left gap-3 cursor-pointer"
                              >
                                <span className="font-display font-bold text-[11px] sm:text-xs text-white leading-tight uppercase tracking-wide">
                                  {art.question}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-on-surface-variant opacity-75 shrink-0" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-on-surface-variant opacity-75 shrink-0" />
                                )}
                              </button>

                              {/* Accordion expand block */}
                              {isExpanded && (
                                <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3 text-left">
                                  <p className="font-sans text-[11px] text-[#f2edd9] leading-relaxed select-text lowercase">
                                    {art.answer}
                                  </p>

                                  {/* WAS THIS HELPFUL QUESTIONNAIRE ROW */}
                                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2 select-none border-t border-white/5">
                                    <span className="font-mono text-[8px] text-on-surface-variant font-bold uppercase tracking-wider block">
                                      {feedback ? '✔️ FEEDBACK LOGGED' : 'WAS THIS ARTICLE HELPFUL?'}
                                    </span>

                                    <div className="flex items-center gap-2">
                                      {!feedback ? (
                                        <>
                                          <button
                                            onClick={() => handleFaqFeedback(art.id, 'up')}
                                            className="p-1.5 px-3 bg-white/5 hover:bg-green-500/10 hover:border-green-500/35 border border-white/10 rounded-lg text-xs hover:text-green-400 cursor-pointer transition-colors flex items-center gap-1.5"
                                          >
                                            <ThumbsUp className="h-3 w-3" />
                                            <span className="font-sans text-[8.5px] font-black uppercase">Yes</span>
                                          </button>
                                          <button
                                            onClick={() => handleFaqFeedback(art.id, 'down')}
                                            className="p-1.5 px-3 bg-white/5 hover:bg-red-500/10 hover:border-red-500/35 border border-white/10 rounded-lg text-xs hover:text-[#ff1a40] cursor-pointer transition-colors flex items-center gap-1.5"
                                          >
                                            <ThumbsDown className="h-3 w-3" />
                                            <span className="font-sans text-[8.5px] font-black uppercase">No</span>
                                          </button>
                                        </>
                                      ) : feedback === 'up' ? (
                                        <span className="font-sans text-[9px] text-green-400 font-extrabold flex items-center gap-1">
                                          <ThumbsUp className="h-3.5 w-3.5 animate-bounce" />
                                          <span>AMAZING! THREAD COMPILATION LOGGED.</span>
                                        </span>
                                      ) : (
                                        // Thumbs down triggers quick action fallback link directly to Contact Tab 3
                                        <div className="flex flex-col items-end gap-1.5">
                                          <span className="font-sans text-[8.5px] text-primary font-bold">Sorry about that — open a support ticket?</span>
                                          <button
                                            onClick={() => {
                                              setContactSubject('Technical problem');
                                              setContactMessage(`[FAQ feedback shortfall escalation regarding: "${art.question}"]\nPlease review this knowledge gap below:\n`);
                                              setActiveTab('contact');
                                            }}
                                            className="px-3 py-1 bg-primary text-on-primary font-sans text-[8px] font-black tracking-widest uppercase rounded-lg hover:scale-102 transition-transform cursor-pointer"
                                          >
                                            Direct Quick Form ➔
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
