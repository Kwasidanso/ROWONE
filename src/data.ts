/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Movie, ScreeningTime, ChatMessage, ScheduleEvent } from './types';

export const CAST_JULIAN_THORNE = {
  id: 'c1',
  name: 'Julian Thorne',
  character: 'The Projectionist',
  imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuAmHhC644ekKlVtXHVbsMlexKbQ1oF3hUAenC-pdD9NIF4WaQZrpvErZTM6X-LADn9eoasqP7T-ZDLIEwG2l_5Vn0anDlpfuctqMuohSR9WdL2c6eimu9fyyg3gr62BveuaiDCRsLwOgrtxf6a2GYEvtjs6g9HV2fp9MkpNvGaJ8ivi8KpqhcP2da8M9f6D7MrypZx0kFl7KeEXrKRY7fycTwNrcLTHfwxRU_dlfJWEiTtO7HHg0Wz8EP3CohQFdCUaTVnlK1mCOl',
};

export const CAST_ELENA_VANCE = {
  id: 'c2',
  name: 'Elena Vance',
  character: 'Clara',
  imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDL25hqeMyPN50r0NuStaj8GzEWUah_qdVUrd1QNNnE8z_tZzK5Dg9zJW3dtadUJELKW5l4vVqBUkp_kZyYfh1M_Ayn1idTfcCTqyklN00OE3peBk3SCLe1XpvqCUS-RJdawUk8opyRmf8-eRpIiHkF-JtDDisFMa9a6TZ2BJmOtH6-y8Ad9sFpItwHNIRr9_jGHcgu-7raCacrq6BbffhNiSRxKl_oqL-Jetri74epn9FbjrEzh8Qt4zUJquuPExoMAsdgoF3oWnKH',
};

export const CAST_MARCUS_REED = {
  id: 'c3',
  name: 'Marcus Reed',
  character: 'The Director',
  imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCj1gwmxwI8w9jccJld2oWUvdsqBvKdyIXhIDe-ayjV-wiq_WLBO4gwBLftq11hU_3yl6w0omZLmOTtX1s7vpF0e830RLnZM4jVL3w47_SUAG-5R2XKOZPG7-9UKiH3AU9t4XOE0Km41gP7GPIUAvHbXw7qV4icHTA3FD2Jxsi4k5xzkDiW8ccMJtdEAT919XUPSyT_zckMw0DljHj8AUTAI_4WuqR5zo5p8jphmG7FSUFvOi772eYurcj1JV2i7GDtI-y1WKwjAXax',
};

export const CAST_SARAH_LIN = {
  id: 'c4',
  name: 'Sarah Lin',
  character: 'Evelyn',
  imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqH_tmv-A5dvIel83FOFgcCaUfTZzR4hGnviks26FpUIB0Z0-gO8s9crHd9b5hvk9nCESgCbovd68rsTZgBsq_zObSjJE6N9LyOkVG22_jubdZ1dGrUd_OE-tz6nixmj2kJ38zmCCxPY8ueUkJE-zJevMq64KnCeOxXrHXQsng6zyQYUpFr038Q2gFdjhgKidkBjBJquQNWpn_HHlAVFy-EANEFlA3PthYF5xPHhEOGdKVjnYcUwIyUWyHin5A6rAxJc1wsGEvZAoX',
};

