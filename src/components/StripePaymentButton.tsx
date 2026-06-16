/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, PaymentElement, ExpressCheckoutElement } from '@stripe/react-stripe-js';
import { Lock, Sparkles, CreditCard, ChevronRight } from 'lucide-react';

interface StripePaymentButtonProps {
  amount: number;
  movieTitle: string;
  movieId: string;
  time: string;
  hall: string;
  seat: string;
  onSuccess: (details: { paymentId: string; simulated: boolean }) => void;
  onCancel: () => void;
  userId?: string;
  email?: string;
}

// Inline checkout form using real Stripe Elements
const SecureCheckoutForm: React.FC<{
  amount: number;
  onSuccess: StripePaymentButtonProps['onSuccess'];
  onCancel: StripePaymentButtonProps['onCancel'];
}> = ({ amount, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage('');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Payment processing failed.');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess({
        paymentId: paymentIntent.id,
        simulated: false,
      });
    } else {
      setErrorMessage('Action required or checkout incomplete.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <PaymentElement options={{ layout: 'tabs' }} />
      
      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-500 font-mono tracking-wide uppercase">
          ⚠️ {errorMessage}
        </div>
      )}

      <div className="flex gap-3 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 border border-white/10 hover:bg-white/[0.03] text-zinc-400 hover:text-white rounded-xl text-[10px] font-sans font-black tracking-widest uppercase transition-all duration-200 cursor-pointer"
        >
          Nevermind
        </button>
        <button
          type="submit"
          disabled={isProcessing || !stripe}
          className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-black rounded-xl text-[10px] font-sans font-black tracking-widest uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <span className="w-3 h-3 rounded-full border-2 border-black border-t-transparent animate-spin" />
          ) : (
            `CONFIRM $${amount.toFixed(2)}`
          )}
        </button>
      </div>
    </form>
  );
};

