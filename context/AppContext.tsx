import React from 'react';
import { User, TVShow, Episode, AppSettings, SubscribedList, Reminder, Interaction } from '../types';
import { useSettings } from './v2/SettingsContext';
import { useAuth } from './v2/AuthContext';
import { useData } from './v2/DataContext';
import { useCalendar } from './v2/CalendarContext';
import { useUI } from './v2/UIContext';

export const THEMES: Record<string, Record<string, string>> = {
  default: { 500: '99, 102, 241' }, // Indigo
  emerald: { 500: '16, 185, 129' },
  rose: { 500: '244, 63, 94' },
  amber: { 500: '245, 158, 11' },
  cyan: { 500: '6, 182, 212' },
  violet: { 500: '139, 92, 246' },
  zinc: { 500: '113, 113, 122' },
};

export const generatePaletteFromHex = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    const rgb = result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '99, 102, 241';
    return { 500: rgb };
};

// This hook composes all V2 hooks into a single interface for legacy components
export const useAppContext = () => {
  const { settings, updateSettings } = useSettings();
  const { user, login, logout, loginCloud, updateUserKey, traktAuth, traktPoll, saveTraktToken, disconnectTrakt, authLoading } = useAuth();
  const { 
      watchlist, subscribedLists, reminders, interactions, 
      addToWatchlist, removeFromWatchlist, batchAddShows, subscribeToList, unsubscribeFromList, batchSubscribe,
      addReminder, removeReminder, toggleWatched, toggleEpisodeWatched, markHistoryWatched, setRating,
      syncTraktData, performFullSync, saveToCloudCalendar, 
      isSyncing, syncProgress, fullSyncRequired, setFullSyncRequired, dataLoading, loadingStatus
  } = useData();
  const { episodes, calendarDate, setCalendarDate, refreshEpisodes, loadArchivedEvents, loading: calendarLoading } = useCalendar();
  const { isSearchOpen, setIsSearchOpen, isMobileWarningOpen, closeMobileWarning, calendarScrollPos, setCalendarScrollPos, reminderCandidate, setReminderCandidate } = useUI();

  // Derived State
  const allTrackedShows = React.useMemo(() => {
      const map = new Map<number, TVShow>();
      watchlist.forEach(show => map.set(show.id, show));
      subscribedLists.forEach(list => list.items.forEach(show => { if (!map.has(show.id)) map.set(show.id, show); }));
      return Array.from(map.values());
  }, [watchlist, subscribedLists]);

  // Legacy Bridge Functions
  const unhideShow = (showId: number) => {
      const newHidden = settings.hiddenItems.filter(i => i.id !== showId);
      updateSettings({ hiddenItems: newHidden });
      if (user?.traktToken) syncTraktData(true);
  };

  const performFullSyncBridge = async (config?: Partial<AppSettings>) => {
      if (config) updateSettings(config);
      await performFullSync(allTrackedShows);
  };

  const hardRefreshCalendar = async () => {
      await refreshEpisodes(true);
  };

  const reloadAccount = async () => {
       window.location.reload();
  };

  const requestNotificationPermission = async () => {
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'granted') return true;
      const permission = await Notification.requestPermission();
      return permission === 'granted';
  };

  const importBackup = (data: any) => {
      if (data.watchlist) batchAddShows(data.watchlist);
      if (data.settings) updateSettings(data.settings);
  };

  const uploadBackupToCloud = async (data: any) => { /* No-op */ };
  const getSyncPayload = () => JSON.stringify({ user, settings }); 
  const processSyncPayload = (payload: string) => { /* No-op */ };
  const testConnection = async () => { return { read: true, write: true, message: 'V2 Bridge Active' }; };

  return {
      // Auth
      user, login, loginCloud, logout, updateUserKey, loading: authLoading || dataLoading,
      
      // Data
      watchlist, addToWatchlist, removeFromWatchlist, unhideShow, batchAddShows, batchSubscribe,
      subscribedLists, subscribeToList, unsubscribeFromList, allTrackedShows,
      reminders, addReminder, removeReminder,
      interactions, toggleWatched, toggleEpisodeWatched, markHistoryWatched, setRating,
      loadingStatus, // New: Exposed status text
      
      // Calendar
      episodes, calendarDate, setCalendarDate, refreshEpisodes, loadArchivedEvents, 
      isRefreshing: calendarLoading, // Explicit separation
      
      // Sync
      isSyncing, syncProgress, fullSyncRequired, performFullSync: performFullSyncBridge,
      hardRefreshCalendar, traktAuth, traktPoll, saveTraktToken, disconnectTrakt, syncTraktData,
      testConnection,
      
      // UI / Settings
      settings, updateSettings,
      isSearchOpen, setIsSearchOpen,
      isMobileWarningOpen, closeMobileWarning,
      calendarScrollPos, setCalendarScrollPos,
      reminderCandidate, setReminderCandidate,
      
      // Utils
      requestNotificationPermission,
      importBackup, uploadBackupToCloud,
      getSyncPayload, processSyncPayload,
      reloadAccount
  };
};

// Deprecated Provider - Renders children directly to avoid breaking tree
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};