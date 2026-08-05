export interface OffsetMarker {
  topic: string;
  partition: number;
  offset: string;
}

export type FlushHandler<T> = (rows: T[], offsets: OffsetMarker[]) => Promise<void>;

export class BatchBuffer<T> {
  private rows: T[] = [];
  private readonly offsets = new Map<string, OffsetMarker>();
  private timer: NodeJS.Timeout | null = null;
  private flushing: Promise<void> | null = null;
  private lastError: Error | null = null;

  constructor(private readonly maxSize: number, private readonly maxMs: number, private readonly onFlush: FlushHandler<T>) {}

  get size(): number {
    return this.rows.length;
  }

  push(row: T, marker: OffsetMarker): void {
    this.rows.push(row);
    this.offsets.set(`${marker.topic}:${marker.partition}`, marker);
    if (!this.timer) this.timer = setTimeout(() => void this.flushFromTimer(), this.maxMs);
  }

  shouldFlush(): boolean {
    return this.rows.length >= this.maxSize;
  }

  async flush(): Promise<void> {
    if (this.flushing) await this.flushing;
    if (this.lastError) {
      const error = this.lastError;
      this.lastError = null;
      throw error;
    }
    if (this.rows.length === 0) return;
    this.clearTimer();
    const rows = this.rows;
    this.rows = [];
    const offsets = [...this.offsets.values()];
    this.flushing = this.onFlush(rows, offsets)
      .then(() => {
        for (const marker of offsets) {
          const key = `${marker.topic}:${marker.partition}`;
          if (this.offsets.get(key)?.offset === marker.offset) this.offsets.delete(key);
        }
      })
      .catch((error: Error) => {
        this.rows = rows.concat(this.rows);
        throw error;
      })
      .finally(() => {
        this.flushing = null;
      });
    await this.flushing;
  }

  async drain(): Promise<void> {
    this.clearTimer();
    await this.flush();
  }

  private async flushFromTimer(): Promise<void> {
    this.timer = null;
    try {
      await this.flush();
    } catch (error) {
      this.lastError = error as Error;
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
