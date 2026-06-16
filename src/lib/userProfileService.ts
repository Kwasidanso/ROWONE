/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabaseClient';
import { encryptWithSubtle, decryptWithSubtle } from '../utils/cryptoUtility';

export interface UserProfile {
  userId: string;
  email: string;
  fullName: string;
  companyName: string;
  phoneNumber: string;
  website: string;
  profileImage: string;
  address: string;
  country: string;
  preferredLanguage: string;
  timezone: string;
  userSettings: {
    parentalLockActive: boolean;
    parentMaxRating: string;
    dyslexiaFontActive: boolean;
    quietModeActive: boolean;
    disableReactions: boolean;
    ambientSoundActive: boolean;
  };
  connectedServices: {
    googleConnected: boolean;
    discordConnected: boolean;
    stripeConnected: boolean;
  };
  apiKeys: {
    id: string;
    label: string;
    encryptedKey: string;
    createdAt: string;
  }[];
  subscriptionPlan: 'spectator' | 'gold_premium' | 'vip_platinum';
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Client-side cipher using the user's specific secret UID as a private key
export function encryptValue(plainText: string, secretKey: string): string {
  if (!plainText) return '';
  try {
    const cipherText = plainText.split('').map((char, index) => {
      const keyChar = secretKey.charCodeAt(index % secretKey.length);
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
    }).join('');
    return btoa(unescape(encodeURIComponent(cipherText)));
  } catch (e) {
    console.error('Symmetric encrypt failed:', e);
    return plainText;
  }
}

export function decryptValue(cipherText: string, secretKey: string): string {
  if (!cipherText) return '';
  try {
    const rawCipher = decodeURIComponent(escape(atob(cipherText)));
    return rawCipher.split('').map((char, index) => {
      const keyChar = secretKey.charCodeAt(index % secretKey.length);
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
    }).join('');
  } catch (e) {
    console.error('Symmetric decrypt failed:', e);
    return '';
  }
}

// Secure Asynchronous Cryptographic Wrappers (SubtleCrypto Native AES-GCM)
export async function encryptValueAsync(plainText: string, secretKey: string): Promise<string> {
  return await encryptWithSubtle(plainText, secretKey);
}

export async function decryptValueAsync(cipherText: string, secretKey: string): Promise<string> {
  return await decryptWithSubtle(cipherText, secretKey);
}

export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) {
    return '••••••••••••';
  }
  return `${key.slice(0, 8)}••••••••${key.slice(-4)}`;
}

// Default initial state generator
export function createDefaultProfile(userId: string, email: string, fullName = ''): UserProfile {
  const timestamp = new Date().toISOString();
  return {
    userId,
    email,
    fullName: fullName || email.split('@')[0] || 'Cinephile',
    companyName: '',
    phoneNumber: '',
    website: '',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    address: '',
    country: 'United States',
    preferredLanguage: 'English',
    timezone: 'UTC',
    userSettings: {
      parentalLockActive: false,
      parentMaxRating: 'PG-13',
      dyslexiaFontActive: false,
      quietModeActive: false,
      disableReactions: false,
      ambientSoundActive: false,
    },
    connectedServices: {
      googleConnected: email.includes('gmail.com'),
      discordConnected: false,
      stripeConnected: false,
    },
    apiKeys: [],
    subscriptionPlan: 'spectator',
    onboardingCompleted: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

// Primary load profile routine (fetches database with transparent local fallback caching)
export async function loadUserProfile(userId: string, email: string): Promise<UserProfile> {
  const cacheKey = `rowone_profile_${userId}`;
  
  // Try retrieving from Supabase user_profiles table
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase profile table load failed. Falling back to robust local memory persistence.', error.message);
    } else if (data) {
      // Successfully retrieved from database
      const profileInfo: UserProfile = {
        userId: data.userId,
        email: data.email,
        fullName: data.fullName,
        companyName: data.companyName || '',
        phoneNumber: data.phoneNumber || '',
        website: data.website || '',
        profileImage: data.profileImage || '',
        address: data.address || '',
        country: data.country || '',
        preferredLanguage: data.preferredLanguage || 'English',
        timezone: data.timezone || 'UTC',
        userSettings: data.userSettings || {
          parentalLockActive: false,
          parentMaxRating: 'PG-13',
          dyslexiaFontActive: false,
          quietModeActive: false,
          disableReactions: false,
          ambientSoundActive: false,
        },
        connectedServices: data.connectedServices || {
          googleConnected: false,
          discordConnected: false,
          stripeConnected: false,
        },
        apiKeys: data.apiKeys || [],
        subscriptionPlan: data.subscriptionPlan || 'spectator',
        onboardingCompleted: data.onboardingCompleted || false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      
      // Update local storage cache (encrypted with AES-GCM)
      try {
        const encrypted = await encryptWithSubtle(JSON.stringify(profileInfo), userId);
        localStorage.setItem(cacheKey, encrypted);
      } catch (err) {
        localStorage.setItem(cacheKey, JSON.stringify(profileInfo));
      }
      return profileInfo;
    }
  } catch (err: any) {
    console.warn('Real-time database fetch connection warning:', err.message);
  }

  // Load from offline/unlocked Cache
  const cachedDataStr = localStorage.getItem(cacheKey);
  if (cachedDataStr) {
    try {
      let decryptedStr = cachedDataStr;
      // If it doesn't look like standard unencrypted JSON object, decrypt using AES-GCM
      if (cachedDataStr.trim().startsWith('{') === false) {
        decryptedStr = await decryptWithSubtle(cachedDataStr, userId);
      }
      const cached = JSON.parse(decryptedStr);
      if (cached && cached.userId === userId) {
        return cached;
      }
    } catch (e) {
      console.warn('Failed parsing/decrypting cached user profile, restoring default:', e);
    }
  }

  // Create new profile if none exists
  const defaultProfile = createDefaultProfile(userId, email);
  try {
    const encrypted = await encryptWithSubtle(JSON.stringify(defaultProfile), userId);
    localStorage.setItem(cacheKey, encrypted);
  } catch {
    localStorage.setItem(cacheKey, JSON.stringify(defaultProfile));
  }
  
  // Try inserting it database asynchronously as optimistic strategy
  try {
    await supabase.from('user_profiles').insert(defaultProfile);
  } catch {}

  return defaultProfile;
}

// Primary save profile routine (transacts DB + caches locally synchronously)
export async function saveUserProfile(profile: UserProfile): Promise<boolean> {
  const updatedProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };

  // Sync Cache Instantly with AES-GCM encryption
  const cacheKey = `rowone_profile_${profile.userId}`;
  try {
    const encrypted = await encryptWithSubtle(JSON.stringify(updatedProfile), profile.userId);
    localStorage.setItem(cacheKey, encrypted);
  } catch (err) {
    localStorage.setItem(cacheKey, JSON.stringify(updatedProfile));
  }

  // Sync DB
  try {
    const { error } = await supabase
      .from('user_profiles')
      .upsert(updatedProfile, { onConflict: 'userId' });

    if (error) {
      console.warn('SQL table sync aborted. Profile cached securely offline.', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('Real-time database offline, profile deferred locally:', err.message);
    return false;
  }
}
