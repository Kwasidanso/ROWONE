/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Check, Sparkles, Crown, CreditCard, Lock, X, ShieldCheck, Ticket, Users, Zap, Star } from 'lucide-react';

interface UpgradeModalProps {
  onUpgradeSuccess: () => void;
  onClose: () => void;
  pitchMovieTitle?: string;
}

export default function UpgradeModal({ onUpgradeSuccess, onClose, pitchMovieTitle }: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pass'>('pass');
  const [step, setStep] = useState<'tier-select' | 'stripe-checkout' | 'success'>('tier-select');
  
  // Simulated Stripe state
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [cardName, setCardName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const plans = [
    {
      id: 'free',
      name: 'Free Spectator',
      price: '$0.00',
      period: 'forever',
      description: 'Access basic community rooms and standard catalogue features.',
      features: [
        'Access to catalogue screenings only',
        'Standard social chat room tools',
        'Standard audio streams',
        'Single room active syncing',
      ],
      cta: 'Current Plan',
      disabled: true,
    },
    {
      id: 'pass',
      name: 'ROWONE Pass',
      price: '$14.99',
      period: 'month',
      description: 'Unlocks the entire theater with ultimate executive privileges.',
      features: [
        'Unlimited access to all catalogue films',
        'Discounted new releases ($4.99 tickets)',
        'Early access to limited studio premieres',
        'Gold VIP "PASS" profile badge',
        'Priority high-fidelity audio streams',
        'Unlimited synchronous group watch parties',
      ],
      cta: 'Upgrade with Stripe',
      highlighted: true,
    }
  ];

  const handleChoosePlan = (planId: string) => {
    if (planId === 'free') return;
    setStep('stripe-checkout');
  };

  const handleSimulatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setCheckoutError('');

    // Simulate standard 2-second Stripe gateway authorization
    setTimeout(() => {
      setIsProcessing(false);
      setStep('success');
      onUpgradeSuccess();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/92 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none animate-fade-in overflow-y-auto">
      <div className="relative max-w-4xl w-full bg-surface-container-lowest border border-white/5 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(255,215,0,0.12)] overflow-hidden my-6">
        {/* Soft background golden light spill */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

        {/* Close Button */}
        {step !== 'success' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-white rounded-full bg-white/5 border border-white/10 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* STEP 1: Tier Presentation / Comparison Matrix */}
        {step === 'tier-select' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header Title with localized Pitch */}
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-yellow-400/10 border border-yellow-400/25 rounded-full text-yellow-400 font-sans text-[9px] font-black tracking-widest uppercase">
                <Crown className="h-3.5 w-3.5 fill-yellow-400" />
                <span>GOLD POPCORN SUBSCRIPTION SYSTEM</span>
              </div>
              
              {pitchMovieTitle ? (
                <div className="space-y-1">
                  <h2 className="font-display text-2xl md:text-3.5xl font-bold tracking-tight text-on-surface">
                    Unlock <span className="text-yellow-400">"{pitchMovieTitle}"</span>
                  </h2>
                  <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
                    This selection is currently classified under <span className="text-yellow-400/90 font-bold uppercase">Pass-Only Screenings</span>. Upgrade below with Stripe to access instant playbacks and synchronized room sessions immediately!
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <h2 className="font-display text-2.5xl md:text-4xl font-black text-[#f5efeb]">
                    Choose Your Viewing Privilege
                  </h2>
                  <p className="font-sans text-xs text-on-surface-variant">
                    Unlock elite high-fidelity audio, early access premieres, and unlimited group lounges.
                  </p>
                </div>
              )}
            </div>

            {/* Price Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto pt-2">
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => {
                      if (!plan.disabled) setSelectedPlan(plan.id as 'free' | 'pass');
                    }}
                    className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 border cursor-pointer select-none ${
                      plan.highlighted
                        ? isSelected
                          ? 'bg-yellow-500/5 border-yellow-500/60 shadow-[0_0_30px_rgba(234,179,8,0.15)] scale-[1.01]'
                          : 'bg-[#181613] border-yellow-500/20 hover:border-yellow-500/40'
                        : 'bg-[#121111]/80 border-white/5 opacity-75 hover:opacity-100'
                    }`}
                  >
                    {plan.highlighted && (
                      <span className="absolute -top-3.5 right-6 px-3 py-1 bg-yellow-400 text-black text-[9px] font-sans font-black tracking-widest uppercase rounded-full shadow-lg">
                        BEST THEATER VALUE
                      </span>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h3 className="font-display font-black text-md uppercase text-on-surface tracking-wider">
                          {plan.name}
                        </h3>
                        <div className="flex items-baseline gap-1 mt-1 text-on-surface">
                          <span className="font-display text-3xl font-black">{plan.price}</span>
                          <span className="font-sans text-xs text-on-surface-variant">/{plan.period}</span>
                        </div>
                        <p className="font-sans text-[11px] text-on-surface-variant mt-2 leading-relaxed">
                          {plan.description}
                        </p>
                      </div>

                      <hr className="border-white/5" />

                      <ul className="space-y-2.5 font-sans text-xs">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <Check className={`h-4 w-4 shrink-0 mt-0.5 ${plan.highlighted ? 'text-yellow-400' : 'text-on-surface-variant/70'}`} />
                            <span className="text-on-surface-variant leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-6">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChoosePlan(plan.id);
                        }}
                        disabled={plan.disabled}
                        className={`w-full py-3.5 rounded-xl font-sans text-[10px] font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                          plan.highlighted
                            ? 'bg-yellow-400 hover:bg-yellow-500 text-black shadow-lg shadow-yellow-500/10'
                            : 'bg-white/5 text-on-surface-variant cursor-default'
                        }`}
                      >
                        {plan.highlighted && <Zap className="h-3.5 w-3.5 fill-black" />}
                        <span>{plan.cta}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Pre-populated Stripe Form */}
        {step === 'stripe-checkout' && (
          <div className="max-w-md mx-auto space-y-6 animate-fade-in py-2">
            <div className="text-center space-y-1.5 select-none">
              <div className="inline-flex gap-2 items-center text-yellow-400 font-sans text-[10px] font-black tracking-widest uppercase pb-1">
                <Lock className="h-3.5 w-3.5" />
                <span>STRIPE STENCIL CHECKOUT GATEWAY</span>
              </div>
              <h3 className="font-display text-2xl font-black text-on-surface">Secure Payment</h3>
              <p className="font-sans text-xs text-on-surface-variant">
                Activate ROWONE Pass subscription ($14.99/month, cancel anytime).
              </p>
            </div>

            {/* Unified Billing Form */}
            <form onSubmit={handleSimulatePayment} className="space-y-5 bg-[#121111]/80 border border-white/5 rounded-2xl p-5 md:p-6 shadow-md">
              {/* Product brief */}
              <div className="flex items-center justify-between p-3.5 bg-yellow-400/5 rounded-xl border border-yellow-400/10 select-none">
                <div className="flex gap-2.5 items-center">
                  <div className="h-8 w-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400">
                    <Crown className="h-4.5 w-4.5 fill-yellow-400" />
                  </div>
                  <div>
                    <h5 className="font-display font-bold text-xs text-on-surface uppercase leading-none">Monthly ROWONE Pass</h5>
                    <p className="font-sans text-[9px] text-on-surface-variant mt-1">unlimited theatre access</p>
                  </div>
                </div>
                <span className="font-mono text-xs font-black text-yellow-500">$14.99</span>
              </div>

              {/* Stripe Input Elements */}
              <div className="space-y-4 font-sans text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-sans font-black tracking-widest text-on-surface-variant uppercase">CARDHOLDER NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Lin"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant/35 rounded-xl px-3.5 py-3 text-xs text-on-surface focus:outline-none focus:border-yellow-400 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-sans font-black tracking-widest text-on-surface-variant uppercase">CREDIT CARD NUMBER</label>
                  <div className="relative flex items-center bg-surface-container border border-outline-variant/35 rounded-xl px-3.5 py-3 focus-within:border-yellow-400 transition-colors">
                    <CreditCard className="h-4 w-4 text-on-surface-variant mr-2.5 shrink-0" />
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 4242 4242 4242"
                      className="w-full bg-transparent border-none text-xs text-on-surface focus:outline-none focus:ring-0 p-0 font-mono tracking-widest"
                    />
                    <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2e8W2J_hVpx_LDR0f9LREe3ZfNidUpvEypG1VvNu-K6Bmt8LqO-Vd6199LdD6xOx7Cg_S=s32" className="h-4 w-6 shrink-0 object-contain ml-2 opacity-80" alt="Visa" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-sans font-black tracking-widest text-on-surface-variant uppercase">EXPIRY DATE</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full bg-surface-container border border-outline-variant/35 rounded-xl px-3.5 py-3 text-center text-xs text-on-surface focus:outline-none focus:border-yellow-400 transition-colors font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-sans font-black tracking-widest text-on-surface-variant uppercase">CVV / CVC CODE</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      placeholder="•••"
                      className="w-full bg-surface-container border border-outline-variant/35 rounded-xl px-3.5 py-3 text-center text-xs text-on-surface focus:outline-none focus:border-yellow-400 transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Encryption security banner */}
              <div className="flex gap-2 p-3 bg-black/40 border border-white/5 rounded-xl select-none">
                <ShieldCheck className="h-4.5 w-4.5 text-green-400 shrink-0" />
                <span className="font-sans text-[8.5px] text-on-surface-variant leading-relaxed lowercase">
                  payments processed securely by <span className="text-on-surface">Stripe payments</span> end-to-end encrypted tunnels. your billing credentials are never cached locally.
                </span>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('tier-select')}
                  className="flex-1 py-3.5 border border-outline hover:bg-white/5 hover:text-white rounded-xl text-sans text-[10px] font-black tracking-widest uppercase transition-all duration-200 cursor-pointer text-on-surface-variant"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-[2] py-3.5 bg-yellow-400 hover:bg-yellow-500 text-black text-[10px] font-sans font-black tracking-widest uppercase rounded-xl hover:shadow-lg hover:shadow-yellow-500/10 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span>Pay &amp; Subscribe</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: Premium Success Frame */}
        {step === 'success' && (
          <div className="py-12 text-center space-y-6 animate-fade-in flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="h-20 w-20 rounded-full bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center text-yellow-400 mb-1 animate-pulse relative">
              <Crown className="h-10 w-10 fill-yellow-400 animate-bounce text-yellow-400" />
              <div className="absolute -inset-1 bg-yellow-400/20 rounded-full blur-md opacity-50 duration-200 pointer-events-none" />
            </div>

            <div className="space-y-2 select-none">
              <div className="inline-flex items-center gap-1 text-[9px] font-black tracking-widest uppercase text-yellow-400">
                <Star className="h-3 w-3 fill-yellow-400" />
                <span>GOLD USER PROFILE ACTIVATED</span>
                <Star className="h-3 w-3 fill-yellow-400" />
              </div>
              <h2 className="font-display text-3xl font-black text-on-surface tracking-tight">Welcome to popcorn Pass</h2>
              <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
                Congratulations! You are now subscribed. Unlimited catalogue streams, priority sync lobbies, and discounted premiere screening tickets ($4.99 only) have been unlocked for @YourAccount.
              </p>
            </div>

            <button
              onClick={onClose}
              className="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-black font-sans text-xs font-black tracking-widest uppercase rounded-xl transition-all shadow-lg hover:shadow-yellow-500/20 cursor-pointer"
            >
              Enter Golden Showroom
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
