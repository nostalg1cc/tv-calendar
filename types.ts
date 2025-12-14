
export interface TVShow {
  id: number;
  name: string; // Used for Title (Movie) or Name (TV)
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date: string; // Used for Release Date (Movie) or First Air Date (TV)
  vote_average: number;
  number_of_seasons?: number;
  media_type: 'tv' | 'movie'; // distinct type
  seasons?: { season_number: number; poster_path: string | null; episode_count: number }[]; // Added for metadata caching
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  air_date: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  show_id?: number; // Added for internal reference
  show_name?: string; // Added for internal reference
  poster_path?: string | null; // Added for Calendar UI (Vertical image)
  season1_poster_path?: string | null; // Anti-Spoiler Art
  is_movie?: boolean; // Flag to identify movies in mixed lists
  release_type?: 'theatrical' | 'digital'; // Specific release type for movies
}

export interface Season {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episodes: Episode[];
}

export interface User {
  id?: string; // Supabase UUID if cloud user
  username: string;
  tmdbKey: string; // TMDB Read Access Token
  isAuthenticated: boolean;
  isCloud?: boolean; // Flag to determine storage strategy
  email?: string;
}

export interface CalendarDay {
  date: Date;
  episodes: Episode[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface AppSettings {
  hideSpoilers: boolean;
  hideTheatrical: boolean;
  recommendationsEnabled: boolean;
  recommendationMethod: 'banner' | 'inline';
  compactCalendar: boolean;
  viewMode: 'grid' | 'list'; 
  suppressMobileAddWarning: boolean; 
  calendarPosterFillMode: 'cover' | 'contain'; 
  useSeason1Art: boolean; // Anti-Spoiler
  cleanGrid: boolean; // No Text Labels
  timezone?: string; // Region Preference
  theme?: string; // Accent Color Theme
  customThemeColor?: string; // Hex Code for Custom Theme
}

export interface SubscribedList {
  id: string; // List ID can sometimes be string or number in TMDB v4, safe to use string
  name: string;
  item_count: number;
  items: TVShow[];
}

export interface Reminder {
  id?: string;
  tmdb_id: number;
  media_type: 'tv' | 'movie';
  show_name?: string; // For display
  scope: 'all' | 'episode' | 'movie_theatrical' | 'movie_digital';
  episode_season?: number;
  episode_number?: number;
  offset_minutes: number; // 0 = On day, 1440 = 1 Day Before
}

export interface Interaction {
    tmdb_id: number;
    media_type: 'tv' | 'movie';
    is_watched: boolean;
    rating: number; // 0-5
}