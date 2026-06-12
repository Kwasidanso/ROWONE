/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Share2, 
  Copy, 
  Check, 
  Ticket, 
  Users, 
  Calendar, 
  DoorOpen, 
  X, 
  QrCode, 
  Sparkles, 
  Smartphone, 
  CheckCircle2, 
  Cpu, 
  Printer, 
  ScanLine,
  Download
} from 'lucide-react';
import QRCode from 'qrcode';
// @ts-ignore
import jsQR from 'jsqr';
import { BookedTicket } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface TicketModalProps {
  ticket: BookedTicket;
  onClose: () => void;
  onJoinRoom: (movieTitle: string) => void;
  initialShowKiosk?: boolean;
}

export default function TicketModal({ ticket, onClose, onJoinRoom, initialShowKiosk = false }: TicketModalProps) {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [showKiosk, setShowKiosk] = useState<boolean>(initialShowKiosk);
  
  // Kiosk Simulation States
  const [kioskStep, setKioskStep] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [ticketPrinted, setTicketPrinted] = useState<boolean>(false);

  // Real Web-Camera QR Scanner States & Ref Hooks
  const [useRealCamera, setUseRealCamera] = useState<boolean>(false);
  const [cameraPermissionState, setCameraPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const requestRef = React.useRef<number | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const stopCameraDevice = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCameraDevice = async () => {
    try {
      setCameraError(null);
      setCameraPermissionState('prompt');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      setCameraPermissionState('granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play().catch(e => {
          console.warn("Kiosk video stream autoplay warning", e);
        });
        setKioskStep('scanning');
        // Start continuous scanning analysis loop
        requestRef.current = requestAnimationFrame(scanCameraFrameStep);
      }
    } catch (err: any) {
      console.warn('Real camera error:', err);
      setCameraPermissionState('denied');
      setCameraError(err.message || 'Camera blocked or not available inside this frame.');
      setUseRealCamera(false);
      setKioskStep('idle');
    }
  };

  const scanCameraFrameStep = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_CURRENT_DATA) {
      requestRef.current = requestAnimationFrame(scanCameraFrameStep);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      try {
        const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });

        if (decoded) {
          const rawText = decoded.data;
          handleVerifyScannedPayload(rawText);
          return;
        }
      } catch (e) {
        // ignore raw decoding errors
      }
    }
    requestRef.current = requestAnimationFrame(scanCameraFrameStep);
  };

  const handleVerifyScannedPayload = (scannedText: string) => {
    stopCameraDevice();
    setUseRealCamera(false);

    try {
      let isMatched = false;
      let reason = "";

      // Check if it's JSON representing their private pass ticket QR payload
      if (scannedText.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(scannedText);
          if (parsed && parsed.ticketId === ticket.id) {
            isMatched = true;
          } else if (parsed && parsed.kiosk_protocol === 'ROW_ONE_BYPASS_VERIFIED_v419') {
            isMatched = true; // Authorized bypass
          } else {
            reason = `Scanned ticket code mismatches (Found ID: ${parsed ? parsed.ticketId : 'unknown'})`;
          }
        } catch {
          // ignore parsing error
        }
      }

      // Raw match verification fallback (e.g., if code scans raw ID only)
      if (!isMatched && (scannedText.trim() === ticket.id || scannedText.includes(ticket.id))) {
        isMatched = true;
      }

      if (isMatched) {
        setKioskStep('success');
        playBeep(true);
        setTimeout(() => {
          setTicketPrinted(true);
        }, 800);
      } else {
        playBeep(false);
        setCameraError(reason || `Code doesn't match current expected Ticket ID: ${ticket.id}`);
        setKioskStep('idle');
      }
    } catch (e: any) {
      playBeep(false);
      setCameraError(`Verification read error: ${e.message}`);
      setKioskStep('idle');
    }
  };

  useEffect(() => {
    if (useRealCamera && showKiosk) {
      startCameraDevice();
    } else {
      stopCameraDevice();
    }
    return () => {
      stopCameraDevice();
    };
  }, [useRealCamera, showKiosk]);

  const uniqueRoomId = `${ticket.movieTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}-${ticket.id.toLowerCase()}`;
  const inviteLink = `https://popcorn-cinema.app/room/${uniqueRoomId}`;

  // Generate actual QR code detailing ticket payload
  useEffect(() => {
    const payload = JSON.stringify({
      ticketId: ticket.id,
      movie: ticket.movieTitle,
      time: ticket.time,
      hall: ticket.hall,
      seat: ticket.seat,
      price: ticket.price,
      kiosk_protocol: 'ROW_ONE_BYPASS_VERIFIED_v419'
    });

    QRCode.toDataURL(payload, {
      margin: 1,
      width: 320,
      color: {
        dark: '#0c0a09', // Deep dark
        light: '#f5efeb' // Light/off-white background
      }
    })
    .then((url) => {
      setQrUrl(url);
    })
    .catch((err) => {
      console.error('Error generating QR code', err);
    });
  }, [ticket]);

  // Audio tone generator using Web Audio API (totally offline & zero-dependency)
  const playBeep = (success = true) => {
    try {
      const audioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxClass) return;
      const audioCtx = new audioCtxClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (success) {
        // High, short pleasant chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1450, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else {
        // Warning chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (err) {
      console.warn('Speaker access block or unsupported:', err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ROWONE Invite - ${ticket.movieTitle}`,
          text: `Join my private screening room for "${ticket.movieTitle}" at ${ticket.time}!`,
          url: inviteLink,
        });
        return;
      } catch (err) {
        console.log('Share canceled or failed:', err);
      }
    }
    handleCopyLink();
  };

  // Launch mock kiosk scan procedure
  const handleTriggerMockScan = () => {
    if (kioskStep !== 'idle') return;
    setKioskStep('scanning');
    setScanProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 8;
      if (progress >= 100) {
        clearInterval(interval);
        setScanProgress(100);
        setKioskStep('success');
        playBeep(true);
        // Turn print simulation state on automatically shortly after scan
        setTimeout(() => {
          setTicketPrinted(true);
        }, 800);
      } else {
        setScanProgress(progress);
      }
    }, 120);
  };

  // Reset simulator
  const handleResetKiosk = () => {
    setKioskStep('idle');
    setScanProgress(0);
    setTicketPrinted(false);
  };

  const handleExportTicketFile = () => {
    try {
      const translations: Record<string, Record<string, string>> = {
        en: {
          header: "POPCORN CINEMA COLLECTIVE - COZY SYNC PASS",
          ticketId: "TICKET ID",
          movie: "MOVIE REEL",
          time: "SHOWTIME",
          hall: "LOUNGE",
          seat: "SEAT NUMBER",
          price: "PRICE PAID",
          stamp: "STAMP DATE",
          bypass: "BYPASS CODE",
          link: "SYNC ROOM INVITE LINK",
          footer: "KEEP THIS FILE ACCESSIBLE OFFLINE FOR CONFIRMATION\nAT ENTRY CONTROL GATES OR CINE-COUCH PREMISES.",
        },
        es: {
          header: "COLECTIVO DE CINE POPCORN - SINCROPASE ACOGEDOR",
          ticketId: "ID DE BOLETO",
          movie: "PELÍCULA",
          time: "HORARIO",
          hall: "SALA",
          seat: "NÚMERO DE ASIENTO",
          price: "PRECIO PAGADO",
          stamp: "FECHA DE EMISIÓN",
          bypass: "CÓDIGO DE ACCESO",
          link: "ENLACE DE INVITACIÓN AL CUARTO SINCRO",
          footer: "MANTENGA ESTE ARCHIVO ACCESIBLE SIN CONEXIÓN PARA CONFIRMACIÓN\nEN LAS PUERTAS DE ENTRADA O EN LAS INSTALACIONES.",
        },
        fr: {
          header: "COLLECTIF POPCORN CINÉMA - PASS SYNC COSY",
          ticketId: "ID DU BILLET",
          movie: "BOBINE DE FILM",
          time: "SÉANCE",
          hall: "SALON OU SALLE",
          seat: "NUMÉRO DE SIÈGE",
          price: "PRIX PAYÉ",
          stamp: "DATE D'ÉMISSION",
          bypass: "CODE DE CONVALIDATION",
          link: "LIEN D'INVITATION DE SALLE SYNCHRONE",
          footer: "GARDER CE FICHIER ACCESSIBLE HORS LIGNE POUR CONFIRMATION\nAUX PORTES D'ENTRÉE OU DANS LES LOCAUX.",
        },
        zh: {
          header: "ROWONE POPCORN 影院 - 私人同步观影券",
          ticketId: "入场券编码",
          movie: "排映影片",
          time: "放映时间",
          hall: "影厅通道",
          seat: "预订座号",
          price: "票价支付",
          stamp: "出票日期",
          bypass: "内部验证码",
          link: "房间邀请链接",
          footer: "请妥善保存此文件，脱机状态下可在影院自助闸机\n或值班台出示确认入场。",
        }
      };

      const dict = translations[language] || translations['en'];

      const offlinePassContent = `==================================================
        ${dict.header}
==================================================
${dict.ticketId}:   ${ticket.id}
${dict.movie}:  ${ticket.movieTitle}
${dict.time}:    ${ticket.time}
${dict.hall}:      ${ticket.hall}
${dict.seat}: ${ticket.seat}
${dict.price}:  ${ticket.price}
${dict.stamp}:  ${new Date().toLocaleDateString()}
${dict.bypass}: ROW_ONE_BYPASS_VERIFIED_v419

--------------------------------------------------
${dict.link}:
${inviteLink}
--------------------------------------------------
${dict.footer}
==================================================`;

      const blob = new Blob([offlinePassContent], { type: 'text/plain;charset=utf-8' });
      const element = document.createElement('a');
      element.href = URL.createObjectURL(blob);
      element.download = `popcorn_pass_${ticket.id.toLowerCase()}_offline.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (e) {
      console.error("Export ticket error:", e);
    }
  };

  return (
    <motion.div 
      className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-4 overflow-y-auto" 
      id="ticket-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className="relative max-w-xl w-full bg-surface-container-lowest border border-white/5 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(255,42,77,0.15)] overflow-hidden" 
        id="ticket-modal-card"
        initial={{ y: '100vh', opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: '100vh', opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 26, stiffness: 140 }}
      >
        
        {/* Aesthetic cinema projection ambient glowing orb backdrops */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary/20 blur-3xl rounded-full pointer-events-none" />

        {/* Header with Ticket Icon */}
        <div className="flex justify-between items-center mb-5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
              <Ticket className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-sans text-[9px] font-black tracking-widest text-primary uppercase">BOOKING CONFIRMED</p>
              <h3 className="font-display font-bold text-lg text-on-surface">Your Cinema Pass</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-primary transition-all cursor-pointer"
            id="ticket-modal-close-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Realistic Cinema Ticket Container Stub */}
        <div className="relative bg-surface-container-high rounded-2xl border border-white/10 shadow-2xl overflow-hidden mb-5 group">
          
          {/* Ticket Edge Notches */}
          <div className="absolute top-1/2 -left-3 h-6 w-6 rounded-full bg-surface-container-lowest border-r border-white/10 transform -translate-y-1/2 z-20" />
          <div className="absolute top-1/2 -right-3 h-6 w-6 rounded-full bg-surface-container-lowest border-l border-white/10 transform -translate-y-1/2 z-20" />

          {/* Ticket Header Banner */}
          <div className="bg-gradient-to-r from-primary to-secondary px-6 py-3.5 flex justify-between items-center text-black">
            <span className="font-display font-extrabold text-[#030303] text-xs tracking-widest uppercase">
              POPCORN CINEMA COLLECTIVE
            </span>
            <span className="font-mono text-[10px] bg-black text-secondary px-2 py-0.5 rounded font-black tracking-wider">
              {ticket.id}
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-12 gap-5 relative">
            {/* Left Column: Movie Poster and details */}
            <div className="sm:col-span-4 flex sm:flex-col items-center justify-center gap-3">
              <div className="relative w-24 sm:w-full aspect-[2/3] rounded-lg overflow-hidden border border-white/10 shadow-lg">
                <img
                  src={ticket.imageUrl}
                  alt={ticket.movieTitle}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right Column: Key Details */}
            <div className="sm:col-span-8 flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <span className="font-sans text-[9px] font-black text-secondary uppercase tracking-widest">
                  COMMUNAL PREMIERE
                </span>
                <h4 className="font-display font-bold text-xl text-on-surface tracking-tight leading-none group-hover:text-primary transition-colors">
                  {ticket.movieTitle}
                </h4>
              </div>

              {/* Time, Hall, Seat Info Grid */}
              <div className="grid grid-cols-3 gap-2.5 bg-black/40 rounded-xl p-3 border border-white/5">
                <div className="flex flex-col">
                  <span className="font-sans text-[8px] font-black text-on-surface-variant uppercase tracking-wider">TIME</span>
                  <span className="font-sans text-[11px] font-extrabold text-on-surface leading-snug">{ticket.time}</span>
                </div>
                <div className="flex flex-col border-l border-white/5 pl-2.5">
                  <span className="font-sans text-[8px] font-black text-on-surface-variant uppercase tracking-wider">LOUNGE</span>
                  <span className="font-sans text-[11px] font-extrabold text-on-surface leading-snug truncate">{ticket.hall.split(' ')[0]}</span>
                </div>
                <div className="flex flex-col border-l border-white/5 pl-2.5">
                  <span className="font-sans text-[8px] font-black text-on-surface-variant uppercase tracking-wider">SEAT</span>
                  <span className="font-sans text-[11px] font-extrabold text-secondary leading-snug">{ticket.seat}</span>
                </div>
              </div>

              {/* Unique Sync Room Invite link detail */}
              <div className="space-y-1.5">
                <span className="font-sans text-[9px] font-black text-on-surface-variant uppercase tracking-widest block">
                  UNIQUE SYNC ROOM LINK
                </span>
                <div className="flex items-center justify-between gap-2 bg-black/60 px-3 py-2 rounded-xl border border-white/5 text-xs font-mono text-on-surface-variant">
                  <span className="truncate max-w-[150px] md:max-w-[210px]">{inviteLink}</span>
                  <button 
                    onClick={handleCopyLink}
                    className="shrink-0 p-1.5 hover:bg-white/5 text-on-surface hover:text-primary rounded-lg transition-colors cursor-pointer"
                    title="Copy Ticket URL"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Barcode & QR Code Integration Sector */}
          <div className="border-t border-dashed border-white/10 px-6 py-4 flex items-center justify-between bg-black/45 select-none">
            <div className="flex flex-col gap-0.5">
              <span className="font-sans text-[8px] text-on-surface-variant tracking-wider uppercase">PRICE</span>
              <span className="font-sans text-xs font-black text-on-surface">{ticket.price}</span>
            </div>

            {/* Aesthetic Mini QR embedded inside the ticket decoration */}
            <div className="flex items-center gap-3">
              <span className="font-sans text-[9px] font-black text-right text-on-surface-variant uppercase tracking-tight block max-w-[85px] leading-tight">
                SCAN QR PASS FOR ENTRY
              </span>
              <div className="w-11 h-11 bg-white p-0.5 rounded border border-white/10 shrink-0">
                {qrUrl ? (
                  <img src={qrUrl} alt="Quick scan QR" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-stone-200 animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Digital Kiosk Launch Sector */}
        <div className="mb-6 p-4 bg-[#110e0e]/80 border border-white/5 rounded-2xl flex flex-col sm:flex-row items-center gap-4 relative">
          <div className="w-14 h-14 bg-white p-1 rounded-xl shrink-0 border border-stone-800 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            {qrUrl ? (
              <img src={qrUrl} alt="Kiosk verify code" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-stone-200 animate-pulse rounded" />
            )}
          </div>
          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[#dda75f]">
              <QrCode className="h-3.5 w-3.5" />
              <span className="font-sans text-[9px] font-black tracking-widest uppercase">VIRTU-GATE® KIOSK PASS</span>
            </div>
            <p className="font-sans text-[10px] text-on-surface-variant leading-relaxed">
              Scan this verified QR ticket at our entrance kiosk simulator to print your physical seat receipt and gain instant entry.
            </p>
          </div>
          <button
            onClick={() => {
              handleResetKiosk();
              setShowKiosk(true);
            }}
            className="w-full sm:w-auto shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#dda75f]/20 to-[#dda75f]/5 border border-[#dda75f]/30 hover:border-[#dda75f] text-sans text-[9px] font-black tracking-widest uppercase text-[#dda75f] hover:text-[#fff] transition-all cursor-pointer shadow-sm"
          >
            ⚡ Scan in Kiosk
          </button>
        </div>

        {/* CTA share buttons row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleShareLink}
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-outline hover:border-primary text-sans text-[10px] font-black tracking-widest uppercase text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
          >
            <Share2 className="h-4 w-4" />
            <span>Share Invite</span>
          </button>

          <button
            onClick={handleExportTicketFile}
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-[#dda75f]/30 hover:border-[#dda75f] text-sans text-[10px] font-black tracking-widest uppercase text-on-surface-variant hover:text-[#dda75f] bg-[#dda75f]/5 hover:bg-[#dda75f]/10 transition-all cursor-pointer"
            title="Download offline localized ticket"
          >
            <Download className="h-4 w-4 text-[#dda75f]" />
            <span>
              {language === 'es' ? 'Pase Offline' : language === 'fr' ? 'Pass Offline' : language === 'zh' ? '离线通行证' : 'Offline Pass'}
            </span>
          </button>

          <button
            onClick={() => {
              onClose();
              onJoinRoom(ticket.movieTitle);
            }}
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-sans text-[10px] font-black tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-primary/20"
          >
            <DoorOpen className="h-4 w-4" />
            <span>Enter Room</span>
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-white transition-all font-sans text-[9px] font-black tracking-wider uppercase cursor-pointer"
          >
            Manage Bookings Later
          </button>
        </div>

      </motion.div>

      {/* --- KIOSK SIMULATOR OVERLAY MODAL --- */}
      <AnimatePresence>
        {showKiosk && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-[#070505]/98 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="relative max-w-2xl w-full bg-[#110e0e] border border-white/10 rounded-3xl p-6 md:p-8 shadow-[0_0_80px_rgba(221,167,95,0.15)] flex flex-col justify-between overflow-hidden">
              
              {/* Backlight flare glow */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#dda75f]/5 rounded-full filter blur-[100px] pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={() => setShowKiosk(false)}
                className="absolute top-6 right-6 h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-on-surface hover:text-primary transition-all cursor-pointer z-50"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              {/* Virtual Kiosk Header */}
              <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                <div className="p-2 bg-[#dda75f]/10 border border-[#dda75f]/30 rounded-xl text-[#dda75f]">
                  <Cpu className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-display font-black text-[#dda75f] text-[10px] tracking-[0.25em] uppercase">
                    ROWONE SYSTEMS GROUP CO.
                  </h4>
                  <h3 className="font-sans font-black text-lg text-white">
                    Virtual Cine-Kiosk Ticket Gate
                  </h3>
                </div>
              </div>

              {/* Grid content mapping Mobile Pass -> Laser Scanner Frame */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Left Panel: The Virtual Smartphone displaying their pass */}
                <div className="md:col-span-5 flex flex-col items-center">
                  <span className="font-sans text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-3">
                    PRESENT PASS
                  </span>
                  
                  {/* Phone Mockup Frame */}
                  <motion.div 
                    animate={kioskStep === 'scanning' ? {
                      y: [0, -10, 15, 0],
                      scale: [1, 1.05, 1.01, 1],
                      transition: { duration: 1.5, repeat: Infinity }
                    } : { y: 0, scale: 1 }}
                    className="w-48 bg-stone-900 border-[6px] border-stone-800 rounded-[30px] p-2.5 shadow-2xl relative"
                  >
                    {/* Speaker/Camera notch */}
                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-4 bg-stone-900 rounded-full z-20 flex items-center justify-center">
                      <div className="w-4 h-1 bg-stone-800 rounded-full" />
                    </div>

                    <div className="bg-black rounded-[20px] p-3 text-center space-y-4 pt-5 select-none relative overflow-hidden flex flex-col items-center">
                      <div className="space-y-0.5">
                        <span className="font-sans text-[7px] font-black text-primary tracking-widest block uppercase">ROWONE PASS</span>
                        <h5 className="font-sans font-bold text-[10px] text-zinc-300 truncate max-w-[130px]">{ticket.movieTitle}</h5>
                      </div>
                      
                      {/* Active glowing ticket QR representation */}
                      <div className="relative p-1 bg-white rounded-lg inline-block shadow-lg">
                        {qrUrl && <img src={qrUrl} alt="Smartphone QR" className="w-24 h-24 object-contain" />}
                        {kioskStep === 'scanning' && (
                          <motion.div 
                            animate={{ opacity: [0.1, 0.4, 0.1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="absolute inset-0 bg-primary/20 rounded-lg border-2 border-primary"
                          />
                        )}
                      </div>

                      {/* Display scanner alignment tags */}
                      <div className="bg-[#111] px-2 py-1 rounded border border-white/5 text-[8px] font-mono text-zinc-400">
                        {kioskStep === 'success' ? (
                          <span className="text-green-400 font-bold">✦ APERTURE ALIGNED</span>
                        ) : kioskStep === 'scanning' ? (
                          <span className="animate-pulse text-[#dda75f]">SYNCING LAUNCH...</span>
                        ) : (
                          <span>PRESENT TO LENS</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Center / Scanner Bed connection bridge */}
                <div className="md:col-span-1 flex items-center justify-center">
                  <div className="h-0.5 w-6 md:h-12 md:w-0.5 bg-white/10" />
                </div>

                {/* Right Panel: Kiosk Scanner Bed & laser sweep feedback */}
                <div className="md:col-span-6 space-y-4">
                  <span className="font-sans text-[8px] font-black text-on-surface-variant uppercase tracking-widest block text-center md:text-left">
                    KIOSK DECODER LENS
                  </span>

                  {/* Laser Scan Camera field container */}
                  <div className="h-48 rounded-2xl bg-black border border-white/10 relative overflow-hidden flex items-center justify-center">
                    
                    {/* Live Video Device Feed */}
                    {useRealCamera && (
                      <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover rounded-2xl z-0"
                        playsInline
                        muted
                      />
                    )}

                    {/* Hidden canvas processor frame */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Laser Sweep Beam */}
                    {kioskStep === 'scanning' && (
                      <motion.div 
                        initial={{ top: '5%' }}
                        animate={{ top: '95%' }}
                        transition={{
                          duration: 1.1,
                          repeat: Infinity,
                          repeatType: "reverse",
                          ease: "easeInOut"
                        }}
                        className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)] z-10"
                      />
                    )}

                    {kioskStep === 'success' && (
                      <div className="absolute inset-x-0 h-0.5 bg-green-500 shadow-[0_0_12px_rgba(34,197,94,1)] z-10 top-1/2" />
                    )}

                    {/* Camera view indicators */}
                    <div className="absolute top-4 left-4 font-mono text-[8px] text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 select-none z-20">
                      <span className={`w-1.5 h-1.5 rounded-full ${useRealCamera ? 'bg-red-500 animate-pulse' : kioskStep === 'scanning' ? 'bg-red-500 animate-ping' : kioskStep === 'success' ? 'bg-green-500' : 'bg-orange-500'}`} />
                      <span>{useRealCamera ? 'CAM: LIVE_LENS_INT' : 'CAM: SYSTEM_MOCK_INT'}</span>
                    </div>

                    <div className="absolute bottom-4 right-4 font-mono text-[8px] text-zinc-600 select-none z-20">
                      SYS v4.19.0
                    </div>

                    {/* Scanner graphic grid layout */}
                    <div className="absolute inset-6 border border-dashed border-white/5 rounded-xl pointer-events-none flex items-center justify-center z-10">
                      <div className="w-12 h-12 border-l border-t border-white/30 absolute top-0 left-0" />
                      <div className="w-12 h-12 border-r border-t border-white/30 absolute top-0 right-0" />
                      <div className="w-12 h-12 border-l border-b border-white/30 absolute bottom-0 left-0" />
                      <div className="w-12 h-12 border-r border-b border-white/30 absolute bottom-0 right-0" />
                    </div>

                    {/* Error overlay descriptor */}
                    {cameraError && (
                      <div className="absolute inset-0 bg-stone-950/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4">
                        <span className="text-[8px] font-sans font-black text-red-500 uppercase tracking-widest block mb-1">
                          ⚠️ SCAN EXCEPTION
                        </span>
                        <p className="text-[10px] text-zinc-300 font-sans leading-relaxed text-center max-w-xs">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCameraError(null);
                            if (useRealCamera) {
                              startCameraDevice();
                            }
                          }}
                          className="mt-3.5 py-1.5 px-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-[9px] font-sans font-black uppercase text-white cursor-pointer transition-all"
                        >
                          Acknowledge &amp; Reset
                        </button>
                      </div>
                    )}

                    {/* Decode Visual Center Feedback states */}
                    <div className="z-20 text-center space-y-2 p-4 select-none">
                      {kioskStep === 'idle' && (
                        <div className="space-y-3">
                          <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 mx-auto flex items-center justify-center text-zinc-400">
                            <ScanLine className="h-6 w-6" />
                          </div>
                          <p className="font-sans text-[11px] font-black text-zinc-300 uppercase tracking-wider">
                            Awaiting validation pass
                          </p>
                        </div>
                      )}

                      {kioskStep === 'scanning' && !useRealCamera && (
                        <div className="space-y-2">
                          <p className="font-mono text-xl font-bold tracking-widest text-[#dda75f]">
                            {scanProgress}%
                          </p>
                          <div className="w-28 bg-stone-900 border border-white/5 h-1 rounded-full overflow-hidden mx-auto">
                            <div className="bg-[#dda75f] h-full transition-all duration-100" style={{ width: `${scanProgress}%` }} />
                          </div>
                          <p className="font-mono text-[8px] text-zinc-500 tracking-wider uppercase">
                            DECODING MATRIX SEGMENT
                          </p>
                        </div>
                      )}

                      {kioskStep === 'scanning' && useRealCamera && (
                        <div className="bg-black/50 px-3 py-1.5 rounded-lg border border-[#dda75f]/20 backdrop-blur-sm">
                          <p className="font-sans text-[10px] font-black text-white uppercase tracking-wider animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping shrink-0" />
                            Align ticket QR in scanner range...
                          </p>
                        </div>
                      )}

                      {kioskStep === 'success' && (
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="space-y-1.5"
                        >
                          <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto" />
                          <p className="font-sans text-xs font-black text-green-400 uppercase tracking-widest">
                            VERIFIED APPROVED
                          </p>
                          <p className="font-mono text-[9px] text-zinc-500 tracking-wide uppercase leading-none">
                            TICKET CODE: {ticket.id}
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Dual Mode launch triggers */}
                  {kioskStep === 'idle' && (
                    <div className="grid grid-cols-2 gap-3" id="scanner-action-dock">
                      <button
                        type="button"
                        onClick={handleTriggerMockScan}
                        className="py-3 px-2 rounded-xl border border-white/5 hover:border-[#dda75f]/30 bg-stone-900/30 hover:bg-[#dda75f]/5 text-zinc-400 hover:text-[#dda75f] text-sans text-[10px] font-black tracking-widest uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Mock Scanner</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleResetKiosk();
                          setUseRealCamera(true);
                        }}
                        className="py-3 px-2 rounded-xl bg-[#dda75f] hover:bg-amber-500 text-black font-sans text-[10px] font-black tracking-widest uppercase transition-all cursor-pointer shadow-lg shadow-[#dda75f]/20 flex items-center justify-center gap-1.5"
                      >
                        <ScanLine className="h-3.5 w-3.5" />
                        <span>Physical Cam</span>
                      </button>
                    </div>
                  )}

                  {kioskStep === 'scanning' && (
                    <div className="space-y-2">
                      {useRealCamera ? (
                        <button
                          type="button"
                          onClick={() => {
                            stopCameraDevice();
                            setUseRealCamera(false);
                            setKioskStep('idle');
                          }}
                          className="w-full py-3 rounded-xl border border-red-500/30 hover:border-red-500 text-red-500 font-sans text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-1.5 cursor-pointer bg-red-950/20 hover:bg-red-950/40 transition-all"
                        >
                          <X className="h-4 w-4" />
                          <span>Close Camera Feed</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-sans text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-2"
                        >
                          <span>Simulated match in progress...</span>
                        </button>
                      )}
                    </div>
                  )}

                  {kioskStep === 'success' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleResetKiosk();
                        setUseRealCamera(false);
                      }}
                      className="w-full py-3 rounded-xl border border-white/10 hover:border-[#dda75f]/40 text-sans text-[9px] font-black tracking-widest uppercase text-on-surface-variant hover:text-[#dda75f] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Reset / Scan Another</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Thermal receipt printer rollout container on success */}
              <AnimatePresence>
                {ticketPrinted && kioskStep === 'success' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mt-6 border-t border-dashed border-white/10 pt-6 overflow-hidden"
                  >
                    <div className="text-center mb-3">
                      <span className="font-sans text-[8px] font-black text-[#dda75f] uppercase tracking-widest inline-flex items-center gap-1">
                        <Printer className="h-3 w-3" /> PRINTED ENTRY RECEIPT SLIP
                      </span>
                    </div>

                    {/* Classic Cinema Thermal printout paper mock */}
                    <div className="max-w-md mx-auto bg-white text-stone-900 p-5 rounded-md shadow-2xl relative select-none font-mono text-[10px] space-y-4 border-l-[3px] border-[#dda75f] text-left">
                      
                      {/* Top serrated tooth edge */}
                      <div className="absolute top-0 inset-x-0 h-1.5 flex justify-between overflow-hidden opacity-50" style={{ transform: 'translateY(-100%)' }}>
                        {Array.from({ length: 30 }).map((_, i) => (
                          <div key={i} className="w-2.5 h-2.5 bg-white rotate-45 shrink-0" style={{ transform: 'translateY(1.2px) rotate(45deg)' }} />
                        ))}
                      </div>

                      {/* Receipt Header */}
                      <div className="text-center space-y-1 pb-3 border-b border-stone-300">
                        <h4 className="font-extrabold text-sm tracking-widest uppercase">ROWONE SPECTRE GATE</h4>
                        <p className="text-[9px] text-stone-600">KIOSK VERIFIED • TICKET ID: {ticket.id}</p>
                        <p className="text-[8px] text-stone-500">PRINTED: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>

                      {/* Grid lists */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="font-semibold text-stone-500 uppercase">THEATER REEL:</span>
                          <span className="font-bold text-stone-900 text-right">{ticket.movieTitle}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-stone-500 uppercase">ACCESS GATE:</span>
                          <span className="font-bold text-stone-900">{ticket.hall}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-stone-500 uppercase">ASSIGNED SEAT:</span>
                          <span className="font-bold text-stone-900">{ticket.seat}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-stone-500 uppercase">ADMIT COUNT:</span>
                          <span className="font-bold text-stone-900">1 PERSON</span>
                        </div>
                      </div>

                      {/* Custom footer barcode */}
                      <div className="pt-3 border-t border-dashed border-stone-300 text-center space-y-2">
                        <div className="flex justify-center items-center gap-[1px] h-6">
                          {[1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 1].map((w, idx) => (
                            <div key={idx} className="bg-stone-950 h-full" style={{ width: `${w}px` }} />
                          ))}
                        </div>
                        <p className="text-[8px] text-stone-600 font-bold uppercase tracking-wider">
                          ★ gate ticket validated for entry. enjoy! ★
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action row to enter hall */}
              <div className="flex gap-4 mt-6 border-t border-white/5 pt-5 relative">
                <button
                  onClick={() => setShowKiosk(false)}
                  className="flex-1 py-3 text-sans text-[10px] font-black tracking-widest uppercase border border-white/5 hover:border-white/10 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Close Kiosk View
                </button>

                <button
                  onClick={() => {
                    setShowKiosk(false);
                    onClose();
                    onJoinRoom(ticket.movieTitle);
                  }}
                  className="flex-1 py-3 text-sans text-[10px] font-black tracking-widest uppercase rounded-xl bg-green-500 hover:bg-green-600 text-black font-bold transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-green-500/10"
                >
                  <DoorOpen className="h-4 w-4" />
                  <span>Enter Screening Hall</span>
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
