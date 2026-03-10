export class TTLCache<T> {
  private data: T | null = null;
  private fetchedAt = 0;
  private pending: Promise<T> | null = null;

  constructor(
    private readonly fetcher: () => Promise<T>,
    private readonly ttlMs: number,
  ) {}

  async get(): Promise<T> {
    const now = Date.now();

    if (this.data && now - this.fetchedAt < this.ttlMs) {
      return this.data;
    }

    if (this.pending) return this.pending;

    this.pending = this.fetcher()
      .then((result) => {
        this.data = result;
        this.fetchedAt = Date.now();
        this.pending = null;
        return result;
      })
      .catch((err) => {
        this.pending = null;
        if (this.data) return this.data; // stale fallback
        throw err;
      });

    return this.pending;
  }

  invalidate(): void {
    this.data = null;
    this.fetchedAt = 0;
  }

  get stalenessSeconds(): number {
    if (!this.fetchedAt) return -1;
    return Math.round((Date.now() - this.fetchedAt) / 1000);
  }
}
