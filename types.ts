
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
  is_movie?: boolean; // Flag to identify movies in mixed lists
  release_type?: 'theatrical' | 'digital'; // Specific release type for movies
}

export interface Season {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
  episodes: Episode[];
}

export interface User {
  username: string;
  tmdbKey: string; // TMDB Read Access Token
  isAuthenticated: boolean;
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
  viewMode: 'grid' | 'list'; // Added viewMode
}

export interface SubscribedList {
  id: string; // List ID can sometimes be string or number in TMDB v4, safe to use string
  name: string;
  item_count: number;
  items: TVShow[];
}
