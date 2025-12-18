
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
  origin_country?: string[]; // Added for Timezone Logic
  seasons?: { season_number: number; poster_path: string | null; episode_count: number; air_date?: string }[]; // Added for metadata caching
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
  show_backdrop_path?: string | null; // Added for Header UI (Horizontal Show Art)
  poster_path?: string | null; // Added for Calendar UI (Vertical image)
  season1_poster_path?: string | null; // Anti-Spoiler Art
  is_movie?: boolean; // Flag to identify movies in mixed lists
  release_type?: 'theatrical' | 'digital'; // Specific release type for movies
  backdrop_path?: string | null; // For movies or specific episode styling
}

export interface Season {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episodes: Episode[];
}

export interface Video {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  site: string; // "YouTube"
  size: number;
  type: string; // "Trailer", "Teaser", "Clip", "Featurette", "Behind the Scenes"
  official: boolean;
  published_at: string;
}

export interface TraktProfile {
    username: string;
    name: string;
    ids: { slug: string };
    images?: { avatar?: { full?: string } };
}

export interface User {
  id?: string; // Supabase UUID if cloud user
  username: string;
  tmdbKey: string; // TMDB Read Access Token
  isAuthenticated: boolean;
  isCloud?: boolean; // Flag to determine storage strategy
  email?: string;
  fullSyncCompleted?: boolean; // New Flag for migration state
  traktToken?: {
      access_token: string;
      refresh_token: string;
      expires: number;
      created_at: number;
  };
  traktProfile?: TraktProfile;
}

export interface CalendarDay {
  date: Date;
  episodes: Episode[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

export type V2SidebarMode = 'fixed' | 'collapsed';

export interface AppSettings {
  spoilerConfig: {
      images: boolean;
      overview: boolean;
      title: boolean;
      includeMovies: boolean; 
      replacementMode?: 'blur' | 'banner';
  };
  hideTheatrical: boolean;
  ignoreSpecials: boolean; 
  recommendationsEnabled: boolean;
  recommendationMethod: 'banner' | 'inline';
  compactCalendar: boolean;
  viewMode: 'grid' | 'list' | 'stack'; 
  mobileNavLayout: 'standard' | 'pill'; 
  suppressMobileAddWarning: boolean; 
  calendarPosterFillMode: 'cover' | 'contain'; 
  useSeason1Art: boolean; // Anti-Spoiler
  cleanGrid: boolean; // No Text Labels
  timezone?: string; // Region Preference
  timeShift: boolean; // Smart Date Adjustment
  theme?: string; // Accent Color Theme
  customThemeColor?: string; // Hex Code for Custom Theme
  appDesign: 'default' | 'blackout'; // Deprecated in favor of baseTheme, kept for migration
  baseTheme: 'cosmic' | 'oled' | 'midnight' | 'forest' | 'dawn' | 'light' | 'auto'; // New Base Theme
  appFont: 'inter' | 'outfit' | 'space' | 'lora' | 'system'; // New Font Option
  reminderStrategy: 'ask' | 'always' | 'never'; // New Reminder Preference
  hiddenItems: { id: number; name: string }[]; // Blacklist for deleted items to prevent Trakt re-sync
  v2SidebarMode?: V2SidebarMode;
  autoSync: boolean; // New: Toggle for automatic calendar fetching
}

export interface SubscribedList {
  id: string; 
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
    media_type: 'tv' | 'movie' | 'episode';
    is_watched: boolean;
    rating: number; // 0-5
    watched_at?: string; // ISO date
    season_number?: number; // For episodes
    episode_number?: number; // For episodes
}
