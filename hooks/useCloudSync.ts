
import { useState } from 'react';
import { User, TVShow, Episode } from '../types';
import { supabase } from '../services/supabase';
import { getMovieReleaseDates, getShowDetails, getSeasonDetails } from '../services/tmdb';
import { set } from 'idb-keyval';

const DB_KEY_EPISODES = 'tv_calendar_episodes_v2'; 

export const useCloudSync = (
    user: User | null,
    allTrackedShows: TVShow[],
    setEpisodes: React.Dispatch<React.SetStateAction<Record<string, Episode[]>>>
) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [fullSyncRequired, setFullSyncRequired] = useState(false);

    const saveToCloudCalendar = async (episodesList: Episode[], userId: string) => {
        if (!supabase || episodesList.length === 0) return;
        
        const rows = episodesList.map(ep => ({
            user_id: userId,
            tmdb_id: ep.show_id || ep.id,
            media_type: ep.is_movie ? 'movie' : 'tv',
            season_number: ep.season_number ?? -1,
            episode_number: ep.episode_number ?? -1,
            title: ep.show_name || ep.name || '',
            episode_name: ep.name || '',
            overview: ep.overview || '', 
            air_date: ep.air_date,
            poster_path: ep.poster_path || null,
            backdrop_path: ep.still_path || null, 
            vote_average: ep.vote_average || 0,
            release_type: ep.release_type || null
        }));
  
        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            await supabase.from('user_calendar_events').upsert(batch, { 
                onConflict: 'user_id, tmdb_id, media_type, season_number, episode_number' 
            });
        }
    };

    const performFullSync = async () => {
        if (!user?.isCloud || !supabase || !user.id) return;
        
        setIsSyncing(true);
        try {
            const uniqueItems = [...allTrackedShows];
            setProgress({ current: 0, total: uniqueItems.length });
  
            await supabase.from('user_calendar_events').delete().eq('user_id', user.id);
  
            let processedCount = 0;
            const batchSize = 3; 
            let fullEpisodeList: Episode[] = [];
  
            for (let i = 0; i < uniqueItems.length; i += batchSize) {
                const batch = uniqueItems.slice(i, i + batchSize);
                const batchEpisodes: Episode[] = [];
  
                await Promise.all(batch.map(async (item) => {
                    try {
                        if (item.media_type === 'movie') {
                            const releaseDates = await getMovieReleaseDates(item.id);
                            releaseDates.forEach(rel => {
                                batchEpisodes.push({ id: item.id * 1000 + (rel.type === 'theatrical' ? 1 : 2), name: item.name, overview: item.overview, vote_average: item.vote_average, air_date: rel.date, episode_number: 1, season_number: 1, still_path: item.backdrop_path, show_backdrop_path: item.backdrop_path, poster_path: item.poster_path, season1_poster_path: item.poster_path ? item.poster_path : undefined, show_id: item.id, show_name: item.name, is_movie: true, release_type: rel.type });
                            });
                        } else {
                            const details = await getShowDetails(item.id);
                            const seasonsMeta = details.seasons || [];
                            
                            for (const sMeta of seasonsMeta) {
                                try {
                                    const sData = await getSeasonDetails(item.id, sMeta.season_number);
                                    if (sData.episodes) {
                                        sData.episodes.forEach(ep => {
                                            if (ep.air_date) batchEpisodes.push({ ...ep, show_id: item.id, show_name: item.name, poster_path: item.poster_path, season1_poster_path: details.poster_path, show_backdrop_path: details.backdrop_path, is_movie: false }); 
                                        });
                                    }
                                } catch (e) { console.error(`Error fetching season ${sMeta.season_number}`, e); }
                            }
                        }
                    } catch (err) {
                        console.error(`Error processing ${item.name}`, err);
                    }
                }));
  
                if (batchEpisodes.length > 0) {
                    fullEpisodeList = [...fullEpisodeList, ...batchEpisodes];
                    await saveToCloudCalendar(batchEpisodes, user.id);
                }
                
                processedCount += batch.length;
                setProgress(prev => ({ ...prev, current: processedCount }));
            }
  
            await supabase.from('profiles').update({ 
                full_sync_completed: true,
                last_full_sync: new Date().toISOString()
            }).eq('id', user.id);
            
            const newEpisodesMap: Record<string, Episode[]> = {};
            fullEpisodeList.forEach(ep => {
                if(!ep.air_date) return;
                if(!newEpisodesMap[ep.air_date]) newEpisodesMap[ep.air_date] = [];
                newEpisodesMap[ep.air_date].push(ep);
            });
            await set(DB_KEY_EPISODES, newEpisodesMap);
            setEpisodes(newEpisodesMap);
  
            setFullSyncRequired(false);
  
        } catch (e) {
            console.error("Full Sync Failed", e);
            alert("Sync failed. Please check console for details.");
        } finally {
            setIsSyncing(false);
        }
    };

    return {
        isCloudSyncing: isSyncing,
        cloudSyncProgress: progress,
        fullSyncRequired,
        setFullSyncRequired,
        performFullSync,
        saveToCloudCalendar
    };
};
