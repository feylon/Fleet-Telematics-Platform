export interface OffsetMarker {
  topic: string;
  partition: number;
  offset: string;
}

export type FlushHandler<T> = (rows: T[], offsets: OffsetMarker[]) => Promise<void>;
export type FlushErrorHandler = (error: Error, firstOffsets: OffsetMarker[]) => Promise<void> | void;

export class BatchBuffer<T> {
  private rows: T[] = [];
  private readonly lastOffsets = new Map<string, OffsetMarker>();
  private readonly firstOffsets = new Map<string, OffsetMarker>();
  private timer: NodeJS.Timeout | null = null;
  private flushing: Promise<void> | null = null;

  constructor(private readonly maxSize: number, private readonly maxMs: number, private readonly onFlush: FlushHandler<T>, private readonly onError: FlushErrorHandler = () => undefined) {}

  get size(): number {
    return this.rows.length;
  }

  push(row: T, marker: OffsetMarker): void {
    const key = `${marker.topic}:${marker.partition}`;
    this.rows.push(row);
    this.lastOffsets.set(key, marker);
    if (!this.firstOffsets.has(key)) this.firstOffsets.set(key, marker);
    if (!this.timer) this.timer = setTimeout(() => void this.flushFromTimer(), this.maxMs);
  }

  shouldFlush(): boolean {
    return this.rows.length >= this.maxSize;
  }

  pendingFirstOffsets(): OffsetMarker[] {
    return [...this.firstOffsets.values()];
  }

  discard(): void {
    this.clearTimer();
    this.rows = [];
    this.lastOffsets.clear();
    this.firstOffsets.clear();
  }

  async flush(): Promise<void> {
    if (this.flushing) await this.flushing;
    if (this.rows.length === 0) return;
    this.clearTimer();
    const rows = this.rows;
    const offsets = [...this.lastOffsets.values()];
    const firstOffsets = [...this.firstOffsets.values()];
    this.rows = [];
    this.lastOffsets.clear();
    this.firstOffsets.clear();
    this.flushing = this.onFlush(rows, offsets)
      .catch(async (error: Error) => {
        this.discard();
        await this.onError(error, firstOffsets);
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
    } catch {
      return;
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
