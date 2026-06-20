import React, { useState, useEffect } from 'react';
import { 
  Check, Lock, Sparkles, AlertCircle, RefreshCw, Star, X, Film, 
  PlusCircle, ArrowLeft, Shield, CheckCircle, HelpCircle, Flame, Gift
} from 'lucide-react';
import { UserProfile } from '../lib/userProfileService';
import { Movie } from '../types';
import RevenueTrendChart from './RevenueTrendChart';

interface SubscriptionViewProps {
  isLoggedIn: boolean;
  username: string;
  isPopcornPass: boolean;
  onUpgradeSuccess: () => void;
  onTriggerAuth: (mode: 'signin' | 'signup' | 'register-studio') => void;
  onBackToCinema: () => void;
  triggerNotification?: (notif: any) => void;
  userProfile: UserProfile | null;
  movies?: Movie[];
}

export default function SubscriptionView({
  isLoggedIn,
  username,
  isPopcornPass,
  onUpgradeSuccess,
  onTriggerAuth,
  onBackToCinema,
  triggerNotification,
  userProfile,
  movies = []
}: SubscriptionViewProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(8);

  const pathname = window.location.pathname.toLowerCase();
  const isSuccessPass = pathname.startsWith('/subscribe/success/pass');
  const isSuccessStudio = pathname.startsWith('/subscribe/success/studio');

  // Multi-tier Active Target Plan detection
  let activePlan: 'lobby' | 'pass' | 'studio' = 'lobby';
  if (isLoggedIn) {
    const localRole = localStorage.getItem('popcorn_account_type');
    if ((userProfile as any)?.account_type === 'studio' || (userProfile as any)?.accountType === 'studio' || localRole === 'studio') {
      activePlan = 'studio';
    } else if (isPopcornPass || userProfile?.subscriptionPlan === 'gold_premium') {
      activePlan = 'pass';
    }
  }

  // Auto-redirect timer for active success views
  useEffect(() => {
    if (isSuccessPass) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onBackToCinema();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isSuccessPass]);

  // Handle Stripe Redirection or Simulated Billing Session
  const handleSubscribe = async (tier: 'lobby' | 'pass' | 'studio') => {
    if (tier === 'lobby') {
      if (isLoggedIn) {
        onBackToCinema();
      } else {
        onTriggerAuth('signup');
      }
      return;
    }

    if (!isLoggedIn) {
      if (tier === 'studio') {
        onTriggerAuth('register-studio');
      } else {
        onTriggerAuth('signup');
      }
      return;
    }

    try {
      setIsProcessing(tier);
      setErrorMessage('');

      const priceId = tier === 'pass' 
        ? ((import.meta as any).env.VITE_STRIPE_ROWONE_PASS_PRICE_ID || 'price_rowone_pass')
        : ((import.meta as any).env.VITE_STRIPE_STUDIO_PRICE_ID || 'price_studio');

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: userProfile?.userId || localStorage.getItem('logged_in_user_id')
        })
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to initialize booking session');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Payment server failed to respond. Please try again.');
    } finally {
      setIsProcessing(null);
    }
  };

  // Stripe Portal redirection for subscriptions management
  const handleManagePortal = async () => {
    try {
      setIsProcessing('portal');
      setErrorMessage('');
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile?.userId || localStorage.getItem('logged_in_user_id')
        })
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to load custom portal link');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Billing portal offline. Standard trial simulation active.');
      // Offline fallback: simulate portal cancelation success message or alert
      alert('Simulated Stripe Customer Portal: Subscription and invoices remain validated.');
    } finally {
      setIsProcessing(null);
    }
  };

  // -------------------------------------------------------------
  // SUCCESS VIEW: ROW ONE PASS ACTIVE
  // -------------------------------------------------------------
  if (isSuccessPass) {
    return (
      <div className="min-h-screen bg-black text-[#EDE6E3] flex flex-col justify-center items-center px-4 py-16 font-sans relative overflow-hidden select-none">
        {/* Abstract Gold Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-xl w-full text-center space-y-12 relative z-10 animate-fade-in">
          {/* Centers WORDMARK */}
          <div className="flex flex-col items-center justify-center">
            <span className="font-serif text-3xl font-bold tracking-[0.25em] text-[#DDA75F] mb-6">ROWONE</span>
            
            {/* Pulsing Gold Ring Expansion Animation */}
            <div className="relative flex items-center justify-center w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-4 rounded-full bg-amber-500/15 animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-[#9a3412] flex items-center justify-center shadow-2xl">
                <Star className="w-8 h-8 text-black fill-black" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="font-serif text-4xl font-bold text-[#DDA75F] tracking-tight md:text-5xl">
              Row One is yours.
            </h1>
            <p className="font-serif italic text-lg text-[#EDE6E3]/85 max-w-md mx-auto leading-relaxed">
              "Your pass is active. The lights go down whenever you're ready."
            </p>
          </div>

          {/* Gold VIP Pass Badge */}
          <div className="bg-gradient-to-br from-[#2A1500] to-black border border-[#DDA75F]/35 rounded-2xl p-6 shadow-[0_0_24px_rgba(245,200,66,0.12)] max-w-sm mx-auto">
            <div className="flex items-center justify-between border-b border-[#DDA75F]/20 pb-4 mb-4">
              <span className="font-serif italic text-[#DDA75F] text-lg">Row One Pass Badge</span>
              <span className="bg-[#DDA75F] text-black text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded uppercase">VIP</span>
            </div>
            <div className="flex items-center space-x-3.5 text-left">
              <div className="h-10 w-10 bg-[#DDA75F]/15 rounded-full flex items-center justify-center border border-[#DDA75F]/20 text-[#DDA75F]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-[#EDE6E3]/60 uppercase tracking-widest">Authorized Member</p>
                <p className="font-serif text-md font-semibold text-[#EDE6E3]">{username || 'Cinephile'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <button
              onClick={onBackToCinema}
              className="w-full sm:w-auto px-10 py-4 bg-[#DDA75F] text-black hover:bg-[#DDA75F]/90 font-sans font-semibold text-sm tracking-widest uppercase rounded-md transition-all duration-300"
            >
              Browse tonight's screenings
            </button>
            <p className="text-xs text-[#EDE6E3]/50 font-mono">
              Auto-redirecting back to Browse in <span className="text-[#DDA75F] font-bold">{countdown}</span> seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SUCCESS VIEW: STUDIO PORTAL VERIFIED
  // -------------------------------------------------------------
  if (isSuccessStudio) {
    return (
      <div className="min-h-screen bg-black text-[#EDE6E3] flex flex-col justify-center items-center px-4 py-16 font-sans relative overflow-hidden select-none">
        {/* Abstract Dark Red Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#8C1C13]/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-2xl w-full text-center space-y-10 relative z-10 animate-fade-in">
          {/* Centers WORDMARK */}
          <div className="flex flex-col items-center justify-center">
            <span className="font-serif text-3xl font-bold tracking-[0.25em] text-[#DDA75F] mb-6">ROWONE</span>
            <div className="relative w-16 h-16 rounded-full bg-[#8C1C13] flex items-center justify-center shadow-2xl mb-4 border border-[#DDA75F]/35">
              <CheckCircle className="w-9 h-9 text-white" />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="font-serif text-3xl font-bold text-[#DDA75F] tracking-tight md:text-5xl">
              Welcome to Row One, Producer.
            </h1>
            <p className="font-serif italic text-lg text-[#EDE6E3]/85">
              "Your studio is verified. Start uploading your first film."
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-4xl mx-auto">
            {/* Verified Studio Badge Keepsake */}
            <div className="bg-gradient-to-br from-[#3D2000] to-black border border-[#8C1C13] rounded-2xl p-6 shadow-2xl space-y-6 flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between border-b border-[#8C1C13]/40 pb-4 mb-4">
                  <span className="font-serif text-[#EDE6E3] font-semibold tracking-wide">Producer License</span>
                  <span className="bg-[#8C1C13] text-[#EDE6E3] text-[9px] font-bold tracking-widest px-2.5 py-0.5 rounded uppercase">VERIFIED</span>
                </div>
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#EDE6E3]/60">Studio Identification:</span>
                    <span className="font-mono text-[#DDA75F] uppercase">#ST-{userProfile?.userId?.substring(0, 6) || 'DRCDRM'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#EDE6E3]/60">DRC DRM Permissions:</span>
                    <span className="text-[#DDA75F]">Uncapped Broadcasting</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#EDE6E3]/60">Revenue Retention:</span>
                    <span className="text-emerald-400 font-bold">85% Earned Share</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                <p className="text-[10.5px] text-[#DDA75F]/90 font-serif italic leading-relaxed">
                  "Your permanent executive distributor credentials have been issued. Complete set up to schedule public premieres in all virtual lounges."
                </p>
              </div>
            </div>

            {/* D3 Revenue Forecast Trend Chart */}
            <RevenueTrendChart 
              title="Verified Studio Projection" 
              subtitle="Projected compounding growth values once premium theatrical sessions launch" 
            />
          </div>

          <div className="pt-4">
            <button
              onClick={() => {
                // Navigate directly to Studio Upload page tab
                window.location.href = '/studio/upload';
              }}
              className="px-10 py-4 bg-[#EDE6E3] text-black hover:bg-[#EDE6E3]/90 font-sans font-semibold text-sm tracking-widest uppercase rounded-md transition-all duration-300 shadow-xl cursor-pointer"
            >
              Set up my studio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PRIMARY PRICING / SUBSCRIBE MAIN VIEW
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-black text-[#EDE6E3] font-sans pb-20 select-none">
      
      {/* Absolute Header with Centered Wordmark */}
      <div className="border-b border-[#DDA75F]/15 py-6">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <button
            onClick={onBackToCinema}
            className="flex items-center gap-2 font-sans text-[10px] font-semibold text-[#EDE6E3]/70 hover:text-white uppercase tracking-widest bg-white/5 border border-white/10 px-4 py-2 rounded cursor-pointer transition-all active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#DDA75F]" />
            <span>cinema app</span>
          </button>
          <span className="font-serif text-2xl font-bold tracking-[0.2em] text-[#DDA75F] absolute left-1/2 -translate-x-1/2">
            ROWONE
          </span>
          <span className="font-mono text-[9px] text-[#dda75f] bg-[#DDA75F]/10 border border-[#DDA75F]/20 px-3 py-1 rounded uppercase tracking-wider hidden sm:block">
            Stripe Secure Gate active
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-16 space-y-16">
        
        {/* Headings and Stage divider */}
        <div className="text-center space-y-4 max-w-2xl mx-auto animate-fade-in_500">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#EDE6E3] tracking-tight leading-none">
            Choose your seat.
          </h2>
          <p className="font-serif italic text-lg text-[#DDA75F]">
            "Every great film deserves the right ticket."
          </p>
          
          {/* Gold Center Divider */}
          <div className="flex justify-center pt-2">
            <div className="w-[120px] h-[2px] bg-[#DDA75F]" />
          </div>
        </div>

        {errorMessage && (
          <div className="bg-[#8C1C13]/15 border border-[#8C1C13] p-4 rounded text-sm text-[#EDE6E3] max-w-lg mx-auto flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-[#8C1C13] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Transaction Error</p>
              <p className="text-xs text-[#EDE6E3]/80 mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            THREE COLUMN BENTO STATS / PRODUCTS GRID
            ------------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-6">

          {/* TIER 1 — THE LOBBY (FREE) */}
          <div id="tier-lobby-card" className="flex flex-col bg-[#3D2000] border border-[#DDA75F]/20 rounded-xl p-8 justify-between space-y-8 text-left transition-all hover:border-[#DDA75F]/40 order-2 md:order-1 relative">
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="font-sans text-[11px] text-[#DDA75F] tracking-widest uppercase font-semibold">Spectator Access</span>
                <h3 className="font-serif text-3xl font-bold text-[#EDE6E3]">The Lobby</h3>
                <p className="font-serif italic text-sm text-[#DDA75F]/90">
                  "Step inside. See what Row One feels like."
                </p>
              </div>

              {/* Large Pricing typography */}
              <div>
                <p className="font-serif text-5xl font-bold text-[#DDA75F]">$0</p>
                <p className="text-xs text-[#DDA75F] tracking-wide uppercase mt-1">Forever free</p>
              </div>

              <hr className="border-[#DDA75F]/15" />

              {/* Feature check list */}
              <div className="space-y-3">
                <p className="text-[10px] font-sans font-bold tracking-widest text-[#EDE6E3]/40 uppercase">What's Included:</p>
                <div className="space-y-2.5">
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]/95"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Access to all free catalogue screenings</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]/95"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Join public movie rooms and watch with strangers</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]/95"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Live chat and emoji reactions in every room</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]/95"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Create a personal profile with avatar and bio</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]/95"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Save films to your Watchlist</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]/95"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Receive screening reminders and notifications</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]/95"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Invite friends to free public rooms</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]/95"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Access genre browsing and film discovery</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]/95"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Post-screening star ratings and reviews</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]/95"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Access on any device — browser, mobile, tablet</span></div>
                </div>
              </div>

              {/* Locked lists */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-sans font-bold tracking-widest text-[#EDE6E3]/40 uppercase">Locked Privileges:</p>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2 text-xs text-[#DDA75F]/60"><Lock className="w-3.5 h-3.5 text-[#DDA75F]/55 shrink-0 mt-0.5" /><span>New release and premiere screenings</span></div>
                  <div className="flex items-start space-x-2 text-xs text-[#DDA75F]/60"><Lock className="w-3.5 h-3.5 text-[#DDA75F]/55 shrink-0 mt-0.5" /><span>Private invite-only room creation</span></div>
                  <div className="flex items-start space-x-2 text-xs text-[#DDA75F]/60"><Lock className="w-3.5 h-3.5 text-[#DDA75F]/55 shrink-0 mt-0.5" /><span>Row One Pass badge on your profile</span></div>
                  <div className="flex items-start space-x-2 text-xs text-[#DDA75F]/60"><Lock className="w-3.5 h-3.5 text-[#DDA75F]/55 shrink-0 mt-0.5" /><span>Early access to studio premieres</span></div>
                  <div className="flex items-start space-x-2 text-xs text-[#DDA75F]/60"><Lock className="w-3.5 h-3.5 text-[#DDA75F]/55 shrink-0 mt-0.5" /><span>Discounted one-off premiere tickets</span></div>
                  <div className="flex items-start space-x-2 text-xs text-[#DDA75F]/60"><Lock className="w-3.5 h-3.5 text-[#DDA75F]/55 shrink-0 mt-0.5" /><span>Ad-free experience</span></div>
                  <div className="flex items-start space-x-2 text-xs text-[#DDA75F]/60"><Lock className="w-3.5 h-3.5 text-[#DDA75F]/55 shrink-0 mt-0.5" /><span>Priority support</span></div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              {activePlan === 'lobby' ? (
                <div className="space-y-2">
                  <button
                    disabled
                    className="w-full py-3.5 bg-[#DDA75F]/20 text-[#DDA75F] border border-[#DDA75F]/30 text-xs font-semibold uppercase tracking-widest rounded-md"
                  >
                    Active Plan
                  </button>
                  <p className="text-center text-xs text-[#DDA75F] tracking-wide italic">Your current plan</p>
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe('lobby')}
                  className="w-full py-3.5 bg-[#DDA75F] hover:bg-[#DDA75F]/95 text-black text-xs font-semibold uppercase tracking-widest rounded-md transition-colors"
                >
                  Start for free
                </button>
              )}
            </div>
          </div>

          {/* TIER 2 — ROW ONE PASS (MOST POPULAR - CHOSEN CENTER TARGET) */}
          <div id="tier-pass-card" className="flex flex-col bg-[#2A1500] border-2 border-[#DDA75F] rounded-xl p-8 justify-between space-y-8 text-left transition-all shadow-[0_0_24px_rgba(245,200,66,0.18)] scale-[1.03] order-1 md:order-2 relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#DDA75F] text-black text-[9px] font-bold tracking-widest px-4 py-1 rounded-full uppercase">
              MOST POPULAR
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <span className="font-sans text-[11px] text-[#DDA75F] tracking-widest uppercase font-semibold">VIP Privilege</span>
                <h3 className="font-serif text-3xl font-bold text-[#DDA75F] flex items-center gap-1.5">
                  Row One Pass <Gift className="w-4 h-4" />
                </h3>
                <p className="font-serif italic text-sm text-[#EDE6E3]">
                  "The full cinema experience. Every night. From anywhere."
                </p>
              </div>

              {/* Large Pricing typography */}
              <div>
                <p className="font-serif text-6xl font-bold text-[#DDA75F] flex items-baseline">
                  $14
                  <span className="font-sans text-lg font-normal text-[#DDA75F]/80 ml-1">/month</span>
                </p>
                <p className="text-xs text-[#DDA75F] tracking-wide uppercase mt-1">Billed monthly. Cancel any time.</p>
              </div>

              <hr className="border-[#DDA75F]/20" />

              {/* Feature check list */}
              <div className="space-y-3">
                <p className="text-[10px] font-sans font-bold tracking-widest text-[#EDE6E3]/40 uppercase">What's Included:</p>
                <div className="space-y-2.5">
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3] font-medium"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Everything in The Lobby (free tier)</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Unlimited access to all new release screenings</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Full premiere event access — live Q&As, red carpet rooms</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Create unlimited private rooms for friends and family</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Row One Pass gold badge on your profile and in chat</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Early bird access — book seats 48 hours before public release</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Discounted one-off premiere tickets (20% off)</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Ad-free experience across the entire platform</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Exclusive Row One Pass screenings — catalogue cuts</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Spoiler-free mode — blur all chat until revealed</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Watch Party host controls — mute, pin, set rules</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Download your digital ticket as a styled PDF keepsake</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Access to Wrapped — your annual cinema stats</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Priority customer support — responses within 2 hours</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>HD stream quality — 1080p guaranteed in all rooms</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Early access to new features before general release</span></div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              {activePlan === 'pass' ? (
                <div className="space-y-2">
                  <button
                    onClick={handleManagePortal}
                    disabled={isProcessing === 'portal'}
                    className="w-full py-4 bg-[#DDA75F] hover:bg-[#DDA75F]/90 text-black text-xs font-semibold uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing === 'portal' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Opening Stripe...</span>
                      </>
                    ) : (
                      <span>Manage plan</span>
                    )}
                  </button>
                  <p className="text-center text-xs text-[#DDA75F] tracking-wide italic">Your current plan</p>
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe('pass')}
                  disabled={isProcessing === 'pass'}
                  className="w-full py-4 bg-[#DDA75F] hover:bg-[#DDA75F]/95 text-black text-xs font-bold uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing === 'pass' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Contacting Stripe...</span>
                    </>
                  ) : (
                    <span>Get Row One Pass</span>
                  )}
                </button>
              )}
              <p className="text-[10px] text-center text-[#DDA75F]/60">
                Secure payment via Stripe. Cancel any time from your profile.
              </p>
            </div>
          </div>

          {/* TIER 3 — STUDIO PORTAL */}
          <div id="tier-studio-card" className="flex flex-col bg-[#3D2000] border border-[#8C1C13] rounded-xl p-8 justify-between space-y-8 text-left transition-all hover:border-[#8C1C13]/60 order-3 relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#8C1C13] text-[#EDE6E3] text-[9px] font-bold tracking-widest px-4 py-1 rounded-full uppercase">
              FOR STUDIOS
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <span className="font-sans text-[11px] text-[#8C1C13] tracking-widest uppercase font-semibold">Distributor License</span>
                <h3 className="font-serif text-3xl font-bold text-[#EDE6E3]">Studio Portal</h3>
                <p className="font-serif italic text-sm text-[#DDA75F]">
                  "Bring your films to Row One. Reach audiences who love cinema."
                </p>
              </div>

              {/* Large Pricing typography */}
              <div>
                <p className="font-serif text-5xl font-bold text-[#EDE6E3]">$49</p>
                <p className="text-xs text-[#DDA75F] tracking-wide uppercase mt-1">One-time registration fee</p>
                <p className="text-[11px] text-[#DDA75F]/80 italic mt-0.5">No monthly charges. Yours permanently.</p>
              </div>

              <hr className="border-[#8C1C13]/30" />

              {/* Feature check list */}
              <div className="space-y-3">
                <p className="text-[10px] font-sans font-bold tracking-widest text-[#EDE6E3]/40 uppercase">What's Included:</p>
                <div className="space-y-2.5">
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3] font-medium"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Permanent verified Studio Account — never pay again</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Verified studio badge on all listings and in rooms</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Upload unlimited films to the ROWONE catalogue</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Schedule unlimited screenings at chosen times & prices</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Set your own ticket prices for new releases and premieres</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Full revenue dashboard — earnings, viewer counts, analytics</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Audience reaction data — peak emoji highlights, sentiment</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Premiere event tools — red carpet room, pinned announcements</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Set as Premiere toggle — adds Gold premiere badge</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Co-marketing placement — new releases on ROWONE home</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Direct messaging to studio followers for new release alerts</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Export audience data as CSV after every screening</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Priority listing in genre and new release browse pages</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Access to ROWONE's studio partner Slack community</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3]"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Dedicated studio onboarding call with the ROWONE team</span></div>
                  <div className="flex items-start space-x-2 text-sm text-[#EDE6E3] font-medium"><Check className="w-4 h-4 text-[#DDA75F] shrink-0 mt-0.5" /><span>Revenue share: ROWONE takes 15% — you keep 85%</span></div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              {activePlan === 'studio' ? (
                <div className="space-y-2">
                  <button
                    disabled
                    className="w-full py-3.5 bg-[#8C1C13]/25 text-[#EDE6E3] border border-[#8C1C13]/40 text-xs font-semibold uppercase tracking-widest rounded-md"
                  >
                    Active Plan
                  </button>
                  <p className="text-center text-xs text-[#DDA75F] tracking-wide italic">Your current plan</p>
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe('studio')}
                  disabled={isProcessing === 'studio'}
                  className="w-full py-3.5 bg-[#EDE6E3] hover:bg-[#EDE6E3]/95 text-black text-xs font-semibold uppercase tracking-widest rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing === 'studio' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Contacting Stripe...</span>
                    </>
                  ) : (
                    <span>Register Your Studio</span>
                  )}
                </button>
              )}
              <p className="text-[10px] text-center text-[#DDA75F]/60">
                One payment. Permanent access. Powered by Stripe.
              </p>
            </div>
          </div>

        </div>

        {/* -------------------------------------------------------------
            COMPARISON GRID TABLE SECTION
            ------------------------------------------------------------- */}
        <div className="space-y-6 pt-12 animate-fade-in_1000">
          <div className="text-center select-none space-y-2">
            <h4 className="font-serif text-3xl font-bold text-[#EDE6E3]">Every seat, compared.</h4>
            <p className="text-xs text-[#DDA75F] tracking-widest uppercase font-mono block">Complete platform matrix</p>
          </div>

          <div className="overflow-x-auto border border-[#DDA75F]/15 rounded-xl bg-[#2A1500]/10 shadow-2xl">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm font-sans">
              
              {/* Gold Header Row */}
              <thead>
                <tr className="bg-[#2A1500] border-b border-[#DDA75F]/35 text-[#DDA75F]">
                  <th className="py-4.5 px-6 font-serif text-base font-bold">Capabilities</th>
                  <th className="py-4.5 px-6 font-serif text-base font-bold text-center">The Lobby</th>
                  <th className="py-4.5 px-6 font-serif text-base font-bold text-center">Row One Pass</th>
                  <th className="py-4.5 px-6 font-serif text-base font-bold text-center">Studio Portal</th>
                </tr>
              </thead>

              {/* alternating custom row backgrounds */}
              <tbody className="divide-y divide-[#DDA75F]/10">
                
                {/* Catalog access */}
                <tr className="bg-[#3D2000]/40">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Free Cinema Catalogue Screenings</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]/40">—</td>
                </tr>

                {/* Public rooms */}
                <tr className="bg-[#2A1500]/20">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Join Public Watch Rooms</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]/40">—</td>
                </tr>

                {/* Live reaction Chat */}
                <tr className="bg-[#3D2000]/40">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Live Chat & Emoji Reactions</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]/40">—</td>
                </tr>

                {/* Bio settings */}
                <tr className="bg-[#2A1500]/20">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Personal Avatar & Bio Setup</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                </tr>

                {/* Device compatibility */}
                <tr className="bg-[#3D2000]/40">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Cross-device Access (Web & Mobile)</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                </tr>

                {/* Star reviews */}
                <tr className="bg-[#2A1500]/20">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Film Star Ratings & Critic Reviews</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                </tr>

                {/* Watchlist */}
                <tr className="bg-[#3D2000]/40">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Film Watchlists & Reminders</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]/40">—</td>
                </tr>

                {/* Ticket Booking */}
                <tr className="bg-[#2A1500]/20">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Individual Ticket booking</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F] font-bold">Free</td>
                </tr>

                {/* New releases */}
                <tr className="bg-[#3D2000]/40">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">New Release Screenings</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F] font-semibold">Unlimited</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]/40">—</td>
                </tr>

                {/* Private room creation */}
                <tr className="bg-[#2A1500]/20">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Host Private Watch Rooms</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]/40">—</td>
                </tr>

                {/* Gold VIP badge */}
                <tr className="bg-[#3D2000]/40">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Golden Profile & Chat Badge</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#8C1C13]">Studio Badge</td>
                </tr>

                {/* Early bird reservation */}
                <tr className="bg-[#2A1500]/20">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Early Bird Booking (48 hrs)</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]/40">—</td>
                </tr>

                {/* Premiere discount */}
                <tr className="bg-[#3D2000]/40">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Ticket Discounts</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F] font-semibold">20% Off</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]/40">—</td>
                </tr>

                {/* Ad-free */}
                <tr className="bg-[#2A1500]/20">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Ad-Free Experience</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                </tr>

                {/* Watch party host controls */}
                <tr className="bg-[#3D2000]/40">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Host Controls & Moderation Tools</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                </tr>

                {/* Keepsake tickets */}
                <tr className="bg-[#2A1500]/20">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Styled Digital Keeping Tickets (PDF)</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]/40">—</td>
                </tr>

                {/* Stream guarantee */}
                <tr className="bg-[#3D2000]/40">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Fidelity Quality Guarantee</td>
                  <td className="py-4 px-6 text-center text-[#EDE6E3]/60">720p</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F] font-bold">1080p HD</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]/40">—</td>
                </tr>

                {/* Cinema Wrapped stats */}
                <tr className="bg-[#2A1500]/20">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Wrapped (Annual Cinema Statistics)</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]/40">—</td>
                </tr>

                {/* Film submission */}
                <tr className="bg-[#3D2000]/40">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Upload Unlimited Movies to Catalogue</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                </tr>

                {/* Scheduling tools */}
                <tr className="bg-[#2A1500]/20">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Schedule Unlimited Screenings</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                </tr>

                {/* Revenue dashboard */}
                <tr className="bg-[#3D2000]/40">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Financial Revenue Dashboard & Analytics</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                </tr>

                {/* Audience reactions */}
                <tr className="bg-[#2A1500]/20">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Audience Emoji Reactions Analytics</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                </tr>

                {/* Revenue share */}
                <tr className="bg-[#3D2000]/40">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Revenue Split Keep Percentage</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F] font-bold">85% Retained</td>
                </tr>

                {/* Studio Partner Slack */}
                <tr className="bg-[#2A1500]/20">
                  <td className="py-4 px-6 text-[#EDE6E3] font-medium">Distributor Slack Community Access</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-red-500">❌</td>
                  <td className="py-4 px-6 text-center text-[#DDA75F]">✅</td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
