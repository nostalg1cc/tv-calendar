

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
  air_date: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  show_id: number;
  show_name: string;
  is_movie?: boolean;
  release_type?: 'theatrical' | 'digital';
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
  baseTheme: 'cosmic' | 'oled' | 'midnight' | 'forest' | 'dawn' | 'light' | 'auto';
  appFont: 'inter' | 'outfit' | 'space' | 'lora' | 'system';
  compactCalendar: boolean;
  timezone: string;
  timeShift: boolean;
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
  viewMode?: 'grid' | 'list' | 'stack';
  calendarPosterFillMode?: 'contain' | 'cover';
  cleanGrid?: boolean;
  useSeason1Art?: boolean;
  mobileNavLayout?: 'pill' | 'standard';
}

export const DEFAULT_SETTINGS: AppSettings = {
  baseTheme: 'cosmic',
  appFont: 'inter',
  compactCalendar: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  timeShift: false,
  hideTheatrical: false,
  ignoreSpecials: true,
  spoilerConfig: { images: true, overview: true, title: false, includeMovies: false, replacementMode: 'blur' },
  recommendationsEnabled: true,
  v2SidebarMode: 'fixed',
  v2LibraryLayout: 'grid',
  hiddenItems: []
};

// Database Row Types
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