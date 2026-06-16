/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabaseClient';
import { UserPaymentMethod } from '../types';

/**
 * Loads saved payment methods for a user.
 * Combines database retrieval with persistent browser local fallback caching.
 */
export async function loadUserPaymentMethods(userId: string): Promise<UserPaymentMethod[]> {
  const cacheKey = `rowone_payment_methods_${userId}`;

  // Try retrieving from Supabase table: user_payment_methods
  try {
    const { data, error } = await supabase
      .from('user_payment_methods')
      .select('*')
      .eq('userId', userId);

    if (error) {
      console.warn('Supabase loading payment methods failed. Falling back to local cache.', error.message);
    } else if (data && data.length > 0) {
      const parsedData: UserPaymentMethod[] = data.map((item: any) => ({
        id: item.id || item.paymentMethodId,
        userId: item.userId,
        provider: item.provider as any || 'stripe',
        customerId: item.customerId,
        paymentMethodId: item.paymentMethodId,
        cardBrand: item.cardBrand,
        lastFourDigits: item.lastFourDigits,
        expiryMonth: item.expiryMonth ? Number(item.expiryMonth) : undefined,
        expiryYear: item.expiryYear ? Number(item.expiryYear) : undefined,
        isDefault: !!item.isDefault,
        email: item.email,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt || item.createdAt,
      }));

      localStorage.setItem(cacheKey, JSON.stringify(parsedData));
      return parsedData;
    }
  } catch (err: any) {
    console.warn('Network alert when fetching saved payment methods:', err.message);
  }

  // Fallback to localStorage cache
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      console.warn('Failed to parse cached payment methods.');
    }
  }

  // Seed default payment methods for a rich Netflix-style experience
  const seedMethods: UserPaymentMethod[] = [
    {
      id: 'pm_stripe_demo_visa',
      userId,
      provider: 'stripe',
      customerId: 'cus_stripe_abc123',
      paymentMethodId: 'pm_stripe_visa4242',
      cardBrand: 'Visa',
      lastFourDigits: '4242',
      expiryMonth: 8,
      expiryYear: 2029,
      isDefault: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'pm_stripe_demo_mastercard',
      userId,
      provider: 'stripe',
      customerId: 'cus_stripe_abc123',
      paymentMethodId: 'pm_stripe_mc8888',
      cardBrand: 'Mastercard',
      lastFourDigits: '8888',
      expiryMonth: 11,
      expiryYear: 2030,
      isDefault: false,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'pm_paypal_demo',
      userId,
      provider: 'paypal',
      customerId: 'cus_paypal_9999',
      paymentMethodId: 'pm_paypal_john',
      email: 'john@example.com',
      isDefault: false,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'pm_apple_demo',
      userId,
      provider: 'applepay',
      customerId: 'cus_apple_1111',
      paymentMethodId: 'pm_apple_pay_device',
      isDefault: false,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'pm_google_demo',
      userId,
      provider: 'googlepay',
      customerId: 'cus_google_2222',
      paymentMethodId: 'pm_google_pay_device',
      isDefault: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  localStorage.setItem(cacheKey, JSON.stringify(seedMethods));
  return seedMethods;
}

/**
 * Saves a new payment method for a user.
 * Preserves details in Supabase with client-side localStorage secondary caching.
 */
export async function saveUserPaymentMethod(paymentMethod: UserPaymentMethod): Promise<boolean> {
  const cacheKey = `rowone_payment_methods_${paymentMethod.userId}`;

  let currentMethods: UserPaymentMethod[] = [];
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      currentMethods = JSON.parse(cached);
    } catch {
      currentMethods = [];
    }
  }

  // If this new method is default, set isDefault: false on all existing ones
  if (paymentMethod.isDefault) {
    currentMethods = currentMethods.map(m => ({ ...m, isDefault: false }));
  }

  // Add the new method to the stack
  currentMethods = [
    paymentMethod,
    ...currentMethods.filter(item => item.paymentMethodId !== paymentMethod.paymentMethodId)
  ];

  localStorage.setItem(cacheKey, JSON.stringify(currentMethods));

  try {
    const { error } = await supabase
      .from('user_payment_methods')
      .upsert(paymentMethod, { onConflict: 'paymentMethodId' });

    if (error) {
      console.warn('SQL Payment Sync aborted. Saved to offline client cache.', error.message);
    }
    return true;
  } catch (err: any) {
    console.warn('Database offline, card details queued in active local storage:', err.message);
    return true; // Return true as local cache is successfully updated
  }
}

/**
 * Set a specific payment method as the default, resetting all others.
 */
