/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Armchair, X, Info, Sparkles, Check, Ticket, User, ShieldCheck, Clock } from 'lucide-react';
import { BookedTicket } from '../types';

interface SeatSelectionModalProps {
  movieTitle: string;
  time: string;
  hall: string;
  price: string;
  date: string;
  bookedTickets: BookedTicket[];
  onClose: () => void;
  onConfirm: (seatName: string, finalPrice: string) => void;
}

// Generate deterministic occupied seats list based on movieTitle, date, and showtime
const getDeterministicOccupiedSeats = (movieTitle: string, date: string, time: string, currentBookedSeats: string[]): string[] => {
  const seed = `${movieTitle}-${date}-${time}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const occupied: string[] = [...currentBookedSeats];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  // Set roughly 35% - 50% of the hall as occupied
  rows.forEach((row) => {
    for (let col = 1; col <= 12; col++) {
      const seatId = `${row}${col}`;
      if (occupied.includes(seatId)) continue;

      // Deterministic pseudo-randomness using the hash
      const val = Math.abs(Math.sin(hash + row.charCodeAt(0) * col)) * 100;
      if (val < 42) { // 42% chance of being pre-assigned/occupied
        occupied.push(seatId);
      }
    }
  });

  return occupied;
};

export default function SeatSelectionModal({
  movieTitle,
  time,
  hall,
  price,
  date,
  bookedTickets,
  onClose,
  onConfirm,
}: SeatSelectionModalProps) {
  // Extract seats of other tickets already booked for this exact screening
  const currentShowBookings = bookedTickets
    .filter(
      (t) =>
        t.movieTitle === movieTitle &&
        t.time === time &&
        (t.date || 'today').trim().toLowerCase() === date.trim().toLowerCase()
    )
    .map((t) => t.seat);

  // Derive occupied list
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes in seconds
  const [holdExpired, setHoldExpired] = useState<boolean>(false);

  useEffect(() => {
    const list = getDeterministicOccupiedSeats(movieTitle, date, time, currentShowBookings);
    setOccupiedSeats(list);
  }, [movieTitle, date, time]);

  useEffect(() => {
    if (!selectedSeat) {
      return;
    }

    setHoldExpired(false);
    setTimeLeft(300); // Reset to 5 minutes whenever seat changes

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSelectedSeat(null); // Release seat hold
          setHoldExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedSeat]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Pricing multiplier/tier modifiers based on row
  const getSeatInfo = (row: string, col: number) => {
    let baseVal = parseFloat(price.replace('$', '')) || 12.50;
    let category = 'Standard Seating';
    let addedCost = 0;
    let colorName = 'zinc';

    if (row === 'E' || row === 'F') {
      category = 'VIP Luxury DreamSofa';
      addedCost = 5.50;
      colorName = 'amber';
    } else if (row === 'C' || row === 'D') {
      category = 'Prime Central Seat';
      addedCost = 2.00;
      colorName = 'indigo';
    }

    const finalPriceVal = baseVal + addedCost;
    return {
      category,
      priceFormatted: `$${finalPriceVal.toFixed(2)}`,
      colorName,
      row,
      col,
    };
  };

  const selectedSeatDetails = selectedSeat 
    ? getSeatInfo(selectedSeat[0], parseInt(selectedSeat.slice(1), 10))
    : null;

  const handleSeatClick = (row: string, col: number) => {
    const seatId = `${row}${col}`;
    if (occupiedSeats.includes(seatId)) return; // Occupied cannot be clicked

    setHoldExpired(false);
    if (selectedSeat === seatId) {
      setSelectedSeat(null);
    } else {
      setSelectedSeat(seatId);
    }
  };

  const handleConfirmReservation = () => {
    if (!selectedSeat || !selectedSeatDetails) return;
    onConfirm(selectedSeat, selectedSeatDetails.priceFormatted);
  };

  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  const columns = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 bg-black/92 backdrop-blur-xl flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in select-none">
      <div className="relative max-w-4xl w-full bg-surface-container-lowest border border-white/5 rounded-3xl p-6 md:p-8 shadow-[0_0_60px_rgba(255,42,77,0.12)] overflow-hidden">
        
        {/* Floating background neon gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[150px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 right-10 w-[200px] h-[200px] bg-secondary/15 blur-[120px] rounded-full pointer-events-none" />

        {/* Modal Header */}
        <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] font-black tracking-widest text-[#ff2a4d] px-2 py-0.5 rounded bg-primary/10 border border-primary/20 uppercase">
                COMMUNAL FLOORPLAN
              </span>
              <span className="font-sans text-[10px] text-zinc-400">• Dynamic Seating Map</span>
            </div>
            <h3 className="font-display font-extrabold text-2xl text-on-surface mt-1 tracking-tight leading-none">
              Select Your Seating Row
            </h3>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-xl">
              Screening <span className="text-secondary font-semibold font-mono">@{movieTitle}</span> in <span className="text-on-surface font-semibold">{hall}</span> ({selectedDayLabel(date)}) at <span className="text-primary font-bold">{time}</span>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-primary transition-all cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          
          {/* LEFT/CENTER COMPONENT: The Theater Layout Canvas */}
          <div className="lg:col-span-8 flex flex-col items-center">
            
            {/* Curved Projector Screen Visualizer */}
            <div className="w-full max-w-md mx-auto mb-14 mt-4 relative">
              <div className="h-3.5 bg-gradient-to-b from-[#ff2a4d]/25 via-[#ff2a4d]/10 to-transparent rounded-[50%] blur-sm w-full absolute -top-1" />
              <div className="h-1.5 w-full bg-gradient-to-r from-red-600/10 via-primary/80 to-red-600/10 rounded-full shadow-[0_1px_15px_rgba(255,42,77,0.7)]" />
              <div className="text-center mt-3">
                <span className="font-sans text-[8.5px] font-black tracking-[0.25em] text-zinc-500 uppercase">
                  THEATRE SYNCHRONIZED SCREEN
                </span>
              </div>
            </div>

            {/* Layout Grid */}
            <div className="space-y-4 w-full overflow-x-auto pb-4 px-2 scrollbar-none flex flex-col items-center">
              {rows.map((row) => {
                const isVIP = row === 'E' || row === 'F';
                const isPrime = row === 'C' || row === 'D';

                return (
                  <div key={row} className="flex items-center gap-3">
                    {/* Left Row Identifier */}
                    <span className="w-4 text-[10px] font-mono font-black text-zinc-500 text-center uppercase">
                      {row}
                    </span>

                    {/* Columns arranged with architectural aisles */}
                    <div className="flex items-center gap-1.5">
                      {columns.map((col) => {
                        const seatId = `${row}${col}`;
                        const isOccupied = occupiedSeats.includes(seatId);
                        const isSelected = selectedSeat === seatId;
                        
                        // Determine layout spacer columns (Aisles after 3 and 9)
                        const showLeftGap = col === 4;
                        const showRightGap = col === 10;

                        // Custom styling vectors based on Seat state & tier
                        let stateStyles = '';
                        if (isOccupied) {
                          stateStyles = 'bg-zinc-800 border-zinc-700/60 text-zinc-600 cursor-not-allowed opacity-35';
                        } else if (isSelected) {
                          stateStyles = 'bg-[#ff2a4d] border-white text-white shadow-[0_0_12px_rgba(255,42,77,0.8)] scale-110';
                        } else if (isVIP) {
                          stateStyles = 'bg-amber-950/15 border-amber-600/40 hover:bg-amber-900/30 hover:border-amber-400 text-amber-200/90';
                        } else if (isPrime) {
                          stateStyles = 'bg-indigo-950/15 border-indigo-500/40 hover:bg-indigo-900/30 hover:border-indigo-400 text-indigo-200/90';
                        } else {
                          stateStyles = 'bg-zinc-950/30 border-zinc-600/45 hover:bg-zinc-800/40 hover:border-zinc-400 text-zinc-300';
                        }

                        return (
                          <React.Fragment key={col}>
                            {showLeftGap && <div className="w-4 h-full" />}
                            
                            <button
                              id={`seat-${seatId}`}
                              disabled={isOccupied}
                              onClick={() => handleSeatClick(row, col)}
                              className={`
                                transition-all duration-150 relative cursor-pointer font-mono group
                                ${isVIP ? 'w-7.5 h-7 rounded-t-lg' : 'w-6 h-6.5 rounded-t-md'}
                                border flex flex-col items-center justify-center text-[8.5px] font-bold
                                ${stateStyles}
                              `}
                              title={
                                isOccupied 
                                  ? `Seat ${seatId} is occupied` 
                                  : `Select Seat ${seatId} (${isVIP ? 'VIP sofa' : isPrime ? 'Prime center seat' : 'Standard seat'})`
                              }
                            >
                              <span>{col}</span>
                              
                              {/* Seat Base physical accent line helper */}
                              <span 
                                className={`
                                  absolute bottom-0 left-0.5 right-0.5 h-1 rounded-t-xs opacity-80
                                  ${isSelected ? 'bg-white' : isOccupied ? 'bg-zinc-700' : isVIP ? 'bg-amber-500/40' : isPrime ? 'bg-indigo-500/40' : 'bg-zinc-500/30'}
                                `} 
                              />
                            </button>

                            {showRightGap && <div className="w-4 h-full" />}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Right Row Identifier */}
                    <span className="w-4 text-[10px] font-mono font-black text-zinc-500 text-center uppercase">
                      {row}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Color Map / Legend Indicators Row */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3.5 border-t border-white/5 pt-5 mt-6 w-full max-w-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-t-sm bg-zinc-950/30 border border-zinc-600 flex items-center justify-center" />
                <span className="font-sans text-[10px] text-zinc-400 uppercase tracking-wider">Regular</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-t-sm bg-indigo-950/20 border border-indigo-500/50" />
                <span className="font-sans text-[10px] text-zinc-400 uppercase tracking-wider">Prime (+ $2)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-t-sm bg-amber-950/20 border border-amber-600/50" />
                <span className="font-sans text-[10px] text-zinc-400 uppercase tracking-wider">VIP Sofa (+ $5.50)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-t-sm bg-primary border border-white shadow-[0_0_8px_rgba(255,42,77,0.7)]" />
                <span className="font-sans text-[10px] text-primary uppercase font-bold tracking-wider">Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-t-sm bg-zinc-800 border border-zinc-700/60 opacity-35" />
                <span className="font-sans text-[10px] text-zinc-500 uppercase tracking-wider">Occupied</span>
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR: Selection confirmation card & details */}
          <div className="lg:col-span-4 bg-surface-container-high/60 border border-white/5 rounded-2xl p-5 md:p-6 space-y-6 flex flex-col justify-between h-full min-h-[380px]">
            <div>
              <h4 className="font-display font-extrabold text-sm text-zinc-300 uppercase tracking-wider border-b border-white/5 pb-2">
                Ticket Details
              </h4>
              
              <div className="space-y-4 mt-4">
                {/* Cinema Room Info */}
                <div className="flex justify-between items-center bg-black/30 p-2.5 rounded-lg border border-white/5 text-xs">
                  <span className="text-zinc-400 font-sans">Lounge Hall</span>
                  <span className="font-bold text-on-surface truncate max-w-[120px]">{hall}</span>
                </div>

                <div className="flex justify-between items-center bg-black/30 p-2.5 rounded-lg border border-white/5 text-xs">
                  <span className="text-zinc-400 font-sans">Projection Slot</span>
                  <span className="font-mono font-extrabold text-secondary">{time}</span>
                </div>

                <div className="flex justify-between items-center bg-black/30 p-2.5 rounded-lg border border-white/5 text-xs">
                  <span className="text-zinc-400 font-sans">Movie runtime</span>
                  <span className="font-sans font-bold text-zinc-300">Synchronizedparty Ready</span>
                </div>
              </div>

              {/* Dynamic Live Seat display */}
              <div className="mt-6">
                <AnimatePresence mode="wait">
                  {selectedSeat ? (
                    <motion.div
                      key="selected-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-primary/5 border border-primary/25 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-sans text-[9px] font-black text-primary tracking-widest uppercase">
                          SEAT RESERVED
                        </span>
                        <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                          <Check className="h-3 w-3 stroke-[2.5]" />
                        </div>
                      </div>
                      
                      <div className="flex items-baseline gap-2">
                        <span className="font-display font-black text-3xl text-white tracking-tight">
                          {selectedSeat}
                        </span>
                        <span className="text-xs text-zinc-400 font-sans">
                          ({selectedSeatDetails?.category})
                        </span>
                      </div>

                      <div className="flex justify-between items-center border-t border-white/10 pt-2.5 text-xs">
                        <span className="text-zinc-400">Total Ticket Price</span>
                        <span className="font-mono font-black text-secondary text-sm">
                          {selectedSeatDetails?.priceFormatted}
                        </span>
                      </div>

                      {/* Seat Hold Countdown Timer progress bar */}
                      <div className="space-y-1.5 pt-2 border-t border-white/5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" /> Hold Expires In
                          </span>
                          <span className={`font-black tracking-widest ${timeLeft < 60 ? 'text-red-500 font-bold animate-pulse' : 'text-amber-500'}`}>
                            {formatTime(timeLeft)}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800/80 rounded-full h-1 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${timeLeft < 60 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}
                            style={{ width: `${(timeLeft / 300) * 100}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-zinc-500 leading-normal block">
                          Your selected seat is temporarily held for purchase.
                        </span>
                      </div>
                    </motion.div>
                  ) : holdExpired ? (
                    <motion.div
                      key="hold-expired"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="border border-red-500/30 bg-red-500/5 rounded-xl p-5 text-center text-red-400"
                    >
                      <Clock className="h-9 w-9 text-red-500 mx-auto mb-2.5 stroke-[1.5] animate-bounce" />
                      <p className="text-xs font-sans font-black tracking-wider uppercase text-red-500">Hold Timer Expired</p>
                      <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px] mx-auto text-center leading-normal">
                        Your 5-minute seat reservation has timed out features to keep bookings synchronized. Please select a couch seat again.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="no-selected"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border border-dashed border-zinc-700/60 rounded-xl p-6 text-center text-zinc-500"
                    >
                      <Armchair className="h-9 w-9 text-zinc-600 mx-auto mb-3 stroke-[1.5]" />
                      <p className="text-xs font-sans font-semibold">No Seat Selected Yet</p>
                      <p className="text-[10px] text-zinc-500 mt-1 max-w-[180px] mx-auto text-center leading-normal">
                        Click on any available cushion above to pick your viewing spot.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom confirmation action */}
            <div className="space-y-3 mt-6 border-t border-white/5 pt-4">
              <button
                disabled={!selectedSeat}
                onClick={handleConfirmReservation}
                className={`
                  w-full py-3.5 px-4 rounded-xl font-sans text-[11px] font-black tracking-widest uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg
                  ${selectedSeat 
                    ? 'bg-primary hover:bg-primary-hover text-on-primary hover:scale-[1.01] active:scale-[0.99] shadow-primary/15'
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed shadow-none'
                  }
                `}
              >
                <Ticket className="h-4 w-4" />
                <span>CONFIRM MY RESERVATION</span>
              </button>
              
              <div className="flex items-center justify-center gap-1.5 text-[9px] text-zinc-500 text-center font-sans">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/80 shrink-0" />
                <span>Seat holds inside room sync loop automatically</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

function selectedDayLabel(dayValue: string) {
  if (dayValue === 'today') return 'Today\'s stream';
  if (dayValue === 'tomorrow') return 'Tomorrow\'s stream';
  return dayValue;
}
