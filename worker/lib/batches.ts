export class Batches {
  private batchSize: number = 20;
  public withSize(size: number): this {
    this.batchSize = size;
    return this;
  }
  public batch<T>(array: T[], batchSize: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      result.push(array.slice(i, i + batchSize));
    }
    return result;
  }

  public fromSet(set: Set<string>): string[][] {
    return this.batch(Array.from(set), this.batchSize);
  }
  public fromArray<T>(array: T[]): T[][] {
    return this.batch(array, this.batchSize);
  }
}
