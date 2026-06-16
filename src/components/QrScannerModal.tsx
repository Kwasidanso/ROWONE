/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, QrCode, UploadCloud, AlertCircle, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import jsQR from 'jsqr';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToContent: (contentType: 'movie' | 'reel', slug: string) => void;
}

export default function QrScannerModal({ isOpen, onClose, onNavigateToContent }: QrScannerModalProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);

  // Sound effect generator for the diagnostic scanner beep
  const playPulseBeep = (freq = 880, duration = 0.15) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio check beep error blocked by browser ambient profile state:', e);
    }
  };

  // Start live QR camera tracking
  const startCamera = async () => {
    setScanError(null);
    setScannedResult(null);
    
    // Stop any existing stream
    stopCamera();

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS support
        await videoRef.current.play();
        setIsScanning(true);
        setHasCameraPermission(true);
        // Begin recursive capture loops
        requestRef.current = requestAnimationFrame(scanTick);
      }
    } catch (err: any) {
      console.warn('Media capture device allocation failed:', err);
      setHasCameraPermission(false);
      setScanError('Could not gain camera stream access. Verify permission grants or use file uploader fallback tab.');
    }
  };

  // Stop camera stream safely
  const stopCamera = () => {
    setIsScanning(false);
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

  // Switch facing camera lens mode
  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Continuous loop checking each video capture frame for QR data
  const scanTick = () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
      if (isScanning && isOpen && activeTab === 'camera') {
        requestRef.current = requestAnimationFrame(scanTick);
      }
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          handleFoundCode(code.data);
          return; // Stop scanning recurse upon finding QR code
        }
      } catch (err) {
        console.warn('AnimationFrame imageData lookup failed:', err);
      }
    }

    if (isOpen && activeTab === 'camera') {
      requestRef.current = requestAnimationFrame(scanTick);
    }
  };

  // Extract content slug/type payload from any ROWONE format string
  const handleFoundCode = (dataString: string) => {
    console.log('🔮 Target QR String Match:', dataString);
    playPulseBeep(1000, 0.25);
    setScannedResult(dataString);
    stopCamera();

    // Check query validation URL pattern
    try {
      // Handles both absolute URLs e.g. https://www.rowone.xyz/movies/my-slug
      // And plain slash routes /reels/summer-vacation
      const lower = dataString.trim().toLowerCase();
      
      let contentType: 'movie' | 'reel' | null = null;
      let slug = '';

      if (lower.includes('/reels/')) {
        contentType = 'reel';
        const parts = lower.split('/reels/');
        slug = parts[parts.length - 1].split('?')[0];
      } else if (lower.includes('/movies/')) {
        contentType = 'movie';
        const parts = lower.split('/movies/');
        slug = parts[parts.length - 1].split('?')[0];
      } else {
        // Fallback or general match
        // E.g. raw slug or simple non-url structured text: look for patterns
        const items = lower.split('/');
        const last = items[items.length - 1].trim();
        if (lower.startsWith('reel') || items.includes('reels')) {
          contentType = 'reel';
          slug = last;
        } else if (lower.startsWith('movie') || items.includes('movies')) {
          contentType = 'movie';
          slug = last;
        } else {
          // Assume movie is standard fallback
          contentType = 'movie';
          slug = last;
        }
      }

      // Check for garbage empty slug
      slug = slug.replace(/[^a-z0-9-]/gi, '');
      if (slug && contentType) {
        setTimeout(() => {
          onNavigateToContent(contentType!, slug);
          onClose();
        }, 1500);
      } else {
        setScanError(`Unrecognized code contents: "${dataString}". It must point to a valid film page.`);
      }
    } catch (parseErr) {
      setScanError('Failed to parse scan package content data.');
    }
  };

  // Parse custom uploaded image file
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError(null);
    setScannedResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
              handleFoundCode(code.data);
            } else {
              setScanError('Could not find a valid ROWONE QR code inside this image. Ensure the image is crisp and well-lit.');
            }
          } catch (err) {
            setScanError('Failed to read and process image metadata.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Start process when modal renders or tab shifts
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'camera') {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, activeTab, facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      {/* Container Card */}
      <div className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-xs text-white uppercase tracking-wider">QR Scanner Hub</h3>
              <p className="text-[9px] font-sans font-bold text-zinc-400 lowercase leading-tight">point camera to load film logs instantly</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95 duration-200 rounded-full"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Dynamic Tabs switcher */}
        <div className="flex border-b border-white/5 bg-zinc-950 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 text-[10px] font-sans font-black tracking-wider uppercase rounded-xl flex items-center justify-center gap-1.5 duration-200 ${
              activeTab === 'camera' 
                ? 'bg-zinc-900 text-[#dda75f] border border-white/5' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Use Video Camera</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-[10px] font-sans font-black tracking-wider uppercase rounded-xl flex items-center justify-center gap-1.5 duration-200 ${
              activeTab === 'upload' 
                ? 'bg-zinc-900 text-[#dda75f] border border-white/5' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Upload QR Image File</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-grow overflow-y-auto p-6 flex flex-col items-center justify-center min-h-[300px]">
          
          {scanError && (
            <div className="w-full mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 animate-slide-up">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <div className="text-[10px] font-sans font-bold leading-relaxed">{scanError}</div>
            </div>
          )}

          {scannedResult ? (
            <div className="text-center space-y-4 animate-scale-up py-4">
              <div className="w-16 h-16 bg-[#dda75f]/10 border border-[#dda75f]/30 rounded-full flex items-center justify-center mx-auto text-[#dda75f] animate-pulse">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-black text-white text-xs uppercase tracking-wide">QR Code Decoded Successfully</h4>
                <p className="text-[8px] font-mono text-[#dda75f] select-all underline break-all max-w-[280px] mx-auto py-1 px-2.5 bg-white/5 rounded-lg border border-white/5">
                  {scannedResult}
                </p>
                <p className="text-[10px] font-sans font-bold text-zinc-400 lowercase leading-relaxed flex items-center justify-center gap-1.5 pt-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>loading movie detail ledger...</span>
                </p>
              </div>
            </div>
          ) : activeTab === 'camera' ? (
            /* Camera Scanner Layout */
            <div className="w-full relative max-w-[320px] aspect-square rounded-2xl overflow-hidden bg-black border border-white/5 flex items-center justify-center">
              
              {/* Invisible Canvas for calculations */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Feed video stream */}
              <video 
                ref={videoRef}
                className="w-full h-full object-cover relative z-10"
              />

              {/* Camera Scanner Reticle Frame overlay */}
              <div className="absolute inset-0 z-20 pointer-events-none border border-white/5 flex items-center justify-center p-8">
                {/* Target alignment crosshairs box */}
                <div className="w-full h-full border border-dashed border-[#dda75f]/40 rounded-xl relative">
                  
                  {/* Top-Left Corner Bracket */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#dda75f]" />
                  {/* Top-Right Corner Bracket */}
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#dda75f]" />
                  {/* Bottom-Left Corner Bracket */}
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#dda75f]" />
                  {/* Bottom-Right Corner Bracket */}
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#dda75f]" />

                  {/* Pulsing Horizontal Scan-Line */}
                  <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-[bounce_3s_infinite]" />
                </div>
              </div>

              {!isScanning && (
                <div className="absolute inset-0 z-30 bg-zinc-950 flex flex-col items-center justify-center p-4 text-center space-y-3">
                  <Camera className="h-8 w-8 text-zinc-600 animate-pulse" />
                  <p className="text-[10px] font-sans font-bold text-zinc-400 leading-relaxed">
                    Camera stream is loading or inactive. Ensure permissions are set.
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3.5 py-1.5 bg-primary rounded-lg text-on-primary text-[9px] font-sans font-black uppercase tracking-wider hover:opacity-90 duration-150 cursor-pointer"
                  >
                    Activate Camera
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Image File Upload Tab Layout */
            <div className="w-full max-w-[320px] flex flex-col items-center justify-center">
              <label className="w-full aspect-square border-2 border-dashed border-white/10 hover:border-primary/50 bg-white/5 hover:bg-white/8 transition-all duration-300 rounded-2xl cursor-pointer flex flex-col items-center justify-center p-6 text-center group">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload} 
                />
                <div className="p-3 bg-zinc-900 border border-white/5 rounded-2xl group-hover:scale-110 duration-200">
                  <UploadCloud className="h-6 w-6 text-zinc-400 group-hover:text-[#dda75f] duration-200" />
                </div>
                <h4 className="mt-3 text-xs font-display font-medium text-white uppercase tracking-wide">Drop or Browse image file</h4>
                <p className="text-[9px] font-sans font-bold text-zinc-500 lowercase mt-1 leading-relaxed px-4">
                  select an exported screenshot, picture or code file pointing to a ROWONE link
                </p>
              </label>
            </div>
          )}

          {/* Facing camera switch action (only available on camera tab with camera running) */}
          {activeTab === 'camera' && isScanning && (
            <button
              type="button"
              onClick={toggleCameraFacing}
              className="mt-4 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-xl text-[9px] font-sans font-black tracking-wider uppercase text-zinc-300 flex items-center gap-1.5 cursor-pointer active:scale-95 duration-100"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Rotate Lens ({facingMode === 'user' ? 'Front' : 'Back'})</span>
            </button>
          )}

        </div>

        {/* Explanatory Footer */}
        <div className="px-6 py-3 border-t border-white/5 bg-zinc-950/80 text-center flex items-center justify-center gap-1.5 select-none">
          <Sparkles className="h-3 w-3 text-[#dda75f]" />
          <span className="text-[8px] font-sans font-black text-zinc-500 uppercase tracking-widest">
            Automatic cinema routing logic enabled
          </span>
        </div>

      </div>
    </div>
  );
}
