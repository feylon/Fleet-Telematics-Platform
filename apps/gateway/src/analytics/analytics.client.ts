import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { ANALYTICS_GRPC } from '../grpc/grpc-clients.module';

type Doc = Record<string, unknown>;

export interface AnalyticsGrpc {
  summary(range: Doc): Observable<Doc>;
  vehicleSeries(request: Doc): Observable<{ points: Doc[] }>;
  track(request: Doc): Observable<{ points: Doc[] }>;
  driverScores(request: Doc): Observable<{ items: Doc[] }>;
  dailyRollups(range: Doc): Observable<{ items: Doc[] }>;
  runRollup(range: Doc): Observable<{ items: Doc[] }>;
  alerts(request: Doc): Observable<{ items: Doc[]; meta: Doc }>;
  alertStats(range: Doc): Observable<{ items: Doc[] }>;
  heatmap(request: Doc): Observable<{ cells: Doc[] }>;
  requestReport(request: Doc): Observable<Doc>;
  listReports(request: { organizationId: string }): Observable<{ items: Doc[] }>;
  getReportFile(request: { organizationId: string; jobId: string }): Observable<{ fileName: string; path: string; contentType: string; ready: boolean }>;
  ingest(request: Doc): Observable<Doc>;
}

@Injectable()
export class AnalyticsClient implements OnModuleInit {
  service: AnalyticsGrpc;

  constructor(@Inject(ANALYTICS_GRPC) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.service = this.client.getService<AnalyticsGrpc>('AnalyticsService');
  }
}
