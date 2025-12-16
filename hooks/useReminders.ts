
import { useState, useCallback } from 'react';
import { Reminder, TVShow, Episode, AppSettings } from '../types';
import { supabase } from '../services/supabase';
import { isSameDay, parseISO, subMinutes } from 'date-fns';

export const useReminders = (
    user: any, 
    settings: AppSettings, 
    episodes: Record<string, Episode[]>
) => {
    const [reminders, setReminders] = useState<Reminder[]>(() => { 
        try { return JSON.parse(localStorage.getItem('tv_calendar_reminders') || '[]'); } catch { return []; } 
    });
    const [reminderCandidate, setReminderCandidate] = useState<TVShow | Episode | null>(null);

    const addReminder = async (reminder: Reminder) => { 
        const newReminder = { ...reminder, id: reminder.id || crypto.randomUUID() }; 
        setReminders(prev => [...prev, newReminder]); 
        
        if (user?.isCloud && supabase) { 
            await supabase.from('reminders').insert({ 
                user_id: user.id, 
                tmdb_id: reminder.tmdb_id, 
                media_type: reminder.media_type, 
                scope: reminder.scope, 
                episode_season: reminder.episode_season, 
                episode_number: reminder.episode_number, 
                offset_minutes: reminder.offset_minutes 
            }); 
        } 
        
        if ('Notification' in window && Notification.permission !== 'granted') {
            await Notification.requestPermission();
        }
    };

    const removeReminder = async (id: string) => { 
        setReminders(prev => prev.filter(r => r.id !== id)); 
        if (user?.isCloud && supabase) { 
            await supabase.from('reminders').delete().eq('id', id); 
        } 
    };

    // Logic to decide whether to show the modal or auto-add
    const handleReminderRequest = (item: TVShow | Episode) => {
        // Check strategy
        const strategy = settings.reminderStrategy || 'ask';

        if (strategy === 'never') {
            return; // Do nothing
        }

        if (strategy === 'always') {
            // Auto-add generic reminder
            const isMovie = 'media_type' in item ? item.media_type === 'movie' : item.is_movie;
            const showId = 'show_id' in item && item.show_id ? item.show_id : item.id;
            const name = 'show_name' in item && item.show_name ? item.show_name : item.name;

            const defaultReminder: Reminder = {
                tmdb_id: showId || 0,
                media_type: isMovie ? 'movie' : 'tv',
                show_name: name,
                scope: isMovie ? 'movie_digital' : 'all', // Default scopes
                offset_minutes: 0 // Default to On Day
            };
            addReminder(defaultReminder);
            // Optionally show a toast here
        } else {
            // 'ask' strategy
            setReminderCandidate(item);
        }
    };

    return {
        reminders,
        setReminders,
        addReminder,
        removeReminder,
        reminderCandidate,
        setReminderCandidate,
        handleReminderRequest
    };
};
