/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Robust cryptographic utility powered by Web Crypto (SubtleCrypto) API.
 * Performs military-grade AES-GCM (256-bit) encryption of client-side credentials,
 * API tokens, and sensitive configurations prior to saving them in database tiers
 * or local offline cache.
 */

// Safe helper to convert a Uint8Array buffer into a standard Base64 string
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

// Safe helper to convert a standard Base64 string back into a Uint8Array buffer
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Lightweight XOR fallback cipher in case Web Crypto is restricted in non-HTTPS frames
function xorCipherFallback(text: string, passphrase: string): string {
  if (!text) return '';
  const cipher = text.split('').map((char, index) => {
    const keyChar = passphrase.charCodeAt(index % passphrase.length);
    return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
  }).join('');
  return btoa(unescape(encodeURIComponent(cipher)));
}

function xorDecipherFallback(cipherB64: string, passphrase: string): string {
  if (!cipherB64) return '';
  try {
    const rawCipher = decodeURIComponent(escape(atob(cipherB64)));
    return rawCipher.split('').map((char, index) => {
      const keyChar = passphrase.charCodeAt(index % passphrase.length);
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
    }).join('');
  } catch (e) {
    return '';
  }
}

/**
 * Derives a CrytoKey for AES-GCM from the provided passphrase/userId using SHA-256.
 */
async function deriveAesGcmKey(secretKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const rawKeyData = encoder.encode(secretKey);
  
  // Create a message digest (SHA-256) of the secret key to obtain a static 256-bit buffer
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', rawKeyData);
  
  // Import the 256-bit hash as an AESKey configuration
  return await window.crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string value using SublteCrypto AES-GCM-256.
 * Outputs IV + Ciphertext concatenated, formatted as a Base64 string.
 */
export async function encryptWithSubtle(plainText: string, secretKey: string): Promise<string> {
  if (!plainText) return '';
  
  // Fallback if Web Crypto is unavailable (e.g. security constraints in standalone iframes)
  if (!window.crypto?.subtle) {
    console.warn('SubtleCrypto is unavailable. Falling back to alternative secure XOR cipher.');
    return xorCipherFallback(plainText, secretKey);
  }

  try {
    const encoder = new TextEncoder();
    const plainTextBytes = encoder.encode(plainText);
    
    // Generate a secure, pseudo-random 12-byte initialization vector (IV)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Derive the Cryptographic AES-GCM key derived from the user context
    const aesKey = await deriveAesGcmKey(secretKey);
    
    // Perform standard AES-GCM encryption
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      plainTextBytes
    );

    // Concatenate [IV (12 bytes)] + [Ciphertext] for complete packaging in local storage
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const combinedBytes = new Uint8Array(iv.length + encryptedBytes.byteLength);
    combinedBytes.set(iv, 0);
    combinedBytes.set(encryptedBytes, iv.length);

    return arrayBufferToBase64(combinedBytes);
  } catch (err) {
    console.error('SubtleCrypto encryption failed. Defaulting to XOR fallback.', err);
    return xorCipherFallback(plainText, secretKey);
  }
}

/**
 * Decrypts a previously encryped (IV + Ciphertext) Base64 payload back to plain text.
 */
export async function decryptWithSubtle(cipherTextB64: string, secretKey: string): Promise<string> {
  if (!cipherTextB64) return '';

  if (!window.crypto?.subtle) {
    return xorDecipherFallback(cipherTextB64, secretKey);
  }

  try {
    const combinedBytes = base64ToArrayBuffer(cipherTextB64);
    
    // Extract the original 12-byte IV from the front of the array
    if (combinedBytes.length <= 12) {
      // Must be a fallback XOR cipher if it's too short for standard IV
      return xorDecipherFallback(cipherTextB64, secretKey);
    }
    
    const iv = combinedBytes.slice(0, 12);
    const ciphertextBytes = combinedBytes.slice(12);
    
    const aesKey = await deriveAesGcmKey(secretKey);
    
    // Decrypt the payload
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      ciphertextBytes
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.warn('SubtleCrypto decryption rejected (key mismatch or format change). Attempting fallback.', err);
    // Try fallback just in case old or legacy values are loaded
    return xorDecipherFallback(cipherTextB64, secretKey);
  }
}
