/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Lock, Unlock, Eye, HelpCircle, Check, Key, Crown, Sparkles, 
  CreditCard, Receipt, Wallet, Plus, Trash2, ArrowRightLeft, Gift, 
  AlertTriangle, CloudDownload, Calendar, User, Zap, Star, X, Info,
  LogOut
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { getRatingBadgeText } from '../types';

interface SettingsViewProps {
  isLoggedIn: boolean;
  username: string;
  userAge: number | null;
  dobString: string;
  parentMaxRating: string;
  isParentalModeActive: boolean;
  onUpdateParentalControls: (isActive: boolean, maxRating: string) => void;
  onTriggerAuth: () => void;
  isPopcornPass: boolean;
  onTriggerUpgrade: () => void;
  isDyslexiaFontActive: boolean;
  onUpdateDyslexiaFont: (active: boolean) => void;
  isQuietModeActive: boolean;
  onUpdateQuietMode: (active: boolean) => void;
  disableReactionsAndAnimations: boolean;
  onUpdateDisableReactionsAndAnimations: (active: boolean) => void;
  isCinemaAmbientSoundActive?: boolean;
  onUpdateCinemaAmbientSound?: (active: boolean) => void;
  onTriggerSupport?: () => void;
  onTriggerEditProfile?: () => void;
  onSignOut?: () => void;

  // Payments / subscriptions extension props
  walletBalance?: number;
  onUpdateWalletBalance?: (val: number) => void;
  savedCards?: any[];
  onUpdateSavedCards?: (cards: any[]) => void;
  billingTransactions?: any[];
  onUpdateBillingTransactions?: (txs: any[]) => void;
  onToggleSubscription?: (isActive: boolean) => void;

  // Dual Registration workspace parameters
  hasStudioAccount?: boolean;
  onRegisterStudioClick?: () => void;
  activeMode?: 'individual' | 'studio';
  onToggleActiveMode?: (mode: 'individual' | 'studio') => void;
}

