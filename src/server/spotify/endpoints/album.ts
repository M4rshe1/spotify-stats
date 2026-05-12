import type { Spotify } from "..";
import type { Album } from "../types";
import { Endpoint } from "./endpoint";

export class AlbumEndpoint extends Endpoint {
  constructor(spotify: Spotify) {
    super(spotify);
  }

  /**
   * February 2026: batch `GET /albums` removed; fetches each id via `GET /albums/{id}`.
   */
  async get(id: string): Promise<Album>;
  async get(ids: string[]): Promise<Album[]>;
  async get(id: string | string[]): Promise<Album | Album[]> {
    if (Array.isArray(id)) {
      return Promise.all(id.map((id) => this.get(id)));
    }
    return this.getJson<Album>(`albums/${encodeURIComponent(id)}`);
  }
}
