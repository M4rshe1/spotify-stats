import { logger } from '@/lib/logger';
import { tryCatch } from '@/lib/try-catch';
import { db } from '@/server/db';
import getSpotifyApi from '@/server/spotify';
import { createGenres, createArtists, createAlbums, createTracks, createPlaybacks, addToCreationQueues, createEntity, cleanQueues, getQueueSize, getCreatedEntitySize } from '@/lib/spotify';

async function fetchPlaybackStats() {
    logger.info("Fetching playback stats");
    cleanQueues();
    const users = await tryCatch(db.user.findMany({
        include: {
            playbacks: {
                take: 1,
                orderBy: {
                    playedAt: "desc",
                },
            }
        }
    }));
    if (users.error) {
        logger.error(users.error);
        return;
    }
    logger.info({
        count: users.data.length,
    }, "Found users");
    for (const user of users.data) {
        const spotify = getSpotifyApi(user.id);
        const recentlyPlayed = await tryCatch(spotify.player.getRecentlyPlayedTracks(50));

        if (recentlyPlayed.error) {
            logger.error(recentlyPlayed.error);
            continue;
        }

        const filteredPlaybacks = recentlyPlayed.data.items.filter(playback => new Date(playback.played_at) > new Date(user.playbacks[0]?.playedAt ?? 0));
        logger.info({
            count: filteredPlaybacks.length,
        }, "Found filtered playbacks");
        for (const track of filteredPlaybacks) {
            track.track.artists.map(artist => addToCreationQueues("artists", artist.id));
            track.track.album.artists.map(artist => addToCreationQueues("artists", artist.id));

            track.track.album.genres?.map(genre => addToCreationQueues("genres", genre))

            addToCreationQueues("albums", track.track.album.id);

            addToCreationQueues("tracks", track.track.id);
        }

        await createGenres();
        await createArtists(spotify);
        logger.info({
            count: getCreatedEntitySize("genres"),
        }, "Created genres");

        logger.info({
            count: getCreatedEntitySize("artists"),
        }, "Created artists");
        await createAlbums(spotify);
        logger.info({
            count: getCreatedEntitySize("albums"),
        }, "Created albums");
        await createTracks(spotify);
        logger.info({
            count: getCreatedEntitySize("tracks"),
        }, "Created tracks");
        await createPlaybacks(user.id, recentlyPlayed.data.items);
        logger.info({
            count: filteredPlaybacks.length,
        }, "Created playbacks");
    }
    logger.info("Playback stats fetched");
}


setInterval(fetchPlaybackStats, 1000 * 60 * 5);
fetchPlaybackStats();