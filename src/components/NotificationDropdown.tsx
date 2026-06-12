/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bell, Users, Film, Tv, Play, X, Check, Clock, CircleDot } from 'lucide-react';

export interface AppNotification {
  id: string;
  type: 'screening' | 'invite' | 'release';
  title: string;
  message: string;
  timestamp: string; // human readable e.g., 'Moments ago' or '12:45'
  timeValue: Date;   // actual time value
  movieTitle: string;
  countdownMinutes?: number; // for direct active screening
  studioName?: string;
  invitedBy?: string;
  isRead?: boolean;
}

interface NotificationDropdownProps {
  notifications: AppNotification[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onAction: (notif: AppNotification) => void;
}

export default function NotificationDropdown({
  notifications,
  onClose,
  onMarkAllRead,
  onAction,
}: NotificationDropdownProps) {
  return (
    <div className="absolute right-0 top-12 w-80 md:w-96 bg-surface-container-high border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in text-on-surface">
      
      {/* Header section with bell metadata */}
      <div className="p-4 bg-surface-container-highest border-b border-outline-variant/30 flex justify-between items-center select-none">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary animate-bounce" />
          <h4 className="font-display font-medium text-xs md:text-sm tracking-wide">Command Center</h4>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={onMarkAllRead}
            className="font-sans text-[9px] font-black text-secondary hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
          >
            Clear All
          </button>
          
          <button
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-white rounded hover:bg-white/5 cursor-pointer"
            title="Close Command"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications body lists scroll box */}
      <div className="max-h-96 overflow-y-auto divide-y divide-outline-variant/15 scrollbar-none">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant space-y-2 select-none">
            <Bell className="h-8 w-8 mx-auto stroke-[1.5] text-outline-variant" />
            <p className="font-sans text-[10px] font-black tracking-widest uppercase">The quiet before the show</p>
            <p className="font-sans text-[9px] lowercase opacity-60">You are fully up to date on screenings and invites</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = !notif.isRead;
            
            return (
              <div
                key={notif.id}
                className={`p-4 transition-colors flex gap-2 relative group ${
                  isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-white/5'
                }`}
              >
                {/* Visual indicator for unread posts */}
                {isUnread && (
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
                )}

                {/* Left icon wrapper */}
                <div className="shrink-0 pt-0.5">
                  {notif.type === 'screening' && (
                    <div className="p-2 bg-secondary/15 rounded-xl text-secondary border border-secondary/25">
                      <Clock className="h-4 w-4" />
                    </div>
                  )}
                  {notif.type === 'invite' && (
                    <div className="p-2 bg-primary/15 rounded-xl text-primary border border-primary/25">
                      <Users className="h-4 w-4" />
                    </div>
                  )}
                  {notif.type === 'release' && (
                    <div className="p-2 bg-green-500/15 rounded-xl text-green-400 border border-green-500/25">
                      <Film className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Text and interaction nodes */}
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-sans font-black text-[11px] leading-tight text-on-surface truncate">
                      {notif.title}
                    </p>
                    <span className="font-sans text-[8px] text-on-surface-variant tracking-wider uppercase shrink-0">
                      {notif.timestamp}
                    </span>
                  </div>

                  <p className="font-sans text-[10px] text-on-surface-variant leading-relaxed">
                    {notif.message}
                  </p>

                  {/* Context-specific elements and action CTAs */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    {/* Live screening dynamic countdown bar */}
                    {notif.countdownMinutes !== undefined && notif.countdownMinutes > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/50 border border-secondary/20 text-secondary text-[8px] font-black tracking-widest uppercase animate-pulse select-none">
                        <CircleDot className="h-2 w-2 text-secondary fill-secondary" />
                        Starts in {notif.countdownMinutes}m
                      </span>
                    ) : notif.countdownMinutes !== undefined ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600/25 border border-red-500/35 text-red-500 text-[8px] font-black tracking-widest uppercase select-none">
                        ● LIVE NOW
                      </span>
                    ) : null}

                    {/* Main CTA button */}
                    <button
                      onClick={() => onAction(notif)}
                      className={`px-3 py-1 bg-white hover:bg-primary hover:text-on-primary text-[#030303] rounded-lg font-sans text-[8px] font-black tracking-widest uppercase flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                        notif.type === 'invite' ? 'bg-primary text-on-primary' : ''
                      }`}
                    >
                      <Play className="h-2 w-2 fill-current" />
                      <span>
                        {notif.type === 'invite' ? 'Join Sync Session' :
                         notif.type === 'screening' ? 'Enter Room' :
                         'Launch Movie'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer notice detailing synchronization limits */}
      <div className="p-3.5 bg-surface-container-low text-center border-t border-outline-variant/20 select-none">
        <span className="font-sans text-[8.5px] font-bold text-on-surface-variant uppercase tracking-widest">
          SYNC LATENCY DEADBAND: &lt; 20MS
        </span>
      </div>

    </div>
  );
}
