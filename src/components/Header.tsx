/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Film, Search, User, Bell, Users, LogOut, Settings, Edit3, QrCode, Sparkles } from 'lucide-react';
import NotificationDropdown, { AppNotification } from './NotificationDropdown';
import { useLanguage } from '../context/LanguageContext';
import RowOneLogo from './RowOneLogo';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isLoggedIn: boolean;
  onOpenAuth: () => void;
  onOpenSearch: () => void;
  onOpenQrScanner?: () => void;
  notifications: AppNotification[];
  onNotificationAction: (notif: AppNotification) => void;
  onClearNotifications: () => void;
  isPopcornPass?: boolean;
  onToggleFriends?: () => void;
  onEnterTvMode?: () => void;
  onTriggerSupport?: () => void;
  username?: string;
  userAvatarUrl?: string;
  onSignOut?: () => void;
  onEditProfile?: () => void;

  // Dual Registration workspace switcher props
  activeMode?: 'individual' | 'studio';
  hasStudioAccount?: boolean;
  onToggleActiveMode?: (mode: 'individual' | 'studio') => void;
  onRegisterStudioClick?: () => void;
}

export default function Header({
  currentTab,
  setCurrentTab,
  isLoggedIn,
  onOpenAuth,
  onOpenSearch,
  onOpenQrScanner,
  notifications,
  onNotificationAction,
  onClearNotifications,
  isPopcornPass = false,
  onToggleFriends,
  onEnterTvMode,
  onTriggerSupport,
  username,
  userAvatarUrl,
  onSignOut,
  onEditProfile,

  // Switcher parameters
  activeMode = 'individual',
  hasStudioAccount = false,
  onToggleActiveMode,
  onRegisterStudioClick,
}: HeaderProps) {
  const { t } = useLanguage();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger scroll check on mount in case they refreshed the page scrolled down
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showDropdown && !target.closest('.notification-bell-container')) {
        setShowDropdown(false);
      }
      if (showProfileDropdown && !target.closest('.profile-dropdown-container')) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showDropdown, showProfileDropdown]);

  return (
    <header 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 md:px-8 h-16 transition-all duration-500 ease-in-out ${
        isScrolled || isHovered || currentTab !== 'home'
          ? 'bg-surface-container-low/95 backdrop-blur-md border-b border-white/5 shadow-2xl shadow-black/40' 
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div 
        className="flex items-center gap-2.5 cursor-pointer group active:scale-95 duration-200"
        onClick={() => {
          setShowDropdown(false);
          setCurrentTab('home');
        }}
      >
        <RowOneLogo size={28} />
        <span className="font-display font-black text-xl md:text-2xl italic tracking-tighter select-none transition-all duration-300">
          <span className="text-[#dda75f] group-hover:text-[#fde2af] transition-all duration-300 group-hover:[text-shadow:0_0_12px_rgba(253,226,175,0.7)]">Row</span>
          <span className="text-white group-hover:text-white/95 transition-all duration-300 group-hover:[text-shadow:0_0_10px_rgba(255,255,255,0.5)]">One</span>
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-8">
        {(['home', 'discover', 'browse', 'history', 'studio'] as const).map((tab) => {
          const isActive = currentTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setShowDropdown(false);
                setCurrentTab(tab);
              }}
              className={`font-sans font-bold text-xs tracking-widest uppercase py-1 border-b-2 transition-all duration-300 transform origin-center hover:scale-110 ${
                isActive
                  ? 'text-primary border-primary hover:text-[#dda75f]'
                  : 'text-[#f5efeb]/80 border-transparent hover:text-[#dda75f]'
              }`}
            >
              {tab === 'history' 
                ? t('nav_history') 
                : tab === 'studio' 
                  ? t('nav_studio') 
                  : tab === 'home' 
                    ? t('nav_home') 
                    : tab === 'discover'
                      ? t('nav_discover')
                      : t('nav_browse')}
            </button>
          );
        })}
        {!isPopcornPass && (
          <button
            onClick={() => setCurrentTab('rowonepass')}
            className="hidden md:block font-sans font-black text-[10px] tracking-widest uppercase bg-[#dda75f] text-black px-3.5 py-1.5 rounded hover:bg-[#dda75f]/95 transition-all cursor-pointer hover:shadow-[0_0_12px_rgba(221,167,95,0.4)]"
          >
            Upgrade
          </button>
        )}
      </nav>

      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenSearch}
          className="p-1 text-on-surface-variant hover:text-primary active:scale-90 transition-all rounded-full hover:bg-white/5"
          title="Search"
        >
          <Search className="h-5 w-5" />
        </button>

        <button 
          onClick={onToggleFriends}
          className="p-1 text-on-surface-variant hover:text-purple-400 active:scale-90 transition-all rounded-full hover:bg-white/5 relative"
          title="Squad & Friends"
        >
          <Users className="h-5.5 w-5.5" />
          {isLoggedIn && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-400 rounded-full animate-pulse shadow-md" />
          )}
        </button>

        {isLoggedIn && hasStudioAccount && onToggleActiveMode && (
          <div id="desktop-toggle-capsule" className="hidden md:flex bg-neutral-900 border border-white/5 rounded-xl p-0.5 select-none text-[9px] font-bold uppercase transition-all whitespace-nowrap">
            <button
              id="view-mode-pill"
              type="button"
              onClick={() => onToggleActiveMode('individual')}
              className={`py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
                activeMode === 'individual'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-400 hover:text-[#dda75f]'
              }`}
            >
              Viewer Mode
            </button>
            <button
              id="studio-mode-pill"
              type="button"
              onClick={() => onToggleActiveMode('studio')}
              className={`py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
                activeMode === 'studio'
                  ? 'bg-amber-500 text-black shadow-md font-extrabold'
                  : 'text-gray-400 hover:text-[#dda75f]'
              }`}
            >
              Studio Mode
            </button>
          </div>
        )}

        <button
          onClick={onEnterTvMode}
          className="px-3 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 text-[10px] font-mono tracking-widest uppercase rounded-lg cursor-pointer transition-all flex items-center gap-1 hover:scale-102 font-bold duration-300"
          title="Switch to Smart TV view mode"
        >
          <span>{t('nav_tv_mode')}</span>
        </button>
        
        {isLoggedIn && (
          <div className="notification-bell-container relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className={`relative p-1.5 transition-all rounded-full hover:bg-white/5 duration-200 cursor-pointer ${
                showDropdown ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-ping" />
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-primary rounded-full text-[7px] text-white flex items-center justify-center font-black" />
                </>
              )}
            </button>

            {showDropdown && (
              <NotificationDropdown
                notifications={notifications}
                onClose={() => setShowDropdown(false)}
                onMarkAllRead={() => {
                  onClearNotifications();
                }}
                onAction={(notif) => {
                  setShowDropdown(false);
                  onNotificationAction(notif);
                }}
              />
            )}
          </div>
        )}

        {isLoggedIn ? (
          <div className="profile-dropdown-container relative">
            <button 
              onClick={() => {
                setShowProfileDropdown(!showProfileDropdown);
                setShowDropdown(false);
              }}
              className="flex items-center gap-2 p-1 text-on-surface-variant hover:text-primary active:scale-95 transition-all rounded-full hover:bg-white/5 focus:outline-none relative cursor-pointer"
              title={isPopcornPass ? "ROWONE Pass Premium Member" : "View Profile"}
            >
              {userAvatarUrl ? (
                <div className={`h-8 w-8 rounded-full overflow-hidden flex items-center justify-center relative ${
                  isPopcornPass 
                    ? 'ring-2 ring-yellow-400 font-extrabold shadow-[0_5px_15px_rgba(234,179,8,0.25)] border border-transparent' 
                    : 'border border-primary/30 ring-1 ring-primary/10'
                }`}>
                  <img 
                    src={userAvatarUrl} 
                    alt={username || 'User Profile'} 
                    className="h-full w-full object-cover" 
                  />
                  {isPopcornPass && (
                    <span className="absolute -bottom-1 -right-1.5 bg-yellow-400 text-[6px] text-black font-black px-0.5 rounded border border-black scale-95 leading-none">PASS</span>
                  )}
                </div>
              ) : (
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-sans font-bold text-xs relative ${
                  isPopcornPass 
                    ? 'bg-gradient-to-br from-yellow-300 to-amber-500 text-black ring-2 ring-yellow-400 font-extrabold shadow-[0_5px_15px_rgba(234,179,8,0.25)]' 
                    : 'bg-primary-container/40 border border-primary/30 text-primary ring-1 ring-primary/10'
                }`}>
                  {isPopcornPass ? '⭐' : (username ? username.charAt(0).toUpperCase() : 'U')}
                  {isPopcornPass && (
                    <span className="absolute -bottom-1 -right-1.5 bg-yellow-400 text-[6px] text-black font-black px-0.5 rounded border border-black scale-95 leading-none">PASS</span>
                  )}
                </div>
              )}
            </button>

            {showProfileDropdown && (
              <div 
                className="absolute right-0 top-11 mt-2 w-60 bg-neutral-950/95 border border-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-3 z-50 animate-fade-in text-left space-y-2 font-sans"
              >
                {/* Profile User Header */}
                <div className="flex items-center gap-3 p-2 border-b border-white/5 pb-2.5">
                  <div className="h-10 w-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                    <img 
                      src={userAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'} 
                      className="h-full w-full object-cover" 
                      alt="Avatar" 
                    />
                  </div>
                  <div className="min-w-0 flex-1 leading-none">
                    <p className="font-display font-black text-xs text-white uppercase truncate">@{username}</p>
                    <p className="font-sans text-[8px] text-primary tracking-widest uppercase mt-1 font-bold">
                      {isPopcornPass ? '👑 PREMIUM PASS' : 'Verified Cinephile'}
                    </p>
                  </div>
                </div>

                {/* Dropdown Options */}
                <div className="space-y-1">
                  {!isPopcornPass && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setCurrentTab('rowonepass');
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-black uppercase rounded-lg hover:opacity-90 transition-all cursor-pointer text-left font-sans mb-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Row One Pass</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileDropdown(false);
                      onEditProfile?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all cursor-pointer text-left font-sans"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit Profile Info</span>
                  </button>
                </div>

                {/* Distributor / Viewer state option switcher */}
                {hasStudioAccount ? (
                  <div className="p-2 border-t border-b border-white/5 space-y-1.5 select-none">
                    <span className="text-[8px] font-sans font-black text-[#dda75f] uppercase tracking-widest block text-center">Active Workspace</span>
                    <div className="flex bg-neutral-900 p-0.5 border border-white/5 rounded-xl text-[9px] font-black uppercase">
                      <button
                        type="button"
                        onClick={() => {
                          onToggleActiveMode?.('individual');
                          setShowProfileDropdown(false);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                          activeMode === 'individual' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Viewer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onToggleActiveMode?.('studio');
                          setShowProfileDropdown(false);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                          activeMode === 'studio' ? 'bg-amber-500 text-black shadow-sm font-extrabold' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Studio
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 border-t border-b border-white/5 select-none">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        onRegisterStudioClick?.();
                      }}
                      className="w-full py-2 bg-[#dda75f]/10 border border-[#dda75f]/20 hover:bg-[#dda75f]/30 hover:border-[#dda75f]/40 text-[#dda75f] font-sans text-[9px] font-black tracking-widest uppercase rounded-lg text-center cursor-pointer transition-all"
                    >
                      🎬 Register Studio Brand
                    </button>
                  </div>
                )}

                <div className="border-t border-white/5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileDropdown(false);
                      onSignOut?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer text-left font-sans"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={onOpenAuth}
            className="flex items-center gap-2 p-1 text-on-surface-variant hover:text-primary active:scale-90 transition-all rounded-full hover:bg-white/5 focus:outline-none relative cursor-pointer"
            title="Login"
          >
            <User className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  );
}
