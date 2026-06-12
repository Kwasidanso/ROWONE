/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, X, Camera, Check, Calendar, Mail, Image as ImageIcon, Upload } from 'lucide-react';

interface EditProfileModalProps {
  username: string;
  dobString: string;
  userAvatarUrl: string;
  onClose: () => void;
  onSave: (newUsername: string, newDob: string, newAvatarUrl: string) => void;
  isPopcornPass?: boolean;
}

const PRESET_AVATARS = [
  {
    name: 'Cyber Neon',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    colorText: 'text-pink-400',
    borderClass: 'border-pink-500/40'
  },
  {
    name: 'Golden Scribe',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    colorText: 'text-amber-400',
    borderClass: 'border-amber-500/40'
  },
  {
    name: 'Silver Cinema',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    colorText: 'text-blue-400',
    borderClass: 'border-blue-500/40'
  },
  {
    name: 'Retro Reel',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150',
    colorText: 'text-emerald-400',
    borderClass: 'border-emerald-500/40'
  },
  {
    name: 'Showrunner',
    url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150',
    colorText: 'text-purple-400',
    borderClass: 'border-purple-500/40'
  }
];

export default function EditProfileModal({
  username,
  dobString,
  userAvatarUrl,
  onClose,
  onSave,
  isPopcornPass = false
}: EditProfileModalProps) {
  const [newUsername, setNewUsername] = useState(username);
  const [customAvatar, setCustomAvatar] = useState(userAvatarUrl);
  const [selectedPreset, setSelectedPreset] = useState(
    PRESET_AVATARS.find((av) => av.url === userAvatarUrl)?.url || ''
  );
  const [customAvatarInput, setCustomAvatarInput] = useState(
    PRESET_AVATARS.some((av) => av.url === userAvatarUrl) ? '' : userAvatarUrl
  );

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, JPEG, WEBP, GIF, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Selected image is too large. Please select an image smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setCustomAvatar(base64Url);
        setCustomAvatarInput('Uploaded: ' + file.name);
        setSelectedPreset('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, JPEG, WEBP, GIF, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Selected image is too large. Please select an image smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setCustomAvatar(base64Url);
        setCustomAvatarInput('Dropped: ' + file.name);
        setSelectedPreset('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Parse DOB string e.g. "January 15, 2000"
  let parsedMonth = 'January';
  let parsedDay = '15';
  let parsedYear = '2000';

  if (dobString) {
    try {
      // Split on space and comma
      const parts = dobString.replace(',', '').split(' ');
      if (parts.length === 3) {
        parsedMonth = parts[0];
        parsedDay = parts[1];
        parsedYear = parts[2];
      }
    } catch (e) {
      console.warn('DOB parsing failed, falling back to default', e);
    }
  }

  const [birthMonth, setBirthMonth] = useState(parsedMonth);
  const [birthDay, setBirthDay] = useState(parsedDay);
  const [birthYear, setBirthYear] = useState(parsedYear);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const years = Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - i));

  const handlePresetSelect = (url: string) => {
    setSelectedPreset(url);
    setCustomAvatar(url);
  };

  const handleCustomAvatarChange = (val: string) => {
    setCustomAvatarInput(val);
    setSelectedPreset('');
    setCustomAvatar(val || PRESET_AVATARS[0].url);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const finalDob = `${birthMonth} ${birthDay}, ${birthYear}`;
    onSave(newUsername.trim().toLowerCase(), finalDob, customAvatar);
  };

  const activeAvatar = customAvatar || PRESET_AVATARS[0].url;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none animate-fade-in font-sans">
      <div className="bg-surface-container-low border border-white/5 max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl relative p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header Title with X Close Button */}
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <div className="space-y-0.5 text-left">
            <span className="font-mono text-[8px] text-primary font-black tracking-widest uppercase">
              POP_PROFILE_INTERFACE
            </span>
            <h3 className="font-display font-black text-xl text-white uppercase tracking-wide">
              Edit Cinephile Profile
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 px-3 text-on-surface-variant hover:text-white text-xs font-black tracking-widest uppercase transition-all bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSaveSubmit} className="space-y-6">
          
          {/* Top layout: Interactive avatar settings */}
          <div className="flex flex-col md:flex-row items-center gap-6 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative group select-none cursor-pointer hover:scale-[1.03] active:scale-95 transition-all text-center shrink-0"
              title="Click to Upload Custom Profile Picture from Computer or Phone"
            >
              <div className={`h-20 w-20 rounded-full overflow-hidden flex items-center justify-center border-2 ${
                isPopcornPass 
                  ? 'border-yellow-400 ring-2 ring-yellow-400/20 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                  : 'border-primary/40 ring-1 ring-primary/10'
              }`}>
                <img 
                  src={activeAvatar} 
                  alt="Current Avatar Preview" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback source on copy/paste errors
                    (e.target as HTMLImageElement).src = PRESET_AVATARS[0].url;
                  }}
                />
              </div>
              <div className="absolute inset-0 bg-black/75 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200">
                <Camera className="h-4.5 w-4.5 text-white animate-pulse" />
                <span className="text-[7px] font-sans font-black uppercase text-white tracking-widest mt-0.5">Upload</span>
              </div>
            </div>

            <div className="flex-1 space-y-2 text-left w-full">
              <h4 className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest">
                Choose Preset Character Avatar
              </h4>
              <div className="grid grid-cols-5 gap-2.5">
                {PRESET_AVATARS.map((av) => {
                  const isPresetActive = selectedPreset === av.url;
                  return (
                    <button
                      key={av.name}
                      type="button"
                      onClick={() => handlePresetSelect(av.url)}
                      className={`h-11 w-11 rounded-xl overflow-hidden border-2 relative cursor-pointer active:scale-90 transition-all ${
                        isPresetActive ? 'border-primary scale-[1.05]' : 'border-white/10 hover:border-white/30'
                      }`}
                      title={av.name}
                    >
                      <img src={av.url} className="w-full h-full object-cover" />
                      {isPresetActive && (
                        <div className="absolute inset-x-0 bottom-0 bg-primary/80 flex items-center justify-center py-0.5">
                          <Check className="h-2 w-2 text-on-primary fill-on-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Upload Profile Picture Option */}
          <div className="space-y-1.5 text-left">
            <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider block">
              Upload Custom Image (From Computer or Phone)
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 group/uploader ${
                dragOver 
                  ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse' 
                  : 'border-white/10 hover:border-primary/40 bg-white/[0.01] hover:bg-white/[0.03]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="profile-avatar-device-file-input"
              />
              <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
                <Upload className="h-5 w-5 text-on-surface-variant group-hover/uploader:text-primary transition-all duration-300 transform group-hover/uploader:-translate-y-0.5" />
                <p className="font-sans text-[10px] font-bold text-on-surface">
                  Click to select photo or drag &amp; drop image
                </p>
                <p className="font-sans text-[8px] text-on-surface-variant tracking-wider">
                  Supports JPEG, PNG, WEBP, GIF (Max 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Paste Custom Avatar URL option */}
          <div className="space-y-1.5 text-left">
            <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider block">
              Or Paste Custom Image URL
            </label>
            <div className="relative flex items-center bg-surface-container border border-white/5 rounded-xl px-3.5 py-1 focus-within:border-primary transition-colors">
              <ImageIcon className="h-3.5 w-3.5 text-on-surface-variant mr-2 shrink-0" />
              <input
                type="text"
                placeholder="https://images.unsplash.com/your-custom-image-url..."
                value={customAvatarInput}
                onChange={(e) => handleCustomAvatarChange(e.target.value)}
                className="w-full bg-transparent border-none text-xs text-on-surface focus:outline-none focus:ring-0 py-2 placeholder:text-neutral-500 font-sans"
              />
            </div>
          </div>

          {/* Editable Display Username */}
          <div className="space-y-1.5 text-left">
            <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider block">
              Display Handle / Username
            </label>
            <div className="relative flex items-center bg-surface-container border border-white/5 rounded-xl px-4 py-1.5 focus-within:border-primary transition-colors">
              <User className="h-4 w-4 text-on-surface-variant mr-3 shrink-0" />
              <span className="text-on-surface-variant text-xs font-bold leading-none select-none">@</span>
              <input
                type="text"
                required
                placeholder="cinephile_99"
                value={newUsername}
                onChange={(e) => {
                  const cleaned = e.target.value.substring(0, 16).replace(/[^a-zA-Z0-9__-]/g, "");
                  setNewUsername(cleaned);
                }}
                className="w-full bg-transparent border-none text-xs text-on-surface focus:outline-none focus:ring-0 py-2 placeholder:text-neutral-500 font-sans font-semibold"
              />
            </div>
          </div>

          {/* Birthday Date of Birth Select Options (Age limits bypass evaluation sync) */}
          <div className="space-y-1.5 text-left">
            <label className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider block">
              Date of Birth (Determines Ratings Access)
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className="w-full bg-surface-container border border-white/5 rounded-xl px-3 py-2.5 text-xs text-on-surface focus:outline-none cursor-pointer font-sans"
                >
                  {months.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <select
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                  className="w-full bg-surface-container border border-white/5 rounded-xl px-3 py-2.5 text-xs text-on-surface focus:outline-none cursor-pointer font-sans"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="w-full bg-surface-container border border-white/5 rounded-xl px-3 py-2.5 text-xs text-on-surface focus:outline-none cursor-pointer font-sans"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[9px] text-[#dda75f] leading-tight">
              Classification systems automatically restrict 15+ &amp; 18+ titles based on the resulting verified age of your birthyear.
            </p>
          </div>

          {/* Form Actions footer segment */}
          <div className="flex gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 w-1/2 bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white font-sans text-[10px] font-black tracking-widest uppercase rounded-xl cursor-pointer transition-all text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-3 w-1/2 bg-primary text-on-primary font-sans text-[10px] font-black tracking-widest uppercase rounded-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 transition-transform text-center"
            >
              Save Profile
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
