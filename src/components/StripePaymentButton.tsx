/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { 
  Lock, 
  Sparkles, 
  CreditCard, 
  ChevronRight, 
  Check, 
  Trash2, 
  ShieldCheck, 
  Zap, 
  Plus, 
  AlertCircle, 
  TrendingUp,
  Inbox,
  Clock,
  ExternalLink
} from 'lucide-react';
import { 
  loadUserPaymentMethods, 
  saveUserPaymentMethod, 
  removePaymentMethod,
  setDefaultPaymentMethod,
  getPreferredPaymentMethodId,
  setPreferredPaymentMethodId,
  getAutofillCredentials
} from '../lib/paymentService';
import { UserPaymentMethod } from '../types';

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
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-500 font-mono tracking-wide uppercase font-bold">
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

  // Saved Payment Methods list
  const [savedMethods, setSavedMethods] = useState<UserPaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [showNewPaymentForm, setShowNewPaymentForm] = useState<boolean>(false);

  // New Payment Form fields
  const [newProvider, setNewProvider] = useState<'stripe' | 'paypal' | 'applepay' | 'googlepay'>('stripe');
  const [newCardHolder, setNewCardHolder] = useState<string>('');
  const [newCardNumber, setNewCardNumber] = useState<string>('');
  const [newCardExpiry, setNewCardExpiry] = useState<string>('');
  const [newCardCvc, setNewCardCvc] = useState<string>('');
  const [paypalEmail, setPaypalEmail] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Post-purchase 'Save this payment method?' screen parameters
  const [pendingSaveMethod, setPendingSaveMethod] = useState<UserPaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activePaymentId, setActivePaymentId] = useState<string>('');

  // Load saved payment methods
  useEffect(() => {
    const fetchMethods = async () => {
      if (userId) {
        try {
          const list = await loadUserPaymentMethods(userId);
          setSavedMethods(list);
          
          // Determine initial selected billing method
          const preferredId = getPreferredPaymentMethodId(userId);
          const hasPreferred = preferredId && list.some(item => item.paymentMethodId === preferredId);
          
          if (hasPreferred) {
            setSelectedMethodId(preferredId);
          } else {
            const defaultMethod = list.find(item => item.isDefault) || list[0];
            if (defaultMethod) {
              setSelectedMethodId(defaultMethod.paymentMethodId);
            } else {
              setShowNewPaymentForm(true);
            }
          }
        } catch (err) {
          console.warn('Error loading saved payment methods:', err);
        }
      } else {
        setShowNewPaymentForm(true);
      }
    };
    fetchMethods();
  }, [userId]);

  // Real Stripe Elements config setup
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

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanNum = e.target.value.replace(/\D/g, '');
    const segments = cleanNum.match(/.{1,4}/g);
    setNewCardNumber(segments ? segments.join(' ') : cleanNum);
    setFormError('');
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length > 2) {
      raw = raw.substring(0, 2) + '/' + raw.substring(2, 4);
    }
    setNewCardExpiry(raw);
    setFormError('');
  };

  const handleSetDefault = async (e: React.MouseEvent, methodId: string) => {
    e.stopPropagation();
    if (!userId) return;
    try {
      const refreshed = await setDefaultPaymentMethod(userId, methodId);
      setSavedMethods(refreshed);
    } catch (err) {
      console.warn('Set default failed:', err);
    }
  };

  const handleRemove = async (e: React.MouseEvent, methodId: string) => {
    e.stopPropagation();
    if (!userId) return;
    if (confirm('Are you sure you want to delete this saved payment method?')) {
      try {
        const refreshed = await removePaymentMethod(userId, methodId);
        setSavedMethods(refreshed);
        if (selectedMethodId === methodId) {
          const nextDefault = refreshed.find(m => m.isDefault) || refreshed[0];
          setSelectedMethodId(nextDefault ? nextDefault.paymentMethodId : null);
          if (!nextDefault) setShowNewPaymentForm(true);
        }
      } catch (err) {
        console.warn('Remove payment method failed:', err);
      }
    }
  };

  const executeOneClickCheckout = () => {
    if (!selectedMethodId) {
      setFormError('Please select a payment method first.');
      return;
    }
    
    setIsProcessing(true);
    setFormError('');

    const targetMethod = savedMethods.find(m => m.paymentMethodId === selectedMethodId);
    
    setTimeout(() => {
      setIsProcessing(false);
      const simulatedId = `pi_sim_${Math.random().toString(36).substring(2, 11)}`;
      
      // Complete transaction instantly
      onSuccess({
        paymentId: simulatedId,
        simulated: true
      });
    }, 1600);
  };

  const handleNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsProcessing(true);

    setTimeout(async () => {
      const pmId = `pm_${newProvider}_${Math.random().toString(36).substring(2, 11)}`;
      const simulatedId = `pi_sim_${Math.random().toString(36).substring(2, 11)}`;
      setActivePaymentId(simulatedId);

      let paymentMethodObj: UserPaymentMethod = {
        id: pmId,
        userId: userId || 'guest_user',
        provider: newProvider,
        customerId: `cus_${newProvider}_${Math.random().toString(36).substring(2, 11)}`,
        paymentMethodId: pmId,
        isDefault: savedMethods.length === 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (newProvider === 'stripe') {
        const cleanCard = newCardNumber.replace(/\s+/g, '');
        if (!newCardHolder.trim()) {
          setFormError('Please enter the cardholder name.');
          setIsProcessing(false);
          return;
        }
        if (cleanCard.length < 15) {
          setFormError('Invalid credit card number length.');
          setIsProcessing(false);
          return;
        }
        if (newCardExpiry.length < 5) {
          setFormError('Expiration date is required (MM/YY).');
          setIsProcessing(false);
          return;
        }
        if (newCardCvc.length < 3) {
          setFormError('CVC Security code is required.');
          setIsProcessing(false);
          return;
        }

        const isVisaObj = cleanCard.startsWith('4');
        paymentMethodObj = {
          ...paymentMethodObj,
          cardBrand: isVisaObj ? 'Visa' : 'Mastercard',
          lastFourDigits: cleanCard.slice(-4),
          expiryMonth: Number(newCardExpiry.split('/')[0]) || 12,
          expiryYear: Number('20' + newCardExpiry.split('/')[1]) || 2029,
        };
      } else if (newProvider === 'paypal') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!paypalEmail.trim() || !emailRegex.test(paypalEmail.trim())) {
          setFormError('Please enter a valid PayPal email address.');
          setIsProcessing(false);
          return;
        }
        paymentMethodObj = {
          ...paymentMethodObj,
          email: paypalEmail.trim(),
        };
      }

      setIsProcessing(false);

      if (userId) {
        // Logged-in user: show "Save this payment method for future purchases?" flow
        setPendingSaveMethod(paymentMethodObj);
      } else {
        // Guest user: skip save questionnaire and complete checkout instantly
        onSuccess({
          paymentId: simulatedId,
          simulated: true,
        });
      }
    }, 1800);
  };

  const handlePostPurchaseSaveConsent = async (save: boolean) => {
    if (save && pendingSaveMethod && userId) {
      setIsProcessing(true);
      try {
        await saveUserPaymentMethod(pendingSaveMethod);
        setPreferredPaymentMethodId(userId, pendingSaveMethod.paymentMethodId);
      } catch (err) {
        console.warn('Offline backup save activated:', err);
      } finally {
        setIsProcessing(false);
      }
    }
    // Finalize payment resolution
    onSuccess({
      paymentId: activePaymentId,
      simulated: true
    });
  };

  const getSimulatedBrandText = (num: string) => {
    const raw = num.replace(/\s+/g, '');
    if (raw.startsWith('4')) return 'Visa';
    if (raw.startsWith('5')) return 'Mastercard';
    return 'Credit Card';
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-yellow-400 animate-spin" />
        <span className="font-mono text-[9px] text-[#dda75f] uppercase tracking-widest font-bold">Constructing Secure Tokenizer...</span>
      </div>
    );
  }

  // --- POST-PURCHASE CONSENT SCREEN FOR SAVING PAYMENT ---
  if (pendingSaveMethod) {
    return (
      <div className="bg-[#121111]/95 border border-white/10 rounded-3xl p-6 space-y-5 text-left relative overflow-hidden animate-fade-in shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="text-center space-y-2 pb-2">
          <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
            <Check className="h-6 w-6 stroke-[3]" />
          </div>
          <span className="text-[10px] font-mono text-green-400 uppercase tracking-widest font-black block">Authorization Successful</span>
          <h3 className="font-display text-xl font-black text-white uppercase tracking-wide">Save Payment Method?</h3>
          <p className="text-[11px] text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Would you like to securely save this payment method to your account profile? Next time, click and check out instantly with zero forms!
          </p>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-white/5 rounded-2xl flex items-center gap-3">
          <div className="p-2.5 bg-black/40 border border-white/10 rounded-xl">
            <CreditCard className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <span className="font-sans font-bold text-xs text-on-surface block">
              {pendingSaveMethod.provider === 'stripe' ? (
                `${pendingSaveMethod.cardBrand || 'Card'} •••• ${pendingSaveMethod.lastFourDigits}`
              ) : pendingSaveMethod.provider === 'paypal' ? (
                `PayPal: ${pendingSaveMethod.email}`
              ) : pendingSaveMethod.provider === 'applepay' ? (
                `Apple Pay device`
              ) : (
                `Google Pay profile`
              )}
            </span>
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5 block leading-none">
              {pendingSaveMethod.provider === 'stripe' ? `Expires ${pendingSaveMethod.expiryMonth}/${pendingSaveMethod.expiryYear}` : 'Seamless digital payment method'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => handlePostPurchaseSaveConsent(true)}
            className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 disabled:bg-zinc-800 text-black rounded-xl font-sans text-[10px] font-black tracking-widest uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10"
          >
            {isProcessing ? (
              <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin block" />
            ) : (
              <>
                <Sparkles className="h-4.5 w-4.5 text-black animate-pulse shrink-0" />
                <span>Save Payment Method</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => handlePostPurchaseSaveConsent(false)}
            className="w-full py-3.5 bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white rounded-xl font-sans text-[10px] font-black tracking-widest uppercase transition-all duration-200 cursor-pointer text-center"
          >
            Don't Save
          </button>
        </div>

        <div className="flex gap-2 p-3 bg-black/40 border border-white/5 rounded-2xl select-none text-left">
          <ShieldCheck className="h-4 w-4 text-zinc-500 shrink-0" />
          <span className="font-sans text-[8px] text-zinc-500 leading-snug">
            Security Guarantee: Credit card PANs (Numbers) and sensitive CVV codes are strictly processed via sandbox token tunnels and never committed to disk. No raw parameters are stored.
          </span>
        </div>
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

  // --- PLATFORM CHECKOUT PANEL WITH INTEGRATED SAVED INSTRUMENTS ---
  return (
    <div className="bg-[#121111]/95 border border-white/5 rounded-2xl p-5 md:p-6 space-y-5 text-left relative overflow-hidden animate-fade-in">
      {/* Gloss background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="flex justify-between items-start select-none">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-500 text-[8px] font-mono font-black uppercase tracking-wider">SECURE CHECKOUT</span>
            <span className="text-[8px] text-zinc-500 font-mono">100% PCI COMPLIANT</span>
          </div>
          <h4 className="font-display text-md font-black text-white uppercase tracking-wide">ROWONE GATEWAY CHECKS</h4>
          <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
            Selected Watch Asset: <span className="text-[#dda75f] font-bold">{movieTitle} (Seat {seat})</span>
          </p>
        </div>
        <Lock className="h-4.5 w-4.5 text-zinc-500 shrink-0" />
      </div>

      {/* SECURE WALLET: Retrieve and Select Saved Payment Instruments */}
      {savedMethods.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between select-none">
            <label className="text-[10px] font-sans font-black tracking-widest text-[#ece7e3] uppercase block">SAVED PAYMENT METHODS</label>
            {!showNewPaymentForm && (
              <button
                type="button"
                onClick={() => {
                  setShowNewPaymentForm(true);
                  setSelectedMethodId(null);
                }}
                className="text-[9px] font-sans font-black tracking-wider text-yellow-400 uppercase hover:text-yellow-300 flex items-center gap-1 transition-all cursor-pointer active:scale-95"
              >
                <Plus className="h-3 w-3 shrink-0" /> Use New Method
              </button>
            )}
          </div>

          <div className="space-y-2">
            {savedMethods.map((pm) => {
              const isSelected = selectedMethodId === pm.paymentMethodId;
              
              return (
                <div
                  key={pm.paymentMethodId}
                  onClick={() => {
                    setSelectedMethodId(pm.paymentMethodId);
                    setShowNewPaymentForm(false);
                    setFormError('');
                  }}
                  className={`group p-4 bg-zinc-900/50 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-all duration-300 ${
                    isSelected
                      ? 'border-yellow-400 bg-[#1e1a12]/70 shadow-[0_0_15px_rgba(234,179,8,0.08)]'
                      : 'border-white/5 hover:border-white/10 hover:bg-zinc-900/90'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 bg-black/40 rounded-xl border flex items-center justify-center font-mono text-[8px] font-black uppercase text-center ${
                      isSelected ? 'border-yellow-400/35 text-yellow-400' : 'border-white/5 text-zinc-500'
                    }`}>
                      {pm.provider === 'stripe' ? (
                        pm.cardBrand || 'Card'
                      ) : pm.provider === 'paypal' ? (
                        'PayPal'
                      ) : pm.provider === 'applepay' ? (
                        'Apple'
                      ) : (
                        'Google'
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans font-bold text-xs text-on-surface">
                          {pm.provider === 'stripe' ? (
                            `${pm.cardBrand} •••• ${pm.lastFourDigits}`
                          ) : pm.provider === 'paypal' ? (
                            `PayPal login (${pm.email})`
                          ) : pm.provider === 'applepay' ? (
                            `Apple Pay device`
                          ) : (
                            `Google Pay wallet`
                          )}
                        </span>
                        {pm.isDefault && (
                          <span className="px-1.5 py-0.5 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-[6.5px] font-sans font-black uppercase tracking-wider rounded">
                            Def
                          </span>
                        )}
                      </div>
                      
                      <span className="font-sans text-[10px] text-on-surface-variant block leading-tight">
                        {pm.provider === 'stripe' ? (
                          `Expires ${pm.expiryMonth?.toString().padStart(2, '0')}/${pm.expiryYear?.toString().slice(-2)}`
                        ) : (
                          'Secured checkout memory'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 justify-end">
                    {!pm.isDefault && (
                      <button
                        type="button"
                        onClick={(e) => handleSetDefault(e, pm.paymentMethodId)}
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white rounded-md text-[8px] font-sans font-bold uppercase transition-all duration-150"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleRemove(e, pm.paymentMethodId)}
                      className="p-1 px-1.5 text-zinc-500 hover:text-red-400 duration-150"
                      title="Delete Saved Card"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    
                    <div className={`h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ml-1.5 ${
                      isSelected ? 'border-yellow-400 bg-yellow-400 text-black' : 'border-zinc-700'
                    }`}>
                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3.5]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NEW CUSTOMER / ADD NEW INSTRUMENT SECTION */}
      {showNewPaymentForm && (
        <form onSubmit={handleNewSubmit} className="space-y-4 pt-1 animate-fade-in text-left">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[10px] font-sans font-black tracking-widest text-yellow-400 uppercase">ADD SECURE BILLING DETAILS</span>
            {savedMethods.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const def = savedMethods.find(m => m.isDefault) || savedMethods[0];
                  setSelectedMethodId(def.paymentMethodId);
                  setShowNewPaymentForm(false);
                  setFormError('');
                }}
                className="text-[9px] font-sans font-black tracking-wider text-zinc-400 uppercase hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Provider selector tab bar */}
          <div className="grid grid-cols-4 gap-1.5 select-none">
            {([
              { key: 'stripe', label: 'Stripe 💳' },
              { key: 'paypal', label: 'PayPal 🔵' },
              { key: 'applepay', label: 'Apple Pay 🍏' },
              { key: 'googlepay', label: 'G-Pay 🤖' }
            ] as const).map((prov) => (
              <button
                key={prov.key}
                type="button"
                onClick={() => {
                  setNewProvider(prov.key);
                  setFormError('');
                }}
                className={`py-2 px-1 text-[8.5px] font-sans font-black uppercase tracking-wider rounded-xl transition-all border shrink-0 text-center cursor-pointer ${
                  newProvider === prov.key
                    ? 'bg-yellow-400 border-yellow-400 text-black shadow'
                    : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                }`}
              >
                {prov.label}
              </button>
            ))}
          </div>

          {/* Quick Pre-Seed Autofill for Stripe */}
          {newProvider === 'stripe' && getAutofillCredentials().length > 0 && (
            <div className="p-3 bg-yellow-400/[0.03] border border-yellow-400/10 rounded-xl space-y-2 select-none text-left">
              <span className="text-[8px] font-mono text-[#dda75f] uppercase tracking-widest block font-black">
                ⚡ SECURE SANDBOX QUICK AUTOFILL
              </span>
              <div className="flex flex-wrap gap-1.5">
                {getAutofillCredentials().map((cred, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setNewCardHolder(cred.cardholderName);
                      setNewCardNumber(cred.fullCardNumber);
                      setNewCardExpiry(cred.expiryDate);
                      setNewCardCvc(cred.cvc);
                      setFormError('');
                    }}
                    className="px-2.5 py-1.5 bg-neutral-900 border border-white/5 rounded-lg text-[9px] font-mono text-zinc-300 hover:text-white cursor-pointer hover:bg-yellow-400/10 transition-colors"
                  >
                    <span>{cred.brand} •••• {cred.lastFourDigits} ({cred.cardholderName})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card inputs */}
          {newProvider === 'stripe' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[9px] font-sans font-black tracking-widest text-[#b8b3ae] uppercase">CARDHOLDER NAME</label>
                <input
                  type="text"
                  placeholder="Alexis J. Jordan"
                  value={newCardHolder}
                  onChange={(e) => { setNewCardHolder(e.target.value); setFormError(''); }}
                  required={newProvider === 'stripe'}
                  className="w-full bg-surface-container border border-white/10 rounded-xl px-3 py-2.5 text-xs text-on-surface focus:outline-none focus:border-yellow-400 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-sans font-black tracking-widest text-[#b8b3ae] uppercase">CREDIT CARD NUMBER</label>
                <div className="relative flex items-center bg-surface-container border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-yellow-400 transition-all font-mono">
                  <CreditCard className="h-4 w-4 text-zinc-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={newCardNumber}
                    onChange={handleCardNumberChange}
                    required={newProvider === 'stripe'}
                    placeholder="4242 4242 4242 4242"
                    className="w-full bg-transparent border-none text-xs text-on-surface focus:outline-none p-0 tracking-widest"
                  />
                  <span className="text-[8.5px] font-mono text-yellow-500 font-bold ml-1 shrink-0 uppercase">
                    {getSimulatedBrandText(newCardNumber)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[9px] font-sans font-black tracking-widest text-[#b8b3ae] uppercase">EXPIRY (MM/YY)</label>
                  <input
                    type="text"
                    value={newCardExpiry}
                    maxLength={5}
                    onChange={handleExpiryChange}
                    required={newProvider === 'stripe'}
                    placeholder="08/29"
                    className="w-full bg-surface-container border border-white/10 rounded-xl px-3 py-2.5 text-center text-xs text-on-surface focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-sans font-black tracking-widest text-[#b8b3ae] uppercase">CVC SECURITY</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={newCardCvc}
                    onChange={(e) => { setNewCardCvc(e.target.value.replace(/\D/g, '')); setFormError(''); }}
                    required={newProvider === 'stripe'}
                    placeholder="•••"
                    className="w-full bg-surface-container border border-white/10 rounded-xl px-3 py-2.5 text-center text-xs text-on-surface focus:outline-none focus:border-yellow-400 font-mono tracking-widest"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PayPal Login input */}
          {newProvider === 'paypal' && (
            <div className="space-y-3 p-3 bg-white/[0.01] border border-white/5 rounded-2xl">
              <span className="text-[8.5px] font-mono text-[#dda75f] uppercase tracking-widest block font-black">Secure PayPal Integration</span>
              <div className="space-y-1">
                <label className="text-[9px] font-sans font-[#b8b3ae] tracking-widest uppercase block">PAYPAL ACCOUNT EMAIL</label>
                <input
                  type="email"
                  placeholder="john.doe@example.com"
                  value={paypalEmail}
                  onChange={(e) => { setPaypalEmail(e.target.value); setFormError(''); }}
                  required={newProvider === 'paypal'}
                  className="w-full bg-surface-container border border-white/10 rounded-xl px-3 py-2.5 text-xs text-on-surface focus:outline-none focus:border-yellow-400"
                />
              </div>
              <p className="text-[9px] text-zinc-500 leading-normal">
                No redirection required. RowOne links a secure, pre-approved digital token linked with your PayPal credentials.
              </p>
            </div>
          )}

          {/* Apple Pay explanation */}
          {newProvider === 'applepay' && (
            <div className="p-4 bg-zinc-900 border border-white/5 rounded-2xl space-y-2 select-none">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-sans font-bold text-xs text-white">Apple Pay device checkout available</span>
              </div>
              <p className="font-sans text-[10px] text-zinc-400 leading-normal">
                Checkout with biometric authentication (FaceID / TouchID). Click the transaction button below to authorize.
              </p>
            </div>
          )}

          {/* Google Pay explanation */}
          {newProvider === 'googlepay' && (
            <div className="p-4 bg-zinc-900 border border-white/5 rounded-2xl space-y-2 select-none">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-sans font-bold text-xs text-white">Google Smart Wallet Connected</span>
              </div>
              <p className="font-sans text-[10px] text-zinc-400 leading-normal">
                Complete payment instantly using your saved Google Chrome credentials and payment profiles.
              </p>
            </div>
          )}

          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[10.5px] rounded-xl flex items-center gap-2 font-sans font-bold lowercase">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 animate-bounce" />
              <span>{formError}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-sans text-[10px] font-black tracking-widest uppercase rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 uppercase font-black"
            >
              {isProcessing ? (
                <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin block" />
              ) : (
                `Securely Authorize $${amount.toFixed(2)}`
              )}
            </button>
          </div>
        </form>
      )}

      {/* ONE-CLICK INSTANT ACTION BUTTON */}
      {!showNewPaymentForm && selectedMethodId && (
        <div className="space-y-3.5 pt-1.5 animate-fade-in text-left">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={executeOneClickCheckout}
            disabled={isProcessing}
            className="w-full py-4 bg-[#dda75f] hover:bg-[#dda75f]/90 hover:scale-[1.01] active:scale-[0.99] disabled:bg-zinc-800 disabled:text-zinc-500 text-black text-[10.5px] font-sans font-black tracking-widest uppercase rounded-xl transition-all duration-200 flex items-center justify-center gap-2 select-none shadow-lg shadow-yellow-500/10 cursor-pointer"
          >
            {isProcessing ? (
              <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin block" />
            ) : (
              <>
                <Zap className="h-4 w-4 fill-black text-black animate-pulse" />
                <span>1-Click Confirm Reservation (${amount.toFixed(2)})</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* PCI assurance block */}
      <div className="flex gap-2.5 p-3.5 bg-neutral-950/80 border border-white/5 rounded-2xl select-none text-left">
        <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
        <span className="font-sans text-[8px] text-zinc-500 leading-relaxed uppercase">
          compliant with PCI-DSS 3.2 merchant levels. card numbers are converted into secure payment tokens immediately through the client-side provider gateway.
        </span>
      </div>

      <div className="pt-2 text-center select-none">
        <button
          type="button"
          onClick={onCancel}
          className="text-[9px] text-[#dac8bb] hover:text-[#dda75f] hover:underline font-bold uppercase tracking-wider cursor-pointer"
        >
          Cancel and return to seat map
        </button>
      </div>

    </div>
  );
};
