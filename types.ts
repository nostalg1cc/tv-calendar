
export interface TVShow {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  first_air_date: string;
  vote_average: number;
  media_type: 'tv' | 'movie';
  origin_country?: string[];
  seasons?: Season[];
  original_language?: string;
  custom_poster_path?: string | null;
  status?: string;
  runtime?: number;
  genres?: { id: number, name: string }[];
  networks?: Array<{ name: string, id: number, logo_path: string | null }>;
  credits?: {
      cast: Array<{ id: number, name: string, character: string, profile_path: string | null }>;
      crew: Array<{ id: number, name: string, job: string }>;
  };
  external_ids?: {
    imdb_id?: string;
    tvdb_id?: number;
    facebook_id?: string;
    instagram_id?: string;
    twitter_id?: string;
  };
}

export interface Season {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episodes: Episode[];
  episode_count: number;
  vote_average: number;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  air_date: string; // Used for grouping (YYYY-MM-DD in local time)
  air_date_iso?: string; // Full ISO timestamp for display
  air_date_source?: 'tmdb' | 'tvmaze' | 'trakt';
  episode_number: number;
  season_number: number;
  still_path: string | null;
  show_id: number;
  show_name: string;
  is_movie?: boolean;
  release_type?: 'theatrical' | 'digital';
  release_country?: string;
  runtime?: number;
  show_backdrop_path?: string | null;
  poster_path?: string | null;
  season1_poster_path?: string | null;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  is_cloud: boolean;
  tmdb_key?: string;
}

export interface AppSettings {
  // Visual Theme (Major Overhaul)
  activeTheme: 'standard' | 'upside-down';
  // Color Palette (Only applies to 'standard' theme)
  baseTheme: 'cosmic' | 'oled' | 'midnight' | 'forest' | 'dawn' | 'light' | 'auto' | 'custom';
  appFont: 'inter' | 'outfit' | 'space' | 'lora' | 'system';
  themeFontOverride: boolean;
  compactCalendar: boolean;
  timezone: string;
  country: string;
  hideTheatrical: boolean;
  ignoreSpecials: boolean;
  spoilerConfig: {
      images: boolean;
      overview: boolean;
      title: boolean;
      includeMovies: boolean;
      replacementMode: 'blur' | 'banner';
  };
  recommendationsEnabled: boolean;
  recommendationMethod?: 'banner' | 'inline';
  reminderStrategy?: 'ask' | 'always' | 'never';
  v2SidebarMode: 'fixed' | 'collapsed';
  v2LibraryLayout: 'grid' | 'list';
  hiddenItems: number[];
  theme?: string;
  customThemeColor?: string;
  viewMode?: 'grid' | 'list' | 'stack' | 'cards';
  calendarPosterFillMode?: 'contain' | 'cover';
  cleanGrid?: boolean;
  useSeason1Art?: boolean;
  mobileNavLayout?: 'pill' | 'standard';
  calendarFilterTv?: boolean;
  calendarFilterMovies?: boolean;
  customPosters: Record<number, string>;
  traktClient?: {
      id: string;
      secret: string;
  };
  showCalendarRatings?: boolean;
  // Legacy or deprecated flags can be optional
  upsideDownMode?: boolean; 
}

export const DEFAULT_SETTINGS: AppSettings = {
  activeTheme: 'standard',
  baseTheme: 'cosmic',
  appFont: 'inter',
  themeFontOverride: true,
  compactCalendar: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  country: 'US',
  hideTheatrical: false,
  ignoreSpecials: true,
  spoilerConfig: { images: true, overview: true, title: false, includeMovies: false, replacementMode: 'blur' },
  recommendationsEnabled: true,
  v2SidebarMode: 'fixed',
  v2LibraryLayout: 'grid',
  hiddenItems: [],
  calendarFilterTv: true,
  calendarFilterMovies: true,
  customPosters: {},
  showCalendarRatings: false
};

export interface WatchedItem {
    tmdb_id: number;
    media_type: 'tv' | 'movie' | 'episode';
    season_number?: number;
    episode_number?: number;
    is_watched: boolean;
    rating?: number;
    watched_at?: string;
}

export type Interaction = WatchedItem;

export interface Reminder {
    id?: string;
    tmdb_id: number;
    media_type: 'movie' | 'tv';
    show_name: string;
    scope: 'all' | 'episode' | 'movie_theatrical' | 'movie_digital';
    episode_season?: number;
    episode_number?: number;
    offset_minutes: number;
}

export interface Video {
    id: string;
    key: string;
    name: string;
    site: string;
    type: string;
}
