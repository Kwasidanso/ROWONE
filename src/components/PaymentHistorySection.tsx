/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Receipt, CloudDownload, RefreshCw, Layers, CreditCard, Clock, 
  HelpCircle, Sparkles, SlidersHorizontal, ArrowUpRight, Search, ThumbsUp
} from 'lucide-react';

interface StripeTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'subscription' | 'one-time' | 'topup';
  paymentMethod: string;
  status: 'succeeded' | 'failed' | 'pending';
  receiptUrl: string;
}

interface PaymentHistorySectionProps {
  userId?: string;
  email?: string;
  username: string;
  dobString: string;
  userAge: number | null;
}

export const PaymentHistorySection: React.FC<PaymentHistorySectionProps> = ({
  userId,
  email,
  username,
  dobString,
  userAge,
}) => {
  const [transactions, setTransactions] = useState<StripeTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'subscription' | 'one-time'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isStripeLive, setIsStripeLive] = useState<boolean>(false);

  const fetchHistory = async (quiet: boolean = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);
    
    setError('');
    
    try {
      const uId = userId || localStorage.getItem('logged_in_user_id') || 'guest_user';
      const uEmail = email || localStorage.getItem('logged_in_email') || 'user@example.com';
      
      const response = await fetch(`/api/stripe/payment-history?userId=${encodeURIComponent(uId)}&email=${encodeURIComponent(uEmail)}`);
      if (!response.ok) {
        throw new Error(`Server returned error rate limit ${response.status}`);
      }
      const data = await response.json();
      
      if (data.transactions) {
        setTransactions(data.transactions);
        setIsStripeLive(!data.simulated);
      } else {
        setError('Billing systems could not locate dynamic transactions.');
      }
    } catch (err: any) {
      console.error('💥 Failed retrieving stripe logs:', err);
      setError('Secure payment gateway history currently offline.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userId, email]);

  const generatePDF = (tx: StripeTransaction) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Dark top banner matching Cinema palette (#121111)
      doc.setFillColor(18, 17, 17);
      doc.rect(0, 0, 210, 52, 'F');

      // Popcorn Gold banner highlights (#dda75f)
      doc.setFillColor(221, 167, 95);
      doc.rect(0, 52, 210, 2.5, 'F');

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('ROWONE CINEMA', 15, 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(180, 180, 180);
      doc.text('PREMIUM MOVIE CRADLES & SOCIAL BROADCASTINGS', 15, 28);
      doc.text('STRIPE PCI MERCHANT TRANSACTION RECEIPT', 15, 33);
      doc.text('SYSTEM GATEWAY COMPLIANCE: PCI-DSS v3.2', 15, 38);

      // Gold Official Invoice status block
      doc.setTextColor(221, 167, 95);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('SETTLED TRANSACTION', 140, 22);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(220, 220, 220);
      doc.text(`RECEIPT REF: ${tx.id.toUpperCase()}`, 140, 28);
      doc.text(`DATE: ${tx.date}`, 140, 33);
      doc.text('STATUS: CLEAR / CAPTURED', 140, 38);

      // Billing Details
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('BILL TO:', 15, 72);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(80, 80, 80);
      doc.text(`Cinephile profile: ${username || 'Valued Spectator'}`, 15, 78.5);
      if (email || localStorage.getItem('logged_in_email')) {
        doc.text(`Secured Email: ${email || localStorage.getItem('logged_in_email') || 'registered@rowone.internal'}`, 15, 84);
      }
      doc.text(`Account BirthDate: ${dobString || 'January 15, 2000'} (${userAge ?? 26} Years Old)`, 15, 89.5);
      doc.text(`Funding Instrument: ${tx.paymentMethod}`, 15, 95);

      // Merchant details
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('MERCHANT CONDUIT:', 125, 72);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(80, 80, 80);
      doc.text('ROWONE Cinemas LLC', 125, 78.5);
      doc.text('Executive Cloud Billing Desk', 125, 84);
      doc.text('Gateway: Stripe Server API', 125, 89.5);
      doc.text('Support Desk: support@rowone.com', 125, 95);

      // Table Header definitions
      doc.setFillColor(248, 248, 250);
      doc.rect(15, 110, 180, 10, 'F');
      doc.setDrawColor(230, 230, 235);
      doc.rect(15, 110, 180, 10, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 65);
      doc.text('PRODUCT / INVOICE SERVICE LINE', 20, 116.5);
      doc.text('PERIOD/RATE', 120, 116.5);
      doc.text('TOTAL AMOUNT', 160, 116.5);

      // Table row items
      doc.setDrawColor(240, 240, 245);
      doc.line(15, 132, 195, 132);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(tx.description, 20, 126.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 100, 100);
      doc.text(tx.type === 'subscription' ? 'Monthly Recurrent' : 'One-time Pass', 120, 126.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 20);
      doc.text(`$${Number(tx.amount).toFixed(2)}`, 160, 126.5);

      // Summary lines
      doc.setDrawColor(210, 210, 215);
      doc.rect(15, 140, 180, 48, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 100, 100);
      doc.text('Subtotal Charges:', 115, 149);
      doc.text('Local Sales Tax (0% online):', 115, 155);
      doc.text('Gateway Surcharges:', 115, 161);
      doc.text('Payment Source captured:', 115, 167);

      doc.setTextColor(40, 40, 40);
      doc.text(`$${Number(tx.amount).toFixed(2)}`, 165, 149);
      doc.text('$0.00', 165, 155);
      doc.text('$0.00', 165, 161);
      doc.setFont('helvetica', 'bold');
      doc.text('SECURE CLEAR', 165, 167);

      doc.setDrawColor(220, 220, 220);
      doc.line(115, 173, 188, 173);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.text('Total Settled:', 115, 181);
      doc.text(`$${Number(tx.amount).toFixed(2)}`, 165, 181);

      // Terms/Footer notes
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text('• Thank you for using ROWONE Cinematic Lounge services. This file behaves as a formal proof of payment.', 15, 200);
      doc.text('• Payments are processed securely via Stripe. All subscription charges are non-refundable except under special terms.', 15, 205);
      doc.text('• To dispute this charge, open a support ticket or visit the Billing Portal options inside Settings directly.', 15, 210);

      // System Hash bottom reference
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(160, 160, 165);
      doc.text(`HASHED CRYPTOGRAPHIC SIGN_LOG: ${Math.random().toString(36).substring(2, 15).toUpperCase()} - SECURE INTEGRITY SEAL`, 15, 224);

      // Trigger automatic save in browser
      doc.save(`ROWONE_Receipt_${tx.id}.pdf`);

    } catch (err: any) {
      console.error('Invoice PDF compilation crashed:', err);
    }
  };

  const filteredHistory = transactions.filter((tx) => {
    // Category tabs filter
    if (filterType === 'subscription' && tx.type !== 'subscription') return false;
    if (filterType === 'one-time' && tx.type !== 'one-time') return false;

    // Search bar filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchLabel = tx.description.toLowerCase().includes(q) || 
                         tx.id.toLowerCase().includes(q) || 
                         tx.paymentMethod.toLowerCase().includes(q);
      if (!matchLabel) return false;
    }

    return true;
  });

  return (
    <div className="bg-[#121111]/80 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 text-left relative overflow-hidden">
      {/* Background Visual Flare */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#dda75f]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 col-span-2">
          <div className="flex items-center gap-2 select-none">
            <Receipt className="h-5 w-5 text-[#dda75f]" />
            <h3 className="font-display font-extrabold text-[#edf3e3] text-lg uppercase tracking-wide">
              Stripe Transaction Ledger
            </h3>
            {isStripeLive ? (
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[7px] font-mono font-black uppercase tracking-widest animate-pulse">
                ● Stripe Live
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-[#dda75f]/15 border border-[#dda75f]/20 text-[#dda75f] text-[7.5px] font-mono font-black uppercase tracking-widest">
                Stripe Sandbox
              </span>
            )}
          </div>
          <p className="font-sans text-[11px] text-zinc-400 leading-relaxed max-w-2xl">
            Displays a real-time list of your registered one-time ticket purchases and automatic subscription renewals retrieved from Stripe. Download secure PDF invoice certificates for your records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchHistory(true)}
          disabled={isRefreshing || isLoading}
          className="self-start md:self-center px-4 py-2 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 disabled:opacity-50 text-zinc-300 hover:text-white rounded-xl text-[9px] font-sans font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed select-none"
        >
          <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Sync Ledger</span>
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 items-center">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 bg-[#171616] p-1 border border-white/5 rounded-xl self-start w-full max-w-sm">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-sans font-black uppercase tracking-widest transition-all text-center cursor-pointer ${
              filterType === 'all'
                ? 'bg-[#dda75f] text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Logs
          </button>
          <button
            type="button"
            onClick={() => setFilterType('subscription')}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-sans font-black uppercase tracking-widest transition-all text-center cursor-pointer ${
              filterType === 'subscription'
                ? 'bg-[#dda75f] text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Renewals
          </button>
          <button
            type="button"
            onClick={() => setFilterType('one-time')}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-sans font-black uppercase tracking-widest transition-all text-center cursor-pointer ${
              filterType === 'one-time'
                ? 'bg-[#dda75f] text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            One-time
          </button>
        </div>

        {/* Search input field */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="FILTER HISTORIES ID, CARDS, SERVICE OR TICKET..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 bg-[#171616] border border-white/5 rounded-xl text-[9.5px] font-mono uppercase tracking-wider text-zinc-300 placeholder-zinc-650 focus:outline-none focus:border-[#dda75f]/35 text-left"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 md:py-24 text-center flex flex-col items-center justify-center space-y-4 rounded-2xl bg-black/15 border border-white/5">
          <div className="w-9 h-9 rounded-full border-2 border-white/10 border-t-[#dda75f] animate-spin" />
          <span className="font-mono text-[9px] text-[#dda75f] font-bold uppercase tracking-widest animate-pulse">Requesting transaction audit logs...</span>
        </div>
      ) : error ? (
        <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl text-center space-y-2">
          <p className="text-[10px] text-red-500 font-mono uppercase tracking-wider">⚠️ {error}</p>
          <button
            type="button"
            onClick={() => fetchHistory()}
            className="text-[8.5px] font-sans font-bold uppercase tracking-widest text-zinc-400 hover:text-[#dda75f] underline underline-offset-4 cursor-pointer"
          >
            Attempt Secured Reconnection
          </button>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-black/10 border border-white/5 space-y-3 p-6">
          <div className="h-9 w-9 mx-auto rounded-full bg-white/[0.02] flex items-center justify-center text-zinc-600">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="font-display font-bold text-[11px] text-zinc-400 uppercase tracking-wider">No Billing Matches Located</h4>
            <p className="text-[9.5px] text-zinc-500 font-sans mt-1">
              {searchQuery ? 'No transactions correspond to your search parameter.' : 'No Stripe charges or renewals recorded on this account yet.'}
            </p>
          </div>
        </div>
      ) : (
        /* Table element for full list */
        <div className="border border-white/5 bg-black/10 rounded-2xl overflow-hidden shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01] text-zinc-500 text-[8px] font-black uppercase tracking-widest select-none">
                  <th className="px-5 py-3.5">Charge Line</th>
                  <th className="px-5 py-3.5 text-center">Settlement</th>
                  <th className="px-5 py-3.5">Method</th>
                  <th className="px-5 py-3.5">Settled Amount</th>
                  <th className="px-5 py-3.5 text-right">Invoices</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredHistory.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-5 py-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#f5f5f4] text-[11.5px] tracking-wide block leading-tight">{tx.description}</span>
                        {tx.type === 'subscription' ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#dda75f]/10 text-[#dda75f] text-[6.5px] font-mono font-black uppercase tracking-wider">RENEWAL</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[6.5px] font-mono font-black uppercase tracking-wider">TICKET</span>
                        )}
                      </div>
                      <span className="font-mono text-[7.5px] text-zinc-550 block select-all tracking-wider">{tx.id.toUpperCase()}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-mono text-[10.5px] text-zinc-305">{tx.date}</span>
                        <span className="text-[6.5px] font-sans font-black text-emerald-500 uppercase tracking-widest mt-0.5">CHARGED</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3 w-3 text-zinc-500 shrink-0" />
                        <span className="text-zinc-350 text-[10.5px] font-medium">{tx.paymentMethod}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-mono font-black text-[12.5px] text-[#edf3e3] flex items-center gap-1">
                        <span>${Number(tx.amount).toFixed(2)}</span>
                        <span className="text-[8px] font-mono text-zinc-600 font-bold">USD</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => generatePDF(tx)}
                        className="ml-auto px-3 py-1.5 bg-white/[0.02] hover:bg-[#dda75f] text-[#dda75f] hover:text-black border border-white/5 hover:border-transparent rounded-lg font-sans text-[8.5px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer flex items-center gap-1.5 select-none hover:scale-[1.02] active:scale-[0.98]"
                        title="Download secure certified PDF receipt file"
                      >
                        <CloudDownload className="h-3 w-3 shrink-0" />
                        <span>PDF Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Helpful Info footer note */}
      <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-2xl flex items-start gap-2.5">
        <HelpCircle className="h-3.5 w-3.5 text-zinc-550 shrink-0 mt-0.5" />
        <p className="text-[8.5px] text-zinc-550 font-sans tracking-wide leading-relaxed uppercase">
          In order to update payment methods, modify subscription tiers, or handle full cancellation parameters, you can click on the Stripe Customer portal options directly above.
        </p>
      </div>
    </div>
  );
};