export const INITIAL_MOVIES: Movie[] = [
  {
    id: 'm1',
    title: 'NEON ECHOES',
    synopsis: 'A high-octane cyberpunk thriller following a lone synthetics scanner tracking down renegade AI ghosts in rainy Neo-Seoul.',
    genre: 'SCI-FI',
    rating: '15+',
    runtime: '1h 58m',
    format: '4K ULTRA',
    ratingScore: 4.7,
    reviewsCount: '1.8k',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdRWCC7SEBlcatZbdig8smoRv4rV3ewONPoC0HAo2PqOrPKF9S11hZdnC2npx-nz0ww7lZAEGj5P6Y-aGhJLspMefGwzxfoYX8HO0gTqt25dIlbNG7ojeN7r9VJBNm2w1VIRV-5H4Mnq_PUk928GjCo983RGNQnPWcR47Rx4nmo7YzfAd6BVT1pgiGuvVLZk-rRyWP91L1vbWK4P2KsEgAJ7w38vVBrpdrS0J4teGbfD2A98_Gx_dIajS6PpiAodKy08YoAgcjDANf',
    heroImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxT9zC2lJVOAEOqyuftQT05-4HX59FAr4a9kSrZsGBhPTLf5Bmk-n3_DfYHb7EmO25zOe4vd5ziomItKXmEkW_rOQFG2Mh7jsBis-utuLL83EOw7ZKH_N9o_a_W2M-cQPsKAH2XcM6d6emEYJfCg9oLdzYRQkG6ghfOlSzbxZJhLo5LaHP9-n0xtMBpfoZ9VwgnVTVZ3fd9FNW-AgL8TQSHI1HuPO8wwUDLDRh3jXCVH5RDd943hUL-Lnfr9I9C66AV-8VSgd4r_yf',
    startsIn: '12m',
    isLive: true,
    isNewRelease: true,
    cast: [CAST_JULIAN_THORNE, CAST_ELENA_VANCE, CAST_MARCUS_REED, CAST_SARAH_LIN],
    capacity: 78,
    visualAtmosphere: 'neon-rain',
  },
  {
    id: 'm2',
    title: 'THE LAST REEL',
    synopsis: 'An elegant, nostalgic look inside classic Hollywood cinema, highlighting the tactile glory of film reels in a dying historic theater.',
    genre: 'CLASSIC',
    rating: 'PG',
    runtime: '1h 42m',
    format: 'DOLBY CINEMA',
    ratingScore: 4.9,
    reviewsCount: '840',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWLBitCTQupJ8B3EL0TiIWF7sUJWsFr_4bwS1hdHLlY5gTzRQAiWSS7-XqC_epIXwHkU_B4d1S6dKXMHBaGyigNKbgfgcc893QMIG0bIZ3SjwB-llUdK4sPFlQoBIYJqXQP5HAvHVFUREe3G3oi_BknMtUerpqWWrAUjuoM-N-L0ThgbxfZsuK0ezPlkkFkOEvbdrRglXrqN7fpl0hwrkMC69Nrf-xicZAt1iyTS6guPhT8X3EojBq5VY3KnXOIOMyFBZoUBK2oey4',
    startsIn: '45m',
    cast: [CAST_JULIAN_THORNE, CAST_MARCUS_REED],
    capacity: 45,
    visualAtmosphere: 'retro-noise',
  },
  {
    id: 'm3',
    title: 'FROZEN PEAKS',
    synopsis: 'A serene and awe-inspiring documentary charting the highest peaks on Earth under a deep night sky illuminated by remote magic lights.',
    genre: 'DOCUMENTARY',
    rating: '12+',
    runtime: '1h 35m',
    format: '4K ULTRA',
    ratingScore: 4.6,
    reviewsCount: '3.1k',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOsZohPmdwkkFMQkMMkhD79dLySgvq7tbLxd8hNtqCtVTa5wpXmqNVg6kZcTAAVu6aQrlA2WQyS1URlf_mWND0u1wQmTG2OBxPlhxeyvzuYLCY8E9iSUuengks83C95QfkPII0k87awJIOlKsr6c0ljBv2BZnmpPtTEQAPScyTALjolgHvGYjvYfjuT0YvYJJtntBBANzv8FbgTK2X3x4MKTIry2XPu6Bjcu-gl99r0OLxVtZCPwgSoPpgGrGV1qlgHdUbkTXoAacW',
    startsIn: '2h 15m',
    tag: 'LIMITED',
    cast: [CAST_ELENA_VANCE, CAST_SARAH_LIN],
    capacity: 52,
    visualAtmosphere: 'quiet-projection',
  },
  {
    id: 'm4',
    title: 'SHATTERED GLASS',
    synopsis: 'A moody, psychological thriller examining the mind of a fractured artist whose vision distorts reality in shocking crystalline sequences.',
    genre: 'THRILLER',
    rating: '18+',
    runtime: '2h 05m',
    format: 'IMAX 3D',
    ratingScore: 4.5,
    reviewsCount: '1.2k',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmdxznYvU8hDBYf4O4u2n7wv_AZTLmHL1SXYhceiLXmw1oldq8uR3oh_1yJNFMTtPA_IWWLnBmsksnufg9-ELmAfay01OC_STyErLZ7RFjMCK1jk2spXWblNfoCOI_YJQ15w6f4R018SkVb8AR9-aumQYJ18_w-ZLepktEWYWlhnGe0xuRbQmAf7N4aTuaYRTYFUgGon9zEgZbQ7ARInLYw_AHCTNYO53ElOjSEDfMhrvLzh-sqyLScGp8CVA3T_DcWjx1-NNPz7-v',
    startsIn: '5m',
    cast: [CAST_JULIAN_THORNE, CAST_ELENA_VANCE, CAST_SARAH_LIN],
    capacity: 90,
    visualAtmosphere: 'retro-noise',
  },
  {
    id: 'm5',
    title: 'COSMIC COMEDY',
    synopsis: 'A vibrant, heartwarming animated adventure where playful celestial beings travel through colorful galaxies and sweet nebulae.',
    genre: 'COMEDY',
    rating: 'U',
    runtime: '1h 28m',
    format: 'DOLBY VISION',
    ratingScore: 4.8,
    reviewsCount: '4.5k',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrGjdWxA3ddYH_n8WMmPEpV6Gv9i_2PcPLQSUExqzhyy83RRRpkyEgnQDuyM6bfgqvjuGvgI3CUcJTHSFRUXOTHpzmqvKJFRu6UhCrTIToIZsciKb2IOFp2qlp2Z3pKc9btG7gk4DiCLlxA6TmqrbHuUKDG1ApOxhDCK_QK0VC0MPGULilRVbwccxANjaMNE5tTeSp3S6xwuB5fEzyo3CDxjCHP3LRUjN2xCqrlPsFISPijY2reABdcx825biGWZ3RtZ8f2DfOloAK',
    startsIn: '3h 05m',
    cast: [CAST_JULIAN_THORNE, CAST_ELENA_VANCE],
    capacity: 35,
  },
  {
    id: 'm6',
    title: 'The Midnight Premiere',
    synopsis: 'When an old theater scheduled for demolition plays a reel that hasn\'t been seen in fifty years, the line between the silver screen and reality begins to blur. "The Midnight Premiere" is a haunting tribute to the golden age of cinema, where shadows hold secrets and the projector\'s light reveals more than just a story.',
    genre: 'DRAMA',
    rating: '12+',
    runtime: '2h 14m',
    format: '4K ULTRA',
    ratingScore: 4.8,
    reviewsCount: '2.4k',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWx-ePMBTozTW95I_GuAdr4wM_xI_FDZx5Wbxxuo7IjsxLEjIB5ShzzDbuD56kXoxYmFXIsj1ELA4r3YtHBm8nifuZLc2JKT51yix3enF9E1UlnOUnijLRWElhmsTkYb-3ZmdmJHR_9lGVZPxsdUlTQjnSWVz6ssLez_8CWsrIHKAESfaKd3335PaHjm1ThtcfqLGgainq3IJ6lNiuusrXOmpk1tvqwQKK7hjnKRWYFQhO3iaeStdJH9sRvnXYE8KBhzJWMj3HLSlo',
    heroImageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPjuU4rzTC57OoKGYbRXLEqp4FLXIkWGL2MGL5QPO0e5GOpdgiug-v4pIstlUnGJDBExVAn5SzbCjZVsEQ0SdsNj18c4Dpx-NxEB-9SFwCgIoBURrmofvO8vkmRTKJ8sa9sIOzCEOLWSi9ZQpHGOvTh-mo0VpjbpEN5RbEcMP5urcSwUp_5jWLKnNIdWrQKuUbQwBbOwSvWDDWSUtTUWybu5ZQr_xdr11A1jKTzJpxlAmPiq0dpGebCy7WoiN3mwe0qPXhy6Ah9sBV',
    startsIn: 'Tonight',
    isPremiere: true,
    isPassOnly: true,
    cast: [CAST_JULIAN_THORNE, CAST_ELENA_VANCE, CAST_MARCUS_REED, CAST_SARAH_LIN],
    capacity: 88,
  },
  {
    id: 'm7',
    title: 'The Batman (2022)',
    synopsis: 'Batman ventures into Gotham City\'s underworld when a sadistic killer leaves behind a trail of cryptic clues.',
    genre: 'ACTION',
    rating: '15+',
    runtime: '2h 56m',
    format: 'DOLBY CINEMA',
    ratingScore: 4.7,
    reviewsCount: '12k',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGD6awKAkwLgUpX4tq8IFv6NAaPpf6D8pbdQrg5WsH89q_G5aVvd5UTdXYxIQyyaILhCIbCfOec3KkmQwPcieEF0NkTJn7HwBaSwdkE01URhFK4RMh5PDr12HG3DIIYLzLAblhB8MNY-cVzgjZ9iDBwQ9kBj-j3x39t9CJRRPn7XTkDmFWTqbGugEf8i9TVSlHVuzhN_pdEblaUpnHYliWkIVX9wTW_xK4EFC58sUt7IWg4tSqIBe2jkQH9FymE8Tryb_zKcYUr8ZA',
    isNewRelease: true,
    cast: [CAST_MARCUS_REED, CAST_SARAH_LIN],
    capacity: 85,
  },
  {
    id: 'm8',
    title: 'Dune: Part One',
    synopsis: 'A noble family becomes embroiled in a war for control of the galaxy\'s most valuable asset on a hazardous desert planet.',
    genre: 'SCI-FI',
    rating: '12+',
    runtime: '2h 35m',
    format: '4K ULTRA',
    ratingScore: 4.8,
    reviewsCount: '9.8k',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCN3pixtnPNQ7dFMrE9YSidhA6xKiAREw7THUB8JC_ahjqzSErfFI-ZX88MxIq5Dj0b-2O_k48LfZrNLkQFGvhdP-d5W9hAM8uOimqhnJ2qkIooIOYo805R_e2Zid4tVOHpuv1KW27q_GH8srrG-gkO5L1oqm030IKUuL5duJ_y4GYakt3SR9jqWvhNq2W9cyLPb7jJojVxw5AIDRTVoFWDkhwLt3bkOcPJjDNI3B3T6LpUROkWq7sUdZi356BCX6UHMDKthsgtIJVX',
    cast: [CAST_ELENA_VANCE, CAST_MARCUS_REED],
    capacity: 62,
  },
];