export default function SettingsView({
  isLoggedIn,
  username,
  userAge,
  dobString,
  parentMaxRating,
  isParentalModeActive,
  onUpdateParentalControls,
  onTriggerAuth,
  isPopcornPass,
  onTriggerUpgrade,
  isDyslexiaFontActive,
  onUpdateDyslexiaFont,
  isQuietModeActive,
  onUpdateQuietMode,
  disableReactionsAndAnimations,
  onUpdateDisableReactionsAndAnimations,
  isCinemaAmbientSoundActive = false,
  onUpdateCinemaAmbientSound,
  onTriggerSupport,
  onTriggerEditProfile,
  onSignOut,

  // Payment system handlers passed from App.tsx
  walletBalance,
  onUpdateWalletBalance,
  savedCards,
  onUpdateSavedCards,
  billingTransactions,
  onUpdateBillingTransactions,
  onToggleSubscription,

  // Dual Registration overrides
  hasStudioAccount = false,
  onRegisterStudioClick,
  activeMode = 'individual',
  onToggleActiveMode,
}: SettingsViewProps) {
  const [activeTab, setActiveTabState] = useState<'profile' | 'billing'>('profile');

  const setActiveTab = (tab: 'profile' | 'billing') => {
    setActiveTabState(tab);
    try {
      const url = new URL(window.location.href);
      url.pathname = `/settings/${tab}`;
      window.history.pushState({}, '', url.pathname + url.search);
    } catch (e) {
      console.warn('Url push failed:', e);
    }
  };

  useEffect(() => {
    const syncSettingsTab = () => {
      try {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/billing')) {
          setActiveTabState('billing');
        } else {
          setActiveTabState('profile');
        }
      } catch (e) {
        console.warn('Sync settings tab failed:', e);
      }
    };
    syncSettingsTab();
    window.addEventListener('popstate', syncSettingsTab);
    return () => window.removeEventListener('popstate', syncSettingsTab);
  }, []);
  const [isSettingMode, setIsSettingMode] = useState(isParentalModeActive);
  const [selectedRating, setSelectedRating] = useState(parentMaxRating);
  
  // Parental Lock Security PIN Flow
  const [pinInput, setPinInput] = useState('');
  const [definedPin, setDefinedPin] = useState('1111'); // default mock PIN
  const [isLockedMessage, setIsLockedMessage] = useState(true);
  const [pinError, setPinError] = useState('');

  // Fallback states if props are not supplied (master robust pattern)
  const [localWalletBalance, setLocalWalletBalance] = useState<number>(() => {
    const stored = localStorage.getItem('popcorn_wallet_balance');
    return stored ? parseFloat(stored) : 10.00;
  });

  const [localSavedCards, setLocalSavedCards] = useState<any[]>(() => {
    const stored = localStorage.getItem('popcorn_saved_cards');
    if (stored) {
      try { return JSON.parse(stored); } catch {}
    }
    return [
      { id: 'card-1', brand: 'visa', last4: '4242', expiry: '12/28', cardholderName: 'Kwasidanso Danso', isDefault: true },
      { id: 'card-2', brand: 'mastercard', last4: '8812', expiry: '08/27', cardholderName: 'Kwasidanso Danso', isDefault: false }
    ];
  });

  const [localTransactions, setLocalTransactions] = useState<any[]>(() => {
    const stored = localStorage.getItem('popcorn_billing_transactions');
    if (stored) {
      try { return JSON.parse(stored); } catch {}
    }
    return [
      { 
        id: 'TX-492019', 
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), 
        description: 'Monthly ROWONE Pass Sub', 
        amount: 14.99, 
        type: 'subscription', 
        paymentMethod: 'Visa •••• 4242', 
        status: 'success' 
      },
      { 
        id: 'TX-104928', 
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), 
        description: 'Wallet Top-up ($25.00 Packet)', 
        amount: 25.00, 
        type: 'topup', 
        paymentMethod: 'Mastercard •••• 8812', 
        status: 'success' 
      }
    ];
  });

  // Dual binding state resolvers
  const currentBalance = walletBalance !== undefined ? walletBalance : localWalletBalance;
  const currentCards = savedCards !== undefined ? savedCards : localSavedCards;
  const currentTxs = billingTransactions !== undefined ? billingTransactions : localTransactions;

  const updateBalance = (newVal: number) => {
    if (onUpdateWalletBalance) {
      onUpdateWalletBalance(newVal);
    } else {
      setLocalWalletBalance(newVal);
      localStorage.setItem('popcorn_wallet_balance', String(newVal));
    }
  };

  const updateCards = (newVal: any[]) => {
    if (onUpdateSavedCards) {
      onUpdateSavedCards(newVal);
    } else {
      setLocalSavedCards(newVal);
      localStorage.setItem('popcorn_saved_cards', JSON.stringify(newVal));
    }
  };

  const updateTxs = (newVal: any[]) => {
    if (onUpdateBillingTransactions) {
      onUpdateBillingTransactions(newVal);
    } else {
      setLocalTransactions(newVal);
      localStorage.setItem('popcorn_billing_transactions', JSON.stringify(newVal));
    }
  };

  // State management for adding a new card UI
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newCardCvc, setNewCardCvc] = useState('');
  const [newCardHolder, setNewCardHolder] = useState('');
  const [isAddingCardLoader, setIsAddingCardLoader] = useState(false);
  const [cardFormError, setCardFormError] = useState('');

  // State for top-up animation
  const [isToppingUp, setIsToppingUp] = useState<string | null>(null);

  // Promo code system state
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Invoice visual state target
  const [showInvoiceReceipt, setShowInvoiceReceipt] = useState<any | null>(null);

  // Billing automation handlers & states
  const [isAutoRenewActive, setIsAutoRenewActive] = useState<boolean>(() => {
    const stored = localStorage.getItem('popcorn_auto_renew_active');
    return stored === null ? true : stored === 'true';
  });

  // Subscription Tier management
  const [activeTier, setActiveTier] = useState<'spectator' | 'gold_premium' | 'vip_platinum'>(() => {
    if (!isPopcornPass) return 'spectator';
    const stored = localStorage.getItem('subscription_tier');
    return (stored as 'gold_premium' | 'vip_platinum') || 'gold_premium';
  });

  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (!isPopcornPass) {
      setActiveTier('spectator');
    } else if (activeTier === 'spectator') {
      setActiveTier('gold_premium');
    }
  }, [isPopcornPass]);

  const handleToggleAutoRenew = () => {
    const nextVal = !isAutoRenewActive;
    setIsAutoRenewActive(nextVal);
    localStorage.setItem('popcorn_auto_renew_active', String(nextVal));
  };

  const generateInvoicePDF = (tx: any) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Dark top header banner (colors match slate theme: #191717)
      doc.setFillColor(25, 23, 23);
      doc.rect(0, 0, 210, 52, 'F');

      // Popcorn Red highlight line (#ff1a40 / 255, 26, 64)
      doc.setFillColor(255, 26, 64);
      doc.rect(0, 52, 210, 2.2, 'F');

      // Logo/Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('POPCORN CINEMA', 15, 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(180, 180, 180);
      doc.text('PREMIUM MOVIE WATCHROOMS & SOCIAL CINEMA', 15, 28);
      doc.text('SECURE BILLING TRANSACTION RECEIPT', 15, 33);
      doc.text('LOCAL CONTAINER PORT REF: 3000', 15, 38);

      // Gold-toned Official Invoice badge
      doc.setTextColor(245, 158, 11); // Amber/Gold #f59e0b
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('OFFICIAL INVOICE', 145, 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(220, 220, 220);
      doc.text(`INVOICE ID: ${tx.id || 'TX-100293'}`, 145, 28);
      doc.text(`DATE: ${tx.date}`, 145, 33);
      doc.text('STATUS: SETTLED / PAID', 145, 38);

      // Bill To & Vendor Coordinates
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('BILL TO:', 15, 70);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(70, 70, 70);
      doc.text(`Cinephile Rank: Verified Member`, 15, 76);
      doc.text(`Cardholder Name: ${username || 'Kwasidanso Danso'}`, 15, 81.5);
      doc.text(`Registered Birthday: ${dobString || 'January 15, 2000'} (Age: ${userAge ?? 26} Yrs)`, 15, 87);
      doc.text(`Payment Instrument: ${tx.paymentMethod}`, 15, 92.5);

      // Provider details
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('PROVIDER INFO:', 125, 70);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 70, 70);
      doc.text('ROWONE Cinema Streaming Inc.', 125, 76);
      doc.text('100 Motion Picture Lane, Floor 3', 125, 81.5);
      doc.text('Digital Hub Suite, Post C-3000', 125, 87);
      doc.text('billing@rowone.internal', 125, 92.5);

      // Drawing Table Header
      doc.setFillColor(243, 244, 246); // Warm grey background
      doc.rect(15, 106, 180, 10, 'F');
      
      doc.setDrawColor(209, 213, 219);
      doc.line(15, 106, 195, 106);
      doc.line(15, 116, 195, 116);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(9.5);
      doc.text('Description / Service Rendered', 18, 112);
      doc.text('Type', 105, 112);
      doc.text('Qty', 140, 112);
      doc.text('Price ($)', 158, 112);
      doc.text('Total ($)', 178, 112);

      // Table Row Data
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.setFontSize(9);
      doc.text(tx.description || 'Premium Streaming Access', 18, 123.5);
      doc.text(tx.type === 'subscription' ? 'Subscription Renewal' : 'Wallet Placement', 105, 123.5);
      doc.text('1', 142, 123.5);
      doc.text(Number(tx.amount).toFixed(2), 159, 123.5);
      doc.text(Number(tx.amount).toFixed(2), 179, 123.5);

      // Bottom boundary separator line
      doc.line(15, 131, 195, 131);

      // Calculations table box
      const balanceAmount = Number(tx.amount);
      const vatAmount = balanceAmount * 0.05; // 5% mock digital tax
      const totalSummary = balanceAmount + vatAmount;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      doc.text('Subtotal:', 140, 140);
      doc.text(`$${balanceAmount.toFixed(2)}`, 179, 140);

      doc.text('Regulatory Tax / VAT (5%):', 140, 146);
      doc.text(`$${vatAmount.toFixed(2)}`, 179, 146);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 26, 64); // Popcorn Red highlight
      doc.setFontSize(10.5);
      doc.text('Grand Total Paid:', 140, 154);
      doc.text(`$${totalSummary.toFixed(2)}`, 179, 154);

      // Informative Notes Block
      doc.setDrawColor(229, 231, 235);
      doc.setFillColor(249, 250, 251);
      doc.rect(15, 172, 180, 24, 'F');
      doc.rect(15, 172, 180, 24, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(8.5);
      doc.text('IMPORTANT CONDITIONS & NOTES:', 18, 177.5);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(7.5);
      doc.text('• Subscriptions auto-renew until termination. Cancel auto-renewal inside settings to prevent debit runs.', 18, 182.5);
      doc.text('• Wallet increments can be exchanged for cinema tickets and cannot be converted back to raw physical cash.', 18, 186.5);
      doc.text('• For billing queries, please click on "Cinephile Support" inside the application Settings portal anytime.', 18, 190.5);

      // Green cryptographically verified security seal stamp
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.rect(15, 208, 180, 30, 'F');
      doc.rect(15, 208, 180, 30, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74); // Green key
      doc.setFontSize(9.5);
      doc.text('✔ TRANSACTION VERIFIED SECURITY CRYPTO-SEAL', 20, 215.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      doc.text(`Audit Node: SSL-NODE-3000-LIVE`, 20, 221.5);
      doc.text(`Block Signature: SHA256/SEC-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${tx.id}-VERIFIED`, 20, 227);
      doc.text(`Sign Date: ${new Date().toUTCString()} | Environment: Production Live Sandbox`, 20, 232.5);

      // Bottom Footer divider
      doc.setDrawColor(243, 244, 246);
      doc.line(15, 258, 195, 258);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('ROWONE Cinema Platform — Handcrafted Cinephile Communities.', 15, 266);
      doc.text('System Port: 3000 Ingress Router. This PDF invoice acts as a legally cleared proof of purchase.', 15, 271);

      doc.save(`rowone-invoice-${tx.id || 'TX'}.pdf`);
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      alert('Error during client-side PDF generation: ' + err.message);
    }
  };

  const handleTopUp = (amount: number) => {
    setIsToppingUp(`TOP-${amount}`);
    setTimeout(() => {
      const newBalance = currentBalance + amount;
      updateBalance(newBalance);
      
      const newTx = {
        id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        description: `Wallet Top-up ($${amount.toFixed(2)} Cinephile Pack)`,
        amount: amount,
        type: 'topup',
        paymentMethod: currentCards[0] ? `${currentCards[0].brand === 'visa' ? 'Visa' : 'Mastercard'} •••• ${currentCards[0].last4}` : 'Wallet Fund',
        status: 'success'
      };
      
      updateTxs([newTx, ...currentTxs]);
      setIsToppingUp(null);
    }, 1200);
  };

  const handleUpgradePlan = (target: 'gold_premium' | 'vip_platinum') => {
    const cost = target === 'vip_platinum' ? 24.99 : 14.99;
    const isUpgradeFromGold = activeTier === 'gold_premium' && target === 'vip_platinum';
    
    const newTx = {
      id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      description: isUpgradeFromGold ? 'Plan Upgrade to ROWONE VIP Platinum' : `ROWONE ${target === 'vip_platinum' ? 'VIP Platinum' : 'Gold Premium'} Subscription Order`,
      amount: cost,
      type: 'subscription',
      paymentMethod: currentCards[0] ? `${currentCards[0].brand === 'visa' ? 'Visa' : 'Mastercard'} •••• ${currentCards[0].last4}` : 'Visa •••• 4242',
      status: 'success'
    };

    updateTxs([newTx, ...currentTxs]);
    setActiveTier(target);
    localStorage.setItem('subscription_tier', target);
    
    if (onToggleSubscription) {
      onToggleSubscription(true);
    }
    
    alert(`🎉 Successfully ${isUpgradeFromGold ? 'Upgraded' : 'Subscribed'}!\n\nYour plan has been updated to ROWONE ${target === 'vip_platinum' ? 'VIP Platinum' : 'Gold Premium'} ($${cost}/mo).\nEnjoy your new premium privileges!`);
  };

  const handleDowngradePlan = (target: 'gold_premium' | 'spectator') => {
    if (target === 'spectator') {
      setShowCancelModal(true);
    } else if (target === 'gold_premium' && activeTier === 'vip_platinum') {
      const newTx = {
        id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        description: 'Plan Downgrade to ROWONE Gold Premium',
        amount: 14.99,
        type: 'subscription',
        paymentMethod: currentCards[0] ? `${currentCards[0].brand === 'visa' ? 'Visa' : 'Mastercard'} •••• ${currentCards[0].last4}` : 'Visa •••• 4242',
        status: 'success'
      };

      updateTxs([newTx, ...currentTxs]);
      setActiveTier('gold_premium');
      localStorage.setItem('subscription_tier', 'gold_premium');
      alert(`📉 Plan Downgraded Successfully!\n\nYour active tier is now ROWONE Gold Premium ($14.99/mo). The price modification will apply beginning with your next renewal cycle.`);
    }
  };

  const handleConfirmCancellation = () => {
    const newTx = {
      id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      description: 'ROWONE Pass Subscription Cancellation',
      amount: 0.00,
      type: 'subscription',
      paymentMethod: 'N/A',
      status: 'success'
    };

    updateTxs([newTx, ...currentTxs]);
    setActiveTier('spectator');
    localStorage.removeItem('subscription_tier');
    
    if (onToggleSubscription) {
      onToggleSubscription(false);
    }
    
    setShowCancelModal(false);
    alert(`👋 ROWONE Pass Premium Cancelled.\n\nYour subscription has been cancelled and downgraded to standard Spectator (Free Tier). We're sad to see you go! You can reactivate at any time.`);
  };

  const handleSimulateRenewal = () => {
    if (!isPopcornPass) {
      alert("Please upgrade to standard ROWONE Pass Gold Premium first to test subscription renewal invoices!");
      return;
    }
    
    const newTx = {
      id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      description: 'Monthly ROWONE Pass Sub (Auto-Renewal)',
      amount: 14.99,
      type: 'subscription',
      paymentMethod: currentCards[0] ? `${currentCards[0].brand === 'visa' ? 'Visa' : 'Mastercard'} •••• ${currentCards[0].last4}` : 'Visa •••• 4242',
      status: 'success'
    };
    
    updateTxs([newTx, ...currentTxs]);
    alert("Simulation Success: A recurring subscription renewal of $14.99 has been authorized and charged. Your invoice is ready in the billing ledger!");
  };

  const handleAddNewCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardHolder || !newCardNumber || !newCardExpiry || !newCardCvc) {
      setCardFormError('Please fill in all credit card form particulars.');
      return;
    }
    
    const rawNumber = newCardNumber.replace(/\s/g, '');
    if (rawNumber.length < 15 || rawNumber.length > 16) {
      setCardFormError('Card number must be 15 or 16 valid digits.');
      return;
    }

    setIsAddingCardLoader(true);
    setCardFormError('');

    setTimeout(() => {
      const last4Digits = rawNumber.slice(-4);
      const isVisa = rawNumber.startsWith('4') || rawNumber.startsWith('5');
      
      const newCardObj = {
        id: `card-${Math.random().toString(36).substring(2, 9)}`,
        brand: isVisa ? 'visa' : 'mastercard',
        last4: last4Digits,
        expiry: newCardExpiry,
        cardholderName: newCardHolder,
        isDefault: currentCards.length === 0
      };

      updateCards([...currentCards, newCardObj]);
      
      // Cleanup
      setNewCardHolder('');
      setNewCardNumber('');
      setNewCardExpiry('');
      setNewCardCvc('');
      setShowAddCard(false);
      setIsAddingCardLoader(false);
    }, 1000);
  };

  const handleDeleteCard = (cardId: string) => {
    if (currentCards.length <= 1) {
      alert("Verification block: You should retain at least one default streaming payment card on your profile file.");
      return;
    }
    const filtered = currentCards.filter(c => c.id !== cardId);
    if (filtered.length > 0 && !filtered.some(c => c.isDefault)) {
      filtered[0].isDefault = true;
    }
    updateCards(filtered);
  };

  const availableRatings = ['U', 'PG', '12', '15', '18'];

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSettingMode && isLockedMessage) {
      setPinError('Please enter your 4-digit security PIN to unlock changes!');
      return;
    }
    
    onUpdateParentalControls(isSettingMode, selectedRating);
    setPinError('');
    // Showing success alert feedback
    const toastType = isSettingMode ? 'Activated' : 'Disabled';
    alert(`Success: Parental controls updated! Restriction level: ${isSettingMode ? selectedRating : 'None (Unfiltered)'}`);
  };

  const verifyPin = () => {
    if (pinInput === definedPin) {
      setIsLockedMessage(false);
      setPinError('');
    } else {
      setPinError('Incorrect security PIN code. Try default "1111"!');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 animate-fade-in max-w-md mx-auto">
        <div className="h-16 w-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-on-surface-variant">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2 select-none">
          <h2 className="font-display text-2xl font-bold text-on-surface">Settings Locked</h2>
          <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
            Please log in or register your verified date of birth profile first to manage settings and access executive locks.
          </p>
        </div>
        <button
          onClick={onTriggerAuth}
          className="px-6 py-3 rounded-xl bg-primary text-on-primary font-sans text-xs font-black tracking-widest uppercase hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer"
        >
          Verify Profile / Join App
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fade-in max-w-4xl mx-auto px-1 md:px-4">
      {/* Title Segment */}
      <section className="space-y-2 select-none">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/25 rounded-md text-primary text-[9px] font-black uppercase tracking-wider">
          <Shield className="h-3 w-3" />
          <span>Profile Safety &amp; Access Controls</span>
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-bold text-on-surface">
          Account Settings
        </h2>
        <p className="text-on-surface-variant font-sans text-xs md:text-sm max-w-lg lowercase">
          configure sensitive filter levels and audit age-gates linked to your security dates of birth.
        </p>
      </section>

      {/* Tabs System Bar */}
      <div className="flex border-b border-white/10 space-x-6 md:space-x-8 select-none">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-4 font-display text-xs md:text-sm font-black tracking-widest uppercase transition-all duration-300 relative cursor-pointer flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Profile Safety &amp; Access</span>
          {activeTab === 'profile' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-fade-in" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-4 font-display text-xs md:text-sm font-black tracking-widest uppercase transition-all duration-300 relative cursor-pointer flex items-center gap-2 ${
            activeTab === 'billing'
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Billing History &amp; Invoices</span>
          {activeTab === 'billing' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-fade-in" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Side: Profile Meta (4 cols) */}
        <div className="md:col-span-4 bg-surface-container-low border border-white/5 rounded-3xl p-6 space-y-6 shadow-md select-none">
          <div className="text-center space-y-4">
            <button
              type="button"
              onClick={onTriggerEditProfile}
              className="group/avatar relative focus:outline-none block mx-auto cursor-pointer"
              title="Click to edit profile"
            >
              <div className={`h-20 w-20 rounded-full overflow-hidden flex items-center justify-center font-display text-3xl font-black relative transition-all duration-300 group-hover/avatar:scale-105 group-hover/avatar:shadow-[0_0_20px_rgba(255,42,77,0.3)] ${
                isPopcornPass
                  ? 'border-4 border-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.4)] bg-[#191717]'
                  : 'bg-primary/15 border-2 border-primary/20 text-primary shadow-inner'
              }`}>
                {localStorage.getItem('popcorn_user_avatar') ? (
                  <img 
                    src={localStorage.getItem('popcorn_user_avatar') || ''} 
                    alt="Profile" 
                    className="w-full h-full object-cover transition-all duration-300 group-hover/avatar:brightness-75" 
                  />
                ) : (
                  <span className={isPopcornPass ? 'text-yellow-400 font-black' : 'text-primary font-black'}>
                    {username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
                
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200">
                  <span className="text-[8px] font-sans font-black tracking-widest text-[#f0ebe6] uppercase">EDIT</span>
                </div>

                {isPopcornPass && (
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[8px] font-sans font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-slate-950 shadow-md z-15">
                    PASS
                  </div>
                )}
              </div>
            </button>
            <div>
              <h3 className="font-display font-black text-on-surface uppercase text-md flex items-center justify-center gap-1.5">
                <span>@{username}</span>
                {isPopcornPass && <Crown className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
              </h3>
              <p className="font-sans text-[10px] text-primary font-bold tracking-widest uppercase mt-0.5">
                {isPopcornPass ? 'GOLD PREMIUM PASS' : 'Verified Cinephile'}
              </p>
            </div>
          </div>

          <hr className="border-white/5" />

          {/* DOB, Age, and Membership Metadata */}
          <div className="space-y-4 font-sans text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-on-surface-variant">Profile Birthday</span>
              <span className="text-on-surface font-semibold">{dobString || 'January 15, 2000'}</span>
            </div>
            
            <div className="flex justify-between items-center py-1">
              <span className="text-on-surface-variant">Computed Age</span>
              <span className="text-primary font-extrabold text-sm">{userAge ?? 26} Years Old</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-on-surface-variant">Access Status</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400 font-bold text-[9px] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span>Cleared 18+</span>
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-on-surface-variant">Membership</span>
              {isPopcornPass ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-400/15 border border-yellow-400/25 text-yellow-500 font-extrabold text-[9px] uppercase tracking-wider">
                  ROWONE Pass 👑
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-on-surface-variant font-bold text-[9px] uppercase tracking-wider">
                  Free Tier
                </span>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {!isPopcornPass ? (
                <button
                  type="button"
                  onClick={onTriggerUpgrade}
                  className="w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 font-sans text-[10px] font-black tracking-widest uppercase text-black rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/15 transition-all duration-300 active:scale-95"
                >
                  <Crown className="h-3.5 w-3.5 fill-black" />
                  <span>Get ROWONE Pass</span>
                </button>
              ) : (
                <div className="p-3 bg-[#11100f] border border-yellow-400/10 rounded-xl text-center select-none">
                  <span className="font-sans text-[8px] font-black tracking-wider uppercase text-yellow-400 flex items-center justify-center gap-1">
                    <Sparkles className="h-3 w-3 fill-yellow-400" />
                    <span>👑 UNLIMITED ACCESS</span>
                  </span>
                  <p className="font-sans text-[8px] text-on-surface-variant mt-1 lowercase leading-snug">enjoy zero restrictions &amp; cheap tickets</p>
                </div>
              )}

              {onTriggerSupport && (
                <button
                  type="button"
                  onClick={onTriggerSupport}
                  className="w-full py-2.5 bg-gradient-to-r from-[#ff1a40]/10 to-[#ff1a40]/25 hover:from-[#ff1a40]/20 hover:to-[#ff1a40]/30 text-white font-sans text-[9px] font-black tracking-widest uppercase rounded-xl border border-[#ff1a40]/20 hover:border-[#ff1a40]/40 cursor-pointer flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-95 shadow-md shadow-pink-500/5"
                >
                  <HelpCircle className="h-4 w-4 text-[#ff1a40]" />
                  <span>Cinephile Support</span>
                </button>
              )}

              {isLoggedIn && onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full py-2.5 bg-white/5 hover:bg-red-500/15 text-on-surface-variant hover:text-red-400 font-sans text-[9px] font-black tracking-widest uppercase rounded-xl border border-white/5 hover:border-red-500/35 cursor-pointer flex items-center justify-center gap-1.5 transition-all duration-300 active:scale-95 shadow-md"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Panels based on activeTab */}
        {activeTab === 'profile' ? (
          <>
            {/* Right Side Column: Studio Portal & Parental Locks (8 cols) */}
            <div className="md:col-span-8 space-y-8">

              {/* STUDIO SERVICE REGISTRY PANEL */}
              {isLoggedIn && (
                <div id="studio-syndicate-portal" className="bg-[#111111]/90 border border-[#dda75f]/25 rounded-3xl p-6 md:p-8 space-y-4 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-32 w-32 bg-[#dda75f]/5 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 text-left">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#dda75f]/10 border border-[#dda75f]/30 rounded-full text-[#dda75f] text-[9px] font-black uppercase tracking-widest select-none">
                        <span>🎬 Studio Distributor Portal</span>
                      </div>
                      <h3 className="font-display font-extrabold text-[#dda75f] text-md uppercase tracking-wide">
                        RowOne Film Syndicate
                      </h3>
                      <p className="font-sans text-[11.5px] text-gray-400 leading-normal max-w-sm lowercase">
                        deploy customized screenings inside live grand theater lounges, publish tickers, and upload high-fidelity movie materials.
                      </p>
                    </div>

                    {!hasStudioAccount ? (
                      <button
                        id="reg-studio-btn"
                        type="button"
                        onClick={onRegisterStudioClick}
                        className="py-3 px-5 bg-[#dda75f] hover:bg-amber-500 text-slate-950 font-sans text-[10px] font-black tracking-widest uppercase rounded-xl cursor-pointer shadow-lg shadow-amber-500/10 transition-all active:scale-95 text-center shrink-0"
                      >
                        Register Studio ($49.99)
                      </button>
                    ) : (
                      <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[9px] uppercase tracking-wider select-none">
                          <Check className="h-3.5 w-3.5" />
                          <span>Distributor Verified</span>
                        </span>
                        
                        {onToggleActiveMode && (
                          <div id="mode-switcher-segmented" className="flex bg-white/5 rounded-xl p-1 border border-white/5 select-none text-[9px] font-bold uppercase w-full">
                            <button
                              id="view-mode-tab"
                              type="button"
                              onClick={() => onToggleActiveMode('individual')}
                              className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                                activeMode === 'individual'
                                  ? 'bg-primary text-white shadow-md'
                                  : 'text-gray-400 hover:text-white'
                              }`}
                            >
                              Viewer Mode
                            </button>
                            <button
                              id="studio-mode-tab"
                              type="button"
                              onClick={() => onToggleActiveMode('studio')}
                              className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                                activeMode === 'studio'
                                  ? 'bg-amber-500 text-black shadow-md'
                                  : 'text-gray-400 hover:text-white'
                              }`}
                            >
                              Studio Mode
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Parental Controls Form Card Wrapper */}
              <div className="bg-surface-container-low border border-white/5 rounded-3xl p-6 md:p-8 space-y-8 shadow-md">
          <div className="space-y-1">
            <h3 className="font-display font-extrabold text-[#edf3e3] text-lg uppercase tracking-wide flex items-center gap-2 select-none">
              <Lock className="h-5 w-5 text-primary" />
              <span>Parental Locks Override</span>
            </h3>
            <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed">
              Restrict layout lists and streaming rooms. Set a maximum visible content rating for family members sharing this account.
            </p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-6">
            
            {/* Active Toggle Switch */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between transition-all select-none col-span-1">
              <div className="flex gap-2.5 items-center">
                <Shield className={`h-5 w-5 ${isSettingMode ? 'text-primary animate-pulse' : 'text-on-surface-variant'}`} />
                <div>
                  <h5 className="font-sans font-black text-[10px] tracking-wider text-on-surface uppercase leading-none">Enable Maximum Filter Restriction</h5>
                  <p className="font-sans text-[9px] text-on-surface-variant mt-1 max-w-sm lowercase">locks movie detail views and rooms rated above chosen threshold.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const targetState = !isSettingMode;
                  setIsSettingMode(targetState);
                  if (targetState) {
                    setIsLockedMessage(true);
                  }
                }}
                className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-all duration-300 cursor-pointer ${
                  isSettingMode ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'
                }`}
              >
                <span className={`h-5 w-5 rounded-full shadow-md transform transition-all duration-300 ${
                  isSettingMode ? 'bg-black' : 'bg-on-surface-variant'
                }`} />
              </button>
            </div>

            {isSettingMode && (
              <div className="space-y-6 p-5 bg-[#141313] border border-white/5 rounded-2xl animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-2xl rounded-full pointer-events-none" />
                
                {/* Security Code unlock first */}
                {isLockedMessage ? (
                  <div className="space-y-3.5 select-none text-center py-4">
                    <Key className="h-8 w-8 text-secondary mx-auto mb-1 animate-bounce" />
                    <div>
                      <h4 className="font-sans font-bold text-xs uppercase text-on-surface tracking-wider">PIN Verification Guard</h4>
                      <p className="font-sans text-[10px] text-on-surface-variant leading-relaxed mt-1">To update filters, enter the parent security PIN (default: <span className="text-secondary font-mono font-black border-b border-dashed border-secondary/55">1111</span>)</p>
                    </div>
                    <div className="flex gap-2 justify-center max-w-[210px] mx-auto pt-2">
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="PIN Code"
                        value={pinInput}
                        onChange={(e) => {
                          setPinInput(e.target.value);
                          setPinError('');
                        }}
                        className="w-24 bg-surface-container border border-outline-variant/40 rounded-xl px-3 py-2 text-center text-xs tracking-widest text-[#ffe29c] font-mono focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={verifyPin}
                        className="px-4 py-2 bg-secondary text-black text-[10px] font-sans font-black tracking-widest uppercase rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                      >
                        Unlock
                      </button>
                    </div>
                    {pinError && (
                      <p className="text-[10px] font-sans text-red-400 font-bold uppercase">{pinError}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center select-none">
                      <div className="flex items-center gap-1.5 text-[10px] text-secondary font-black tracking-widest uppercase">
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Filter Configuration Unlocked</span>
                      </div>
                      <span className="text-[9px] font-mono bg-white/5 text-on-surface-variant px-2 py-0.5 rounded">Security PIN Valid</span>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-[9px] font-sans font-black tracking-widest text-on-surface-variant uppercase block">Select Maximum Allowed Content Rating</label>
                      
                      <div className="grid grid-cols-5 gap-2 pt-1.5">
                        {availableRatings.map((rating) => {
                          const isSel = selectedRating === rating;
                          const ratingLabel = rating === 'U' ? 'G/U' : rating;
                          
                          // Custom colors for rating buttons
                          const ratingColors: Record<string, string> = {
                            'U': 'hover:border-emerald-500/50',
                            'PG': 'hover:border-cyan-500/50',
                            '12': 'hover:border-amber-500/50',
                            '15': 'hover:border-orange-500/50',
                            '18': 'hover:border-red-500/50',
                          };

                          const activeColors: Record<string, string> = {
                            'U': 'bg-emerald-500 text-black border-emerald-400 font-black shadow-[0_0_12px_rgba(16,185,129,0.3)]',
                            'PG': 'bg-cyan-500 text-black border-cyan-400 font-black shadow-[0_0_12px_rgba(6,182,212,0.3)]',
                            '12': 'bg-amber-500 text-black border-amber-400 font-black shadow-[0_0_12px_rgba(245,158,11,0.3)]',
                            '15': 'bg-orange-500 text-black border-orange-400 font-black shadow-[0_0_12px_rgba(249,115,22,0.3)]',
                            '18': 'bg-red-500 text-black border-red-400 font-black shadow-[0_0_12px_rgba(239,68,68,0.3)]',
                          };

                          return (
                            <button
                              key={rating}
                              type="button"
                              onClick={() => setSelectedRating(rating)}
                              className={`py-3 rounded-xl border text-xs font-mono tracking-widest font-black uppercase transition-all duration-300 cursor-pointer ${
                                isSel
                                  ? activeColors[rating]
                                  : `bg-surface-container border-white/5 text-on-surface-variant ${ratingColors[rating]}`
                              }`}
                            >
                              {ratingLabel}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Explanatory notes */}
                      <p className="text-[9px] text-[#dac8bb] font-sans leading-relaxed pt-2.5 flex items-start gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5 shrink-0 text-secondary" />
                        <span>
                          Choosing standard <span className="font-bold uppercase text-primary">PG</span> limits display layout content tags strictly to U (G) &amp; PG. Clear 12, 15, and 18 titles/rooms will be blurred and access-locked.
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-sans text-xs font-black tracking-widest uppercase transition-all shadow-lg shadow-primary/25 cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="h-4 w-4" />
              <span>Apply Restriction Guidelines</span>
            </button>
            
          </form>
        </div>
      </div>

        {/* Universal Accessibility Controls */}
        <div className="md:col-span-8 md:col-start-5 bg-surface-container-low border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 shadow-md text-left">
          <div className="space-y-1">
            <h3 className="font-display font-extrabold text-[#edf3e3] text-lg uppercase tracking-wide flex items-center gap-2 select-none">
              <span className="material-symbols-outlined text-[#dda75f] font-light !text-[24px]">accessibility_new</span>
              <span>Universal Accessibility Features</span>
            </h3>
            <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed lowercase">
              tailor your cinematic experience with custom legibility typography and sensory motion guards compliant with WCAG 2.1 AA standards.
            </p>
          </div>

          <div className="space-y-4">
            
            {/* Dyslexia Friendly Toggle */}
            <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl flex items-center justify-between transition-all select-none">
              <div className="flex gap-3 items-center mr-4">
                <span className="material-symbols-outlined text-[#dda75f] font-light !text-[22px] shrink-0">spellcheck</span>
                <div>
                  <h5 className="font-sans font-black text-[10px] tracking-wider text-on-surface uppercase leading-none">Dyslexia-Friendly Font (OpenDyslexic)</h5>
                  <p className="font-sans text-[9px] text-on-surface-variant mt-1.5 max-w-sm lowercase leading-relaxed">switches the global display font to high-legibility opendyslexic with weighted bottoms, wider spacing and high line-height.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onUpdateDyslexiaFont(!isDyslexiaFontActive)}
                className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-all duration-300 cursor-pointer ${
                  isDyslexiaFontActive ? 'bg-[#dda75f]' : 'bg-surface-container-highest'
                }`}
                aria-label="Toggle Dyslexia-Friendly Font"
              >
                <div className={`h-5 w-5 rounded-full shadow-md transform transition-all duration-300 ${
                  isDyslexiaFontActive ? 'translate-x-6 bg-black' : 'translate-x-0 bg-on-surface-variant'
                }`} />
              </button>
            </div>

            {/* Quiet Mode sensory toggle */}
            <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl flex items-center justify-between transition-all select-none">
              <div className="flex gap-3 items-center mr-4">
                <span className="material-symbols-outlined text-[#dda75f] font-light !text-[22px] shrink-0">motion_photos_off</span>
                <div>
                  <h5 className="font-sans font-black text-[10px] tracking-wider text-on-surface uppercase leading-none">Motion Reduction (Quiet Mode)</h5>
                  <p className="font-sans text-[9px] text-on-surface-variant mt-1.5 max-w-sm lowercase leading-relaxed">suppresses intensive visual reactions, dims live emoji clouds, and cancels distracting pulsing/bouncing animations.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onUpdateQuietMode(!isQuietModeActive)}
                className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-all duration-300 cursor-pointer ${
                  isQuietModeActive ? 'bg-[#dda75f]' : 'bg-surface-container-highest'
                }`}
                aria-label="Toggle Quiet Mode"
              >
                <div className={`h-5 w-5 rounded-full shadow-md transform transition-all duration-300 ${
                  isQuietModeActive ? 'translate-x-6 bg-black' : 'translate-x-0 bg-on-surface-variant'
                }`} />
              </button>
            </div>

            {/* Disable Live Reactions & Animations sensory toggle */}
            <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl flex items-center justify-between transition-all select-none col-span-1">
              <div className="flex gap-3 items-center mr-4">
                <span className="material-symbols-outlined text-[#dda75f] font-light !text-[22px] shrink-0">sentiment_satisfied_alt</span>
                <div>
                  <h5 className="font-sans font-black text-[10px] tracking-wider text-on-surface uppercase leading-none">Mute Live Stream Reactions</h5>
                  <p className="font-sans text-[9px] text-on-surface-variant mt-1.5 max-w-sm lowercase leading-relaxed">selectively blocks floating emoji reactions and stream particle animations during live playback for a visual-cleaner viewing interface.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onUpdateDisableReactionsAndAnimations(!disableReactionsAndAnimations)}
                className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-all duration-300 cursor-pointer ${
                  disableReactionsAndAnimations ? 'bg-[#dda75f]' : 'bg-surface-container-highest'
                }`}
                aria-label="Toggle live reactions mute"
              >
                <div className={`h-5 w-5 rounded-full shadow-md transform transition-all duration-300 ${
                  disableReactionsAndAnimations ? 'translate-x-6 bg-black' : 'translate-x-0 bg-on-surface-variant'
                }`} />
              </button>
            </div>

            {/* Playback Subtle Cinema Room Ambience toggle */}
            <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl flex items-center justify-between transition-all select-none col-span-1">
              <div className="flex gap-3 items-center mr-4">
                <span className="material-symbols-outlined text-[#dda75f] font-light !text-[22px] shrink-0">surround_sound</span>
                <div>
                  <h5 className="font-sans font-black text-[10px] tracking-wider text-on-surface uppercase leading-none">Subtle Cinema Room Ambience</h5>
                  <p className="font-sans text-[9px] text-on-surface-variant mt-1.5 max-w-sm lowercase leading-relaxed">generates a cozy, low-frequency movie theater ventilation rumble with ultra-quiet seat shuffling and popcorn rustling during movie playback.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onUpdateCinemaAmbientSound && onUpdateCinemaAmbientSound(!isCinemaAmbientSoundActive)}
                className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-all duration-300 cursor-pointer ${
                  isCinemaAmbientSoundActive ? 'bg-[#dda75f]' : 'bg-surface-container-highest'
                }`}
                aria-label="Toggle subtle cinema room ambience during playback"
              >
                <div className={`h-5 w-5 rounded-full shadow-md transform transition-all duration-300 ${
                  isCinemaAmbientSoundActive ? 'translate-x-6 bg-black' : 'translate-x-0 bg-on-surface-variant'
                }`} />
              </button>
            </div>

          </div>
        </div>
      </>
    ) : (
      /* Billing & Invoices Tab Content (8 cols) */
      <div className="md:col-span-8 space-y-8 animate-fade-in text-left">
        {/* Wallet & Topups */}
        <div className="bg-surface-container-low border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 select-none">
                <Wallet className="h-5 w-5 text-primary" />
                <h3 className="font-display font-extrabold text-[#edf3e3] text-lg uppercase tracking-wide">
                  ROWONE Wallet Balance
                </h3>
              </div>
              <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed">
                Use your virtual balance for instant ticket payments, premium watch rooms, and visual interaction tokens.
              </p>
            </div>
            <div className="bg-black/40 border border-white/10 px-6 py-4 rounded-2xl text-center min-w-[150px] shadow-inner select-none shrink-0">
              <span className="block text-[9px] font-sans font-black tracking-widest text-[#dda75f] uppercase">AVAILABLE BALANCE</span>
              <span className="font-mono text-2xl font-black text-on-surface">${currentBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Quick Topups */}
          <div className="space-y-3 pt-2">
            <label className="text-[9px] font-sans font-black tracking-widest text-on-surface-variant uppercase block select-none">
              🚀 Load Funds / Quick Wallet Top-up
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { amount: 10.00, label: 'Starter Pack' },
                { amount: 25.00, label: 'Cinephile Pack' },
                { amount: 50.00, label: 'Elite Pack' },
              ].map((pkg) => {
                const isPkgLoading = isToppingUp === `TOP-${pkg.amount}`;
                return (
                  <button
                    key={pkg.amount}
                    type="button"
                    onClick={() => handleTopUp(pkg.amount)}
                    disabled={isToppingUp !== null}
                    className="p-3 bg-surface-container hover:bg-surface-container-high border border-white/5 hover:border-primary/35 rounded-xl text-center transition-all cursor-pointer group active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span className="block font-sans text-[9px] font-bold text-on-surface-variant group-hover:text-primary transition-colors">
                      {pkg.label}
                    </span>
                    <span className="block font-mono text-sm font-black text-on-surface mt-1">
                      {isPkgLoading ? 'Applying...' : `+$${pkg.amount.toFixed(0)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Subscription & Automatic Renewal Management */}
        <div className="bg-surface-container-low border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2 select-none">
              <Crown className="h-5 w-5 text-yellow-400" />
              <h3 className="font-display font-extrabold text-[#edf3e3] text-lg uppercase tracking-wide">
                Manage Subscriptions
              </h3>
            </div>
            <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed font-light">
              Analyze renewal terms, adjust automatic billing triggers, or modify/cancel ROWONE Pass tiers.
            </p>
          </div>

          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex gap-2.5 items-center mr-4">
                <ArrowRightLeft className="h-5 w-5 text-yellow-400 shrink-0" />
                <div>
                  <h4 className="font-sans font-black text-[10px] tracking-wider text-on-surface uppercase leading-none">
                    Automatic Monthly Subscription Renewal
                  </h4>
                  <p className="font-sans text-[9px] text-on-surface-variant mt-1.5 max-w-sm lowercase leading-tight">
                    if active, your saved payment card will be processed automatically at each cycle.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoRenew}
                className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-all duration-300 cursor-pointer shrink-0 ${
                  isAutoRenewActive ? 'bg-yellow-400 justify-end' : 'bg-surface-container-highest justify-start'
                }`}
              >
                <span className={`h-5 w-5 rounded-full shadow-md transform transition-all duration-300 ${
                  isAutoRenewActive ? 'bg-black' : 'bg-on-surface-variant'
                }`} />
              </button>
            </div>

            <hr className="border-white/5" />

            {/* Premium Plans / Tiers Bento Grid */}
            <div className="space-y-3">
              <label className="text-[9px] font-sans font-black tracking-widest text-[#dda75f] uppercase block select-none">
                🍿 Direct Passport Tier Selection
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Free Tier */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                  activeTier === 'spectator' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-white' 
                    : 'bg-surface-container border-white/5 hover:border-white/10 text-on-surface-variant'
                }`}>
                  {activeTier === 'spectator' && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-black font-sans font-black text-[6.5px] uppercase tracking-widest px-2 py-0.5 rounded-bl">
                      Current
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-on-surface-variant shrink-0" />
                      <span className="font-display font-black text-[10px] tracking-wider uppercase text-on-surface">Standard Spectator</span>
                    </div>
                    <div className="font-mono text-xs font-black text-on-surface">
                      Free <span className="font-sans text-[8px] font-normal text-on-surface-variant">/ permanent</span>
                    </div>
                    <ul className="text-[8.5px] space-y-1 text-on-surface-variant list-disc pl-3">
                      <li>Ad-supported playbacks</li>
                      <li>Standard sound specs</li>
                    </ul>
                  </div>
                  {activeTier !== 'spectator' && (
                    <button
                      type="button"
                      onClick={() => handleDowngradePlan('spectator')}
                      className="mt-4 w-full py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-400 font-sans text-[8px] font-black uppercase tracking-widest rounded-lg cursor-pointer transition-all active:scale-[0.97]"
                    >
                      Cancel Membership
                    </button>
                  )}
                </div>

                {/* 2. Gold Premium */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                  activeTier === 'gold_premium' 
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-white' 
                    : 'bg-surface-container border-white/5 hover:border-white/10 text-on-surface-variant'
                }`}>
                  {activeTier === 'gold_premium' && (
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black font-sans font-black text-[6.5px] uppercase tracking-widest px-2 py-0.5 rounded-bl">
                      Current
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Crown className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                      <span className="font-display font-black text-[10px] tracking-wider uppercase text-on-surface text-[#dda75f]">Gold Premium</span>
                    </div>
                    <div className="font-mono text-xs font-black text-on-surface">
                      $14.99 <span className="font-sans text-[8px] font-normal text-on-surface-variant">/ month</span>
                    </div>
                    <ul className="text-[8.5px] space-y-1 text-on-surface-variant list-disc pl-3">
                      <li>24/7 rewatch parties</li>
                      <li>Standard ROWONE Pass</li>
                      <li>No streaming ads</li>
                    </ul>
                  </div>
                  {activeTier === 'spectator' ? (
                    <button
                      type="button"
                      onClick={() => handleUpgradePlan('gold_premium')}
                      className="mt-4 w-full py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black font-sans text-[8px] font-black uppercase tracking-widest rounded-lg cursor-pointer transition-all active:scale-[0.97] shadow"
                    >
                      Upgrade Plan
                    </button>
                  ) : activeTier === 'vip_platinum' ? (
                    <button
                      type="button"
                      onClick={() => handleDowngradePlan('gold_premium')}
                      className="mt-4 w-full py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-sans text-[8px] font-bold uppercase tracking-widest rounded-lg cursor-pointer transition-all active:scale-[0.97]"
                    >
                      Downgrade to Gold
                    </button>
                  ) : null}
                </div>

                {/* 3. VIP Platinum */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                  activeTier === 'vip_platinum' 
                    ? 'bg-primary/10 border-primary/30 text-white' 
                    : 'bg-surface-container border-white/5 hover:border-white/10 text-on-surface-variant'
                }`}>
                  {activeTier === 'vip_platinum' && (
                    <div className="absolute top-0 right-0 bg-primary text-black font-sans font-black text-[6.5px] uppercase tracking-widest px-2 py-0.5 rounded-bl">
                      Current
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-display font-black text-[10px] tracking-wider uppercase text-on-surface text-primary">VIP Platinum</span>
                    </div>
                    <div className="font-mono text-xs font-black text-on-surface">
                      $24.99 <span className="font-sans text-[8px] font-normal text-on-surface-variant">/ month</span>
                    </div>
                    <ul className="text-[8.5px] space-y-1 text-on-surface-variant list-disc pl-3">
                      <li>Ultra HD live playback</li>
                      <li>Interactive perks</li>
                      <li>Priority VIP assistance</li>
                    </ul>
                  </div>
                  {activeTier !== 'vip_platinum' && (
                    <button
                      type="button"
                      onClick={() => handleUpgradePlan('vip_platinum')}
                      className="mt-4 w-full py-1.5 bg-primary hover:bg-primary/80 text-on-primary font-sans text-[8px] font-black uppercase tracking-widest rounded-lg cursor-pointer transition-all active:scale-[0.97] shadow"
                    >
                      {activeTier === 'gold_premium' ? 'Upgrade to VIP' : 'Get VIP Pass'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-white/5" />

            {/* Subscription Meta Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
              <div>
                <span className="block text-[8px] font-black text-on-surface-variant uppercase tracking-wider select-none">CURRENT MEMBERSHIP</span>
                <span className="font-bold text-on-surface uppercase mt-1 block">
                  {activeTier === 'vip_platinum' ? '👑 VIP Platinum' : activeTier === 'gold_premium' ? '⭐ Gold Premium Pass' : 'Standard Spectator'}
                </span>
              </div>
              <div>
                <span className="block text-[8px] font-black text-on-surface-variant uppercase tracking-wider select-none">NEXT BILLING CYCLE</span>
                <span className="font-mono font-bold text-on-surface block mt-1">
                  {activeTier !== 'spectator' ? 'July 4, 2026' : 'N/A'}
                </span>
              </div>
              <div>
                <span className="block text-[8px] font-black text-on-surface-variant uppercase tracking-wider select-none">MONTHLY RECURRING VALUE</span>
                <span className="font-mono text-primary font-black block mt-1">
                  {activeTier === 'vip_platinum' ? '$24.99 / Month' : activeTier === 'gold_premium' ? '$14.99 / Month' : 'Free Tier'}
                </span>
              </div>
            </div>

            {activeTier !== 'spectator' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSimulateRenewal}
                  className="w-full py-2.5 bg-yellow-400/15 hover:bg-yellow-400 border border-yellow-400/20 hover:border-transparent font-sans text-[9px] font-black uppercase text-yellow-500 hover:text-black rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow transition-all duration-300 active:scale-95"
                >
                  <Zap className="h-3 w-3 fill-current shrink-0" />
                  <span>Simulate Automatic Subscription renewal of ${activeTier === 'vip_platinum' ? '24.99' : '14.99'} Run</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Saved Payment Methods / Credit Cards */}
        <div className="bg-surface-container-low border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 shadow-md">
          <div className="flex justify-between items-center select-none">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="font-display font-extrabold text-[#edf3e3] text-lg uppercase tracking-wide">
                  Stored Payment Cards
                </h3>
              </div>
              <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed font-light">
                Set up reliable back-up streaming cards. Authorized for monthly subscription clearance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddCard(!showAddCard);
                setCardFormError('');
              }}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-sans text-[10px] font-bold text-on-surface transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="h-3 w-3 text-primary shrink-0" />
              <span>{showAddCard ? 'Cancel' : 'Add Card'}</span>
            </button>
          </div>

          {/* Add card Form */}
          {showAddCard && (
            <form onSubmit={handleAddNewCardSubmit} className="p-5 bg-black/30 border border-white/10 rounded-2xl space-y-4 animate-fade-in relative z-10 text-left">
              <h4 className="font-sans font-black text-[10px] uppercase text-[#ffe29c] tracking-widest block select-none">Register Streaming Card Details</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-xs font-light">
                  <label className="text-[8px] font-sans font-black text-on-surface-variant uppercase tracking-wider block select-none">Cardholder Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kwasidanso Danso"
                    value={newCardHolder}
                    onChange={(e) => setNewCardHolder(e.target.value)}
                    className="w-full bg-surface-container border border-white/5 focus:border-primary/50 outline-none rounded-xl px-3 py-2 text-on-surface font-sans"
                  />
                </div>
                <div className="space-y-1.5 text-xs font-light">
                  <label className="text-[8px] font-sans font-black text-on-surface-variant uppercase tracking-wider block select-none">16-Digit Card Number</label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="4242 4242 4242 4242"
                    value={newCardNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const matches = val.match(/\d{4,16}/g);
                      const match = (matches && matches[0]) || '';
                      const parts = [];
                      for (let i = 0, len = match.length; i < len; i += 4) {
                        parts.push(match.substring(i, i + 4));
                      }
                      setNewCardNumber(parts.length > 0 ? parts.join(' ') : val);
                    }}
                    className="w-full bg-surface-container border border-white/5 focus:border-primary/50 outline-none rounded-xl px-3 py-2 text-on-surface font-mono"
                  />
                </div>
                <div className="space-y-1.5 text-xs font-light">
                  <label className="text-[8px] font-sans font-black text-on-surface-variant uppercase tracking-wider block select-none">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="12/28"
                    value={newCardExpiry}
                    onChange={(e) => {
                      let clean = e.target.value.replace(/\D/g, '');
                      if (clean.length > 2) {
                        clean = clean.substring(0, 2) + '/' + clean.substring(2, 4);
                      }
                      setNewCardExpiry(clean);
                    }}
                    className="w-full bg-surface-container border border-white/5 focus:border-primary/50 outline-none rounded-xl px-3 py-2 text-on-surface font-mono"
                  />
                </div>
                <div className="space-y-1.5 text-xs font-light">
                  <label className="text-[8px] font-sans font-black text-on-surface-variant uppercase tracking-wider block select-none">Security Code (CVC)</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="•••"
                    value={newCardCvc}
                    onChange={(e) => setNewCardCvc(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-surface-container border border-white/5 focus:border-primary/50 outline-none rounded-xl px-3 py-2 text-[#ffe29c] font-mono tracking-widest"
                  />
                </div>
              </div>

              {cardFormError && (
                <p className="text-[9px] font-sans text-red-500 font-bold uppercase select-none">{cardFormError}</p>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isAddingCardLoader}
                  className="px-5 py-2.5 bg-primary text-on-primary font-sans text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  {isAddingCardLoader ? 'Authorizing Card...' : 'Authorize Secure Payment Instrument'}
                </button>
              </div>
            </form>
          )}

          {/* Cards list */}
          <div className="space-y-3 font-light">
            {currentCards.map((card) => (
              <div key={card.id} className="p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl flex items-center justify-between transition-all font-sans">
                <div className="flex gap-3 items-center">
                  <div className="h-10 w-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-on-surface-variant text-[10px] font-black uppercase tracking-wider select-none shrink-0 font-mono">
                    {card.brand}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold text-xs text-on-surface capitalize">{card.brand} ending in {card.last4}</h5>
                      {card.isDefault && (
                        <span className="px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[7px] font-sans font-black uppercase tracking-wider rounded select-none">DEFAULT</span>
                      )}
                    </div>
                    <p className="text-[9px] text-on-surface-variant mt-0.5 lowercase">
                      Expires: {card.expiry} | Cardholder: {card.cardholderName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteCard(card.id)}
                  className="p-2 text-on-surface-variant hover:text-red-400 transition-colors cursor-pointer shrink-0"
                  title="Remove Payment Card"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Invoices and Billing Ledger */}
        <div className="bg-surface-container-low border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 shadow-md text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-2 select-none">
              <Receipt className="h-5 w-5 text-primary" />
              <h3 className="font-display font-extrabold text-[#edf3e3] text-lg uppercase tracking-wide">
                Past Billing Transactions &amp; Invoices
              </h3>
            </div>
            <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed">
              List of automated renewals, virtual coin loadings, and subscription invoices. Download clear PDFs for accounting records.
            </p>
          </div>

          {/* Transactions table */}
          <div className="border border-white/5 bg-black/20 rounded-2xl overflow-hidden font-light">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-on-surface-variant text-[9px] font-black uppercase tracking-wider select-none">
                    <th className="px-4 py-3">Transaction</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Receipt / Invoice</th>
                    <th className="px-4 py-3 text-right">Settled ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentTxs.map((tx) => (
                    <tr key={tx.id || tx.date} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-4 py-3.5 space-y-0.5">
                        <span className="font-bold text-on-surface block leading-tight">{tx.description}</span>
                        <span className="font-mono text-[8px] text-on-surface-variant uppercase tracking-widest">{tx.id || 'TX-GENERIC'}</span>
                      </td>
                      <td className="px-4 py-3.5 text-on-surface-variant font-mono whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="px-4 py-3.5 text-on-surface-variant font-medium whitespace-nowrap">
                        {tx.paymentMethod || 'Visa •••• 4242'}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => generateInvoicePDF(tx)}
                          className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/20 hover:border-transparent rounded-lg font-sans text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                          title="Download PDF Invoice file"
                        >
                          <CloudDownload className="h-3 w-3 shrink-0" />
                          <span>PDF Invoice</span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-black text-on-surface">
                        ${Number(tx.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>

      {/* Dynamic Subscription Comparisons Tier section */}
      <section className="bg-surface-container-low border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="space-y-1 select-none text-center md:text-left">
          <h3 className="font-display font-extrabold text-[#edf3e3] text-lg uppercase tracking-wide flex items-center justify-center md:justify-start gap-2">
            <Crown className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            <span>ROWONE Subscription Tiers</span>
          </h3>
          <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed lowercase">
            enjoy high-fidelity communal watch rooms. compare standard spectator plans with elite passport memberships.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#121111]/80 border border-white/5 p-6 rounded-2xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center select-none">
                <span className="font-sans text-[9px] font-black tracking-widest text-on-surface-variant uppercase">STANDARD ACCESS</span>
                <span className="font-mono text-xs font-black text-on-surface">FREE</span>
              </div>
              <p className="font-sans text-[11px] text-[#dac8bb] leading-relaxed">
                Enjoy standard communal theater streams for catalog titles. Good for casual cinemagoers.
              </p>
              <ul className="space-y-2 text-[10px] text-on-surface-variant font-sans">
                <li className="flex items-center gap-2 text-green-400/80">✔ Access to catalogue screenings only</li>
                <li className="flex items-center gap-2 text-green-400/80">✔ Standard synced text chat room</li>
                <li className="flex items-center gap-2 text-red-400/80">✖ Discounted ticket pricing</li>
                <li className="flex items-center gap-2 text-red-400/80">✖ Early access premieres</li>
              </ul>
            </div>
            {!isPopcornPass && (
              <div className="font-sans text-[9px] font-black text-center text-primary uppercase tracking-widest pt-5 select-none leading-none">
                👉 Your active tier
              </div>
            )}
          </div>

          <div className="bg-yellow-400/5 border border-yellow-400/30 p-6 rounded-2xl flex flex-col justify-between relative shadow-[0_0_20px_rgba(234,179,8,0.06)]">
            <div className="space-y-3">
              <div className="flex justify-between items-center select-none">
                <div className="flex items-center gap-1.5 font-sans text-[9px] font-black tracking-widest text-yellow-400 uppercase">
                  <span>👑 ELITE MEMBERSHIP</span>
                </div>
                <span className="font-mono text-xs font-black text-yellow-400">$14.99/mo</span>
              </div>
              <p className="font-sans text-[11px] text-[#dac8bb] leading-relaxed">
                Unlimited screening catalog accesses, massive premiere discounts, and golden profile indicators.
              </p>
              <ul className="space-y-2 text-[10px] text-[#eedcb8] font-sans">
                <li className="flex items-center gap-2 text-yellow-400/90">✔ Unlimited access to catalogue films</li>
                <li className="flex items-center gap-2 text-yellow-400/90">✔ Deep-cut ticket discounts on new releases</li>
                <li className="flex items-center gap-2 text-yellow-400/90">✔ Early preview access to limited premieres</li>
                <li className="flex items-center gap-2 text-yellow-400/90">✔ Golden "Pass" badge and avatar frame</li>
              </ul>
            </div>
            
            <div className="pt-5">
              {isPopcornPass ? (
                <div className="text-center bg-yellow-400/15 border border-yellow-400/20 py-2.5 rounded-xl">
                  <span className="font-sans text-[9px] font-black text-yellow-400 uppercase tracking-widest">ACTIVE MEMBER PRIVILEGES</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onTriggerUpgrade}
                  className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 font-sans text-[10px] font-black tracking-widest text-black uppercase rounded-xl transition-all cursor-pointer text-center font-extrabold shadow-lg shadow-yellow-500/15 active:scale-95"
                >
                  UPGRADE NOW WITH STRIPE
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 select-none font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="bg-surface-container-low border border-red-500/20 max-w-md w-full rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/25">
                <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
              </div>

              <div className="space-y-2 text-center">
                <h4 className="font-display font-black text-lg text-white uppercase tracking-wider">
                  Disconnect ROWONE Pass?
                </h4>
                <p className="font-sans text-[11px] text-[#dac8bb] leading-relaxed">
                  Are you sure you want to cancel your streaming passport? This action will immediately downgrade your account to <span className="text-[#dda75f] font-bold">Standard Spectator</span> (Free Tier) and revoke access to:
                </p>
              </div>

              {/* Loss benefits review list */}
              <div className="bg-black/35 rounded-2xl p-4 border border-white/5 space-y-2.5 text-left font-sans text-[10px]">
                <div className="flex gap-2 text-on-surface-variant/90">
                  <span className="text-red-500 select-none">✕</span>
                  <span>Unlimited synchronized virtual screening rooms</span>
                </div>
                <div className="flex gap-2 text-on-surface-variant/90">
                  <span className="text-red-500 select-none">✕</span>
                  <span>Premium high-fidelity audio specifications</span>
                </div>
                <div className="flex gap-2 text-on-surface-variant/90">
                  <span className="text-red-500 select-none">✕</span>
                  <span>Exclusive golden avatar frames and status badges</span>
                </div>
                <div className="flex gap-2 text-on-surface-variant/90">
                  <span className="text-red-500 select-none">✕</span>
                  <span>Ad-free continuous cinematic experiences</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-sans text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer transition-all duration-200"
                >
                  Keep Premium
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancellation}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-sans text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer transition-all duration-200 shadow-lg shadow-red-500/10"
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
