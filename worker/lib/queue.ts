let globalQueueManager: null | QueueManager = null;

class Queue {
  private scheduled: Set<string>;
  private created: Set<string>;
  constructor() {
    this.scheduled = new Set<string>();
    this.created = new Set<string>();
  }
  public add(id: string | null) {
    if (!id) return;
    if (!this.created.has(id)) {
      this.scheduled.add(id);
    }
  }
  public size(): number;
  public size(created?: boolean): number {
    if (created) {
      return this.created.size;
    }
    return this.scheduled.size;
  }
  public complete(id: string) {
    if (this.scheduled.delete(id)) {
      this.created.add(id);
    }
  }
  public clear() {
    this.created = new Set();
    this.scheduled = new Set();
  }
  public toArray(): Array<string>;
  public toArray(created?: boolean): Array<string> {
    if (created) {
      return Array.from(this.created);
    }
    return Array.from(this.scheduled);
  }
}

class QueueManager {
  public readonly tracks: Queue;
  public readonly albums: Queue;
  public readonly artists: Queue;
  public readonly genres: Queue;
  public readonly playlists: Queue;
  constructor() {
    this.tracks = new Queue();
    this.albums = new Queue();
    this.artists = new Queue();
    this.genres = new Queue();
    this.playlists = new Queue();
  }
  public clear() {
    this.tracks.clear();
    this.albums.clear();
    this.artists.clear();
    this.genres.clear();
    this.playlists.clear();
  }
}

export function getQueueManager() {
  globalQueueManager ??= new QueueManager();
  return globalQueueManager;
}
