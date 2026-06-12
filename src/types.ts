/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CastMember {
  id: string;
  name: string;
  character: string;
  imageUrl: string;
}

export interface StudioScreening {
  id: string;
  time: string;
  date: string;
  ticketPrice: number;
  viewersCount: number;
  revenueEarned: number;
  avgRating: number;
  hallName: string;
  features: string;
  isAvailable: boolean;
  isPremiere?: boolean;
}

export interface Movie {
  id: string;
  title: string;
  synopsis: string;
  genre: string;
  rating: string;
  runtime: string;
  format: string; // e.g. "4K ULTRA" or "IMAX 3D"
  ratingScore: number; // e.g. 4.8
  reviewsCount: string; // e.g. "2.4k"
  imageUrl: string;
  heroImageUrl?: string;
  releaseDate?: string;
  startsIn?: string; // e.g. "12m", "45m"
  isLive?: boolean;
  tag?: string; // e.g. "COMING FRIDAY" or "LIMITED"
  cast: CastMember[];
  capacity?: number; // Studio capacity metric (e.g. 85 for 85%)
  isPremiere?: boolean;
  isPassOnly?: boolean;
  isNewRelease?: boolean;
  trailerUrl?: string;
  bannerUrl?: string;
  videoBlobUrl?: string;
  uploadedFileName?: string;
  isUserUploaded?: boolean;
  screenings?: StudioScreening[];
}

export interface ChatMessage {
  id: string;
  username: string;
  timestamp: string;
  text: string;
  isHost?: boolean;
  avatarUrl?: string;
  isSpoiler?: boolean;
  isReported?: boolean;
  isSystem?: boolean;
  isCensored?: boolean;
  isPinned?: boolean;
  isAnnouncement?: boolean;
}

export interface ScreeningTime {
  id: string;
  hallName: string;
  features: string; // e.g. "Dolby Atmos • Laser IMAX"
  time: string;
  isAvailable: boolean;
}

export interface BookedTicket {
  id: string;
  movieTitle: string;
  imageUrl: string;
  time: string;
  hall: string;
  seat: string;
  price: string;
  date?: string;
}

export interface ScheduleEvent {
  id: string;
  movieTitle: string;
  time: string;
  day: number;
}

// Age Gate and Content Rating helpers
export function getRatingBadgeText(ratingStr?: string): 'U' | 'PG' | '12' | '15' | '18' {
  const r = ratingStr?.toUpperCase() || 'U';
  if (r === 'G' || r === 'U') return 'U';
  if (r === 'PG') return 'PG';
  if (r === 'PG-13' || r === '12+' || r === '12') return '12';
  if (r === '15+' || r === '15') return '15';
  if (r === 'R' || r === '18+' || r === '18') return '18';
  return 'U';
}

export function getRatingAgeLimit(badge: 'U' | 'PG' | '12' | '15' | '18'): number {
  switch (badge) {
    case 'U': return 0;
    case 'PG': return 0; // standard parental oversight
    case '12': return 12;
    case '15': return 15;
    case '18': return 18;
    default: return 0;
  }
}

export function isMovieAllowedForUser(
  movieRating: string,
  userAge: number | null,
  parentMaxRating: string | null,
  isParentalModeActive: boolean
): { allowed: boolean; reason: 'age-locked' | 'parental-locked' | null } {
  const badge = getRatingBadgeText(movieRating);
  const ageLimit = getRatingAgeLimit(badge);

  // 1. Age verify check (if logged in and has computed age)
  if (userAge !== null && userAge < ageLimit) {
    return { allowed: false, reason: 'age-locked' };
  }

  // 2. Parental lock override check
  if (isParentalModeActive && parentMaxRating) {
    const parentBadge = getRatingBadgeText(parentMaxRating);
    const ratingOrder = { 'U': 1, 'PG': 2, '12': 3, '15': 4, '18': 5 };
    const movieRank = ratingOrder[badge] || 1;
    const parentRank = ratingOrder[parentBadge] || 5;

    if (movieRank > parentRank) {
      return { allowed: false, reason: 'parental-locked' };
    }
  }

  return { allowed: true, reason: null };
}

export interface MovieReview {
  id: string;
  movieId: string;
  movieTitle: string;
  screeningName: string; // e.g. "Live Premiere", "Grand Hall 1", "Private Squad Lounge"
  username: string;
  avatarUrl: string;
  rating: number; // 1 to 5 stars
  text: string;
  timestamp: string;
  upvotes: number;
  movieMoment?: string; // anchored to a movie moment, e.g. "01:22:04"
  upvotedByUsernames?: string[];
}
