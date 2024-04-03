/* eslint-disable @typescript-eslint/ban-ts-comment */

import YTMusic from './ytmusic-api/YTMusic.js';

export default class Encore {
    public id: string = 'com.cleftly.encore';
    public name: string = 'Project Encore';
    public author: string = 'Cleftly';
    public description: string = "Somethin's abrewin'";
    public version: string = '1.0.0';
    public api_version: string = 'v1';

    private api;
    private client: YTMusic;
    private lastSearchTime = null;
    private lastSearchTimeout = null;

    private onSearch = (query: string) => {
        this.lastSearchTime = Date.now();

        if (this.lastSearchTimeout) {
            clearTimeout(this.lastSearchTimeout);
        }

        this.lastSearchTimeout = setTimeout(() => {
            this.lastSearchTime = null;
            this.lastSearchTimeout = null;

            this.client.searchSongs(query).then(async (res) => {
                console.dir(res, { depth: null });

                const payload = {
                    title: 'Youtube Music',
                    results: res.map((r) => ({
                        id: `yt_${r.videoId}`,
                        title: r.name,
                        artist: {
                            id: `yt_${r.artist.artistId}`,
                            name: r.artist.name,
                            genres: [],
                            createdAt: new Date()
                        },
                        artistId: `yt_${r.artist.artistId}`,
                        album: {
                            id: `yt_${r.album.albumId}`,
                            artistId: `yt_${r.artist.artistId}`,
                            artist: {
                                id: `yt_${r.artist.artistId}`,
                                name: r.artist.name,
                                genres: [],
                                createdAt: new Date()
                            },
                            name: r.album.name,
                            genres: [],
                            albumArt: r.thumbnails[0]?.url,
                            createdAt: new Date()
                        },
                        albumId: `yt_${r.album.albumId}`,
                        location: async () => {
                            return await window['__TAURI_INVOKE__'](
                                'get_audio_url',
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
        this.client.initialize().then(() => {
            console.log('Initialized Encore YTMusic Client');
            this.api.events.eventManager.onEvent('onSearch', this.onSearch);
        });
    }
}
