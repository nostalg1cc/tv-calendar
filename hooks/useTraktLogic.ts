
import { useState, useCallback } from 'react';
import { User, TVShow, Interaction } from '../types';
import { getWatchedHistory, getShowProgress, getDeviceCode, pollToken, getTraktProfile, syncHistory } from '../services/trakt';
import { getMovieDetails, getShowDetails } from '../services/tmdb';
import { supabase } from '../services/supabase';

export const useTraktLogic = (
    user: User | null, 
    setUser: (u: User) => void,
    interactions: Record<string, Interaction>,
    setInteractions: (i: Record<string, Interaction>) => void,
    allTrackedShows: TVShow[],
    batchAddShows: (shows: TVShow[]) => Promise<void>
) => {
    const [isSyncing, setIsSyncing] = useState(false);

    const traktAuth = async (clientId: string, clientSecret: string) => { return await getDeviceCode(clientId); };
    
    const traktPoll = async (deviceCode: string, clientId: string, clientSecret: string) => { return await pollToken(deviceCode, clientId, clientSecret); };
    
    const saveTraktToken = async (tokenData: any) => { 
        if (!user) return; 
        try { 
            const profile = await getTraktProfile(tokenData.access_token); 
            const updatedUser: User = { ...user, traktToken: { ...tokenData, created_at: Date.now() / 1000 }, traktProfile: profile }; 
            setUser(updatedUser); 
            if (user.isCloud && supabase) { 
                await supabase.from('profiles').update({ trakt_token: updatedUser.traktToken, trakt_profile: profile }).eq('id', user.id); 
            } else { 
                localStorage.setItem('tv_calendar_user', JSON.stringify(updatedUser)); 
            } 
        } catch (e) { 
            console.error("Failed to fetch Trakt profile", e); 
        } 
    };

    const disconnectTrakt = async () => { 
        if (!user) return; 
        const updatedUser = { ...user, traktToken: undefined, traktProfile: undefined }; 
        setUser(updatedUser); 
        if (user.isCloud && supabase) { 
            await supabase.from('profiles').update({ trakt_token: null, trakt_profile: null }).eq('id', user.id); 
        } else { 
            localStorage.setItem('tv_calendar_user', JSON.stringify(updatedUser)); 
        } 
    };

    const syncTraktData = async (background = false) => {
        if (!user?.traktToken) return;
        setIsSyncing(true);
        try {
            const token = user.traktToken.access_token;
            const [movieHistory, showHistory] = await Promise.all([getWatchedHistory(token, 'movies'), getWatchedHistory(token, 'shows')]);
            let newInteractions: Record<string, Interaction> = { ...interactions };
            let newShowsToAdd: TVShow[] = [];
            const currentShowIds = new Set(allTrackedShows.map(s => s.id));
            
            // Process Movies
            for (const item of movieHistory) { 
                const tmdbId = item.movie.ids.tmdb; 
                if (!tmdbId) continue; 
                
                newInteractions[`movie-${tmdbId}`] = { 
                    tmdb_id: tmdbId, 
                    media_type: 'movie', 
                    is_watched: true, 
                    rating: 0, 
                    watched_at: item.last_watched_at 
                }; 
                
                if (!currentShowIds.has(tmdbId)) { 
                    try { 
                        const details = await getMovieDetails(tmdbId); 
                        newShowsToAdd.push(details); 
                        currentShowIds.add(tmdbId); 
                    } catch (e) {} 
                } 
            }

            // Process Shows - Sort by recently watched
            const sortedShows = showHistory.sort((a: any, b: any) => 
                new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime()
            );

            // Fetch progress for top 20 recent shows
            const recentShows = sortedShows.slice(0, 20); 
            
            for (const item of recentShows) { 
                const tmdbId = item.show.ids.tmdb; 
                if (!tmdbId) continue; 
                
                if (!currentShowIds.has(tmdbId)) { 
                    try { 
                        const details = await getShowDetails(tmdbId); 
                        newShowsToAdd.push(details); 
                        currentShowIds.add(tmdbId); 
                    } catch (e) {} 
                } 

                try { 
                    const progress = await getShowProgress(token, item.show.ids.trakt); 
                    if (progress && progress.seasons) { 
                        progress.seasons.forEach((season: any) => { 
                            season.episodes.forEach((ep: any) => { 
                                if (ep.completed) { 
                                    const key = `episode-${tmdbId}-${season.number}-${ep.number}`; 
                                    newInteractions[key] = { 
                                        tmdb_id: tmdbId, 
                                        media_type: 'episode', 
                                        is_watched: true, 
                                        season_number: season.number, 
                                        episode_number: ep.number, 
                                        rating: 0, 
                                        watched_at: ep.last_watched_at 
                                    }; 
                                } 
                            }); 
                        }); 
                    } 
                } catch (e) {} 
            }
            
            setInteractions(newInteractions);
            
            // Save to Cloud if needed
            if (user.isCloud && supabase) {
                const updates = Object.values(newInteractions).map(interaction => ({
                    user_id: user.id,
                    tmdb_id: interaction.tmdb_id,
                    media_type: interaction.media_type,
                    is_watched: interaction.is_watched,
                    rating: interaction.rating,
                    season_number: interaction.season_number ?? -1,
                    episode_number: interaction.episode_number ?? -1,
                    watched_at: interaction.watched_at || new Date().toISOString()
                }));
                
                if (updates.length > 0) { 
                    for (let i = 0; i < updates.length; i += 100) { 
                        const batch = updates.slice(i, i + 100); 
                        await supabase.from('interactions').upsert(batch, { 
                            onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' 
                        }); 
                    } 
                }
            }
            if (newShowsToAdd.length > 0) { await batchAddShows(newShowsToAdd); }
            if (!background) alert(`Sync Complete! Updated watched status.`);
        } catch (e) { 
            console.error("Trakt Sync Error", e); 
            if (!background) alert("Trakt sync encountered an error."); 
        } finally { 
            setIsSyncing(false); 
        }
    };

    return {
        isTraktSyncing: isSyncing,
        traktAuth,
        traktPoll,
        saveTraktToken,
        disconnectTrakt,
        syncTraktData
    };
};