export const INITIAL_SCREENINGS: ScreeningTime[] = [
  {
    id: 's1',
    hallName: 'Grand Hall 1',
    features: 'Dolby Atmos • Laser IMAX',
    time: '21:30',
    isAvailable: true,
  },
  {
    id: 's2',
    hallName: 'Grand Hall 1',
    features: 'Dolby Atmos • Laser IMAX',
    time: '23:45',
    isAvailable: false,
  },
  {
    id: 's3',
    hallName: 'The Red Room',
    features: 'Luxury Recliners • Private Bar',
    time: '22:00',
    isAvailable: true,
  },
  {
    id: 's4',
    hallName: 'The Red Room',
    features: 'Luxury Recliners • Private Bar',
    time: '00:15',
    isAvailable: true,
  },
];

export const MOCK_CHAT: ChatMessage[] = [
  {
    id: 'msg1',
    username: 'cinephile_99',
    timestamp: '12:04',
    text: 'That cinematography is actually insane. The lighting is peak. ✨',
  },
  {
    id: 'msg2',
    username: 'host_marco',
    timestamp: '12:04',
    text: 'Wait for the twist in 3 minutes. No spoilers!',
    isHost: true,
  },
  {
    id: 'msg3',
    username: 'popcorn_lover',
    timestamp: '12:05',
    text: '🍿🍿🍿🍿🍿🍿',
  },
  {
    id: 'msg4',
    username: 'sarah_doe',
    timestamp: '12:05',
    text: 'The soundtrack just kicked in...',
  },
];

