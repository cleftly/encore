/* eslint-disable @typescript-eslint/ban-ts-comment */

import YTMusic from './ytmusic-api/YTMusic.js';

export default class Encore {
    public static id: string = 'com.cleftly.encore';
    // @ts-expect-error
    public static name: string = 'Project Encore';
    public static author: string = 'Cleftly';
    public static description: string =
        'Experimental YouTube Music plugin for Cleftly';
    public static version: string = '1.0.0';
    public static api_version: string = 'v1';
    public static features: string[] = ['searchResults', 'externalTracks'];

    private api;
    private client: YTMusic;
    private lastSearchTimeout = null;

    private onSearch = (query: string) => {
        if (this.lastSearchTimeout) {
            clearTimeout(this.lastSearchTimeout);
        }

        this.lastSearchTimeout = setTimeout(() => {
            this.lastSearchTimeout = null;

            this.client.searchSongs(query).then(async (res) => {
                console.dir(res, { depth: null });

                const payload = {
                    id: 'encore_ytmusic',
                    title: 'Youtube Music',
                    results: res.map((r) => ({
                        id: `encore_yt_${r.videoId}`,
                        title: r.name,
                        artist: {
                            id: `encore_yt_${r.artist.artistId}`,
                            name: r.artist.name,
                            genres: [],
                            createdAt: new Date()
                        },
                        artistId: `encore_yt_${r.artist.artistId}`,
                        album: {
                            id: `encore_yt_${r.album.albumId}`,
                            artistId: `encore_yt_${r.artist.artistId}`,
                            artist: {
                                id: `encore_yt_${r.artist.artistId}`,
                                name: r.artist.name,
                                genres: [],
                                createdAt: new Date()
                            },
                            name: r.album.name,
                            genres: [],
                            albumArt: r.thumbnails[0]?.url,
                            createdAt: new Date()
                        },
                        albumId: `encore_yt_${r.album.albumId}`,
                        location: async () => {
                            return await window['__TAURI_INVOKE__'](
                                'get_ytdl_url',
                                {
                                    trackUrl: `https://www.youtube.com/watch?v=${r.videoId}`
                                }
                            );
                        },
                        createdAt: new Date(),
                        discNum: 1,
                        totalDiscs: 1,
                        trackNum: 1,
                        totalTracks: 1,
                        duration: r.duration,
                        genres: [],
                        type: 'http'
                    }))
                };

                this.api.events.eventManager.fireEvent(
                    'addSearchResult',
                    payload
                );
            });
        }, 500);
    };

    public constructor(apis) {
        this.api = apis;
        this.client = new YTMusic();
        this.client
            .initialize()
            .then(() => {
                window['__TAURI_INVOKE__']('check_for_ytdl').then((res) => {
                    if (!res) {
                        alert(
                            "Failed to start Encore: Can't find yt-dlp or youtube-dl.\n\nPlease install yt-dlp from https://github.com/yt-dlp/yt-dlp and add it to your PATH."
                        );
                        return;
                    }

                    console.log('Initialized Encore YTMusic Client');
                    this.api.events.eventManager.onEvent(
                        'onSearch',
                        this.onSearch
                    );
                });
            })
            .catch((err) => {
                console.error(err);
                alert(
                    `Failed to start Encore: ${err?.message || 'Unknown error'}`
                );
            });
    }
}
