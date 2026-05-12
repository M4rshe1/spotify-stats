import type { Spotify } from "..";
import type { Playlist } from "../types";
import { Endpoint } from "./endpoint";

export class PlaylistEndpoint extends Endpoint {
  constructor(spotify: Spotify) {
    super(spotify);
  }

  /**
   * February 2026: batch `GET /playlists` removed; fetches each id via `GET /playlists/{id}`.
   */
  async get(id: string): Promise<Playlist>;
  async get(ids: string[]): Promise<Playlist[]>;
  async get(id: string | string[]): Promise<Playlist | Playlist[]> {
    if (Array.isArray(id)) {
      return Promise.all(id.map((id) => this.get(id)));
    }
    return this.getJson<Playlist>(
      `playlists/${encodeURIComponent(id)}`,
    ) as Promise<Playlist>;
  }
}