export const INITIAL_SCHEDULE: ScheduleEvent[] = [
  { id: 'se1', movieTitle: 'THE DARK KNIGHT (R)', time: '21:30', day: 2 },
  { id: 'se2', movieTitle: 'DUNE', time: '18:00', day: 5 },
  { id: 'se3', movieTitle: 'BATMAN', time: '21:00', day: 5 },
];

export const AVATAR_LEO = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUMMmg4wUjOeGP67BHvckW7QK54LA2AaZMcuCpoM3Hu2vY9Ic9lti4YRyceBT4Xa4aVgS7MpwB64SBM0VilWuJV2mdhKG4RfOmkV6SHU7iEUNbS72EU7jB91skEIP5DDmDYOjKPZmUryVWd3v4_1VXYJ8p9TwrkZJ5eqP3NastiUon4s-VH-EhBJQb4vIFZ294pPzvvwroP1eXEUvONKLSB1iLgrLRvbY9BBCCjiInO0x9ZM1geU0eP_XnbkoiNJzz2yLq-q5qibW7';
export const AVATAR_SARAH = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBN1zkyN0Pb8734ZFQ0q6_UU1ErZWPzuHCM2h5RXzYtYFsE0wGk0tDndVTt82vO2j9N1i4muihePJYlyoEsyO-MN6WgdBcmG4hdllHWUPnoZYhYXg_4HRe24hHm9FVnJyx5ZLbvxzTg2BXW0sdT-MjvOwU-h9rD5EwNfrgu96iPb_xurjXNQUONPl5E8o68dUeilrcKFFrPvPt-86Vem85Vo0IoL85mzDg1E5ZlDH1QMaFfc-auV_uw3qMgmeWmJU6Ghd40J4E6DfSN';
export const AVATAR_ME = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';

