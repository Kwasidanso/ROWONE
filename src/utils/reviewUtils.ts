/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MovieReview } from '../types';

const STORAGE_KEY = 'co_stream_movie_reviews';

const INITIAL_REVIEWS: MovieReview[] = [
  {
    id: 'rev-1',
    movieId: 'm1',
    movieTitle: 'NEON ECHOES',
    screeningName: 'Grand Hall 1 (Dolby Atmos • Laser IMAX) @ 21:30',
    username: 'Leo_V',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUMMmg4wUjOeGP67BHvckW7QK54LA2AaZMcuCpoM3Hu2vY9Ic9lti4YRyceBT4Xa4aVgS7MpwB64SBM0VilWuJV2mdhKG4RfOmkV6SHU7iEUNbS72EU7jB91skEIP5DDmDYOjKPZmUryVWd3v4_1VXYJ8p9TwrkZJ5eqP3NastiUon4s-VH-EhBJQb4vIFZ294pPzvvwroP1eXEUvONKLSB1iLgrLRvbY9BBCCjiInO0x9ZM1geU0eP_XnbkoiNJzz2yLq-q5qibW7',
    rating: 5,
    text: 'The climax sequence with the rain reflections had my entire group holding their breath! Peak cyberpunk atmosphere.',
    timestamp: 'May 28, 2026 at 21:45',
    upvotes: 42,
    movieMoment: '01:34:20',
    upvotedByUsernames: []
  },
  {
    id: 'rev-2',
    movieId: 'm1',
    movieTitle: 'NEON ECHOES',
    screeningName: 'Studio Live Premiere Event',
    username: 'Sarah_Lin',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBN1zkyN0Pb8734ZFQ0q6_UU1ErZWPzuHCM2h5RXzYtYFsE0wGk0tDndVTt82vO2j9N1i4muihePJYlyoEsyO-MN6WgdBcmG4hdllHWUPnoZYhYXg_4HRe24hHm9FVnJyx5ZLbvxzTg2BXW0sdT-MjvOwU-h9rD5EwNfrgu96iPb_xurjXNQUONPl5E8o68dUeilrcKFFrPvPt-86Vem85Vo0IoL85mzDg1E5ZlDH1QMaFfc-auV_uw3qMgmeWmJU6Ghd40J4E6DfSN',
    rating: 4,
    text: 'A bit slow-paced in the second act, but the sound design and synthetic soundtrack more than make up for it.',
    timestamp: 'May 29, 2026 at 18:22',
    upvotes: 18,
    movieMoment: '00:45:12',
    upvotedByUsernames: []
  },
  {
    id: 'rev-3',
    movieId: 'm2',
    movieTitle: 'THE LAST REEL',
    screeningName: 'The Red Room (Luxury Recliners) @ 22:00',
    username: 'cyber_junkie',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150',
    rating: 5,
    text: 'So emotional. It reminds me of why we love physical film stock. Pure tactile cinematic history.',
    timestamp: 'May 29, 2026 at 22:45',
    upvotes: 35,
    movieMoment: '01:10:05',
    upvotedByUsernames: []
  },
  {
    id: 'rev-4',
    movieId: 'm1',
    movieTitle: 'NEON ECHOES',
    screeningName: 'The Red Room (Luxury Recliners) @ 22:00',
    username: 'film_critic_jane',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    rating: 5,
    text: 'Highly recommend! This is the matrix of our generation. Visually arresting and intellectually complex.',
    timestamp: 'May 30, 2026 at 01:10',
    upvotes: 8,
    movieMoment: '01:52:10',
    upvotedByUsernames: []
  }
];

export function getAllReviews(): MovieReview[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_REVIEWS));
      return INITIAL_REVIEWS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error parsing reviews from localStorage:', e);
    return INITIAL_REVIEWS;
  }
}

export function saveAllReviews(reviews: MovieReview[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch (e) {
    console.error('Error saving reviews to localStorage:', e);
  }
}

export function getMovieReviews(movieId: string): MovieReview[] {
  const all = getAllReviews();
  return all.filter((r) => r.movieId === movieId);
}

export function addMovieReview(
  movieId: string,
  movieTitle: string,
  screeningName: string,
  username: string,
  avatarUrl: string,
  rating: number,
  text: string,
  movieMoment?: string
): MovieReview {
  const all = getAllReviews();
  
  const formatDate = () => {
    const now = new Date();
    return now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const newReview: MovieReview = {
    id: `rev-user-${Date.now()}`,
    movieId,
    movieTitle,
    screeningName: screeningName || 'Catalogue Screen Watch',
    username,
    avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
    rating,
    text,
    timestamp: formatDate(),
    upvotes: 0,
    movieMoment: movieMoment || '01:15:00',
    upvotedByUsernames: []
  };

  all.push(newReview);
  saveAllReviews(all);
  return newReview;
}

export function upvoteReview(reviewId: string, username: string): MovieReview[] {
  const all = getAllReviews();
  const updated = all.map((r) => {
    if (r.id === reviewId) {
      const upvotedUsers = r.upvotedByUsernames || [];
      if (upvotedUsers.includes(username)) {
        // Undo upvote if clicked again
        return {
          ...r,
          upvotes: Math.max(0, r.upvotes - 1),
          upvotedByUsernames: upvotedUsers.filter((u) => u !== username),
        };
      } else {
        // Do upvote
        return {
          ...r,
          upvotes: r.upvotes + 1,
          upvotedByUsernames: [...upvotedUsers, username],
        };
      }
    }
    return r;
  });
  saveAllReviews(updated);
  return updated;
}

export function getPopcornScore(movieId: string, baseRating: number): {
  scorePercent: number; // e.g. 94 (means 94%)
  count: number;        // total rating reviews accounted
  stars: number;        // corresponding star out of 5
} {
  const reviews = getMovieReviews(movieId);
  if (reviews.length === 0) {
    // Return baseline calculated score from baseRating
    // e.g. 4.8 star -> 96%
    const percent = Math.floor(baseRating * 20);
    return {
      scorePercent: percent,
      count: 240, // Base reviews count
      stars: Number(baseRating.toFixed(1)),
    };
  }

  // Combine baseline + live reviews
  const totalUserStars = reviews.reduce((sum, r) => sum + r.rating, 0);
  const userAvg = totalUserStars / reviews.length;
  
  // Weights: 80% baseline + 20% user reviews to stabilize and feel realistic
  const weightBaseScore = baseRating * 0.4 + userAvg * 0.6;
  const scorePercent = Math.min(100, Math.max(10, Math.floor(weightBaseScore * 20)));

  return {
    scorePercent,
    count: 240 + reviews.length,
    stars: Number(weightBaseScore.toFixed(1)),
  };
}