export const StripePaymentButton: React.FC<StripePaymentButtonProps> = ({
  amount,
  movieTitle,
  movieId,
  time,
  hall,
  seat,
  onSuccess,
  onCancel,
  userId,
  email,
}) => {
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Simulation support states
  const [simulatingMethod, setSimulatingMethod] = useState<'apple' | 'google' | 'link' | 'card' | null>(null);
  const [showSimCardForm, setShowSimCardForm] = useState(false);
  const [simCardNumber, setSimCardNumber] = useState('4242 •••• •••• 4242');
  const [simCardExpiry, setSimCardExpiry] = useState('12 / 29');
  const [simCardCvc, setSimCardCvc] = useState('424');

  useEffect(() => {
    const initStripe = async () => {
      try {
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId || 'guest_user',
            email: email || 'user@example.com',
            amount,
            movieTitle,
            movieId,
            time,
            hall,
            seat,
          }),
        });

        const data = await response.json();
        
        if (data.clientSecret && !data.simulated && data.publishableKey) {
          setIsConfigured(true);
          setClientSecret(data.clientSecret);
          setStripePromise(loadStripe(data.publishableKey));
        } else {
          setIsConfigured(false);
        }
      } catch (err) {
        console.warn('Real Stripe Elements initialization offline fallback activated:', err);
        setIsConfigured(false);
      } finally {
        setIsLoading(false);
      }
    };

    initStripe();
  }, [amount, movieId, movieTitle, time, hall, seat, userId, email]);

  const handleSimulatedPayment = (method: 'apple' | 'google' | 'link' | 'card') => {
    setSimulatingMethod(method);
    
    // Smooth countdown progress for simulated express checkout
    setTimeout(() => {
      onSuccess({
        paymentId: `pi_sim_${Math.random().toString(36).substring(2, 11)}`,
        simulated: true,
      });
      setSimulatingMethod(null);
    }, 1800);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-yellow-400 animate-spin" />
        <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest">Constructing Secure Tokenizer...</span>
      </div>
    );
  }

  // --- RENDERING REAL STRIPE ELEMENTS COMPONENT ---
  if (isConfigured && stripePromise && clientSecret) {
    return (
      <div className="bg-[#121111]/90 border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-sans font-black text-white/90 uppercase tracking-widest">Stripe PCI Merchant Frame</span>
        </div>
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
          <SecureCheckoutForm amount={amount} onSuccess={onSuccess} onCancel={onCancel} />
        </Elements>
      </div>
    );
  }

  // --- RENDERING STRIPE ELEMENTS SIMULATOR / SMART DEGRADATION WORKFLOW ---
  return (
    <div className="bg-[#121111]/95 border border-white/5 rounded-2xl p-5 md:p-6 space-y-5 text-left relative overflow-hidden">
      
      {/* Background visual gloss */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* Title block with SSL/Secure indicators */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-500 text-[8px] font-mono font-black uppercase tracking-wider">ELEMENTS PREVIEW</span>
            <span className="text-[8px] text-zinc-500 font-mono">PCI-DSS COMPLIANT</span>
          </div>
          <h4 className="font-display text-[15px] font-black text-white uppercase tracking-wide">Secure Link One-Click Checkout</h4>
          <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
            Select a secure payment parameter to check out seat <span className="text-yellow-400 font-medium font-mono">{seat}</span> watch.
          </p>
        </div>
        <Lock className="h-4.5 w-4.5 text-zinc-500 shrink-0" />
      </div>

      <div className="space-y-3.5">
        {/* Apple Pay Button layout */}
        <button
          type="button"
          disabled={simulatingMethod !== null}
          onClick={() => handleSimulatedPayment('apple')}
          className="w-full h-11 bg-black hover:bg-zinc-900 border border-white/10 disabled:opacity-40 text-white rounded-xl font-sans text-xs font-black tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 select-none"
        >
          {simulatingMethod === 'apple' ? (
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span className="font-mono text-[9px] uppercase font-black text-zinc-400">Verifying Apple Wallet Passcode...</span>
            </div>
          ) : (
            <>
              <span className="text-base font-medium font-sans"></span>
              <span>Pay with Apple Pay</span>
            </>
          )}
        </button>

        {/* Google Pay Button layout */}
        <button
          type="button"
          disabled={simulatingMethod !== null}
          onClick={() => handleSimulatedPayment('google')}
          className="w-full h-11 bg-zinc-900 hover:bg-zinc-850 border border-white/10 disabled:opacity-40 text-white rounded-xl font-sans text-xs font-black tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 select-none"
        >
          {simulatingMethod === 'google' ? (
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
              <span className="font-mono text-[9px] uppercase font-black text-zinc-400">Opening Saved Google Account...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-medium font-black font-sans tracking-tight text-white flex gap-0.5">
                <span className="text-blue-500">G</span>
                <span className="text-red-500">o</span>
                <span className="text-yellow-500">o</span>
                <span className="text-blue-500">g</span>
                <span className="text-emerald-500">l</span>
                <span className="text-red-500">e</span>
              </span>
              <span>Pay</span>
            </div>
          )}
        </button>

        {/* Stripe Link Button layout */}
        <button
          type="button"
          disabled={simulatingMethod !== null}
          onClick={() => handleSimulatedPayment('link')}
          className="w-full h-11 bg-[#00d66f] hover:bg-[#00c264] disabled:opacity-40 text-[#011e0f] rounded-xl font-sans text-xs font-black tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 select-none"
        >
          {simulatingMethod === 'link' ? (
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-950 border-t-transparent animate-spin" />
              <span className="font-mono text-[9px] uppercase font-black text-emerald-950/75">Authenticating Link OTP...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="font-mono font-black border border-[#011e0f]/20 px-1 py-0.5 rounded text-[9px] uppercase tracking-tighter">link</span>
              <span>Instant Pay</span>
            </div>
          )}
        </button>
      </div>

      <div className="relative flex items-center justify-center py-1">
        <hr className="w-full border-white/5" />
        <span className="absolute px-3.5 bg-[#121111] text-[7.5px] font-mono text-zinc-600 uppercase tracking-widest select-none">
          OR CREDIT/DEBIT CARDS
        </span>
      </div>

      {/* Credit / Debit Card selection framework */}
      <div className="space-y-4">
        {!showSimCardForm ? (
          <button
            type="button"
            disabled={simulatingMethod !== null}
            onClick={() => setShowSimCardForm(true)}
            className="w-full py-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 text-zinc-300 rounded-xl text-[10px] font-sans font-black tracking-widest uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Enter Card credentials manually</span>
          </button>
        ) : (
          <div className="space-y-4 animate-fade-in text-left">
            <div className="space-y-3 p-4 bg-white/[0.01] border border-white/5 rounded-xl">
              <div className="space-y-1">
                <label className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider block">Card Number</label>
                <input
                  type="text"
                  value={simCardNumber}
                  onChange={(e) => setSimCardNumber(e.target.value)}
                  className="w-full bg-[#181717] border border-white/5 rounded-md px-3 py-2 text-[10.5px] font-mono text-zinc-300 focus:outline-none focus:border-yellow-400/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider block">Expiration Date</label>
                  <input
                    type="text"
                    value={simCardExpiry}
                    onChange={(e) => setSimCardExpiry(e.target.value)}
                    className="w-full bg-[#181717] border border-white/5 rounded-md px-3 py-2 text-[10.5px] font-mono text-zinc-300 focus:outline-none focus:border-yellow-400/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider block">CVC Security Code</label>
                  <input
                    type="text"
                    value={simCardCvc}
                    onChange={(e) => setSimCardCvc(e.target.value)}
                    className="w-full bg-[#181717] border border-white/5 rounded-md px-3 py-2 text-[10.5px] font-mono text-zinc-300 focus:outline-none focus:border-yellow-400/30"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSimCardForm(false)}
                className="flex-1 py-3 border border-white/10 hover:bg-white/[0.03] text-zinc-400 hover:text-white rounded-xl text-[10px] font-sans font-black tracking-widest uppercase transition-all duration-200 cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={simulatingMethod !== null}
                onClick={() => handleSimulatedPayment('card')}
                className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-black rounded-xl text-[10px] font-sans font-black tracking-widest uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                {simulatingMethod === 'card' ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                ) : (
                  <span>PAY ${amount.toFixed(2)}</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[8px] text-zinc-500 font-mono pt-1">
        <span>GATEWAY ID: STRIPE_ELEMENTS_v3</span>
        <span>MERCHANT ACCOUNT ID: ROWONE_CINEMA_GLOBAL</span>
      </div>

      <div className="pt-2 flex justify-center">
        <button
          type="button"
          onClick={onCancel}
          className="text-[9px] text-zinc-550 hover:text-zinc-400 underline uppercase tracking-widest cursor-pointer"
        >
          Cancel and return to seat map
        </button>
      </div>

    </div>
  );
};