export const HERO_EXPLORER_BG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCELMkjB2boxdt8QrbwcPcdPint39YoWRhslkJwgHPXinAtAO4VK1C8fW1TrGQ3AyY9I3DxuEtsaCSo86sk0XNmYCluozjEVXNF4KqmVxTsVF9VKRi4Xo2L6peMLOnhEITxvdalqlzgsuz9hk68wTVhW0hoQJbCFqNCiBnVbFYVry7KHHVxODg_ZJgUx009psl-lvxtBkv3VZ7-d-CRdE9hIoxcUEt08daNmUdrO4M_GTmYEaykH9T8s_bCsF1ywktkkK8va277ximn';
export const VINTAGE_REEL_BG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxywjF68ANhp5qGx5lcxuxvewyQX6plv7l9cdqyugL8ju43DcMIZcYY-8xk15A84kxrhLjQ-ltNCD5VfnDYSmxhDEp5-5wl0fxAtSITqTrTlSaGwiFleZNRnKbcIoqE1hW5RNrDvO6FzZSdsqOx7TrHKa1vcJA-HNRrgG6kSre3859QhI-V-nsKBBOfiTTIVZV-eWEW-NSTwtdh0bIg-yAfDdArsi1VkJ36-MJiKIY17qcGxhaWMjmkKIHa1obHT2bra6AnkkcD6zG';
export const CLASSIC_CINEMA_BG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBe8-8eTTK08ZnmsCKTsOBoDojsp42lAbiH4COHaV7s7473HsKf23S60Tgdhsd5v98R9z-cExEaNE551bBS9guRpSKz-9FbJhnTg2F3pkjXDQhVI1xdrEt9Hkn8hEHNXfMJpgREy1HEzFZA5W7LXqDJv3fQPTjGtTsBdXWlMJbhWiWSkfoBJCksP_2AlfSDH_czLDmdMOCM7aaltUYBbLz68Jz3fKfKbusMVj0Xgel__OS5QGjmF2xwgsUJmti6klA_7xojeV9ovnEw';