export async function setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<UserPaymentMethod[]> {
  const cacheKey = `rowone_payment_methods_${userId}`;
  
  let currentMethods: UserPaymentMethod[] = [];
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      currentMethods = JSON.parse(cached);
    } catch {
      currentMethods = [];
    }
  }

  // Update default states locally
  currentMethods = currentMethods.map(m => ({
    ...m,
    isDefault: m.paymentMethodId === paymentMethodId,
    updatedAt: new Date().toISOString()
  }));

  localStorage.setItem(cacheKey, JSON.stringify(currentMethods));
  localStorage.setItem(`rowone_preferred_pm_${userId}`, paymentMethodId);

  // Attempt DB Sync in parallel
  try {
    const promises = currentMethods.map(m => 
      supabase
        .from('user_payment_methods')
        .upsert(m, { onConflict: 'paymentMethodId' })
    );
    await Promise.all(promises);
  } catch (err: any) {
    console.warn('Syncing default states failed/offline:', err.message);
  }

  return currentMethods;
}

/**
 * Removes a payment method.
 */
export async function removePaymentMethod(userId: string, paymentMethodId: string): Promise<UserPaymentMethod[]> {
  const cacheKey = `rowone_payment_methods_${userId}`;
  
  let currentMethods: UserPaymentMethod[] = [];
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      currentMethods = JSON.parse(cached);
    } catch {
      currentMethods = [];
    }
  }

  const wasDefault = currentMethods.some(m => m.paymentMethodId === paymentMethodId && m.isDefault);

  // Filter out
  currentMethods = currentMethods.filter(m => m.paymentMethodId !== paymentMethodId);

  // If we deleted the default, set a new default
  if (wasDefault && currentMethods.length > 0) {
    currentMethods[0].isDefault = true;
    localStorage.setItem(`rowone_preferred_pm_${userId}`, currentMethods[0].paymentMethodId);
  } else if (currentMethods.length === 0) {
    localStorage.removeItem(`rowone_preferred_pm_${userId}`);
  }

  localStorage.setItem(cacheKey, JSON.stringify(currentMethods));

  // Sync delete to DB
  try {
    await supabase
      .from('user_payment_methods')
      .delete()
      .eq('userId', userId)
      .eq('paymentMethodId', paymentMethodId);

    // If default changed, upsert the modified first item
    if (wasDefault && currentMethods.length > 0) {
      await supabase
        .from('user_payment_methods')
        .upsert(currentMethods[0], { onConflict: 'paymentMethodId' });
    }
  } catch (err: any) {
    console.warn('Failed to sync payment method deletion to db:', err.message);
  }

  return currentMethods;
}

/**
 * Retrieves preferred payment method memory.
 */
export function getPreferredPaymentMethodId(userId: string): string | null {
  return localStorage.getItem(`rowone_preferred_pm_${userId}`);
}

export function setPreferredPaymentMethodId(userId: string, pmId: string) {
  localStorage.setItem(`rowone_preferred_pm_${userId}`, pmId);
}

/**
 * Keeps track of full credit card credentials in local memory / localStorage for instant autofill simulation.
 * In a production app, this would be integrated into an automated secure checkout wallet or device agent.
 */
export interface AutofillCardCredential {
  lastFourDigits: string;
  brand: string;
  fullCardNumber: string;
  cardholderName: string;
  expiryDate: string; // "MM/YY"
  cvc: string;
}

export function saveAutofillCredential(cred: AutofillCardCredential) {
  try {
    const list = getAutofillCredentials();
    const updated = [
      cred,
      ...list.filter(item => item.lastFourDigits !== cred.lastFourDigits)
    ];
    localStorage.setItem('rowone_full_card_autofill_cache', JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save credit card autofill credential', err);
  }
}

export function getAutofillCredentials(): AutofillCardCredential[] {
  try {
    const cached = localStorage.getItem('rowone_full_card_autofill_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to retrieve card autofill credentials', err);
  }

  // Pre-seed default cards for autofill to make the onboarding smooth
  const defaultSeeds: AutofillCardCredential[] = [
    {
      lastFourDigits: '4242',
      brand: 'Visa',
      fullCardNumber: '4242 4242 4242 4242',
      cardholderName: 'Alexis Jordan',
      expiryDate: '08/30',
      cvc: '424'
    },
    {
      lastFourDigits: '8888',
      brand: 'Mastercard',
      fullCardNumber: '5555 5555 5555 8888',
      cardholderName: 'Jordan Vance',
      expiryDate: '11/31',
      cvc: '123'
    }
  ];
  return defaultSeeds;
}

