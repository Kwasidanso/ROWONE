/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Header from './components/Header';
import Footer from './components/Footer';
import IntroAnimation from './components/IntroAnimation';
import HomeView from './components/HomeView';
import BrowseView from './components/BrowseView';
import MovieDetailView from './components/MovieDetailView';
import MoviePlayerView from './components/MoviePlayerView';
import StudioView from './components/StudioView';
import HistoryView from './components/HistoryView';
import AuthView from './components/AuthView';
import EditProfileModal from './components/EditProfileModal';
import TicketModal from './components/TicketModal';
import SeatSelectionModal from './components/SeatSelectionModal';
import SettingsView from './components/SettingsView';
import UpgradeModal from './components/UpgradeModal';
import SupportPanel from './components/SupportPanel';
import PrivacyModal from './components/PrivacyModal';
import QrScannerModal from './components/QrScannerModal';
import DiscoverView from './components/DiscoverView';
import FriendsSidebar from './components/FriendsSidebar';
import TvModeView from './components/TvModeView';
import { AppNotification } from './components/NotificationDropdown';
import { INITIAL_MOVIES } from './data';
import { Movie, BookedTicket, isMovieAllowedForUser } from './types';
import { Search, X, Film, Star, Clock, Users, Bell, Lock, Unlock, Eye, QrCode, VolumeX, Mic, MicOff } from 'lucide-react';
import { useLanguage } from './context/LanguageContext';
import { supabase } from './lib/supabaseClient';
import { loadUserProfile, saveUserProfile, UserProfile, createDefaultProfile } from './lib/userProfileService';
import { sanitizeTitleToSlug, generateUniqueSlug, generateQrCodeUrl, updateSeoTags, resetSeoTags } from './utils/shareUtils';

