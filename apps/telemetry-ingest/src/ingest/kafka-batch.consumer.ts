import { Logger } from '@nestjs/common';
import { Consumer, EachBatchPayload, Kafka } from 'kafkajs';
import { BatchBuffer, OffsetMarker } from './batch-buffer';

export interface BatchConsumerOptions<T> {
  kafka: Kafka;
  groupId: string;
  topic: string;
  maxSize: number;
  maxMs: number;
  parse: (value: string) => T | null;
  write: (rows: T[]) => Promise<void>;
  logger: Logger;
}

export class KafkaBatchConsumer<T> {
  private readonly consumer: Consumer;
  private readonly buffer: BatchBuffer<T>;
  private written = 0;

  constructor(private readonly options: BatchConsumerOptions<T>) {
    this.consumer = options.kafka.consumer({ groupId: options.groupId, sessionTimeout: 45000, heartbeatInterval: 5000, allowAutoTopicCreation: false, maxBytesPerPartition: 2 * 1024 * 1024 });
    this.buffer = new BatchBuffer<T>(options.maxSize, options.maxMs, (rows, offsets) => this.flush(rows, offsets), (error, firstOffsets) => this.rewind(error, firstOffsets));
  }

  get totalWritten(): number {
    return this.written;
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.options.topic, fromBeginning: true });
    await this.consumer.run({
      autoCommit: false,
      eachBatchAutoResolve: false,
      partitionsConsumedConcurrently: 1,
      eachBatch: (payload) => this.onBatch(payload),
    });
    this.options.logger.log(`consuming ${this.options.topic} as ${this.options.groupId}`);
  }

  async stop(): Promise<void> {
    try {
      await this.buffer.drain();
    } finally {
      await this.consumer.disconnect();
    }
  }

  private async onBatch({ batch, heartbeat, isRunning, isStale, resolveOffset }: EachBatchPayload): Promise<void> {
    for (const message of batch.messages) {
      if (!isRunning() || isStale()) break;
      if (message.value) {
        const parsed = this.options.parse(message.value.toString());
        if (parsed) this.buffer.push(parsed, { topic: batch.topic, partition: batch.partition, offset: message.offset });
      }
      resolveOffset(message.offset);
      if (this.buffer.shouldFlush()) {
        await this.flushOrPause(heartbeat);
      }
    }
    await heartbeat();
  }

  private async flushOrPause(heartbeat: () => Promise<void>): Promise<void> {
    try {
      await this.buffer.flush();
    } catch (error) {
      this.options.logger.warn(`flush failed, rewound to last committed offsets: ${(error as Error).message}`);
      await new Promise((resolve) => setTimeout(resolve, this.options.maxMs));
    }
    await heartbeat();
  }

  private rewind(error: Error, firstOffsets: OffsetMarker[]): void {
    this.options.logger.warn(`${this.options.topic}: insert failed (${error.message}); seeking ${firstOffsets.length} partition(s) back to the first unwritten offset`);
    for (const marker of firstOffsets) {
      this.consumer.seek({ topic: marker.topic, partition: marker.partition, offset: marker.offset });
    }
  }

  private async flush(rows: T[], offsets: OffsetMarker[]): Promise<void> {
    await this.options.write(rows);
    await this.consumer.commitOffsets(offsets.map((marker) => ({ topic: marker.topic, partition: marker.partition, offset: String(Number(marker.offset) + 1) })));
    this.written += rows.length;
  }
}
