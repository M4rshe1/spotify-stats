import type { Spotify } from "..";
import type { Artist } from "../types";
import { Endpoint } from "./endpoint";

export class ArtistEndpoint extends Endpoint {
  constructor(spotify: Spotify) {
    super(spotify);
  }

  /**
   * February 2026: batch `GET /artists` removed; fetches each id via `GET /artists/{id}`.
   */
  async get(id: string): Promise<Artist>;
  async get(ids: string[]): Promise<Artist[]>;
  async get(id: string | string[]): Promise<Artist | Artist[]> {
    if (Array.isArray(id)) {
      return Promise.all(id.map((id) => this.get(id)));
    }
    return this.getJson<Artist>(`artists/${encodeURIComponent(id)}`);
  }
}
