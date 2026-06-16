import QRCode from 'qrcode';

/**
 * Clean and sanitize file titles into standard SEO friendly slug URL.
 * Convert to lowercase, replace space/underscores with hyphens, remove any special characters.
 */
export function sanitizeTitleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-');     // Replace multiple hyphens with single hyphen
}

/**
 * Assures a unique slug is always selected. 
 * If a slug collisions exists, appends custom 5-hex identifier.
 */
export function generateUniqueSlug(title: string, existingSlugs: string[]): string {
  const baseSlug = sanitizeTitleToSlug(title);
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }
  // Otherwise, append unique 5-character string
  const randomHex = Math.random().toString(16).substring(2, 7);
  return `${baseSlug}-${randomHex}`;
}

/**
 * Converts any URL text into highly legible QR base64 image representation instantly.
 */
export async function generateQrCodeUrl(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      margin: 1.5,
      width: 256,
      color: {
        dark: '#000000',
        light: '#ffffff',
      }
    });
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
}

/**
 * Updates browser global metadata rules for search spiders, canonical maps, and embeds.
 */
export function updateSeoTags(movie: {
  title: string;
  synopsis: string;
  imageUrl: string;
  contentType?: string;
  slug?: string;
}) {
  try {
    const titleText = `${movie.title} | ROWONE`;
    document.title = titleText;
    
    const descriptionText = movie.synopsis || `Watch ${movie.title} on ROWONE (www.rowone.xyz) - the ultimate creator cinematic ledger.`;
    const shareUrlText = `https://www.rowone.xyz/${movie.contentType || 'movie'}s/${movie.slug || 'slug'}`;
    const imageText = movie.imageUrl || '';

    // Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', descriptionText);

    // Update OG Title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', titleText);

    // Update OG Description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute('content', descriptionText);

    // Update OG Image
    let ogImg = document.querySelector('meta[property="og:image"]');
    if (!ogImg) {
      ogImg = document.createElement('meta');
      ogImg.setAttribute('property', 'og:image');
      document.head.appendChild(ogImg);
    }
    ogImg.setAttribute('content', imageText);

    // Update OG URL
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', shareUrlText);

    // Update Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', shareUrlText);
    
    console.log('SEO meta tags updated for:', movie.title);
  } catch (e) {
    console.warn('Failed to update SEO tags', e);
  }
}

/**
 * Reverts Document title and search indexing tags to baseline values.
 */
export function resetSeoTags() {
  try {
    document.title = "ROWONE | Ultimate Creative Cinema Ledger";
    const desc = "Connect, upload, and stream high-octane indie reels and premier cinematic theatrical sessions with friends on ROWONE.";
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', desc);
    
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', "ROWONE | Ultimate Creative Cinema Ledger");
    
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', desc);

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', "https://www.rowone.xyz/");

    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', "https://www.rowone.xyz/");
  } catch (e) {
    console.warn('Failed to reset SEO tags', e);
  }
}
