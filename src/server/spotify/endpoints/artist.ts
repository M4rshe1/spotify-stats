import type { Spotify } from "..";
import type { Artist } from "../types";
import { Endpoint } from "./endpoint";

export class ArtistEndpoint extends Endpoint {
  constructor(spotify: Spotify) {
    super(spotify);
  }

  async get(id: string): Promise<Artist> {
    return this.getJson<Artist>(`artists/${encodeURIComponent(id)}`);
  }
}
