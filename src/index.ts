/* eslint-disable @typescript-eslint/ban-ts-comment */

import YTMusic from './ytmusic-api/YTMusic.js';

interface EncoreConfig {
    showVideoResults: boolean;
}

function resultsPayload(res: any, type: 'song' | 'video' = 'song') {
    console.log(`RES ${type}`, res);
    return {
        id: `encore_ytmusic${type === 'video' ? '_video' : ''}`,
        title: `${type === 'video' ? 'Music Videos' : 'Youtube Music'}`,
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
                id: `encore_yt_${r.album?.albumId || r.videoId}`,
                artistId: `encore_yt_${r.artist.artistId}`,
                artist: {
                    id: `encore_yt_${r.artist.artistId}`,
                    name: r.artist.name,
                    genres: [],
                    createdAt: new Date()
                },
                name: r.album?.name || r.name,
                genres: [],
                albumArt: r.thumbnails[0]?.url,
                createdAt: new Date()
            },
            albumId: `encore_yt_${r.album?.albumId || r.videoId}`,
            location: async () => {
                return await window['__TAURI_INVOKE__']('get_ytdl_url', {
                    trackUrl: `https://www.youtube.com/watch?v=${r.videoId}`
                });
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
}

export default class Encore {
    public static id: string = 'com.cleftly.encore';
    // @ts-expect-error
    public static name: string = 'Project Encore';
    public static author: string = 'Cleftly';
    public static description: string =
        'Experimental YouTube Music plugin for Cleftly 🎶';
    public static version: string = '0.1.0';
    public static api_version: string = 'v1';
    public static features: string[] = ['searchResults', 'externalTracks'];
    public static config_settings = {
        _1: {
            name: 'Important Notes',
            description: `
• This plugin requires yt-dlp to be installed on your machine. Please install yt-dlp from https://github.com/yt-dlp/yt-dlp and add it to your PATH.
• Use of a VPN or proxy is known to slow down (or prevent entirely) playback.
• This plugin is not in any way affiliated with Youtube, Youtube Music or Google.
                `.trim(),
            type: 'hidden'
        },
        showVideoResults: {
            name: 'Show video results',
            description: 'Show video results tab in search results',
            type: 'bool'
        }
    };

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

                this.api.events.eventManager.fireEvent(
                    'addSearchResult',
                    resultsPayload(res)
                );
            });

            this.api.config.getConfig().then((conf) => {
                if (!conf.showVideoResults) {
                    return;
                }

                this.client.searchVideos(query).then(async (res) => {
                    console.dir(res, { depth: null });

                    this.api.events.eventManager.fireEvent(
                        'addSearchResult',
                        resultsPayload(res, 'video')
                    );
                });
            });
        }, 500);
    };

    private async init() {
        const conf = (await this.api.config.getConfig()) as EncoreConfig;
        const updatedConf = {
            showVideoResults: conf.showVideoResults ?? false
        };

        if (JSON.stringify(conf) !== JSON.stringify(updatedConf)) {
            await this.api.config.saveConfig({
                ...conf,
                ...updatedConf
            });
        }
    }

    public constructor(apis) {
        this.api = apis;

        this.init().then(() => {});

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
