/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Shield, Lock, Eye, Check, FileText, Scale, HeartHandshake } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms';
}

export default function PrivacyModal({ isOpen, onClose, initialTab = 'privacy' }: PrivacyModalProps) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/92 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none animate-fade-in overflow-y-auto">
      <div className="relative max-w-3xl w-full bg-surface-container-lowest border border-white/5 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(255,26,64,0.1)] overflow-hidden my-6">
        {/* Soft background light spills */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-white rounded-full bg-white/5 border border-white/10 transition-colors cursor-pointer"
          title="Close Dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Block */}
        <div className="space-y-4 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ff1a40]/10 border border-[#ff1a40]/25 rounded-full text-[#ff1a40] font-sans text-[9px] font-black tracking-widest uppercase">
            <Shield className="h-3.5 w-3.5" />
            <span>LEGAL CENTER & TRUST PROTOCOL</span>
          </div>
          
          <h2 className="font-display text-2xl md:text-3xl font-black text-[#f5efeb] tracking-tight">
            Security &amp; Legal Framework
          </h2>
          <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
            Welcome to the ROWONE privacy protection policy and usage rules. We are committed to maintaining transparent, private, and secure synchronized watching rooms.
          </p>
        </div>

        {/* Tabs Control */}
        <div className="flex border-b border-white/5 mb-6">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-5 py-3 font-sans text-xs font-black tracking-widest uppercase transition-all relative ${
              activeTab === 'privacy' 
                ? 'text-[#ff1a40] border-b-2 border-[#ff1a40]' 
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Privacy Policy</span>
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-5 py-3 font-sans text-xs font-black tracking-widest uppercase transition-all relative ${
              activeTab === 'terms' 
                ? 'text-[#ff1a40] border-b-2 border-[#ff1a40]' 
                : 'text-on-surface-variant hover:text-white'
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            <span>Terms of Service</span>
          </button>
        </div>

        {/* Modal Scrollable Info Body */}
        <div className="max-h-[380px] overflow-y-auto space-y-6 pr-2 custom-scrollbar font-sans text-xs text-on-surface-variant leading-relaxed text-left">
          {activeTab === 'privacy' ? (
            <div className="space-y-6 animate-fade-in select-text">
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                  <Eye className="h-4 w-4 text-[#ff1a40]" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider">1. Privacy by Architecture</h3>
                </div>
                <p>
                  ROWONE is built from the ground up to respect co-watching environments. We do not track keystroke movements, screen sharing activities, or record audio or video streams from camera overlays. Synchronization packets carry high-level film playback states only (time offset, play/pause commands, and active spectator lists).
                </p>
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                  <Shield className="h-4 w-4 text-[#ff1a40]" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider">2. Interactive Data We Retain</h3>
                </div>
                <p>
                  We store minimal profile preferences locally or dynamically synced to keep your account operational:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Account Credentials:</strong> Username hashes and custom profile colors.</li>
                  <li><strong>Active Tickets:</strong> Digital barcode purchase records and movie seat bookings.</li>
                  <li><strong>Spectator Logs:</strong> Interactive badges unlocked and short-term theater room invites.</li>
                  <li><strong>Visual Preferences:</strong> Dyslexia font configuration, quiet mode toggles, and reaction switches.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                  <Lock className="h-4 w-4 text-[#ff1a40]" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider">3. Room Sync &amp; Socket Streams</h3>
                </div>
                <p>
                  Synchronized sessions leverage transient web socket transport protocols. Chat messages sent during screening watch-parties are delivered to chat rooms in real-time. Chat threads are not archived long-term; they expire automatically when rooms are disbanded.
                </p>
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                  <Check className="h-4 w-4 text-[#ff1a40]" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider">4. Third Parties &amp; Cookie Audits</h3>
                </div>
                <p>
                  ROWONE integrates standard payment engines (including Stripe simulation components) to process VIP ticket transactions securely. We absolutely do not sell user email lists or personalized watch history logs to tracking networks or third-party advertising companies.
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in select-text">
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                  <Scale className="h-4 w-4 text-[#ff1a40]" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider">1. Acceptance of Screenings</h3>
                </div>
                <p>
                  By accessing ROWONE platforms and joint watch-party servers, you agree to comply with this Code of Conduct. Sharing screen capturing outputs or replicating digital studio premiere copies is strictly forbidden under streaming licensing terms.
                </p>
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                  <HeartHandshake className="h-4 w-4 text-[#ff1a40]" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider">2. Cinema Decorum (Chat Rooms)</h3>
                </div>
                <p>
                  Watch parties are safe spaces. Disrupting other cinemagoers with spam reactions, harassment, malicious room link spoofing, or continuous synchronization interruptions may lead to immediate bans, badge revocations, or restricted access to ticket systems.
                </p>
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                  <FileText className="h-4 w-4 text-[#ff1a40]" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider">3. Upgrades &amp; Premium Tickets</h3>
                </div>
                <p>
                  ROWONE Pass features a monthly flat fee to unlock unlimited catalogue movies. Ticket purchases for limited studio premieres are final, though viewers may request help center refunds or reschedule screening sessions in case of genuine technical network stream failures.
                </p>
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-2 text-white">
                  <Check className="h-4 w-4 text-[#ff1a40]" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider">4. Liabilities &amp; Support Solutions</h3>
                </div>
                <p>
                  Our services are offered under robust, high-availability architecture conditions. In case you experience any sync lags, support responses are provided directly from our Cinephile Support Center accessible instantly from footer controls.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="border-t border-white/5 pt-5 mt-6 flex justify-end gap-3 select-none">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-[#ff1a40] to-pink-600 hover:from-[#ff1a40]/90 hover:to-pink-600/90 text-white font-sans text-[10px] font-black tracking-widest uppercase rounded-xl transition-all duration-300 shadow-md cursor-pointer active:scale-95"
          >
            I Accept terms
          </button>
        </div>
      </div>
    </div>
  );
}
