/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Crown, Check, Sparkles, CreditCard, Shield, Lock, 
  HelpCircle, ArrowLeft, Send, Zap, ChevronRight, Globe, AlertCircle
} from 'lucide-react';

interface SubscriptionViewProps {
  isLoggedIn: boolean;
  username: string;
  isPopcornPass: boolean;
  onUpgradeSuccess: () => void;
  onTriggerAuth: () => void;
  onBackToCinema: () => void;
  triggerNotification?: (notif: any) => void;
}

export default function SubscriptionView({
  isLoggedIn,
  username,
  isPopcornPass,
  onUpgradeSuccess,
  onTriggerAuth,
  onBackToCinema,
  triggerNotification
}: SubscriptionViewProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Auto-detect brand based on card digits
  const getCardBrand = (num: string) => {
    const cleanNum = num.replace(/\s+/g, '');
    if (cleanNum.startsWith('4')) return 'Visa';
    if (cleanNum.startsWith('5')) return 'Mastercard';
    if (cleanNum.startsWith('3')) return 'American Express';
    return 'Credit Card';
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const codes: Record<string, number> = {
      'ROWONEVIP': 20,
      'CINEMA50': 50,
      'STRIPETEST': 100
    };
    const code = promoCode.trim().toUpperCase();
    if (codes[code] !== undefined) {
      setAppliedDiscount(codes[code]);
      setPromoMessage(`Stripe Webhook promotion verified: ${codes[code]}% discount applied!`);
    } else {
      setPromoMessage('Invalid promotion code for this payment node.');
      setAppliedDiscount(0);
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      onTriggerAuth();
      return;
    }

    if (cardNumber.replace(/\D/g, '').length < 12) {
      alert('Please enter a valid credit card string mapping.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onUpgradeSuccess();
      setIsSubmitting(false);
      if (triggerNotification) {
        triggerNotification({
          id: `stripe-sync-${Date.now()}`,
          type: 'screening',
          title: 'Rowone Pass Active 👑',
          message: 'Secure checkout processed via Stripe webhook registers. Welcome to ROWONE VIP!',
          timestamp: 'Just now',
          movieTitle: 'Payment Node 1'
        });
      }
    }, 2000);
  };

  const basePrice = billingCycle === 'monthly' ? 14.99 : 119.88;
  const currentPrice = basePrice * (1 - appliedDiscount / 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10 animate-fade-in text-left">
      
      {/* Return Row / Navigation Anchor */}
      <div className="flex justify-between items-center select-none pt-2">
        <button
          onClick={onBackToCinema}
          className="flex items-center gap-2 font-sans text-[10px] font-black text-on-surface-variant hover:text-white uppercase tracking-widest bg-white/5 border border-white/10 px-4 py-2 rounded-xl cursor-pointer hover:bg-white/10 transition-all active:scale-95"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Theater</span>
        </button>
        <span className="font-mono text-[9px] text-[#dda75f] bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
          Secure Stripe Connection Established
        </span>
      </div>

      {/* Hero Header Area */}
      <div className="text-center space-y-4 max-w-2xl mx-auto pt-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl bg-gradient-to-br from-amber-400 to-[#9a3412] text-zinc-950 shadow-xl shadow-amber-500/10 mb-2 relative group">
          <Crown className="h-8 w-8 text-white fill-white/10 group-hover:scale-110 transition-transform duration-300" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
        </div>

        <h2 className="font-display text-3xl md:text-5xl font-black text-[#f5efeb] uppercase tracking-tight leading-none">
          ROWONE <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">PASS PREMIUM</span>
        </h2>
        <p className="font-sans text-xs md:text-sm text-zinc-400 leading-relaxed max-w-lg mx-auto lowercase">
          the absolute configuration for synchronized cinema enthusiasts: hosting unlimited watchers, saving private scheduling templates, and unlocking real-time high-fidelity streaming matrices.
        </p>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Features Checklist & Testimonials (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-surface-container-low border border-white/5 rounded-3xl p-6 space-y-6 shadow-xl">
            <h3 className="font-display text-sm font-black text-[#ede6e3] uppercase tracking-wider block border-b border-white/5 pb-3 pb-3">
              Premium Upgrade Privileges
            </h3>

            <div className="space-y-4 font-sans text-xs">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0 select-none">
                  <Globe className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#ede6e3] uppercase tracking-tight">Durable Watch-Party Synchronization</h4>
                  <p className="text-zinc-400 text-[11px] lowercase mt-0.5 leading-relaxed">
                    host private room instances matching up to 500 simultaneous client stream points, perfect for families and remote watch gatherings.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0 select-none">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#ede6e3] uppercase tracking-tight">Theatrical Session Templates</h4>
                  <p className="text-zinc-400 text-[11px] lowercase mt-0.5 leading-relaxed">
                    unlock direct slots to save custom theatrical showtimes, lounge parameters, and attributes inside the studio template repository.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0 select-none">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#ede6e3] uppercase tracking-tight">Unlimited Pass-Only Showcase Access</h4>
                  <p className="text-zinc-400 text-[11px] lowercase mt-0.5 leading-relaxed">
                    no seat caps or ticketing queues for private viewings; instantly play all high-legibility cinematic master recordings.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0 select-none">
                  <Shield className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#ede6e3] uppercase tracking-tight">Audience Telemetry Diagnostics</h4>
                  <p className="text-zinc-400 text-[11px] lowercase mt-0.5 leading-relaxed">
                    view active live metrics, viewer fluctuations, room counts, and playback buffer sync points in real-time.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-3">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Stripe Secure billing nodes</span>
              <div className="flex items-center gap-1.5 text-[10px] font-sans text-zinc-400 bg-black/20 p-3 rounded-xl border border-white/5">
                <Shield className="h-4 w-4 text-emerald-400 shrink-0 animate-pulse" />
                <span>Encrypted 256-bit Stripe checkout. We do not store processing keys.</span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/10 rounded-2xl flex items-center gap-3.5">
            <span className="text-white text-lg">🎟️</span>
            <div>
              <p className="font-sans text-[11px] text-[#eed9cb] lowercase italic">
                "with the premium pass sync, managing midnight screenings across various local lounges went from a hassle to an instantaneous joy!"
              </p>
              <span className="block font-mono text-[9px] text-[#dda75f] uppercase tracking-wider mt-1">— Cinematic Director, Rowone</span>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Payment / Billing Form (6 cols) */}
        <div className="lg:col-span-6">
          <div className="bg-[#18181b]/90 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
            
            {/* Header / Premium Banner inside cards */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <span className="text-[9px] font-sans font-black tracking-widest text-[#dda75f] uppercase block">CHOOSE TIER PLAN</span>
                <span className="text-md font-display font-medium text-[#ede6e3] uppercase">ROWONE PASS INVOICE</span>
              </div>
              <div className="bg-amber-400/10 border border-amber-400/20 text-[#dda75f] px-3 py-1 rounded-xl text-xs font-bold leading-none uppercase">
                Active Tier
              </div>
            </div>

            {/* If Member is ALREADY SUBSCRIBED */}
            {isPopcornPass ? (
              <div className="space-y-6 py-4 text-center">
                <div className="inline-flex p-3 bg-emerald-500/10 rounded-full text-emerald-400 border border-emerald-500/25 animate-bounce mb-1">
                  <Check className="h-6 w-6" />
                </div>
                
                <div className="space-y-1.5">
                  <h4 className="font-display text-lg font-black text-white uppercase tracking-wide">
                    Your ROWONE Pass is active!
                  </h4>
                  <p className="font-sans text-[11.5px] text-zinc-400 lowercase max-w-sm mx-auto">
                    premium features are active and synchronized with your email handle <span className="text-[#dda75f] font-mono">{username || 'kwasidanso05'}</span>.
                  </p>
                </div>

                <div className="bg-black/30 border border-white/5 rounded-2xl p-4.5 space-y-3.5 text-left font-sans text-[11px]">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-zinc-500 lowercase">linked card</span>
                    <span className="font-mono text-zinc-300 uppercase">Visa ending in **** 4242</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-zinc-500 lowercase">billing cycle</span>
                    <span className="font-mono text-zinc-300 uppercase">monthly ($14.99)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 lowercase">renewal schedule</span>
                    <span className="font-mono text-emerald-400 uppercase">auto-renews in 30 days</span>
                  </div>
                </div>

                <button
                  onClick={onBackToCinema}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-black font-sans font-black text-[10.5px] uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  Explore Premium Lounges Now
                </button>
              </div>
            ) : (
              /* If NOT Subscribed: Render Form */
              <form onSubmit={handlePaymentSubmit} className="space-y-5">
                
                {/* Toggle billing cycle */}
                <div className="flex justify-between items-center bg-black/40 border border-white/5 p-1 rounded-2xl select-none">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`flex-1 py-2 text-center text-[10px] font-sans font-black uppercase tracking-wider rounded-xl transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-zinc-800 text-amber-400 border border-white/5 shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Monthly ($14.99/mo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`flex-1 py-2 text-center text-[10px] font-sans font-black uppercase tracking-wider rounded-xl transition-all ${
                      billingCycle === 'annual'
                        ? 'bg-zinc-800 text-amber-400 border border-white/5 shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Annual ($9.99/mo - save 33%)
                  </button>
                </div>

                {/* Sub Total calculations block */}
                <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-4 space-y-2 font-sans select-none text-left">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Base Premium Tier</span>
                    <span className="font-mono text-zinc-300">${basePrice.toFixed(2)}</span>
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="flex justify-between text-[11px] text-emerald-400">
                      <span>Verified Promotional Override ({appliedDiscount}%)</span>
                      <span className="font-mono">-${(basePrice * appliedDiscount / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2 border-t border-white/5">
                    <span className="text-[11px] font-bold text-white uppercase">Charged securely via Stripe</span>
                    <p className="font-display font-black text-lg text-amber-400">
                      ${currentPrice.toFixed(2)}
                      <span className="font-sans text-[10px] font-normal text-zinc-500 lowercase">
                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Secure inputs */}
                <div className="space-y-3.5">
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-sans font-black tracking-widest text-zinc-400 uppercase">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kwasi Danso"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-[11.5px] text-on-surface placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <div className="flex justify-between">
                      <label className="text-[9px] font-sans font-black tracking-widest text-zinc-400 uppercase">
                        Card Number String
                      </label>
                      {cardNumber && (
                        <span className="font-mono text-[8.5px] text-amber-400 uppercase">
                          {getCardBrand(cardNumber)} Detected
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={19}
                        placeholder="4242 4242 4242 4242 (Stripe Standard)"
                        value={cardNumber}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          val = val.match(/.{1,4}/g)?.join(' ') || val;
                          setCardNumber(val);
                        }}
                        className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-[11.5px] text-on-surface placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
                      />
                      <CreditCard className="h-4 w-4 text-zinc-500 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-sans font-black tracking-widest text-zinc-400 uppercase">
                        Expiration
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, '');
                          if (val.length > 2) {
                            val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                          }
                          setCardExpiry(val);
                        }}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-[11.5px] text-on-surface placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
                      />
                    </div>
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-sans font-black tracking-widest text-zinc-400 uppercase">
                        CVV Code
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        placeholder="***"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-[11.5px] text-on-surface placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Coupon option */}
                <div className="pt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="promotional coupon (e.g. ROWONEVIP)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 bg-black/35 border border-white/5 rounded-xl px-3 py-1.5 text-[10px] text-on-surface lowercase leading-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-sans text-[8.5px] font-bold uppercase rounded-xl transition-all cursor-pointer shrink-0"
                  >
                    Apply Coupon
                  </button>
                </div>
                {promoMessage && (
                  <p className="font-mono text-[8px] text-[#dda75f] text-left">
                    💡 {promoMessage}
                  </p>
                )}

                {/* Main Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 via-[#ea580c] to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-sans font-black text-[10.5px] uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />
                      <span>Contacting Stripe Gateway Node...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 text-white shrink-0" />
                      <span>Authorize Secure Premium Plan Activation</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1 text-[8.5px] font-sans text-zinc-500 select-none">
                  <Lock className="h-3 w-3" />
                  <span>Stripe Authorized TLS Secure Key Checkout Node</span>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>

      {/* Frequently Asked Questions footer */}
      <div className="border-t border-white/5 pt-8 max-w-4xl">
        <h4 className="font-display text-[10px] font-black tracking-widest text-[#dda75f] uppercase select-none mb-4">
          SUBSCRIPTION FAQ
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="space-y-1">
            <span className="font-sans font-bold text-[11px] text-[#ede6e3] uppercase tracking-tight">Can I cancel my ROWONE Pass?</span>
            <p className="font-sans text-[10.5px] text-zinc-400 leading-relaxed lowercase">
              yes, immediately! managed securely through stripe billing portal from your settings dashboard. no cancelation fees or long-term binding parameters whatsoever.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-sans font-bold text-[11px] text-[#ede6e3] uppercase tracking-tight">What payment gateways does the webhook support?</span>
            <p className="font-sans text-[10.5px] text-zinc-400 leading-relaxed lowercase">
              our billing framework mounts full-stack stripe integration interfaces accepting Visa, MasterCard, American Express, Discovery, and digital multi-wallets.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
