import { BatchBuffer, OffsetMarker } from './batch-buffer';

const marker = (offset: number, partition = 0): OffsetMarker => ({ topic: 'telemetry.raw', partition, offset: String(offset) });

describe('BatchBuffer', () => {
  it('flushes when the size threshold is reached and reports the last offset per partition', async () => {
    const flushed: Array<{ rows: number[]; offsets: OffsetMarker[] }> = [];
    const buffer = new BatchBuffer<number>(3, 10000, async (rows, offsets) => {
      flushed.push({ rows, offsets });
    });
    buffer.push(1, marker(10));
    buffer.push(2, marker(11));
    expect(buffer.shouldFlush()).toBe(false);
    buffer.push(3, marker(5, 1));
    expect(buffer.shouldFlush()).toBe(true);
    await buffer.flush();
    expect(flushed).toHaveLength(1);
    expect(flushed[0].rows).toEqual([1, 2, 3]);
    expect(flushed[0].offsets).toEqual([marker(11), marker(5, 1)]);
    expect(buffer.size).toBe(0);
    await buffer.drain();
  });

  it('flushes after the time window elapses', async () => {
    const flushed: number[][] = [];
    const buffer = new BatchBuffer<number>(1000, 30, async (rows) => {
      flushed.push(rows);
    });
    buffer.push(1, marker(1));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(flushed).toEqual([[1]]);
    await buffer.drain();
  });

  it('keeps rows and rethrows when the flush handler fails so offsets are not committed', async () => {
    let attempts = 0;
    const buffer = new BatchBuffer<number>(2, 10000, async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('clickhouse unavailable');
    });
    buffer.push(1, marker(1));
    buffer.push(2, marker(2));
    await expect(buffer.flush()).rejects.toThrow('clickhouse unavailable');
    expect(buffer.size).toBe(2);
    await buffer.flush();
    expect(attempts).toBe(2);
    expect(buffer.size).toBe(0);
  });

  it('surfaces a timer flush failure on the next explicit flush', async () => {
    let attempts = 0;
    const buffer = new BatchBuffer<number>(1000, 20, async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('timer failure');
    });
    buffer.push(1, marker(1));
    await new Promise((resolve) => setTimeout(resolve, 60));
    await expect(buffer.flush()).rejects.toThrow('timer failure');
    await buffer.flush();
    expect(buffer.size).toBe(0);
    await buffer.drain();
  });
});
