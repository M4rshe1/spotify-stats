import type { Spotify } from "..";
import type { Album } from "../types";
import { Endpoint } from "./endpoint";

export class AlbumEndpoint extends Endpoint {
  constructor(spotify: Spotify) {
    super(spotify);
  }

  async get(id: string): Promise<Album> {
    return this.getJson<Album>(`albums/${encodeURIComponent(id)}`);
  }
}