export default function App() {
  const { t } = useLanguage();
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    return !sessionStorage.getItem('intro_played');
  });
  const [currentTab, setCurrentTabState] = useState<string>(() => {
    try {
      const path = window.location.pathname.toLowerCase().replace(/^\/+/, '');
      if (path.startsWith('settings')) return 'settings';
      if (path.startsWith('studio')) return 'studio';
      if (path.startsWith('discover')) return 'discover';
      if (path.startsWith('browse')) return 'browse';
      if (path.startsWith('history')) return 'history';
      if (path.startsWith('notifications')) return 'notifications';
      return 'home';
    } catch {
      return 'home';
    }
  });

  const setCurrentTab = (tab: string) => {
    try {
      let targetPath = `/${tab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      if (tab === 'settings') {
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath.includes('/billing')) {
          targetPath = '/settings/billing';
        } else {
          targetPath = '/settings/profile';
        }
      } else if (tab === 'studio') {
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath.includes('/schedule')) {
          targetPath = '/studio/schedule';
        } else if (currentPath.includes('/editor')) {
          targetPath = '/studio/editor';
        } else {
          targetPath = '/studio/upload';
        }
      }
      
      const url = new URL(window.location.href);
      url.pathname = targetPath;
      window.history.pushState({}, '', url.pathname + url.search);
    } catch (e) {
      console.warn('URL push failed:', e);
    }
    setCurrentTabState(tab);
  };

  const [movies, setMovies] = useState<Movie[]>(() => {
    try {
      const saved = localStorage.getItem('rowone_movies');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load local storage movies:', e);
    }

    // Default: seed with Initial Movies and generate titles slug / direct links
    const items = [...INITIAL_MOVIES];
    const seen: string[] = [];
    for (const item of items) {
      if (!item.contentType) {
        // Map some items to 'reel' and others to 'reel'/'movie' for aesthetic balance
        item.contentType = item.id === 'm2' || item.id === 'm4' ? 'reel' : 'movie';
      }
      if (!item.slug) {
        let base = item.title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
        if (seen.includes(base)) {
          base = `${base}-${Math.random().toString(16).substring(2, 7)}`;
        }
        item.slug = base;
      }
      seen.push(item.slug);
      if (!item.shareUrl) {
        item.shareUrl = `https://www.rowone.xyz/${item.contentType}s/${item.slug}`;
      }
      if (!item.views) {
        item.views = item.id === 'm1' ? 452 : (item.id === 'm2' ? 240 : (item.id === 'm3' ? 180 : 135));
      }
      if (!item.shares) {
        item.shares = item.id === 'm1' ? 38 : (item.id === 'm2' ? 19 : 8);
      }
      if (!item.sharesByPlatform) {
        item.sharesByPlatform = {
          whatsapp: Math.floor(item.shares * 0.4),
          facebook: Math.floor(item.shares * 0.2),
          x: Math.floor(item.shares * 0.2),
          telegram: Math.floor(item.shares * 0.1),
          email: Math.floor(item.shares * 0.1),
          copy: 0
        };
      }
    }
    return items;
  });

  // Background check for missing QR codes in the movie list
  useEffect(() => {
    const generateQrs = async () => {
      try {
        let modified = false;
        const updated = await Promise.all(movies.map(async (m) => {
          if (!m.qrCodeUrl && m.shareUrl) {
            const qr = await generateQrCodeUrl(m.shareUrl);
            modified = true;
            return { ...m, qrCodeUrl: qr };
          }
          return m;
        }));
        if (modified) {
          setMovies(updated);
          localStorage.setItem('rowone_movies', JSON.stringify(updated));
        }
      } catch (err) {
        console.warn('Background Qr generation failed:', err);
      }
    };
    generateQrs();
  }, []);

  // Sync route slug on boot & handle popstate browser back/forward buttons
  useEffect(() => {
    const checkSlugRouting = async (pathStr: string) => {
      const path = pathStr.toLowerCase().replace(/^\/+/, '');
      const parts = path.split('/');
      
      if (parts.length >= 2 && (parts[0] === 'reels' || parts[0] === 'movies')) {
        const contentType = parts[0] === 'reels' ? 'reel' : 'movie';
        const slug = parts[1];
        
        // Find in state first
        let matched = movies.find(m => m.slug === slug && m.contentType === contentType);
        
        if (!matched) {
          // Retrieve dynamically from persistent database server index
          try {
            const resp = await fetch(`/api/content/by-slug/${contentType}/${slug}`);
            if (resp.ok) {
              const remoteItem = await resp.json();
              if (remoteItem && remoteItem.id) {
                matched = remoteItem;
                // Add to movies state if not present
                setMovies(prev => {
                  if (!prev.some(m => m.id === remoteItem.id)) {
                    const nextList = [remoteItem, ...prev];
                    localStorage.setItem('rowone_movies', JSON.stringify(nextList));
                    return nextList;
                  }
                  return prev;
                });
              }
            }
          } catch (err) {
            console.warn('Async slug dynamic lookup failed:', err);
          }
        } else {
          // File was in local storage, increment analytics check
          try {
            fetch('/api/content/analytics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: matched.id, updateType: 'click', referrer: document.referrer })
            });
          } catch (err) {
            console.warn('Click analytics fail:', err);
          }
        }

        if (matched) {
          setSelectedMovieId(matched.id);
          updateSeoTags({
            title: matched.title,
            synopsis: matched.synopsis,
            imageUrl: matched.imageUrl,
            contentType: matched.contentType,
            slug: matched.slug
          });
          return true;
        }
      }
      return false;
    };

    // 1. Check current URL on mount
    checkSlugRouting(window.location.pathname).then((onBootIsMovie) => {
      if (!onBootIsMovie) {
        // Default: set tab based on URL path
        const path = window.location.pathname.toLowerCase().replace(/^\/+/, '');
        if (path.startsWith('settings')) {
          setCurrentTabState('settings');
        } else if (path.startsWith('studio')) {
          setCurrentTabState('studio');
        } else if (path.startsWith('discover')) {
          setCurrentTabState('discover');
        } else if (path.startsWith('browse')) {
          setCurrentTabState('browse');
        } else if (path.startsWith('history')) {
          setCurrentTabState('history');
        } else if (path.startsWith('notifications')) {
          setCurrentTabState('notifications');
        } else {
          setCurrentTabState('home');
        }
      }
    });

    const handlePopStateSync = () => {
      try {
        checkSlugRouting(window.location.pathname).then((isMovie) => {
          if (isMovie) return;

          setSelectedMovieId(null);
          resetSeoTags();

          const path = window.location.pathname.toLowerCase().replace(/^\/+/, '');
          if (path.startsWith('settings')) {
            setCurrentTabState('settings');
          } else if (path.startsWith('studio')) {
            setCurrentTabState('studio');
          } else if (path.startsWith('discover')) {
            setCurrentTabState('discover');
          } else if (path.startsWith('browse')) {
            setCurrentTabState('browse');
          } else if (path.startsWith('history')) {
            setCurrentTabState('history');
          } else if (path.startsWith('notifications')) {
            setCurrentTabState('notifications');
          } else {
            setCurrentTabState('home');
          }
        });
      } catch (e) {
        console.warn('Popstate sync failed:', e);
      }
    };
    window.addEventListener('popstate', handlePopStateSync);
    return () => window.removeEventListener('popstate', handlePopStateSync);
  }, [movies]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('logged_in_username') || '';
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Subscription tier stats
  const [isPopcornPass, setIsPopcornPass] = useState<boolean>(() => {
    return localStorage.getItem('isPopcornPass') === 'true';
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [stripeVerifying, setStripeVerifying] = useState<boolean>(false);
  const [stripeVerifyMessage, setStripeVerifyMessage] = useState<string>('');

  // Stripe session verification handler on page boot / redirect
  useEffect(() => {
    const verifyStripeSession = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const stripeSuccess = urlParams.get('stripe_success');
        const sessionId = urlParams.get('session_id');
        const purchaseType = urlParams.get('type');
        const simulated = urlParams.get('simulated');

        if (stripeSuccess === 'true' && sessionId) {
          setStripeVerifying(true);
          setStripeVerifyMessage('Connecting to safe Stripe billing agent...');

          const query = new URLSearchParams({
            session_id: sessionId,
            simulated: simulated || 'false',
            userId: userProfile?.userId || localStorage.getItem('logged_in_user_id') || 'simulated_user',
            email: userProfile?.email || 'user@example.com',
            type: purchaseType || 'subscription',
            movieTitle: urlParams.get('movieTitle') || '',
            movieId: urlParams.get('movieId') || '',
            time: urlParams.get('time') || '',
            hall: urlParams.get('hall') || '',
            seat: urlParams.get('seat') || '',
            priceValue: urlParams.get('priceValue') || '12.50'
          });

          const res = await fetch(`/api/stripe/verify-session?${query.toString()}`);
          const data = await res.json();

          if (data.success) {
            setStripeVerifyMessage('Payment verified successfully! Welcome aboard...');
            
            if (purchaseType === 'subscription') {
              // Update local state instantly and write cache
              setIsPopcornPass(true);
              localStorage.setItem('isPopcornPass', 'true');
              localStorage.setItem('subscription_tier', 'gold_premium');
              
              if (userProfile) {
                const updated = { ...userProfile, subscriptionPlan: 'gold_premium' as const };
                setUserProfile(updated);
                await saveUserProfile(updated);
              }
              
              // Trigger a beautiful notification
              triggerAppNotification({
                id: `stripe-sub-${Date.now()}`,
                type: 'release',
                title: 'Stripe Pass Subscribed',
                message: 'Your Monthly ROWONE Pass has been activated. Welcome to premium cinema!',
                timestamp: 'Just now',
                movieTitle: 'Monthly Pass'
              });

              // Show UpgradeModal in success mode
              setShowUpgradeModal(true);
              sessionStorage.setItem('stripe_checkout_success_step', 'true');
            } else if (purchaseType === 'studio') {
              localStorage.setItem('popcorn_account_type', 'studio');
              localStorage.setItem('popcorn_active_mode', 'studio');
              localStorage.setItem('popcorn_studio_verified', 'true');
              
              setAccountType('studio');
              setActiveMode('studio');

              if (userProfile) {
                const updated = { 
                  ...userProfile, 
                  accountType: 'studio' as const 
                };
                setUserProfile(updated);
                await saveUserProfile(updated);
              }

              triggerAppNotification({
                id: `stripe-studio-${Date.now()}`,
                type: 'release',
                title: '🎬 Studio Distributor Verified',
                message: 'Your production studio brand is licensed and officially live. Screenings unlocked!',
                timestamp: 'Just now',
                movieTitle: 'Studio Activated'
              });
            } else if (purchaseType === 'ticket') {
              // One-time ticket booked!
              const seatName = urlParams.get('seat') || 'C6';
              const ticketId = `T${Math.floor(Math.random() * 900000) + 100000}`;
              const movie = movies.find(m => m.id === urlParams.get('movieId')) || movies[0];
              
              const newTicket = {
                id: ticketId,
                movieTitle: movie.title,
                imageUrl: movie.imageUrl,
                time: urlParams.get('time') || '19:00',
                hall: urlParams.get('hall') || 'Premium Hall 1',
                seat: seatName,
                price: `$${parseFloat(urlParams.get('priceValue') || '12.50').toFixed(2)}`,
                date: urlParams.get('date') || 'Today'
              };

              setBookedTickets(prev => {
                const exists = prev.some(t => t.id === ticketId);
                if (exists) return prev;
                const next = [...prev, newTicket];
                return next;
              });

              // Display the ticket receipt instantly
              setShowTicketModal(newTicket);

              triggerAppNotification({
                id: `stripe-ticket-${Date.now()}`,
                type: 'screening',
                title: 'Ticket Purchased',
                message: `Seat ${seatName} in ${newTicket.hall} purchased successfully via Stripe Checkout.`,
                timestamp: 'Just now',
                movieTitle: movie.title
              });
            }
          } else {
            console.warn('Stripe checkout verification reported unresolved status:', data.message);
          }

          // Clear query parameters
          setTimeout(() => {
            setStripeVerifying(false);
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }, 2000);
        }
      } catch (err) {
        console.error('Stripe verification effect crashed:', err);
        setStripeVerifying(false);
      }
    };

    verifyStripeSession();
  }, [userProfile, movies]);

  const [upgradePitchMovie, setUpgradePitchMovie] = useState<string | undefined>(undefined);
  const [isSupportOpen, setIsSupportOpen] = useState<boolean>(false);
  const [supportContext, setSupportContext] = useState<{
    movieTitle?: string | null;
    roomId?: string | null;
    playbackState?: string | null;
  } | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const [privacyTab, setPrivacyTab] = useState<'privacy' | 'terms'>('privacy');
  
  // Content Rating and Age gating states
  const [userAge, setUserAge] = useState<number | null>(() => {
    const age = localStorage.getItem('user_age');
    return age ? parseInt(age) : null;
  });
  const [dobString, setDobString] = useState<string>(() => {
    return localStorage.getItem('dob_string') || '';
  });
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>(() => {
    return localStorage.getItem('popcorn_user_avatar') || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150';
  });
  const [favoriteChips, setFavoriteChips] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('popcorn_favourite_genres');
      return saved ? JSON.parse(saved) : ['CYBERPUNK', 'PSYCHOLOGICAL', 'NOSTALGIC CLASSICS', '4K ULTRA'];
    } catch {
      return ['CYBERPUNK', 'PSYCHOLOGICAL', 'NOSTALGIC CLASSICS', '4K ULTRA'];
    }
  });

  const [accountType, setAccountType] = useState<'individual' | 'studio' | null>(() => {
    return (localStorage.getItem('popcorn_account_type') as 'individual' | 'studio' | null) || null;
  });
  const [isStudioVerified, setIsStudioVerified] = useState<boolean>(() => {
    return localStorage.getItem('popcorn_studio_verified') === 'true';
  });
  const [studioDetails, setStudioDetails] = useState<any>(null);

  // Sign Up Flow - Dual mode toggles
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'register-studio'>('signup');
  const [activeMode, setActiveMode] = useState<'individual' | 'studio'>(() => {
    return (localStorage.getItem('popcorn_active_mode') as 'individual' | 'studio') || 'individual';
  });
  const [hasStudioAccount, setHasStudioAccount] = useState<boolean>(() => {
    return localStorage.getItem('popcorn_has_studio_account') === 'true';
  });

  const handleOpenAuthModal = (mode: 'signin' | 'signup' | 'register-studio') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const syncAndLoadSaaSProfile = async (userId: string, email: string, forcedName?: string) => {
    try {
      let profile = await loadUserProfile(userId, email);
      
      // If we signed up and have a forced name, write it to profile
      if (forcedName && (!profile.fullName || profile.fullName === email.split('@')[0])) {
        profile = {
          ...profile,
          fullName: forcedName
        };
        await saveUserProfile(profile);
      }

      setUserProfile(profile);

      // Now automatically populate states
      if (profile.fullName) {
        setUsername(profile.fullName);
        localStorage.setItem('logged_in_username', profile.fullName);
      }
      if (profile.profileImage) {
        setUserAvatarUrl(profile.profileImage);
        localStorage.setItem('popcorn_user_avatar', profile.profileImage);
      }
      if (profile.userSettings) {
        const settings = profile.userSettings;
        setIsParentalModeActive(!!settings.parentalLockActive);
        setParentMaxRating(settings.parentMaxRating || 'PG-13');
        
        setIsDyslexiaFontActive(!!settings.dyslexiaFontActive);
        localStorage.setItem('popcorn_dyslexia', String(!!settings.dyslexiaFontActive));
        
        setIsQuietModeActive(!!settings.quietModeActive);
        localStorage.setItem('popcorn_quiet_mode', String(!!settings.quietModeActive));
        
        setDisableReactionsAndAnimations(!!settings.disableReactions);
        localStorage.setItem('popcorn_disable_reactions_animations', String(!!settings.disableReactions));
        
        setIsCinemaAmbientSoundActive(!!settings.ambientSoundActive);
        localStorage.setItem('popcorn_cinema_ambient_sound', String(!!settings.ambientSoundActive));
      }
      
      if (profile.subscriptionPlan) {
        const isPass = profile.subscriptionPlan === 'gold_premium' || profile.subscriptionPlan === 'vip_platinum';
        setIsPopcornPass(isPass);
        localStorage.setItem('isPopcornPass', String(isPass));
        localStorage.setItem('subscription_tier', profile.subscriptionPlan);
      }

      console.log('SaaS Profile Memory restored automatically! Settings populated.');
    } catch (err) {
      console.warn('Failed to load profile in App.tsx:', err);
    }
  };

  const handleUpdateProfileLocal = async (updated: UserProfile) => {
    setUserProfile(updated);
    
    // Propagate changes to separate React states so the UI reacts in real-time
    if (updated.fullName && updated.fullName !== username) {
      setUsername(updated.fullName);
      localStorage.setItem('logged_in_username', updated.fullName);
    }
    if (updated.profileImage) {
      setUserAvatarUrl(updated.profileImage);
      localStorage.setItem('popcorn_user_avatar', updated.profileImage);
    }
    if (updated.userSettings) {
      const settings = updated.userSettings;
      setIsParentalModeActive(!!settings.parentalLockActive);
      setParentMaxRating(settings.parentMaxRating || 'PG-13');
      
      setIsDyslexiaFontActive(!!settings.dyslexiaFontActive);
      localStorage.setItem('popcorn_dyslexia', String(!!settings.dyslexiaFontActive));
      
      setIsQuietModeActive(!!settings.quietModeActive);
      localStorage.setItem('popcorn_quiet_mode', String(!!settings.quietModeActive));
      
      setDisableReactionsAndAnimations(!!settings.disableReactions);
      localStorage.setItem('popcorn_disable_reactions_animations', String(!!settings.disableReactions));
      
      setIsCinemaAmbientSoundActive(!!settings.ambientSoundActive);
      localStorage.setItem('popcorn_cinema_ambient_sound', String(!!settings.ambientSoundActive));
    }

    if (updated.subscriptionPlan) {
      const isPass = updated.subscriptionPlan === 'gold_premium' || updated.subscriptionPlan === 'vip_platinum';
      setIsPopcornPass(isPass);
      localStorage.setItem('isPopcornPass', String(isPass));
      localStorage.setItem('subscription_tier', updated.subscriptionPlan);
    }

    return await saveUserProfile(updated);
  };

  // Synchronize profile details with Supabase Profiles Table matching current user / handle ID
  const syncUserRelationalData = async (user: any, preferredAccountType?: 'individual' | 'studio', preVerifiedDob?: string) => {
    if (!user) return;
    try {
      let resolvedType: 'individual' | 'studio' = preferredAccountType || 'individual';
      
      // Check if profile exists
      const { data: existingProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileErr) {
        console.warn('Profiles table read failed, attempting insert:', profileErr.message);
      }

      if (existingProfile) {
        resolvedType = existingProfile.account_type || resolvedType;
      } else {
        // Create profiles row
        const { error: insProfileErr } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            account_type: resolvedType
          });
        if (insProfileErr) {
          console.warn('Failed to insert profiles row:', insProfileErr.message);
        }
      }

      // Sync local state
      setAccountType(resolvedType);
      localStorage.setItem('popcorn_account_type', resolvedType);

      if (resolvedType === 'individual') {
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || username || 'Cinephile';
        const dob = preVerifiedDob || dobString || 'January 15, 2000';
        const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || userAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150';

        // Check or insert individuals table row
        const { data: existingIndiv, error: indivErr } = await supabase
          .from('individuals')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (indivErr) {
          console.warn('Individuals table read warning:', indivErr.message);
        }

        if (!existingIndiv) {
          const { error: insIndivErr } = await supabase
            .from('individuals')
            .insert({
              user_id: user.id,
              full_name: fullName,
              dob: dob,
              avatar_url: avatarUrl
            });
          if (insIndivErr) {
            console.warn('Failed to insert individuals row:', insIndivErr.message);
          }
        }
      } else if (resolvedType === 'studio') {
        const studioTitle = (user.user_metadata?.full_name || user.email?.split('@')[0] || username || 'Cinephile').toUpperCase() + ' STUDIO';
        const logoUrl = user.user_metadata?.avatar_url || userAvatarUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=150';

        // Check or insert studios table row
        const { data: existingStudio, error: studioErr } = await supabase
          .from('studios')
          .select('*')
          .eq('owner_user_id', user.id)
          .maybeSingle();

        if (studioErr) {
          console.warn('Studios table read warning:', studioErr.message);
        }

        if (existingStudio) {
          setIsStudioVerified(existingStudio.is_verified || false);
          localStorage.setItem('popcorn_studio_verified', String(existingStudio.is_verified || false));
          setStudioDetails(existingStudio);
        } else {
          const { data: newStudio, error: insStudioErr } = await supabase
            .from('studios')
            .insert({
              owner_user_id: user.id,
              studio_name: studioTitle,
              logo_url: logoUrl,
              is_verified: false
            })
            .select()
            .maybeSingle();

          if (insStudioErr) {
            console.warn('Failed to insert studios row:', insStudioErr.message);
          }

          if (newStudio) {
            setStudioDetails(newStudio);
          }
          setIsStudioVerified(false);
          localStorage.setItem('popcorn_studio_verified', 'false');
        }
      }

      // Check if they own any studio record to support live viewer-studio toggles
      const { data: userStudio } = await supabase
        .from('studios')
        .select('id, is_verified')
        .eq('owner_user_id', user.id)
        .maybeSingle();
      
      const hasStudio = !!userStudio;
      setHasStudioAccount(hasStudio);
      localStorage.setItem('popcorn_has_studio_account', String(hasStudio));
      if (userStudio) {
        setIsStudioVerified(userStudio.is_verified || false);
        localStorage.setItem('popcorn_studio_verified', String(userStudio.is_verified || false));
      }

      // Preset default view mode and handle alignment
      const savedMode = (localStorage.getItem('popcorn_active_mode') as 'individual' | 'studio') || resolvedType;
      setActiveMode(savedMode);
      localStorage.setItem('popcorn_active_mode', savedMode);
    } catch (err) {
      console.warn('syncUserRelationalData caught an exception:', err);
    }
  };

  useEffect(() => {
    const handleSyncProfile = async () => {
      const activeUser = username.trim() || 'cinephile_guest';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await syncUserRelationalData(session.user);
          await syncAndLoadSaaSProfile(session.user.id, session.user.email || '');
        } else {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url, full_name, favorite_genres')
            .eq('username', activeUser)
            .maybeSingle();

          if (error) {
            console.warn('Error querying Supabase profiles layout:', error.message);
            return;
          }

          if (data) {
            if (data.avatar_url) {
              setUserAvatarUrl(data.avatar_url);
              localStorage.setItem('popcorn_user_avatar', data.avatar_url);
            }
            if (data.full_name && data.full_name !== username) {
              setUsername(data.full_name);
              localStorage.setItem('logged_in_username', data.full_name);
            }
            if (data.favorite_genres) {
              let parsedGenres: string[] = [];
              if (Array.isArray(data.favorite_genres)) {
                parsedGenres = data.favorite_genres;
              } else if (typeof data.favorite_genres === 'string') {
                try {
                  parsedGenres = JSON.parse(data.favorite_genres);
                } catch {
                  parsedGenres = data.favorite_genres.split(',').map((s: string) => s.trim()).filter(Boolean);
                }
              }
              if (parsedGenres.length > 0) {
                setFavoriteChips(parsedGenres);
                localStorage.setItem('popcorn_favourite_genres', JSON.stringify(parsedGenres));
              }
            }
          }
        }
      } catch (err) {
        console.error('Supabase profile syncing error:', err);
      }
    };

    handleSyncProfile();
  }, [username]);

  // Google OAuth redirect and initial session recovery handlers
  useEffect(() => {
    // 1. Initial Session Recovery
    const recoverSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          handleGoogleSignInSuccess(session);
        }
      } catch (err) {
        console.warn('Silent session recovery failed:', err);
      }
    };
    recoverSession();

    // 2. Main Window Auth State Change Listener (to capture redirect transitions in same tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        handleGoogleSignInSuccess(session);
      }
    });

    // 3. Popup listener in opener window (for legacy back-compat)
    const handleAuthMessage = async (event: MessageEvent) => {
      // Direct security check
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'GOOGLE_SIGNIN_SUCCESS') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            handleGoogleSignInSuccess(session);
          }
        } catch (err) {
          console.error('Session retrieval from opener failed:', err);
        }
      }
    };
    window.addEventListener('message', handleAuthMessage);

    // 4. Popup itself behavior: signal & close (if rendered as a standalone popup window)
    if (window.opener && window.name === 'google_signin_popup') {
      const checkSessionAndSignal = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          window.opener.postMessage({ type: 'GOOGLE_SIGNIN_SUCCESS' }, window.location.origin);
          window.close();
        }
      };

      const popupSub = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          window.opener.postMessage({ type: 'GOOGLE_SIGNIN_SUCCESS' }, window.location.origin);
          window.close();
        }
      });

      checkSessionAndSignal();

      return () => {
        subscription.unsubscribe();
        popupSub.data.subscription.unsubscribe();
        window.removeEventListener('message', handleAuthMessage);
      };
    }

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleAuthMessage);
    };
  }, []);

  // Synchronically update URL query parameter on login/logout
  useEffect(() => {
    try {
      if (isLoggedIn && username) {
        const url = new URL(window.location.href);
        const nameParam = username.trim().replaceAll(' ', '_').toLowerCase();
        if (url.searchParams.get('user') !== nameParam) {
          url.searchParams.set('user', nameParam);
          window.history.replaceState({}, '', url.toString());
        }
      } else if (!isLoggedIn) {
        const url = new URL(window.location.href);
        if (url.searchParams.has('user')) {
          url.searchParams.delete('user');
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch (e) {
      console.warn('URL update state sync failed:', e);
    }
  }, [isLoggedIn, username]);

  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [parentMaxRating, setParentMaxRating] = useState<string>('18+');
  const [isParentalModeActive, setIsParentalModeActive] = useState<boolean>(false);
  
  // Memoized lists of allowed movies which auto-filters out restrictions
  const allowedMovies = React.useMemo(() => {
    return movies.filter((movie) => {
      const lockCheck = isMovieAllowedForUser(movie.rating, userAge, parentMaxRating, isParentalModeActive);
      return lockCheck.allowed;
    });
  }, [movies, userAge, parentMaxRating, isParentalModeActive]);
  
  // Navigation states
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [playingMovieId, setPlayingMovieId] = useState<string | null>(null);
  const [isPipActive, setIsPipActive] = useState<boolean>(false);
  const [pipAspectRatio, setPipAspectRatio] = useState<'default' | 'cinematic'>('default');
  
  // Drag states for floating Picture-in-Picture window
  const [pipOffset, setPipOffset] = useState({ x: 0, y: 0 });
  const [isDraggingPip, setIsDraggingPip] = useState(false);
  const [isPipLocked, setIsPipLocked] = useState<boolean>(false);
  const [showPipSnapGlow, setShowPipSnapGlow] = useState<boolean>(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragOffsetStartRef = useRef({ x: 0, y: 0 });

  const [showPipHeader, setShowPipHeader] = useState<boolean>(true);
  const pipHeaderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetPipHeaderTimer = () => {
    setShowPipHeader(true);
    if (pipHeaderTimeoutRef.current) {
      clearTimeout(pipHeaderTimeoutRef.current);
    }
    // If user is currently dragging, keep header controls actively shown!
    if (isDraggingPip) return;
    
    pipHeaderTimeoutRef.current = setTimeout(() => {
      setShowPipHeader(false);
    }, 3000);
  };

  const handlePipMouseEnter = () => {
    resetPipHeaderTimer();
  };

  const handlePipMouseMove = () => {
    resetPipHeaderTimer();
  };

  useEffect(() => {
    if (isPipActive) {
      setShowPipHeader(true);
      resetPipHeaderTimer();
    } else {
      setShowPipHeader(true);
      if (pipHeaderTimeoutRef.current) {
        clearTimeout(pipHeaderTimeoutRef.current);
      }
    }
    return () => {
      if (pipHeaderTimeoutRef.current) {
        clearTimeout(pipHeaderTimeoutRef.current);
      }
    };
  }, [isPipActive, isDraggingPip]);

  useEffect(() => {
    if (!showPipSnapGlow) return;
    const timer = setTimeout(() => {
      setShowPipSnapGlow(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [showPipSnapGlow]);
  
  // Sidebar, Friends and Watch Party states
  const [showFriendsSidebar, setShowFriendsSidebar] = useState<boolean>(false);
  const [isWatchPartyActive, setIsWatchPartyActive] = useState<boolean>(false);
  const [watchPartyRoomName, setWatchPartyRoomName] = useState<string>('');
  const [friends, setFriends] = useState<any[]>(() => {
    try {
      const prefixKey = localStorage.getItem('logged_in_username') || 'guest';
      const stored = localStorage.getItem(`popcorn_friends_${prefixKey}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'fr1',
        username: 'Leo_V',
        fullName: 'Leo Ventura',
        avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUMMmg4wUjOeGP67BHvckW7QK54LA2AaZMcuCpoM3Hu2vY9Ic9lti4YRyceBT4Xa4aVgS7MpwB64SBM0VilWuJV2mdhKG4RfOmkV6SHU7iEUNbS72EU7jB91skEIP5DDmDYOjKPZmUryVWd3v4_1VXYJ8p9TwrkZJ5eqP3NastiUon4s-VH-EhBJQb4vIFZ294pPzvvwroP1eXEUvONKLSB1iLgrLRvbY9BBCCjiInO0x9ZM1geU0eP_XnbkoiNJzz2yLq-q5qibW7',
        status: 'watching',
        watchingMovieId: 'm6',
        watchingMovieTitle: 'NEON ECHOES',
        watchingRoom: 'IMAX Hall A'
      },
      {
        id: 'fr2',
        username: 'Sarah_Lin',
        fullName: 'Sarah Lin',
        avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBN1zkyN0Pb8734ZFQ0q6_UU1ErZWPzuHCM2h5RXzYtYFsE0wGk0tDndVTt82vO2j9N1i4muihePJYlyoEsyO-MN6WgdBcmG4hdllHWUPnoZYhYXg_4HRe24hHm9FVnJyx5ZLbvxzTg2BXW0sdT-MjvOwU-h9rD5EwNfrgu96iPb_xurjXNQUONPl5E8o68dUeilrcKFFrPvPt-86Vem85Vo0IoL85mzDg1E5ZlDH1QMaFfc-auV_uw3qMgmeWmJU6Ghd40J4E6DfSN',
        status: 'watching',
        watchingMovieId: 'm1',
        watchingMovieTitle: 'THE LAST REEL',
        watchingRoom: 'Screening Room 2'
      },
      {
        id: 'fr3',
        username: 'cyber_junkie',
        fullName: 'Alex Vance',
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150',
        status: 'watching',
        watchingMovieId: 'm7',
        watchingMovieTitle: 'FROZEN PEAKS',
        watchingRoom: 'Dolby Hall Z'
      },
      {
        id: 'fr4',
        username: 'retro_coder',
        fullName: 'Diana Woods',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
        status: 'idle'
      }
    ];
  });

  // Popup controller states
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [showQrScannerModal, setShowQrScannerModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  // Debounce search effect to trigger real-time search seamlessly
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 220);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Recently Viewed state track
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('recentlyViewedIds');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Booked tickets history record
  const [bookedTickets, setBookedTickets] = useState<BookedTicket[]>([]);

  // Digital Premiere Badges Achievements state
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('popcorn_premiere_badges');
      return stored ? JSON.parse(stored) : ['Midnight Pioneer 🎟️'];
    } catch {
      return ['Midnight Pioneer 🎟️'];
    }
  });

  const handleAwardBadge = (badgeName: string) => {
    setUnlockedBadges((prev) => {
      if (prev.includes(badgeName)) return prev;
      const nextBadges = [...prev, badgeName];
      try {
        localStorage.setItem('popcorn_premiere_badges', JSON.stringify(nextBadges));
      } catch {}
      return nextBadges;
    });
  };

  // Universal Accessibility states
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [isDyslexiaFontActive, setIsDyslexiaFontActive] = useState<boolean>(() => {
    return localStorage.getItem('popcorn_dyslexia') === 'true';
  });
  const [isQuietModeActive, setIsQuietModeActive] = useState<boolean>(() => {
    return localStorage.getItem('popcorn_quiet_mode') === 'true';
  });
  const [disableReactionsAndAnimations, setDisableReactionsAndAnimations] = useState<boolean>(() => {
    return localStorage.getItem('popcorn_disable_reactions_animations') === 'true';
  });
  const [isCinemaAmbientSoundActive, setIsCinemaAmbientSoundActive] = useState<boolean>(() => {
    return localStorage.getItem('popcorn_cinema_ambient_sound') === 'true';
  });

  const handleUpdateDyslexiaFont = (active: boolean) => {
    setIsDyslexiaFontActive(active);
    localStorage.setItem('popcorn_dyslexia', String(active));
  };

  const handleUpdateQuietMode = (active: boolean) => {
    setIsQuietModeActive(active);
    localStorage.setItem('popcorn_quiet_mode', String(active));
  };

  const handleUpdateDisableReactionsAndAnimations = (active: boolean) => {
    setDisableReactionsAndAnimations(active);
    localStorage.setItem('popcorn_disable_reactions_animations', String(active));
  };

  const handleUpdateCinemaAmbientSound = (active: boolean) => {
    setIsCinemaAmbientSoundActive(active);
    localStorage.setItem('popcorn_cinema_ambient_sound', String(active));
  };

  // State to track recently visited rooms
  const [recentRooms, setRecentRooms] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('popcorn_recent_rooms');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'room-1',
        movieId: 'm1',
        movieTitle: 'NEON ECHOES',
        roomName: 'Cyber Lounge Hall A',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdRWCC7SEBlcatZbdig8smoRv4rV3ewONPoC0HAo2PqOrPKF9S11hZdnC2npx-nz0ww7lZAEGj5P6Y-aGhJLspMefGwzxfoYX8HO0gTqt25dIlbNG7ojeN7r9VJBNm2w1VIRV-5H4Mnq_PUk928GjCo983RGNQnPWcR47Rx4nmo7YzfAd6BVT1pgiGuvVLZk-rRyWP91L1vbWK4P2KsEgAJ7w38vVBrpdrS0J4teGbfD2A98_Gx_dIajS6PpiAodKy08YoAgcjDANf',
        genre: 'SCI-FI',
        activeViewers: 28,
      },
      {
        id: 'room-2',
        movieId: 'm2',
        movieTitle: 'THE LAST REEL',
        roomName: 'Classic Projection Hall H4',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWLBitCTQupJ8B3EL0TiIWF7sUJWsFr_4bwS1hdHLlY5gTzRQAiWSS7-XqC_epIXwHkU_B4d1S6dKXMHBaGyigNKbgfgcc893QMIG0bIZ3SjwB-llUdK4sPFlQoBIYJqXQP5HAvHVFUREe3G3oi_BknMtUerpqWWrAUjuoM-N-L0ThgbxfZsuK0ezPlkkFkOEvbdrRglXrqN7fpl0hwrkMC69Nrf-xicZAt1iyTS6guPhT8X3EojBq5VY3KnXOIOMyFBZoUBK2oey4',
        genre: 'CLASSIC',
        activeViewers: 14,
      },
      {
        id: 'room-3',
        movieId: 'm4',
        movieTitle: 'SHATTERED GLASS',
        roomName: 'Crystalline Soundstage A',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmdxznYvU8hDBYf4O4u2n7wv_AZTLmHL1SXYhceiLXmw1oldq8uR3oh_1yJNFMTtPA_IWWLnBmsksnufg9-ELmAfay01OC_STyErLZ7RFjMCK1jk2spXWblNfoCOI_YJQ15w6f4R018SkVb8AR9-aumQYJ18_w-ZLepktEWYWlhnGe0xuRbQmAf7N4aTuaYRTYFUgGon9zEgZbQ7ARInLYw_AHCTNYO53ElOjSEDfMhrvLzh-sqyLScGp8CVA3T_DcWjx1-NNPz7-v',
        genre: 'THRILLER',
        activeViewers: 19,
      }
    ];
  });

  const recordJoinedRoom = (movie: any) => {
    setRecentRooms((prev) => {
      const filtered = prev.filter((r) => r.movieTitle.toUpperCase() !== movie.title.toUpperCase());
      const newRoom = {
        id: `room-${Date.now()}-${Math.random()}`,
        movieId: movie.id,
        movieTitle: movie.title,
        roomName: `${movie.title} Lounge ${Math.floor(Math.random() * 8) + 1}`,
        imageUrl: movie.imageUrl,
        genre: movie.genre || 'SCI-FI',
        activeViewers: Math.floor(Math.random() * 32) + 8,
      };
      const updated = [newRoom, ...filtered].slice(0, 6);
      try {
        localStorage.setItem('popcorn_recent_rooms', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Listen for shared Movie Watch Party deep link navigation coordinates on load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const movieIdParam = params.get('movie');
      const roomParam = params.get('room');
      if (movieIdParam) {
        const foundMovie = movies.find(m => m.id === movieIdParam);
        if (foundMovie) {
          const lockCheck = isMovieAllowedForUser(foundMovie.rating, userAge, parentMaxRating, isParentalModeActive);
          if (!lockCheck.allowed) {
            alert(`Access Restricted: This shared screening room is age-locked and unavailable for your current profile.`);
            return;
          }
          if (roomParam) {
            // Join specified watch party room instantly
            setIsWatchPartyActive(true);
            setWatchPartyRoomName(roomParam);
            setPlayingMovieId(foundMovie.id);
            recordJoinedRoom(foundMovie);
            triggerAppNotification({
              id: `wp-deep-${Date.now()}`,
              type: 'invite',
              title: 'Lounge Sync Connected! 🎮',
              message: `Entered live shared room '${roomParam}' instantly. Sync loop is now online!`,
              timestamp: 'Just now',
              movieTitle: foundMovie.title
            });
          } else {
            // View movie detail list
            setSelectedMovieId(foundMovie.id);
            setCurrentTab('home');
          }
          // Clear parameters from search query pool gracefully to restore URL appearance
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (e) {
      console.warn("Could not load shared deep link watch coordinates:", e);
    }
  }, [movies]);

  // Personal Watchlist and Library
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('popcorn_watchlist');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [libraryItems, setLibraryItems] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('popcorn_library');
      if (stored) return JSON.parse(stored);
    } catch {}
    
    // Seed some beautiful illustrative ones so the Wrapped stats look stunning right away!
    return [
      {
        id: 'lib-1',
        movieId: 'm2',
        movieTitle: 'THE LAST REEL',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7H-S8T74z8LWeq_Vb9YFmKRe24hHm9FVnJyx5ZLbvxzTg2BXW0sdT-MjvOwU-h9rD5EwNfrgu96iPb_xurjXNQUONPl5E8o68dUeilrcKFFrPvPt-86Vem85Vo0IoL85mzDg1E5ZlDH1QMaFfc-auV_uw3qMgmeWmJU6Ghd40J4E6DfSN',
        dateWatched: '2026-04-12',
        rating: 5,
        reviewText: 'Stunning tribute to 35mm film projection! Absolute must-watch 🎞️',
        genre: 'CLASSIC'
      },
      {
        id: 'lib-2',
        movieId: 'm1',
        movieTitle: 'NEON ECHOES',
        imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdRWCC7SEBlcatZbdig8smoRv4rV3ewONPoC0HAo2PqOrPKF9S11hZdnC2npx-nz0ww7lZAEGj5P6Y-aGhJLspMefGwzxfoYX8HO0gTqt25dIlbNG7ojeN7r9VJBNm2w1VIRV-5H4Mnq_PUk928GjCo983RGNQnPWcR47Rx4nmo7YzfAd6BVT1pgiGuvVLZk-rRyWP91L1vbWK4P2KsEgAJ7w38vVBrpdrS0J4teGbfD2A98_Gx_dIajS6PpiAodKy08YoAgcjDANf',
        dateWatched: '2026-05-18',
        rating: 4,
        reviewText: 'Deep synthwave atmosphere, loved the rain-slicked visual tone.',
        genre: 'SCI-FI'
      },
      {
        id: 'lib-3',
        movieId: 'm4',
        movieTitle: 'MIDNIGHT RETRO',
        imageUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=300',
        dateWatched: '2026-05-24',
        rating: 5,
        reviewText: "Epic orchestral scale. The transition inside the black hole was mind bending. 🌌",
        genre: 'SCI-FI'
      }
    ];
  });

  // Share invite ticket modal
  const [showTicketModal, setShowTicketModal] = useState<BookedTicket | null>(null);
  const [ticketModalInitialKiosk, setTicketModalInitialKiosk] = useState<boolean>(false);

  // Floating Picture-in-Picture Room Synchronization Participants list and dropdown states
  const [showPipViewersDropdown, setShowPipViewersDropdown] = useState<boolean>(false);
  const [pipParticipants, setPipParticipants] = useState<Array<{ id: string; name: string; avatar: string; role: string }>>([
    { id: 'v1', name: 'You', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150', role: 'Host' },
    { id: 'v2', name: 'Sarah Lin', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBN1zkyN0Pb8734ZFQ0q6_UU1ErZWPzuHCM2h5RXzYtYFsE0wGk0tDndVTt82vO2j9N1i4muihePJYlyoEsyO-MN6WgdBcmG4hdllHWUPnoZYhYXg_4HRe24hHm9FVnJyx5ZLbvxzTg2BXW0sdT-MjvOwU-h9rD5EwNfrgu96iPb_xurjXNQUONPl5E8o68dUeilrcKFFrPvPt-86Vem85Vo0IoL85mzDg1E5ZlDH1QMaFfc-auV_uw3qMgmeWmJU6Ghd40J4E6DfSN', role: 'Viewer (Synced)' },
    { id: 'v3', name: 'Leo Ventura', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUMMmg4wUjOeGP67BHvckW7QK54LA2AaZMcuCpoM3Hu2vY9Ic9lti4YRyceBT4Xa4aVgS7MpwB64SBM0VilWuJV2mdhKG4RfOmkV6SHU7iEUNbS72EU7jB91skEIP5DDmDYOjKPZmUryVWd3v4_1VXYJ8p9TwrkZJ5eqP3NastiUon4s-VH-EhBJQb4vIFZ294pPzvvwroP1eXEUvONKLSB1iLgrLRvbY9BBCCjiInO0x9ZM1geU0eP_XnbkoiNJzz2yLq-q5qibW7', role: 'Viewer (Synced)' }
  ]);

  // Dynamic Microphone level tracker & talking simulation state variables
  const [isPipMicActive, setIsPipMicActive] = useState<boolean>(true);
  const [pipVoiceAmplitude, setPipVoiceAmplitude] = useState<number>(0);

  useEffect(() => {
    if (!isPipActive || !playingMovieId || !isPipMicActive) {
      setPipVoiceAmplitude(0);
      return;
    }

    let analyser: AnalyserNode | null = null;
    let microphone: MediaStreamAudioSourceNode | null = null;
    let audioContext: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const setupMic = async () => {
      try {
        // Attempt genuine hardware input stream
        stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch((e) => {
          throw e;
        });
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioContextClass();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateRealVolume = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          // Scale real average to an aesthetic 0-100 values
          const scaledAmp = Math.min(100, Math.max(0, average * 2.2));
          setPipVoiceAmplitude(Math.round(scaledAmp));
          animationFrameId = requestAnimationFrame(updateRealVolume);
        };
        updateRealVolume();
      } catch (err) {
        // Fallback gracefully to high-fidelity simulated conversational speaking patterns
        const runSim = () => {
          if (!isPipActive || !playingMovieId || !isPipMicActive) {
            setPipVoiceAmplitude(0);
            return;
          }
          const t = Date.now() / 1000;
          // Sentence rhythmic structure wave (simulating speaking breathing cycles)
          const sentenceWave = Math.max(0, Math.sin(t * 1.4) * 0.75 + 0.25);
          // Syllabic rise/fall jaw movement velocity modeling 
          const syllableVelocity = Math.sin(t * 22) * 0.45 + 0.55;
          // Microscopic hardware jitter/whisper
          const jitter = Math.random() * 15;
          
          let simulatedValue = 0;
          if (sentenceWave > 0.15) {
            simulatedValue = Math.max(10, Math.round(sentenceWave * syllableVelocity * 65 + jitter));
          } else {
            simulatedValue = Math.round(Math.random() * 6); // standard room background noise floor
          }

          setPipVoiceAmplitude(Math.min(100, simulatedValue));
          animationFrameId = requestAnimationFrame(runSim);
        };
        runSim();
      }
    };

    setupMic();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (stream) {
        try {
          stream.getTracks().forEach(track => track.stop());
        } catch(e){}
      }
      if (audioContext) {
        audioContext.close().catch(err => console.log('Error closing mic context:', err));
      }
    };
  }, [isPipActive, playingMovieId, isPipMicActive]);

  const handlePingParticipant = (id: string, name: string) => {
    const actualName = id === 'v1' ? (username || 'You') : name;
    triggerAppNotification({
      id: `ping-${Date.now()}`,
      type: 'screening',
      title: 'Sync Ping Sent',
      message: `📲 Pinged ${actualName}! Requesting clock resynchronization for direct screen-sharing.🍿`,
      timestamp: 'Just now',
      movieTitle: movies.find(m => m.id === playingMovieId)?.title || "Sync Space"
    });
  };

  const handleMuteAllParticipants = () => {
    setPipParticipants(prev => prev.map(p => {
      if (p.id === 'v1') return p;
      return { ...p, role: 'Viewer (Muted)' };
    }));
    triggerAppNotification({
      id: `mute-all-${Date.now()}`,
      type: 'screening',
      title: 'Theater Muted',
      message: '🎙️ Synced audio/chat channels silenced for all audience members.',
      timestamp: 'Just now',
      movieTitle: movies.find(m => m.id === playingMovieId)?.title || "Sync Space"
    });
  };

  const handleKickParticipant = (id: string, name: string) => {
    setPipParticipants(prev => prev.filter(p => p.id !== id));
    triggerAppNotification({
      id: `kick-${Date.now()}`,
      type: 'screening',
      title: 'Participant Removed',
      message: `🚫 Removed guest '${name}' from active synchronized room.`,
      timestamp: 'Just now',
      movieTitle: movies.find(m => m.id === playingMovieId)?.title || "Sync Space"
    });
  };

  const handleAddViewersSimulation = () => {
    const mockNames = [
      { name: 'Diana Woods', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150', role: 'Viewer (Synced)' },
      { name: 'Marcus Brody', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150', role: 'Distributor' },
      { name: 'Cassandra Reel', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150', role: 'Viewer (Synced)' },
      { name: 'Cinephile_99', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150', role: 'Viewer (Synced)' }
    ];
    
    const unused = mockNames.filter(mn => !pipParticipants.some(p => p.name === mn.name));
    if (unused.length === 0) {
      triggerAppNotification({
        id: `full-room-${Date.now()}`,
        type: 'screening',
        title: 'Max Capacity Achieved',
        message: 'This Picture-in-Picture synchronization room has reached its maximum viewer count!',
        timestamp: 'Just now',
        movieTitle: movies.find(m => m.id === playingMovieId)?.title || "Sync Space"
      });
      return;
    }
    
    const picked = unused[Math.floor(Math.random() * unused.length)];
    const newViewer = {
      id: `sim-v-${Date.now()}`,
      ...picked
    };
    
    setPipParticipants(prev => [...prev, newViewer]);
    triggerAppNotification({
      id: `joined-${Date.now()}`,
      type: 'invite',
      title: 'Viewer Entered Sync Room',
      message: `👥 ${picked.name} joined the synchronized screening session.`,
      timestamp: 'Just now',
      movieTitle: movies.find(m => m.id === playingMovieId)?.title || "Sync Space"
    });
  };

  // Seat selection modal state
  const [seatSelectionData, setSeatSelectionData] = useState<{
    time: string;
    hall: string;
    price: string;
    date: string;
    movieTitle: string;
  } | null>(null);

  // Command Center Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'n1',
      type: 'screening',
      title: 'Neon Echoes Group Screening',
      message: 'Exclusive synced laser IMAX screening room starts in 12m. Join the lobby circle.',
      timestamp: '12m ago',
      timeValue: new Date(Date.now() - 12 * 60000),
      movieTitle: 'NEON ECHOES',
      countdownMinutes: 12,
      isRead: false,
    },
    {
      id: 'n2',
      type: 'invite',
      title: 'Sarah Lin invited you',
      message: "Hey! Join Sarah's party room to communal-stream classical cinema memories of 'THE LAST REEL'.",
      timestamp: '35m ago',
      timeValue: new Date(Date.now() - 35 * 60000),
      movieTitle: 'THE LAST REEL',
      invitedBy: 'Sarah Lin',
      isRead: false,
    },
    {
      id: 'n3',
      type: 'release',
      title: 'Midnight Studios New Upload',
      message: "Now playing: 'The Midnight Premiere' (4K ULTRA Dolby Cinema Re-master release).",
      timestamp: '1h ago',
      timeValue: new Date(Date.now() - 60 * 60000),
      movieTitle: 'The Midnight Premiere',
      studioName: 'Midnight Studios',
      isRead: true,
    }
  ]);

  // Corner Live toast popups
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  // Countdown timer log interval updating
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications((prev) =>
        prev.map((notif) => {
          if (notif.type === 'screening' && notif.countdownMinutes !== undefined) {
            const nextMinutes = notif.countdownMinutes - 1;
            return {
              ...notif,
              countdownMinutes: nextMinutes > 0 ? nextMinutes : 0,
              message: nextMinutes > 0 
                ? `Exclusive synced laser IMAX screening room starts in ${nextMinutes}m. Join the lobby circle.`
                : `Lobby room is now fully active! Jump in to start watching synchronized playback.`
            };
          }
          return notif;
        })
      );
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Helper dispatch trigger for toasts & command center
  const triggerAppNotification = (notif: Omit<AppNotification, 'isRead' | 'timeValue'>) => {
    if (notif.title.toLowerCase().includes('achievement unlocked') || (notif.message && notif.message.toLowerCase().includes('achievement unlocked'))) {
      return;
    }
    
    const fullNotif: AppNotification = {
      ...notif,
      isRead: false,
      timeValue: new Date()
    };
    
    setNotifications((prev) => [fullNotif, ...prev]);
    setToasts((prev) => [fullNotif, ...prev]);

    // Self-dismissing toast popups
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== fullNotif.id));
    }, 6000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Dynamic social integration mock simulations timeline
  useEffect(() => {
    // Session Active welcome prompt
    const welcomeTimer = setTimeout(() => {
      const welcomeNotif: AppNotification = {
        id: `welcome-${Date.now()}`,
        type: 'screening',
        title: 'Communal Theater Active',
        message: 'Sync system configured. Share unique tickets and countdown screenings in real-time!',
        timestamp: 'Just now',
        timeValue: new Date(),
        movieTitle: 'NEON ECHOES',
        countdownMinutes: 12
      };
      
      setToasts((prev) => [welcomeNotif, ...prev]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== welcomeNotif.id));
      }, 7000);
    }, 2500);

    // Friend Room Invite toast
    const inviteTimer = setTimeout(() => {
      triggerAppNotification({
        id: `sim-invite-${Date.now()}`,
        type: 'invite',
        title: 'Friend Invite Received 🍿',
        message: "@cyber_junkie invited you to join 'Frozen Peaks' group lounge.",
        timestamp: 'Just now',
        movieTitle: 'FROZEN PEAKS',
        invitedBy: 'cyber_junkie'
      });
    }, 12000);

    // Studio release notification alert
    const releaseTimer = setTimeout(() => {
      triggerAppNotification({
        id: `sim-release-${Date.now()}`,
        type: 'release',
        title: 'New Studio release',
        message: "Classic Cinema Studios has nominated 'DUNE: PART ONE' for digital IMAX lounges.",
        timestamp: 'Just now',
        movieTitle: 'Dune: Part One',
        studioName: 'Classic Cinema Studios'
      });
    }, 26000);

    return () => {
      clearTimeout(welcomeTimer);
      clearTimeout(inviteTimer);
      clearTimeout(releaseTimer);
    };
  }, []);

  // Dismiss all live toast notifications on the screen when clicking on any other part of the screen
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (toasts.length > 0) {
        const clickedInsideToast = target.closest('.live-toast-notification');
        if (!clickedInsideToast) {
          setToasts([]);
        }
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [toasts]);

  // Clear all notifications from history when user clicks any part of the screen
  useEffect(() => {
    const handleHistoryClearClick = () => {
      setNotifications([]);
    };
    document.addEventListener('mousedown', handleHistoryClearClick);
    return () => {
      document.removeEventListener('mousedown', handleHistoryClearClick);
    };
  }, []);

  const handleNotificationAction = (notif: AppNotification) => {
    // mark selected notification item as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...notif, isRead: true } : n))
    );

    const matchMovie = movies.find(
      (m) => m.title.toLowerCase() === notif.movieTitle.toLowerCase()
    );

    if (notif.type === 'invite' || notif.type === 'screening') {
      if (matchMovie) {
        setPlayingMovieId(matchMovie.id);
      } else {
        setPlayingMovieId('m1'); // fallback
      }
    } else if (notif.type === 'release') {
      if (matchMovie) {
        setSelectedMovieId(matchMovie.id);
      } else {
        setCurrentTab('browse');
      }
    }
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // Navigation callbacks
  const handleQrScannerNavigation = async (contentType: 'movie' | 'reel', slug: string) => {
    let matched = movies.find(m => m.slug === slug && m.contentType === contentType);
    if (!matched) {
      matched = movies.find(m => m.slug === slug);
    }

    if (matched) {
      handleSelectMovie(matched.id);
      
      try {
        fetch('/api/content/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: matched.id, updateType: 'qr_scan', referrer: document.referrer })
        });
      } catch (err) {
        console.warn('Analytics tracking warning:', err);
      }
    } else {
      try {
        const resp = await fetch(`/api/content/by-slug/${contentType}/${slug}`);
        if (resp.ok) {
          const remoteItem = await resp.json();
          if (remoteItem && remoteItem.id) {
            setMovies(prev => {
              if (!prev.some(m => m.id === remoteItem.id)) {
                const nextList = [remoteItem, ...prev];
                localStorage.setItem('rowone_movies', JSON.stringify(nextList));
                return nextList;
              }
              return prev;
            });
            handleSelectMovie(remoteItem.id);
            
            fetch('/api/content/analytics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: remoteItem.id, updateType: 'qr_scan', referrer: document.referrer })
            });
          }
        }
      } catch (err) {
        console.warn('Dynamic lookup failed:', err);
      }
    }
  };

  const handleSelectMovie = (id: string) => {
    setSelectedMovieId(id);
    const foundMovie = movies.find(m => m.id === id);
    if (foundMovie) {
      const typeStr = foundMovie.contentType || 'movie';
      const slugStr = foundMovie.slug || sanitizeTitleToSlug(foundMovie.title);
      try {
        const url = new URL(window.location.href);
        url.pathname = `/${typeStr}s/${slugStr}`;
        window.history.pushState({}, '', url.pathname + url.search);
        
        updateSeoTags({
          title: foundMovie.title,
          synopsis: foundMovie.synopsis,
          imageUrl: foundMovie.imageUrl,
          contentType: foundMovie.contentType,
          slug: foundMovie.slug
        });
      } catch (e) {
        console.warn('Push state for slug failed:', e);
      }

      // Increment view count
      setMovies((prev) => {
        const updated = prev.map((m) => {
          if (m.id === id) {
            return {
              ...m,
              views: (m.views || 0) + 1
            };
          }
          return m;
        });
        localStorage.setItem('rowone_movies', JSON.stringify(updated));
        return updated;
      });
    }

    setRecentlyViewedIds((prev) => {
      const filtered = prev.filter((mId) => mId !== id);
      const next = [id, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('recentlyViewedIds', JSON.stringify(next));
      } catch (err) {
        console.warn('Storage saving failed', err);
      }
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToGrid = () => {
    setSelectedMovieId(null);
    try {
      const url = new URL(window.location.href);
      url.pathname = `/${currentTab === 'home' ? '' : currentTab.toLowerCase()}`;
      window.history.pushState({}, '', url.pathname + url.search);
      resetSeoTags();
    } catch (e) {
      console.warn('Reset path on back failed:', e);
    }
  };

  const handleUpdateMovieAnalytics = async (movieId: string, updateType: 'click' | 'qr_scan' | 'share', platform?: string) => {
    // 1. Update local state instantly for lightning-fast responsiveness
    setMovies((prev) => {
      const updated = prev.map((m) => {
        if (m.id === movieId) {
          const fresh = { ...m };
          if (updateType === 'click') {
            fresh.views = (fresh.views || 0) + 1;
            fresh.linkClicks = (fresh.linkClicks || 0) + 1;
          } else if (updateType === 'qr_scan') {
            fresh.views = (fresh.views || 0) + 1;
            fresh.qrScans = (fresh.qrScans || 0) + 1;
          } else if (updateType === 'share') {
            fresh.shares = (fresh.shares || 0) + 1;
            if (platform) {
              const platforms = { ...(fresh.sharesByPlatform || { whatsapp: 0, facebook: 0, x: 0, telegram: 0, email: 0, copy: 0 }) };
              platforms[platform as keyof typeof platforms] = (platforms[platform as keyof typeof platforms] || 0) + 1;
              fresh.sharesByPlatform = platforms;
            }
          }
          return fresh;
        }
        return m;
      });
      localStorage.setItem('rowone_movies', JSON.stringify(updated));
      return updated;
    });

    // 2. Dispatch update metrics to backend API to store permanently
    try {
      fetch('/api/content/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: movieId,
          updateType: updateType === 'click' ? 'click' : (updateType === 'qr_scan' ? 'qr_scan' : 'share'),
          platform,
          referrer: document.referrer
        })
      });
    } catch (err) {
      console.warn('Analytics backend dispatch warning:', err);
    }
  };

  const handleBookSeat = (time: string, hall: string, price: string = '$12.50', date: string = 'today') => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    const movie = movies.find((m) => m.id === selectedMovieId);
    if (!movie) return;

    // Content rating check double gate
    const lockCheck = isMovieAllowedForUser(movie.rating, userAge, parentMaxRating, isParentalModeActive);
    if (!lockCheck.allowed) {
      alert(`Access Restricted: This room rating is locked for your current profile settings.`);
      return;
    }

    // Helper: Parse movie runtime string (e.g. "1h 55m") to total minutes
    const parseRuntimeToMinutes = (runtimeStr?: string): number => {
      if (!runtimeStr) return 120; // default 2 hours
      const hMatch = runtimeStr.match(/(\d+)\s*h/i);
      const mMatch = runtimeStr.match(/(\d+)\s*m/i);
      let total = 0;
      if (hMatch) {
         total += parseInt(hMatch[1], 10) * 60;
      }
      if (mMatch) {
         total += parseInt(mMatch[1], 10);
      }
      if (total === 0) {
        const numMatch = runtimeStr.match(/(\d+)/);
        if (numMatch) return parseInt(numMatch[1], 10);
        return 120;
      }
      return total;
    };

    // Helper: Parse digital time string (e.g. "21:30" or "9:30 PM") to minutes from start of day
    const parseTimeToMinutes = (timeStr?: string): number => {
      if (!timeStr) return 0;
      const cleanTime = timeStr.trim().toUpperCase();
      const ampmMatch = cleanTime.match(/(\d+):(\d+)\s*(AM|PM)/);
      if (ampmMatch) {
        let hrs = parseInt(ampmMatch[1], 10);
        const mins = parseInt(ampmMatch[2], 10);
        const ampm = ampmMatch[3];
        if (ampm === 'PM' && hrs < 12) hrs += 12;
        if (ampm === 'AM' && hrs === 12) hrs = 0;
        return hrs * 60 + mins;
      }
      const standardMatch = cleanTime.match(/(\d+):(\d+)/);
      if (standardMatch) {
        const hrs = parseInt(standardMatch[1], 10);
        const mins = parseInt(standardMatch[2], 10);
        return hrs * 60 + mins;
      }
      return 0;
    };

    // Check if ticket is already booked for exact slot
    const alreadyBooked = bookedTickets.some(
      (t) => t.movieTitle === movie.title && t.time === time && (t.date || 'today').trim().toLowerCase() === date.trim().toLowerCase()
    );
    if (alreadyBooked) {
      alert('You have already booked a seat for this screening slot!');
      return;
    }

    // Friendly Overlapping Time Slot Check
    const targetDate = date.trim().toLowerCase();
    const targetStart = parseTimeToMinutes(time);
    const targetDuration = parseRuntimeToMinutes(movie.runtime);
    const targetEnd = targetStart + targetDuration;

    const overlayTicket = bookedTickets.find((t) => {
      const ticketDate = (t.date || 'today').trim().toLowerCase();
      if (ticketDate !== targetDate) return false;

      const prevMovie = movies.find((prev) => prev.title === t.movieTitle);
      const prevDuration = parseRuntimeToMinutes(prevMovie ? prevMovie.runtime : '2h');
      const prevStart = parseTimeToMinutes(t.time);
      const prevEnd = prevStart + prevDuration;

      // Overlap calculation: s1 < e2 && s2 < e1
      return targetStart < prevEnd && prevStart < targetEnd;
    });

    if (overlayTicket) {
      alert(`⚠️ Screening Schedule Conflict!\n\nYou have a scheduling conflict on ${date}:\n\n• Already Booked: "${overlayTicket.movieTitle}" at ${overlayTicket.time}\n• Selected Show: "${movie.title}" at ${time}\n\nSince cinema running times overlap, please select an alternative screening time.`);
      return;
    }

    setSeatSelectionData({
      time,
      hall,
      price,
      date,
      movieTitle: movie.title,
    });
  };

  const handleCompleteSeatSelection = async (seatName: string, finalPrice: string) => {
    if (!seatSelectionData) return;
    const { time, hall, date, movieTitle } = seatSelectionData;
    const movie = movies.find((m) => m.title === movieTitle);
    if (!movie) return;

    const numericPriceVal = finalPrice.replace(/[^0-9.]/g, '');
    const finalPriceVal = parseFloat(numericPriceVal) || 12.50;

    // Contact Server to open secure Stripe Checkout gateway
    try {
      setStripeVerifying(true);
      setStripeVerifyMessage('Redirecting to secure Stripe Checkout...');

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile?.userId || localStorage.getItem('logged_in_user_id') || 'guest_user',
          email: userProfile?.email || localStorage.getItem('logged_in_email') || 'cinephile@example.com',
          type: 'ticket',
          priceValue: finalPriceVal,
          movieTitle: movie.title,
          movieId: movie.id,
          time,
          hall,
          seat: seatName,
          date
        })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return; // Transitioning to hosted receipt payment frame
      }
    } catch (err) {
      console.warn('Real Stripe ticket session launch failed. Proceeding with robust offline preview model:', err);
    } finally {
      setStripeVerifying(false);
    }

    // Default Local / Simulation Fallback
    const newTicket: BookedTicket = {
      id: `T${Math.floor(Math.random() * 900000) + 100000}`,
      movieTitle: movie.title,
      imageUrl: movie.imageUrl,
      time,
      hall,
      seat: seatName,
      price: priceBinaryNormalize(finalPrice),
      date,
    };

    setBookedTickets((prev) => [...prev, newTicket]);
    
    // Set ticket item to prompt confirmation cinema ticket layout
    setShowTicketModal(newTicket);

    const screeningNotif: AppNotification = {
      id: `not-scr-${Date.now()}`,
      type: 'screening',
      title: 'Pass Reserved',
      message: `Ticket validation code for '${movie.title}' generated. Seat ${seatName} reserved in ${hall}.`,
      timestamp: 'Just now',
      timeValue: new Date(),
      movieTitle: movie.title,
      countdownMinutes: 45
    };
    triggerAppNotification(screeningNotif);

    setSeatSelectionData(null);
    setSelectedMovieId(null);
  };

  function priceBinaryNormalize(p: string) {
    if (!p.startsWith('$')) {
      return `$${p}`;
    }
    return p;
  }

  // Handle studio screening schedule creations
  const handleScheduleScreening = (
    movieId: string,
    screening: { time: string; date: string; ticketPrice: number; hallName: string; features: string; isPremiere?: boolean }
  ) => {
    const viewCount = Math.floor(Math.random() * 80) + 110;
    const freshScreening = {
      id: `scr-${Date.now()}`,
      time: screening.time,
      date: screening.date,
      ticketPrice: screening.ticketPrice,
      viewersCount: viewCount,
      revenueEarned: screening.ticketPrice * viewCount,
      avgRating: parseFloat((4.6 + Math.random() * 0.4).toFixed(1)),
      hallName: screening.hallName,
      features: screening.features,
      isAvailable: true,
      isPremiere: screening.isPremiere,
    };

    setMovies((prev) =>
      prev.map((m) => {
        if (m.id === movieId) {
          const currentScreenings = m.screenings || [];
          return {
            ...m,
            isPremiere: m.isPremiere || screening.isPremiere,
            screenings: [...currentScreenings, freshScreening],
          };
        }
        return m;
      })
    );

    // Resolve movie name
    const solvedMovie = movies.find((m) => m.id === movieId);
    const mName = solvedMovie ? solvedMovie.title : 'New Movie';

    triggerAppNotification({
      id: `sch-toast-${Date.now()}`,
      type: 'screening',
      title: 'Showtime Scheduled 🍿',
      message: `Studio set '${mName}' on ${screening.date} at ${screening.time} with $${screening.ticketPrice.toFixed(2)} tickets.`,
      timestamp: 'Just now',
      movieTitle: mName,
    });

    if (watchlistIds.includes(movieId)) {
      triggerAppNotification({
        id: `watchlist-sched-${Date.now()}`,
        type: 'screening',
        title: '🔔 Watchlist Showtime Scheduled!',
        message: `Exciting! Your watchlisted film '${mName}' is now scheduled for ${screening.date} at ${screening.time}! Book your virtual seat.`,
        timestamp: 'Just now',
        movieTitle: mName,
        countdownMinutes: 15,
      });
    }
  };

  const handleToggleWatchlist = (movieId: string) => {
    setWatchlistIds((prev) => {
      let next;
      const m = movies.find(m => m.id === movieId);
      const mTitle = m ? m.title : 'this movie';
      if (prev.includes(movieId)) {
        next = prev.filter((id) => id !== movieId);
        triggerAppNotification({
          id: `wl-rem-${Date.now()}`,
          type: 'screening',
          title: 'Removed from Watchlist 📥',
          message: `Unsaved '${mTitle}' from your watchlist.`,
          timestamp: 'Just now',
          movieTitle: mTitle
        });
      } else {
        next = [...prev, movieId];
        triggerAppNotification({
          id: `wl-add-${Date.now()}`,
          type: 'screening',
          title: 'Added to Watchlist 🍿',
          message: `Saved '${mTitle}' to watchlist. We will alert you when screening showtimes are scheduled!`,
          timestamp: 'Just now',
          movieTitle: mTitle
        });
      }
      localStorage.setItem('popcorn_watchlist', JSON.stringify(next));
      return next;
    });
  };

  const handleClearWatchlist = () => {
    setWatchlistIds([]);
    localStorage.setItem('popcorn_watchlist', JSON.stringify([]));
    triggerAppNotification({
      id: `wl-clr-${Date.now()}`,
      type: 'screening',
      title: 'Watchlist Cleared 🧹',
      message: 'All movies have been removed from your watchlist collection.',
      timestamp: 'Just now',
      movieTitle: ''
    });
  };

  const handleLogWatchedMovie = (movieId: string, date: string, rating: number, review: string) => {
    const movie = movies.find(m => m.id === movieId);
    if (!movie) return;

    const newItem = {
      id: `lib-${Date.now()}`,
      movieId: movie.id,
      movieTitle: movie.title,
      imageUrl: movie.imageUrl,
      dateWatched: date || new Date().toISOString().split('T')[0],
      rating: rating || 5,
      reviewText: review || 'Wonderful rewatch in the cinema lounge!',
      genre: movie.genre || 'SCI-FI'
    };

    setLibraryItems((prev) => {
      const next = [newItem, ...prev];
      localStorage.setItem('popcorn_library', JSON.stringify(next));
      return next;
    });

    triggerAppNotification({
      id: `lib-logged-${Date.now()}`,
      type: 'release',
      title: 'Logged to Watched Library 🎬',
      message: `Saved '${movie.title}' to your watched library list.`,
      timestamp: 'Just now',
      movieTitle: movie.title
    });
  };

  const handleRemoveFromLibrary = (libId: string) => {
    setLibraryItems((prev) => {
      const next = prev.filter(item => item.id !== libId);
      localStorage.setItem('popcorn_library', JSON.stringify(next));
      return next;
    });
  };

  const handleStartRewatchParty = (movie: Movie) => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    setIsWatchPartyActive(true);
    setWatchPartyRoomName(`${username || 'Cinephile'}'s Retro Rewatch: ${movie.title} 🍿`);
    setPlayingMovieId(movie.id);

    triggerAppNotification({
      id: `rewatch-invite-${Date.now()}`,
      type: 'invite',
      title: 'Rewatch Party Spinning! 🎮',
      message: `Your friends have been invited to enter your rewatch party for '${movie.title}' instantly!`,
      timestamp: 'Just now',
      movieTitle: movie.title
    });
  };

  // Live room player joins
  const handleJoinRoomByTitle = (movieTitle: string) => {
    const movie = movies.find((m) => m.title.toUpperCase() === movieTitle.toUpperCase());
    if (movie) {
      // Content rating check gate
      const lockCheck = isMovieAllowedForUser(movie.rating, userAge, parentMaxRating, isParentalModeActive);
      if (!lockCheck.allowed) {
        alert(`Access Restricted: This film room is locked based on your current profile age ratings.`);
        return;
      }
      recordJoinedRoom(movie);
      setPlayingMovieId(movie.id);
    } else {
      // default fallback
      setPlayingMovieId('m1');
    }
  };

  // Upload/request custom screen nominations
  const handleRequestScreening = (newMovie: Partial<Movie>) => {
    const freshId = `m-${Date.now()}`;
    const finalizedMovie: Movie = {
      id: freshId,
      title: newMovie.title || 'NOMINATED PREMIERE',
      synopsis: newMovie.synopsis || 'A custom cinematic lounge chosen by the viewer circle.',
      genre: newMovie.genre || 'SCI-FI',
      rating: newMovie.rating || 'U',
      runtime: newMovie.runtime || '1h 30m',
      format: newMovie.format || '4K ULTRA',
      ratingScore: 4.5,
      reviewsCount: '1',
      imageUrl: newMovie.imageUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=600',
      startsIn: newMovie.startsIn || 'Scheduled',
      cast: newMovie.cast || [],
      tag: 'REQUESTED',
    };

    setMovies((prev) => [finalizedMovie, ...prev]);
  };

  const handleUploadFilm = (newMovie: Partial<Movie>) => {
    const freshId = newMovie.id || `m-${Date.now()}`;
    const finalizedMovie: Movie = {
      id: freshId,
      title: newMovie.title || 'STUDIO MASTER REEL',
      synopsis: newMovie.synopsis || 'An elite high-budget classic theatrical release.',
      genre: newMovie.genre || 'CLASSIC',
      rating: newMovie.rating || 'PG-13',
      runtime: newMovie.runtime || '2h 15m',
      format: newMovie.format || 'DOLBY CINEMA',
      ratingScore: 4.8,
      reviewsCount: '410',
      imageUrl: newMovie.imageUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=600',
      heroImageUrl: newMovie.heroImageUrl,
      startsIn: newMovie.startsIn || 'Tomorrow',
      cast: newMovie.cast || [],
      capacity: 100, // starting meter
      videoBlobUrl: newMovie.videoBlobUrl,
      uploadedFileName: newMovie.uploadedFileName,
    };

    setMovies((prev) => [finalizedMovie, ...prev]);
  };

  const handleSurpriseMe = () => {
    const allowedMovies = movies.filter((movie) => {
      const lockCheck = isMovieAllowedForUser(movie.rating, userAge, parentMaxRating, isParentalModeActive);
      return lockCheck.allowed;
    });

    if (allowedMovies.length === 0) {
      alert('No available movies matching your rating lock criteria!');
      return;
    }

    const randomMovie = allowedMovies[Math.floor(Math.random() * allowedMovies.length)];
    setPlayingMovieId(randomMovie.id);

    triggerAppNotification({
      id: `surprise-${Date.now()}`,
      type: 'screening',
      title: 'Serendipity Screening Sparked 🍿',
      message: `Dropping you into ${randomMovie.title} (${randomMovie.format} ${randomMovie.genre}) synchronized lounge!`,
      timestamp: 'Just now',
      movieTitle: randomMovie.title,
    });
  };

  // Authentication callbacks
  const handleGoogleSignInSuccess = async (session: any) => {
    const user = session.user;
    const email = user.email || '';
    const fullName = user.user_metadata.full_name || email.split('@')[0] || 'Google User';
    const avatarUrl = user.user_metadata.avatar_url || user.user_metadata.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150';
    
    setIsLoggedIn(true);
    setUsername(fullName);
    setUserAvatarUrl(avatarUrl);
    
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('logged_in_username', fullName);
    localStorage.setItem('popcorn_user_avatar', avatarUrl);
    
    try {
      await syncUserRelationalData(user, 'individual');
      await syncAndLoadSaaSProfile(user.id, email, fullName);
    } catch (e) {
      console.warn('Syncing logged-in Google profile failed:', e);
    }
    
    setShowAuthModal(false);
    
    triggerAppNotification({
      id: `google-auth-${Date.now()}`,
      type: 'release',
      title: 'Google Sign In Successful! 🎉',
      message: `Welcome back, @${fullName}! Your workspace profile has been fully synchronized with Google.`,
      timestamp: 'Just now',
      movieTitle: 'System Account'
    });
  };

  const handleAuthSuccess = async (name: string, dob: string, age: number, optInParental: boolean, selectedAccountType?: 'individual' | 'studio') => {
    setIsLoggedIn(true);
    setUsername(name);
    setDobString(dob);
    setUserAge(age);
    setIsParentalModeActive(optInParental);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('logged_in_username', name);
    localStorage.setItem('dob_string', dob);
    localStorage.setItem('user_age', String(age));
    if (optInParental) {
      // Safeguard restrictive parental default limit to a sensible family level (e.g. PG)
      setParentMaxRating('PG');
    }

    // Perform relational table setup
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await syncUserRelationalData(session.user, selectedAccountType || 'individual', dob);
        await syncAndLoadSaaSProfile(session.user.id, session.user.email || '', name);
      } else {
        // Mock fallback if user is in trial/dev mode
        const fallbackType = selectedAccountType || 'individual';
        setAccountType(fallbackType);
        localStorage.setItem('popcorn_account_type', fallbackType);
        if (fallbackType === 'studio') {
          setIsStudioVerified(false);
          localStorage.setItem('popcorn_studio_verified', 'false');
        }
      }
    } catch (err) {
      console.warn('handleAuthSuccess relational sync warning:', err);
    }

    setShowAuthModal(false);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign out error:', e);
    }
    if (userProfile) {
      localStorage.removeItem(`popcorn_profile_cache_${userProfile.userId}`);
    }
    setUserProfile(null);

    setIsLoggedIn(false);
    setUsername('');
    setDobString('');
    setUserAge(null);
    setIsParentalModeActive(false);
    setAccountType(null);
    setIsStudioVerified(false);
    setStudioDetails(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('logged_in_username');
    localStorage.removeItem('dob_string');
    localStorage.removeItem('user_age');
    localStorage.removeItem('popcorn_user_avatar');
    localStorage.removeItem('popcorn_account_type');
    localStorage.removeItem('popcorn_studio_verified');

    triggerAppNotification({
      id: `signout-${Date.now()}`,
      type: 'release',
      title: 'Successfully Signed Out',
      message: 'You have been logged out of your popcorn account. See you soon!',
      timestamp: 'Just now',
      movieTitle: 'System Account'
    });
  };

  const handleEditProfileSave = async (newUsername: string, newDob: string, newAvatarUrl: string) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    let computedAge = 26; // default fallback
    try {
      const parts = newDob.replace(',', '').split(' ');
      if (parts.length === 3) {
        const mIndex = months.indexOf(parts[0]);
        const birthDateObj = new Date(parseInt(parts[2]), mIndex, parseInt(parts[1]));
        const today = new Date();
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const mDifference = today.getMonth() - birthDateObj.getMonth();
        if (mDifference < 0 || (mDifference === 0 && today.getDate() < birthDateObj.getDate())) {
          age--;
        }
        computedAge = age;
      }
    } catch (e) {
      console.warn(e);
    }

    setUsername(newUsername);
    setDobString(newDob);
    setUserAge(computedAge);
    setUserAvatarUrl(newAvatarUrl);

    localStorage.setItem('logged_in_username', newUsername);
    localStorage.setItem('dob_string', newDob);
    localStorage.setItem('user_age', String(computedAge));
    localStorage.setItem('popcorn_user_avatar', newAvatarUrl);

    // Save profile changes to the Supabase profiles database table
    try {
      await supabase
        .from('profiles')
        .upsert({
          username: newUsername,
          full_name: newUsername,
          avatar_url: newAvatarUrl,
          favorite_genres: favoriteChips
        }, { onConflict: 'username' });
    } catch (err) {
      console.error('Error saving updated profile to Supabase:', err);
    }

    setShowEditProfileModal(false);

    triggerAppNotification({
      id: `profile-update-${Date.now()}`,
      type: 'release',
      title: 'Profile Updated Successfully ⭐',
      message: `Your handle has been configured to @${newUsername} and age restrictions updated.`,
      timestamp: 'Just now',
      movieTitle: 'Profile Editor'
    });
  };

  const handleUpdateFavoriteChips = async (newChips: string[]) => {
    setFavoriteChips(newChips);
    localStorage.setItem('popcorn_favourite_genres', JSON.stringify(newChips));
    
    const activeUser = username.trim() || 'cinephile_guest';
    try {
      await supabase
        .from('profiles')
        .upsert({
          username: activeUser,
          favorite_genres: newChips
        }, { onConflict: 'username' });
    } catch (err) {
      console.error('Error updating favorite genres in Supabase:', err);
    }
  };

  const handleTriggerUpgrade = (movieTitle?: string) => {
    setUpgradePitchMovie(movieTitle);
    setShowUpgradeModal(true);
  };

  const handleUpgradeSuccess = () => {
    setIsPopcornPass(true);
    localStorage.setItem('isPopcornPass', 'true');
    triggerAppNotification({
      id: `not-pass-${Date.now()}`,
      type: 'screening',
      title: 'ROWONE Pass Activated 👑',
      message: 'Exclusive subscriber pass benefits successfully unlocked! enjoy free movie screening sessions.',
      timestamp: 'Just now',
      movieTitle: 'The Midnight Premiere',
    });
  };

  // Real-time results calculated based on the DEBOUNCED value across movies, studios, genres, and screenings
  const searchResults = React.useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return { movies: [], studios: [], genres: [], screenings: [] };

    const matchingMovies: Movie[] = [];
    const matchingStudios: { movie: Movie; studioName: string }[] = [];
    const matchingGenres: Movie[] = [];
    const matchingScreenings: { movie: Movie; time: string; features: string }[] = [];

    // Local dictionary of studios for movies
    const getStudioName = (m: Movie): string => {
      if (m.title.toLowerCase().includes('midnight') || m.genre === 'DRAMA') return 'Midnight Studios';
      if (m.genre === 'CLASSIC' || m.id === 'm2') return 'Classic Cinema Studios';
      if (m.genre === 'DOCUMENTARY') return 'Apex Nature Broadcasts';
      return 'Cinephile Global Network';
    };

    allowedMovies.forEach((m) => {
      const title = m.title.toLowerCase();
      const synopsis = m.synopsis.toLowerCase();
      const genre = m.genre.toLowerCase();
      const studio = getStudioName(m).toLowerCase();
      const startsIn = (m.startsIn || '').toLowerCase();

      // Check for movie matches
      if (title.includes(q) || synopsis.includes(q)) {
        matchingMovies.push(m);
      }

      // Check for studio matches
      if (studio.includes(q)) {
        matchingStudios.push({ movie: m, studioName: getStudioName(m) });
      }

      // Check for genre matches
      if (genre.includes(q)) {
        matchingGenres.push(m);
      }

      // Check for screening times matches
      if (startsIn.includes(q) || (q === 'tonight' && startsIn === 'tonight') || (q === 'tomorrow' && startsIn === 'tomorrow')) {
        matchingScreenings.push({ movie: m, time: m.startsIn || 'Scheduled', features: m.format });
      }
      
      const staticTimes = ['21:30', '22:00', '23:45', '00:15'];
      staticTimes.forEach(time => {
        if (time.includes(q) && (m.id === 'm6' || m.id === 'm1' || m.id === 'm7' || m.id === 'm8')) {
          if (!matchingScreenings.some(x => x.movie.id === m.id && x.time === time)) {
            matchingScreenings.push({ movie: m, time, features: `${m.format} • Synced Lounge` });
          }
        }
      });
    });

    return {
      movies: matchingMovies,
      studios: matchingStudios,
      genres: matchingGenres,
      screenings: matchingScreenings,
    };
  }, [debouncedSearchQuery, movies]);

  // Determine active view rendering frame
  const renderContent = () => {
    if (selectedMovieId) {
      const activeMovie = movies.find((m) => m.id === selectedMovieId);
      if (activeMovie) {
        return (
          <MovieDetailView
            movie={activeMovie}
            onBack={handleBackToGrid}
            onBookSeat={handleBookSeat}
            isPopcornPass={isPopcornPass}
            onTriggerUpgrade={handleTriggerUpgrade}
            friends={friends}
            watchlistIds={watchlistIds}
            onToggleWatchlist={handleToggleWatchlist}
            onClearWatchlist={handleClearWatchlist}
            allMovies={movies}
            onSelectMovie={handleSelectMovie}
            onUpdateMovieAnalytics={handleUpdateMovieAnalytics}
            onCreateWatchParty={(movieId, roomName) => {
              if (!isLoggedIn) {
                setShowAuthModal(true);
                return;
              }
              setIsWatchPartyActive(true);
              setWatchPartyRoomName(roomName);
              setPlayingMovieId(movieId);
              triggerAppNotification({
                id: `wp-${Date.now()}`,
                type: 'invite',
                title: 'Private Sync Started 🎮',
                message: `Created Friends-Only room: '${roomName}'. Sync loops active.`,
                timestamp: 'Just now',
                movieTitle: activeMovie.title
              });
            }}
          />
        );
      }
    }

    switch (currentTab) {
      case 'home':
        return (
          <HomeView
            onBrowse={() => {
              setCurrentTab('browse');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectMovie={handleSelectMovie}
            recentlyViewedIds={recentlyViewedIds}
            movies={allowedMovies}
            onJoinRoom={(movieId) => {
              const movie = movies.find(m => m.id === movieId);
              if (movie) {
                const lockCheck = isMovieAllowedForUser(movie.rating, userAge, parentMaxRating, isParentalModeActive);
                if (!lockCheck.allowed) {
                  alert(`Access Restricted: This film room is locked based on your profile age ratings.`);
                  return;
                }
                recordJoinedRoom(movie);
                setPlayingMovieId(movieId);
              }
            }}
            watchlistIds={watchlistIds}
            onToggleWatchlist={handleToggleWatchlist}
          />
        );
      case 'discover':
        return (
          <DiscoverView
            movies={allowedMovies}
            onSelectMovie={handleSelectMovie}
            onSurpriseMe={handleSurpriseMe}
            userAge={userAge}
            parentMaxRating={parentMaxRating}
            isParentalModeActive={isParentalModeActive}
          />
        );
      case 'browse':
        return (
          <BrowseView
            movies={allowedMovies}
            onSelectMovie={handleSelectMovie}
            onRequestScreening={handleRequestScreening}
            userAge={userAge}
            parentMaxRating={parentMaxRating}
            isParentalModeActive={isParentalModeActive}
            watchlistIds={watchlistIds}
            onToggleWatchlist={handleToggleWatchlist}
            triggerNotification={triggerAppNotification}
          />
        );
      case 'history':
        return (
          <HistoryView
            bookedTickets={bookedTickets}
            onExploreLibrary={() => {
              setCurrentTab('browse');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onJoinRoom={handleJoinRoomByTitle}
            movies={allowedMovies}
            watchlistIds={watchlistIds}
            onToggleWatchlist={handleToggleWatchlist}
            onClearWatchlist={handleClearWatchlist}
            libraryItems={libraryItems}
            onLogWatchedMovie={handleLogWatchedMovie}
            onRemoveFromLibrary={handleRemoveFromLibrary}
            onStartRewatchParty={handleStartRewatchParty}
            unlockedBadges={unlockedBadges}
            onAwardBadge={handleAwardBadge}
            recentRooms={recentRooms}
            isLoggedIn={isLoggedIn}
            username={username}
            userAvatarUrl={userAvatarUrl}
            isPopcornPass={isPopcornPass}
            favoriteChips={favoriteChips}
            onUpdateFavoriteChips={handleUpdateFavoriteChips}
          />
        );
      case 'settings':
        return (
          <SettingsView
            isLoggedIn={isLoggedIn}
            username={username}
            userAge={userAge}
            dobString={dobString}
            parentMaxRating={parentMaxRating}
            isParentalModeActive={isParentalModeActive}
            onUpdateParentalControls={(isActive, maxRating) => {
              setIsParentalModeActive(isActive);
              setParentMaxRating(maxRating);
            }}
            onTriggerAuth={() => handleOpenAuthModal('signin')}
            onTriggerEditProfile={() => setShowEditProfileModal(true)}
            onSignOut={handleSignOut}
            isPopcornPass={isPopcornPass}
            onTriggerUpgrade={() => handleTriggerUpgrade()}
            onToggleSubscription={(isActive) => {
              setIsPopcornPass(isActive);
              localStorage.setItem('isPopcornPass', isActive ? 'true' : 'false');
            }}
            isDyslexiaFontActive={isDyslexiaFontActive}
            onUpdateDyslexiaFont={handleUpdateDyslexiaFont}
            isQuietModeActive={isQuietModeActive}
            onUpdateQuietMode={handleUpdateQuietMode}
            disableReactionsAndAnimations={disableReactionsAndAnimations}
            onUpdateDisableReactionsAndAnimations={handleUpdateDisableReactionsAndAnimations}
            isCinemaAmbientSoundActive={isCinemaAmbientSoundActive}
            onUpdateCinemaAmbientSound={handleUpdateCinemaAmbientSound}
            onTriggerSupport={() => setIsSupportOpen(true)}
             hasStudioAccount={hasStudioAccount}
            onRegisterStudioClick={() => handleOpenAuthModal('register-studio')}
            activeMode={activeMode}
            onToggleActiveMode={(mode) => {
              setActiveMode(mode);
              localStorage.setItem('popcorn_active_mode', mode);
            }}
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfileLocal}
            triggerAppNotification={triggerAppNotification}
          />
        );
      case 'notifications':
        return (
          <div className="space-y-6 animate-fade-in max-w-xl mx-auto px-2">
            <div className="flex justify-between items-center select-none pt-2">
              <div>
                <span className="font-sans text-[9px] font-black text-primary uppercase tracking-widest leading-none">COMMUNAL CONTROL</span>
                <h2 className="font-display text-2xl font-black text-[#f5efeb]">Notifications Inbox</h2>
              </div>
              <button
                onClick={handleClearNotifications}
                className="text-[10px] font-sans font-black text-on-surface-variant hover:text-white uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl cursor-pointer"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-4">
              {notifications.length === 0 ? (
                <div className="p-12 text-center bg-surface-container-low rounded-3xl border border-white/5 select-none">
                  <Bell className="h-8 w-8 mx-auto text-outline-variant duration-1000 animate-pulse mb-3" />
                  <p className="font-sans text-xs font-bold text-on-surface-variant uppercase tracking-widest">Your inbox is empty</p>
                  <p className="font-sans text-[10px] text-on-surface-variant opacity-60 lowercase mt-1.5">We'll notify you when sync parties or releases happen.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`p-5 rounded-2xl border transition-all select-none backdrop-blur-md flex flex-col gap-3 relative overflow-hidden ${
                      notif.isRead 
                        ? 'bg-surface-container-low/40 border-white/5' 
                        : 'bg-primary/5 border-primary/20 shadow-[0_4px_20px_rgba(255,42,77,0.08)]'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 pt-0.5">
                        {notif.type === 'screening' && <Clock className="h-5 w-5 text-secondary" />}
                        {notif.type === 'invite' && <Users className="h-5 w-5 text-primary" />}
                        {notif.type === 'release' && <Film className="h-5 w-5 text-green-400" />}
                      </div>
                      
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2">
                          <h4 className="font-sans font-black text-xs md:text-sm text-on-surface truncate">
                            {notif.title}
                          </h4>
                          {!notif.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          )}
                        </div>
                        <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed mt-1">
                          {notif.message}
                        </p>
                        <span className="font-mono text-[9px] text-on-surface-variant opacity-50 mt-1 block">
                          {notif.timestamp}
                        </span>
                      </div>
                    </div>

                    {notif.movieTitle && (
                      <div className="flex items-center gap-2 justify-end pt-1">
                        <button
                          onClick={() => handleNotificationAction(notif)}
                          className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl font-sans text-[9px] font-black tracking-widest uppercase cursor-pointer"
                        >
                          {notif.type === 'invite' ? 'Join Sync Session' : 'Go to Showcase'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case 'studio':
        return (
          <StudioView
            movies={movies}
            onUploadFilmMovie={handleUploadFilm}
            onScheduleScreening={handleScheduleScreening}
            onStartWatchParty={(movieId, roomName) => {
              setPlayingMovieId(movieId);
              setIsWatchPartyActive(true);
              setWatchPartyRoomName(roomName);
            }}
          />
        );
      default:
        return (
          <HomeView 
            onBrowse={() => setCurrentTab('browse')} 
            onSelectMovie={handleSelectMovie} 
            recentlyViewedIds={recentlyViewedIds}
            movies={allowedMovies}
            onJoinRoom={(movieId) => {
              const movie = movies.find(m => m.id === movieId);
              if (movie) {
                const lockCheck = isMovieAllowedForUser(movie.rating, userAge, parentMaxRating, isParentalModeActive);
                if (!lockCheck.allowed) {
                  alert(`Access Restricted: This film room is locked based on your profile age ratings.`);
                  return;
                }
                recordJoinedRoom(movie);
                setPlayingMovieId(movieId);
              }
            }} 
          />
        );
    }
  };

  // Full-screen TV mode overlay
  if (isTvMode) {
    return (
      <TvModeView
        movies={allowedMovies}
        onExitTvMode={() => setIsTvMode(false)}
        isLoggedIn={isLoggedIn}
        username={username}
        onAwardBadge={handleAwardBadge}
      />
    );
  }

  // Full-screen video player overrides Header/Footer (only if PiP is not active!)
  if (playingMovieId && !isPipActive) {
    const playTarget = movies.find((m) => m.id === playingMovieId);
    if (playTarget) {
      return (
        <MoviePlayerView
          movie={playTarget}
          onBack={() => {
            setPlayingMovieId(null);
            setIsWatchPartyActive(false);
            setWatchPartyRoomName('');
            setIsPipActive(false);
            setPipOffset({ x: 0, y: 0 });
          }}
          isWatchParty={isWatchPartyActive}
          watchPartyRoomName={watchPartyRoomName}
          friends={friends}
          isDyslexiaFontActive={isDyslexiaFontActive}
          isQuietModeActive={isQuietModeActive}
          isCinemaAmbientSoundActive={isCinemaAmbientSoundActive}
          onAwardBadge={handleAwardBadge}
          disableReactionsAndAnimations={disableReactionsAndAnimations}
          onTriggerSupport={(context) => {
            setSupportContext(context || null);
            setIsSupportOpen(true);
          }}
          isPip={false}
          onTogglePip={() => setIsPipActive(true)}
        />
      );
    }
  }

  const isFullWidthHome = currentTab === 'home' && !selectedMovieId;

  return (
    <div className={`min-h-screen bg-background text-on-surface font-sans flex flex-col relative transition-all duration-500 ease-in-out ${isFullWidthHome ? 'pt-0' : 'pt-16'} ${isDyslexiaFontActive ? 'font-dyslexic' : ''} ${isQuietModeActive ? 'quiet-mode' : ''}`}>
      <Header
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setSelectedMovieId(null);
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isLoggedIn={isLoggedIn}
        onOpenAuth={() => handleOpenAuthModal('signin')}
        onOpenSearch={() => setShowSearchModal(true)}
        onOpenQrScanner={() => setShowQrScannerModal(true)}
        notifications={notifications}
        onNotificationAction={handleNotificationAction}
        onClearNotifications={handleClearNotifications}
        isPopcornPass={isPopcornPass}
        onToggleFriends={() => setShowFriendsSidebar(!showFriendsSidebar)}
        onEnterTvMode={() => setIsTvMode(true)}
        onTriggerSupport={() => setIsSupportOpen(true)}
        username={username}
        userAvatarUrl={userAvatarUrl}
        onSignOut={handleSignOut}
        onEditProfile={() => setShowEditProfileModal(true)}
        activeMode={activeMode}
        hasStudioAccount={hasStudioAccount}
        onToggleActiveMode={(mode) => {
          setActiveMode(mode);
          localStorage.setItem('popcorn_active_mode', mode);
          triggerAppNotification({
            id: `mode-toggle-${Date.now()}`,
            type: 'release',
            title: mode === 'studio' ? '🎬 Studio Workspace Active' : '🧍 Viewer Dashboard Active',
            message: mode === 'studio' 
              ? 'Distributor controls, cinema halls, and trailer parameters synchronized.'
              : 'Viewer recommendations, squad halls, and watchlist sync loops loaded.',
            timestamp: 'Just now',
            movieTitle: 'System Account'
          });
        }}
        onRegisterStudioClick={() => handleOpenAuthModal('register-studio')}
      />

      <main className={`flex-grow ${isFullWidthHome ? 'w-full' : 'px-4 md:px-8 py-8 md:py-12 pb-24 md:pb-12 max-w-7xl mx-auto w-full'}`}>
        {renderContent()}
      </main>

      <Footer 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        onTriggerSupport={() => setIsSupportOpen(true)} 
        onTriggerPrivacy={(tab) => {
          setPrivacyTab(tab);
          setIsPrivacyOpen(true);
        }}
      />

      <FriendsSidebar
        isOpen={showFriendsSidebar}
        onClose={() => setShowFriendsSidebar(false)}
        isLoggedIn={isLoggedIn}
        onTriggerAuth={() => setShowAuthModal(true)}
        movies={allowedMovies}
        onJoinFriendRoom={(movieId) => {
          const movie = movies.find(m => m.id === movieId);
          if (movie) {
            const lockCheck = isMovieAllowedForUser(movie.rating, userAge, parentMaxRating, isParentalModeActive);
            if (!lockCheck.allowed) {
              alert(`Access Restricted: This shared room is age-locked based on your profile settings.`);
              return;
            }
            setSelectedMovieId(movieId);
            recordJoinedRoom(movie);
            setPlayingMovieId(movieId);
            setShowFriendsSidebar(false);
          }
        }}
        onTriggerNotification={(title, msg, type) => {
          triggerAppNotification({
            id: `fs-${Date.now()}`,
            type,
            title,
            message: msg,
            timestamp: 'Just now',
            movieTitle: 'Co-Stream Room'
          });
        }}
        username={username}
        onFriendsChange={(updatedFriends) => {
          setFriends(updatedFriends);
        }}
      />

      {/* Shareable Invite Ticket Modal confirmation step */}
      <AnimatePresence>
        {showTicketModal && (
          <TicketModal
            ticket={showTicketModal}
            initialShowKiosk={ticketModalInitialKiosk}
            onClose={() => {
              setShowTicketModal(null);
              setTicketModalInitialKiosk(false);
              setCurrentTab('history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onJoinRoom={(title) => {
              setShowTicketModal(null);
              setTicketModalInitialKiosk(false);
              handleJoinRoomByTitle(title);
            }}
          />
        )}
      </AnimatePresence>

      {/* Interactive Seat Selection Modal floorplan stage */}
      {seatSelectionData && (
        <SeatSelectionModal
          movieTitle={seatSelectionData.movieTitle}
          time={seatSelectionData.time}
          hall={seatSelectionData.hall}
          price={seatSelectionData.price}
          date={seatSelectionData.date}
          bookedTickets={bookedTickets}
          onClose={() => setSeatSelectionData(null)}
          onConfirm={handleCompleteSeatSelection}
        />
      )}

      {/* Live Toast Popups Corner Layer Notification overlay during screens sessions */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3.5 pointer-events-none max-w-sm w-full font-sans">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="live-toast-notification pointer-events-auto bg-surface-container-high/95 border border-primary/20 backdrop-blur-md px-4 py-3.5 rounded-2xl shadow-[0_4px_30px_rgba(255,42,77,0.15)] flex gap-3 animate-fade-in relative overflow-hidden"
          >
            <div className="shrink-0 pt-0.5">
              {toast.type === 'screening' && <Clock className="h-4.5 w-4.5 text-secondary" />}
              {toast.type === 'invite' && <Users className="h-4.5 w-4.5 text-primary" />}
              {toast.type === 'release' && <Film className="h-4.5 w-4.5 text-green-400" />}
            </div>
            
            <div className="flex-1 min-w-0 pr-2">
              <h5 className="font-sans font-black text-[11px] text-on-surface leading-tight truncate">
                {toast.title}
              </h5>
              <p className="font-sans text-[10px] text-on-surface-variant leading-relaxed mt-1">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-on-surface-variant hover:text-white transition-colors self-start p-1 hover:bg-white/5 rounded-lg cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-primary to-secondary w-full" />
          </div>
        ))}
      </div>

      {/* Authentication Gateway Frame */}
      {showAuthModal && (
        <AuthView
          initialMode={authModalMode}
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Edit Profile Info Dialog */}
      {showEditProfileModal && (
        <EditProfileModal
          username={username}
          dobString={dobString}
          userAvatarUrl={userAvatarUrl}
          onClose={() => setShowEditProfileModal(false)}
          onSave={handleEditProfileSave}
          isPopcornPass={isPopcornPass}
        />
      )}

      {/* Search overlay popup popup */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-start justify-center z-50 p-4 pt-16 animate-fade-in">
          <div className="bg-surface-container-low border border-white/5 max-w-xl w-full rounded-2xl overflow-hidden shadow-2xl relative select-none">
            <div className="p-4 border-b border-outline-variant/35 flex items-center gap-3">
              <Search className="h-5 w-5 text-on-surface-variant shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-sm text-on-surface focus:outline-none focus:ring-0 py-1.5 font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-sans font-black text-on-surface-variant hover:text-white uppercase tracking-wider px-2 shrink-0"
                >
                  Clear
                </button>
              )}
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchModal(false);
                }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0 animate-pulse"
              >
                <X className="h-4.5 w-4.5 text-on-surface-variant" />
              </button>
            </div>

            {/* Debounced live results container */}
            <div className="max-h-[70vh] overflow-y-auto p-4 space-y-5">
              {searchQuery === '' ? (
                <div className="space-y-4">
                  <div className="py-2 text-center text-on-surface-variant text-[10px] font-sans font-black uppercase tracking-widest leading-relaxed">
                    Type to instantly query the Silver Lounge
                  </div>
                  
                  {/* Popular quick-tap selectors */}
                  <div className="space-y-2">
                    <span className="text-[8px] font-sans text-on-surface-variant uppercase font-black tracking-widest">Suggested Queries</span>
                    <div className="flex flex-wrap gap-2">
                      {['Midnight', 'Sci-Fi', 'Classic', 'Action', 'Thriller', 'Dolby'].map((term) => (
                        <button
                          key={term}
                          onClick={() => setSearchQuery(term)}
                          className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest border border-white/5 hover:border-primary/20 text-[10px] font-sans text-[#dac8bb] transition-all cursor-pointer"
                        >
                          🔍 {term}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (searchResults.movies.length === 0 &&
                   searchResults.studios.length === 0 &&
                   searchResults.genres.length === 0 &&
                   searchResults.screenings.length === 0) ? (
                <div className="py-8 text-center text-on-surface-variant text-xs font-sans font-bold uppercase tracking-widest leading-relaxed">
                  No matching reels, studios or screenings found
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Category 1: Movies */}
                  {searchResults.movies.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[9px] font-sans font-black text-primary uppercase tracking-[0.2em]">
                        🎬 Matching Reels ({searchResults.movies.length})
                      </div>
                      <div className="space-y-2">
                        {searchResults.movies.map((m) => (
                          <div
                            key={`search-movie-${m.id}`}
                            onClick={() => {
                              setShowSearchModal(false);
                              setSearchQuery('');
                              handleSelectMovie(m.id);
                            }}
                            className="flex items-center justify-between gap-4 p-2 bg-surface-container hover:bg-surface-container-high rounded-xl cursor-pointer border border-white/5 hover:border-primary/20 transition-all duration-200 group/row"
                          >
                            <div className="flex gap-4 items-center min-w-0 flex-1">
                              <div className="w-10 h-14 rounded overflow-hidden shadow flex-shrink-0 bg-black">
                                <img
                                  src={m.imageUrl}
                                  alt={m.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 space-y-1 py-1 min-w-0">
                                <div className="flex justify-between items-center gap-2">
                                  <h4 className="font-sans font-black text-xs md:text-sm text-on-surface truncate">
                                    {m.title}
                                  </h4>
                                  <span className="text-secondary font-sans text-[8.5px] font-black tracking-wider uppercase shrink-0">
                                    {m.genre}
                                  </span>
                                </div>
                                <p className="font-sans text-[10px] text-on-surface-variant flex items-center gap-1.5 truncate">
                                  <span>{m.rating}</span> • <span>{m.runtime}</span> • <span className="text-secondary">{m.format}</span>
                                </p>
                              </div>
                            </div>

                            {/* Quick View Popover trigger button, visible on hover */}
                            <div className="relative group/popover shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-on-surface-variant hover:text-[#dda75f] hover:border-[#dda75f]/30 transition-all opacity-0 group-hover/row:opacity-100 flex items-center justify-center cursor-pointer"
                                title="Quick view synopsis"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              
                              {/* Popover */}
                              <div className="absolute right-0 bottom-full mb-2.5 w-72 p-3 bg-surface-container-highest border border-outline-variant/35 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] opacity-0 scale-95 pointer-events-none group-hover/popover:opacity-100 group-hover/popover:scale-100 transition-all duration-200 z-50">
                                <div className="absolute -bottom-1 right-4 w-2 h-2 bg-surface-container-highest border-r border-b border-outline-variant/35 rotate-45" />
                                <div className="space-y-1 text-left relative z-10">
                                  <div className="flex justify-between items-center pb-1 border-b border-white/5 mb-1">
                                    <span className="font-sans font-black text-[8px] text-[#dda75f] tracking-widest uppercase block">QUICK SYNOPSIS</span>
                                    <span className="text-[8px] font-mono text-on-surface-variant">{m.rating}</span>
                                  </div>
                                  <p className="font-sans text-[10px] text-on-surface leading-normal text-wrap">
                                    {m.synopsis}
                                  </p>
                                </div>
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category 2: Studios */}
                  {searchResults.studios.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="text-[9px] font-sans font-black text-secondary uppercase tracking-[0.2em]">
                        🏢 Mapped Production Studios ({searchResults.studios.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {searchResults.studios.map(({ movie, studioName }, sIdx) => (
                          <div
                            key={`search-studio-${movie.id}-${sIdx}`}
                            onClick={() => {
                              setShowSearchModal(false);
                              setSearchQuery('');
                              handleSelectMovie(movie.id);
                            }}
                            className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-white/5 hover:border-secondary/20 cursor-pointer transition-all duration-200"
                          >
                            <span className="font-mono text-[8px] text-secondary font-black tracking-widest uppercase block leading-none">STUDIO OWNER</span>
                            <span className="font-sans font-bold text-xs text-[#f5efeb] leading-tight block mt-1">{studioName}</span>
                            <span className="font-sans text-[9px] text-on-surface-variant/70 block mt-0.5">featuring "{movie.title}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category 3: Genres */}
                  {searchResults.genres.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="text-[9px] font-sans font-black text-purple-400 uppercase tracking-[0.2em]">
                        🏷️ Genre Lounges ({searchResults.genres.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(searchResults.genres.map((g) => g.genre))).map((genre) => (
                          <button
                            key={`search-genre-${genre}`}
                            onClick={() => {
                              setShowSearchModal(false);
                              setSearchQuery('');
                              setCurrentTab('browse');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-[10px] font-sans font-black tracking-widest text-primary uppercase rounded-full cursor-pointer transition-all"
                          >
                            🎭 {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Category 4: Screenings */}
                  {searchResults.screenings.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="text-[9px] font-sans font-black text-green-400 uppercase tracking-[0.2em]">
                        ⏰ Upcoming Screenings &amp; Times ({searchResults.screenings.length})
                      </div>
                      <div className="space-y-2">
                        {searchResults.screenings.map(({ movie, time, features }, tIdx) => (
                          <div
                            key={`search-screen-${movie.id}-${tIdx}`}
                            onClick={() => {
                              setShowSearchModal(false);
                              setSearchQuery('');
                              handleSelectMovie(movie.id);
                            }}
                            className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-white/5 hover:border-green-400/20 cursor-pointer transition-all duration-200 flex justify-between items-center gap-4"
                          >
                            <div>
                              <span className="font-sans font-black text-xs text-[#f5efeb] block">{movie.title}</span>
                              <span className="font-sans text-[9px] text-on-surface-variant leading-none mt-1 block">{features}</span>
                            </div>
                            <div className="px-3 py-1.5 rounded-lg bg-green-400/10 border border-green-400/25 shrink-0 select-none">
                              <span className="font-mono text-xs font-black text-green-400">{time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {stripeVerifying && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in select-none">
          <div className="text-center space-y-6 max-w-sm px-6">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-2 border-yellow-400/25 border-t-yellow-400 animate-spin" />
              <div className="absolute h-8 w-8 rounded-full bg-yellow-400/10 flex items-center justify-center text-yellow-400">
                <Lock className="h-4.5 w-4.5" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-display text-lg font-black text-white tracking-wide uppercase">Stripe secure validation</h3>
              <p className="font-mono text-[10px] text-zinc-400 tracking-wider">
                {stripeVerifyMessage || 'Connecting to secure Stripe gateway...'}
              </p>
            </div>
            
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-[9px] text-zinc-500 leading-normal">
              Please preserve this window loop alive. Complete security handshake verifies transactions instantly block-free.
            </div>
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <UpgradeModal
          pitchMovieTitle={upgradePitchMovie}
          onUpgradeSuccess={handleUpgradeSuccess}
          onClose={() => setShowUpgradeModal(false)}
          userId={userProfile?.userId}
          userEmail={userProfile?.email}
        />
      )}

      <SupportPanel
        isOpen={isSupportOpen}
        onClose={() => {
          setIsSupportOpen(false);
          setSupportContext(null);
        }}
        username={username}
        isLoggedIn={isLoggedIn}
        movieTitleContext={supportContext?.movieTitle || (playingMovieId ? movies.find((m) => m.id === playingMovieId)?.title : null)}
        roomIdContext={supportContext?.roomId || (isWatchPartyActive ? watchPartyRoomName : null)}
        playbackStateContext={supportContext?.playbackState || (playingMovieId ? 'PLAYING' : 'Not watching any film')}
        onAddToastNotification={(title, message, type) => {
          const mappedType: 'screening' | 'invite' | 'release' = 
            type === 'invite' ? 'invite' : 
            type === 'system' ? 'screening' : 
            type === 'screening' ? 'screening' : 'release';
          triggerAppNotification({
            id: `wp-support-${Date.now()}`,
            type: mappedType,
            title,
            message,
            timestamp: 'Just now',
            movieTitle: 'Cinema Support'
          });
        }}
        onBackToWatching={() => setIsSupportOpen(false)}
      />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        initialTab={privacyTab}
      />

      <QrScannerModal
        isOpen={showQrScannerModal}
        onClose={() => setShowQrScannerModal(false)}
        onNavigateToContent={handleQrScannerNavigation}
      />

      {/* Floating Picture-in-Picture Screening Player */}
      <AnimatePresence>
        {playingMovieId && isPipActive && (
          <motion.div
            initial={{ opacity: 0, y: 150, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 120, scale: 0.93 }}
            transition={{ type: "spring", stiffness: 240, damping: 23 }}
            className="fixed bottom-20 right-6 z-50 pointer-events-none"
          >
            <div 
              className={`w-80 md:w-[360px] rounded-3xl border relative bg-black flex flex-col group pointer-events-auto select-none touch-none transition-all duration-300 ${
                isPipLocked
                  ? 'border-red-500/90 shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_15px_rgba(239,68,68,0.25)]'
                  : showPipSnapGlow 
                    ? 'border-emerald-400 ring-2 ring-emerald-500/50 shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(16,185,129,0.7)] scale-[1.015]'
                    : 'border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.85)]'
              } ${
                pipAspectRatio === 'cinematic' 
                  ? 'h-36 md:h-[150px]' 
                  : 'h-48 md:h-[216px]'
              }`}
              id="floating-pip-container"
              style={{
                transform: `translate(${pipOffset.x}px, ${pipOffset.y}px)`,
                transition: isDraggingPip ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={handlePipMouseEnter}
              onMouseMove={handlePipMouseMove}
              onMouseLeave={() => {
                if (pipHeaderTimeoutRef.current) {
                  clearTimeout(pipHeaderTimeoutRef.current);
                }
                pipHeaderTimeoutRef.current = setTimeout(() => {
                  setShowPipHeader(false);
                }, 1200);
              }}
            >
              {/* Persistent red Locked status badge centered on the container border */}
              {isPipLocked && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-[60] bg-red-600 border border-red-500/50 shadow-md text-white font-sans text-[7px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1 select-none pointer-events-none animate-bounce">
                  <Lock className="h-1.5 w-1.5 fill-white text-white shrink-0 animate-pulse" />
                  <span>WINDOW LOCKED</span>
                </div>
              )}

              {/* PiP Floating Window Mini Header */}
              <div 
                className={`bg-[#0c0c0e]/90 backdrop-blur-md px-3 py-1.5 flex justify-between items-center text-[9px] font-sans border-b border-white/5 select-none text-neutral-400 shrink-0 rounded-t-3xl ${isPipLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} transition-opacity duration-300 ease-in-out ${showPipHeader ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onPointerDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || isPipLocked) {
                    return;
                  }
                  setIsDraggingPip(true);
                  dragStartRef.current = { x: e.clientX, y: e.clientY };
                  dragOffsetStartRef.current = { ...pipOffset };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!isDraggingPip) return;
                  const dx = e.clientX - dragStartRef.current.x;
                  const dy = e.clientY - dragStartRef.current.y;
                  setPipOffset({
                    x: dragOffsetStartRef.current.x + dx,
                    y: dragOffsetStartRef.current.y + dy
                  });
                }}
                onPointerUp={(e) => {
                  if (!isDraggingPip) return;
                  setIsDraggingPip(false);
                  e.currentTarget.releasePointerCapture(e.pointerId);

                  // Magnetic snapping & Docking alignment to the nearest edge
                  const container = e.currentTarget.closest('#floating-pip-container') as HTMLElement;
                  if (container) {
                    const rect = container.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;

                    const distLeft = rect.left;
                    const distRight = viewportWidth - rect.right;
                    const distTop = rect.top;
                    const distBottom = viewportHeight - rect.bottom;

                    let adjustX = 0;
                    let adjustY = 0;

                    const minHorizontal = Math.min(distLeft, distRight);
                    const minVertical = Math.min(distTop, distBottom);
                    const minDistance = Math.min(minHorizontal, minVertical);

                    if (minDistance === distLeft) {
                      adjustX = 16 - rect.left;
                    } else if (minDistance === distRight) {
                      adjustX = (viewportWidth - rect.width - 16) - rect.left;
                    } else if (minDistance === distTop) {
                      adjustY = 16 - rect.top;
                    } else if (minDistance === distBottom) {
                      adjustY = (viewportHeight - rect.height - 16) - rect.top;
                    }
                    // Trigger smooth snap glow animation for physical alignment confirmation
                    setShowPipSnapGlow(true);

                    // Protect/clamp within safe viewport margin limits (min 16px from edges)
                    setPipOffset(prev => {
                      const projLeft = rect.left + adjustX;
                      const projTop = rect.top + adjustY;

                      let finalAdjustX = adjustX;
                      let finalAdjustY = adjustY;

                      if (projLeft < 16) {
                        finalAdjustX = adjustX + (16 - projLeft);
                      } else if (projLeft + rect.width > viewportWidth - 16) {
                        finalAdjustX = adjustX + ((viewportWidth - rect.width - 16) - projLeft);
                      }

                      if (projTop < 16) {
                        finalAdjustY = adjustY + (16 - projTop);
                      } else if (projTop + rect.height > viewportHeight - 16) {
                        finalAdjustY = adjustY + ((viewportHeight - rect.height - 16) - projTop);
                      }

                      return {
                        x: prev.x + finalAdjustX,
                        y: prev.y + finalAdjustY
                      };
                    });
                  }
                  resetPipHeaderTimer();
                }}
              >
                <div className="flex items-center gap-1.5 truncate mr-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPipLocked ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-ping'}`} />
                  <strong className="text-white truncate uppercase tracking-wide font-display">
                    {movies.find(m => m.id === playingMovieId)?.title} • PiP
                  </strong>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 select-none">
                  {isPipLocked ? (
                    <span className="font-mono text-[7px] text-red-400 font-extrabold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-widest flex items-center gap-1 tracking-wider leading-none shrink-0 animate-pulse">
                      <Lock className="h-1.5 w-1.5 text-red-500 fill-current shrink-0" />
                      Locked
                    </span>
                  ) : (
                    <span className="font-mono text-[7px] text-emerald-400 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest hidden sm:inline-block">
                      Sync Active
                    </span>
                  )}
                  
                  {/* Aspect Ratio Toggler */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPipAspectRatio(prev => prev === 'default' ? 'cinematic' : 'default');
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded border text-[7px] font-sans font-black uppercase tracking-widest cursor-pointer transition-all duration-150 bg-white/5 text-neutral-300 border-white/10 hover:bg-white/12 active:scale-95"
                    id="pip-ratio-toggle-btn"
                    title={pipAspectRatio === 'cinematic' ? "Switch to Default aspect ratio" : "Switch to Cinematic aspect ratio"}
                  >
                    <Film className="h-2 w-2 text-yellow-500" />
                    <span>{pipAspectRatio === 'cinematic' ? 'Cinematic' : 'Default'}</span>
                  </button>

                  {/* Viewers Dropdown & Badge */}
                  <div className="relative">
                    <button
                      type="button"
                      id="pip-viewers-dropdown-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPipViewersDropdown(!showPipViewersDropdown);
                      }}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[7px] font-sans font-black uppercase tracking-widest cursor-pointer transition-all duration-150 active:scale-95 ${
                        showPipViewersDropdown 
                          ? 'bg-[#dda75f]/20 text-[#dda75f] border-[#dda75f]/40 font-black shadow-[0_0_8px_rgba(221,167,95,0.3)]' 
                          : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/12 hover:border-[#dda75f]/40 hover:text-[#dda75f]'
                      }`}
                      title="View Active Room Synchronization Participants"
                    >
                      <Users className="h-2 w-2 text-[#dda75f] animate-pulse shrink-0" />
                      <span>{pipParticipants.length} Viewers</span>
                    </button>

                    {/* Popover/Dropdown Card */}
                    <AnimatePresence>
                      {showPipViewersDropdown && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -5 }}
                          transition={{ duration: 0.12 }}
                          className="absolute right-0 top-6 z-[70] w-48 bg-neutral-950/95 border border-white/10 rounded-2xl p-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.95)] backdrop-blur-md space-y-2 pointer-events-auto select-none"
                        >
                          <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
                            <span className="text-[7.5px] font-sans font-black uppercase tracking-widest text-[#dda75f] flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping shrink-0" />
                              Sync Party Lobby
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMuteAllParticipants();
                              }}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-950/20 border border-red-500/20 hover:bg-red-500/30 hover:border-red-500/50 text-[5.5px] font-sans font-black uppercase tracking-widest transition-all cursor-pointer text-red-400 active:scale-95"
                              title="Silence all synced audience participants"
                            >
                              <VolumeX className="h-1.5 w-1.5 shrink-0" />
                              <span>Mute All</span>
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-none">
                            {pipParticipants.map((p) => (
                              <div key={p.id} className="flex justify-between items-center gap-1.5 p-1 rounded hover:bg-white/5 transition-all">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <img 
                                    src={p.id === 'v1' ? (userAvatarUrl || p.avatar) : p.avatar} 
                                    alt={p.name} 
                                    className="w-4 h-4 rounded-full border border-white/10 object-cover shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-[7.5px] font-bold text-white truncate max-w-[85px] leading-tight">
                                      {p.id === 'v1' ? (username || 'You') : p.name}
                                    </div>
                                    <div className="text-[5.5px] text-zinc-500 leading-none font-medium">
                                      {p.role}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePingParticipant(p.id, p.name);
                                    }}
                                    className="px-1 py-0.5 rounded bg-white/5 border border-white/10 hover:bg-[#dda75f]/25 hover:border-[#dda75f]/50 text-[5px] font-sans font-black uppercase tracking-widest transition-all cursor-pointer text-[#dda75f] active:scale-90"
                                  >
                                    Ping
                                  </button>
                                  {p.id !== 'v1' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleKickParticipant(p.id, p.name);
                                      }}
                                      className="px-1 py-0.5 rounded bg-red-950/20 border border-red-500/20 hover:bg-red-500/30 hover:border-red-500/50 text-[5px] font-sans font-black uppercase tracking-widest transition-all cursor-pointer text-red-400 active:scale-90"
                                    >
                                      Kick
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="pt-1.5 border-t border-white/5 flex gap-1.5 justify-between">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddViewersSimulation();
                              }}
                              className="w-full py-1 text-center bg-[#dda75f] hover:bg-amber-500 text-black rounded-lg font-sans text-[6px] font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95"
                            >
                              Add Mock Viewer
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Scan QR Button for Ticket entry */}
                  <button
                    id="scan-qr-pip-btn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Find or construct a booked ticket to scan
                      const currentMovie = movies.find(m => m.id === playingMovieId);
                      let ticketToScan = bookedTickets.find(t => t.movieTitle === currentMovie?.title);
                      if (!ticketToScan) {
                        ticketToScan = bookedTickets[bookedTickets.length - 1];
                      }
                      if (!ticketToScan) {
                        ticketToScan = {
                          id: "TICK-MOCK-GLOBAL",
                          movieTitle: currentMovie?.title || "ROWONE Global Premiere",
                          imageUrl: currentMovie?.imageUrl || "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=300",
                          time: "20:00",
                          hall: "Grand Lounge",
                          seat: "VIP-A1",
                          price: "$14.99",
                          date: "Today"
                        };
                      }
                      setTicketModalInitialKiosk(true);
                      setShowTicketModal(ticketToScan);
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded border text-[7px] font-sans font-black uppercase tracking-widest cursor-pointer transition-all duration-150 bg-white/5 text-neutral-300 border-white/10 hover:bg-white/12 hover:border-[#dda75f]/50 hover:text-[#dda75f] active:scale-95"
                    title="Scan QR Ticket Code for Cinema Entry"
                  >
                    <QrCode className="h-2 w-2 text-[#dda75f]" />
                    <span>Scan QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPipLocked(!isPipLocked);
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[7px] font-sans font-black uppercase tracking-widest cursor-pointer transition-all duration-150 ${
                      isPipLocked
                        ? 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
                        : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/12'
                    }`}
                    id="pip-lock-toggle-btn"
                    title={isPipLocked ? "Unlock PIP Screen" : "Lock PIP Screen (Lock Screen)"}
                  >
                    {isPipLocked ? (
                      <>
                        <Lock className="h-2 w-2 text-red-500 shrink-0" />
                        <span>Locked</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="h-2 w-2 text-neutral-300 shrink-0" />
                        <span>Lock Screen</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-1 relative overflow-hidden bg-black rounded-b-3xl">
                {/* Real-time Voice Chat Voice Amplitude Spectrum Overlay */}
                <div className="absolute top-2 right-2 z-30 flex items-center gap-2 bg-[#0c0c0e]/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] group/voice transition-all hover:bg-[#0c0c0e]/95 hover:border-white/10 select-none">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPipMicActive(!isPipMicActive);
                    }}
                    className={`p-1 rounded-full cursor-pointer transition-all active:scale-90 ${
                      isPipMicActive 
                        ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30' 
                        : 'bg-white/5 text-neutral-400 hover:bg-white/10 border border-white/10'
                    }`}
                    title={isPipMicActive ? "Mute Synchronized Voice Chat" : "Unmute Synchronized Voice Chat"}
                  >
                    {isPipMicActive ? <Mic className="h-2.5 w-2.5" /> : <MicOff className="h-2.5 w-2.5" />}
                  </button>

                  <div className="flex flex-col select-none pr-1">
                    <span className="text-[5.5px] text-zinc-500 font-sans tracking-widest font-black uppercase leading-tight">
                      CineMic™ Sync
                    </span>
                    <span className="text-[7px] text-white font-mono leading-none flex items-center gap-1 font-bold">
                      {isPipMicActive ? (
                        <>
                          <span className="w-1 h-3/4 rounded-full bg-emerald-500 animate-pulse inline-block" />
                          {pipVoiceAmplitude}% <span className="text-[5.5px] text-emerald-400 uppercase font-sans font-black">Live</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1 h-1 rounded-full bg-neutral-600 inline-block" />
                          <span className="text-[5.5px] text-zinc-500 uppercase font-sans font-black">Muted</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Sound Wave Spectrum (Volume Bar Bars) */}
                  <div className="flex items-end gap-0.5 h-4 px-1 py-0.5 bg-black/40 rounded-md border border-white/5">
                    {Array.from({ length: 10 }).map((_, k) => {
                      const getBouncingHeight = (barIndex: number) => {
                        if (!isPipMicActive || pipVoiceAmplitude === 0) return "4px";
                        const distToCenter = Math.abs(barIndex - 4.5);
                        const spreadFactor = Math.max(0.1, 1 - (distToCenter / 5.5));
                        const pinFreq = Date.now() / 60 + barIndex * 1.8;
                        const fluctuation = Math.sin(pinFreq) * 12 + Math.cos(pinFreq * 0.7) * 4;
                        const baseVal = (pipVoiceAmplitude * spreadFactor) + fluctuation;
                        const finalHeight = Math.min(100, Math.max(12, baseVal));
                        return `${finalHeight}%`;
                      };

                      return (
                        <div 
                          key={k}
                          style={{ height: getBouncingHeight(k) }}
                          className={`w-0.5 rounded-full transition-all duration-75 ${
                            isPipMicActive 
                              ? 'bg-gradient-to-t from-emerald-500 via-amber-400 to-[#dda75f] shadow-[0_0_4px_rgba(16,185,129,0.4)]'
                              : 'bg-zinc-800'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {(() => {
                  const playTarget = movies.find((m) => m.id === playingMovieId);
                  if (playTarget) {
                    return (
                      <MoviePlayerView
                        movie={playTarget}
                        onBack={() => {
                          setPlayingMovieId(null);
                          setIsWatchPartyActive(false);
                          setWatchPartyRoomName('');
                          setIsPipActive(false);
                          setPipOffset({ x: 0, y: 0 });
                        }}
                        isWatchParty={isWatchPartyActive}
                        watchPartyRoomName={watchPartyRoomName}
                        friends={friends}
                        isDyslexiaFontActive={isDyslexiaFontActive}
                        isQuietModeActive={isQuietModeActive}
                        isCinemaAmbientSoundActive={isCinemaAmbientSoundActive}
                        onAwardBadge={handleAwardBadge}
                        disableReactionsAndAnimations={disableReactionsAndAnimations}
                        onTriggerSupport={(context) => {
                          setSupportContext(context || null);
                          setIsSupportOpen(true);
                        }}
                        isPip={true}
                        onTogglePip={() => setIsPipActive(false)}
                      />
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIntro && (
          <IntroAnimation onComplete={() => setShowIntro(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
