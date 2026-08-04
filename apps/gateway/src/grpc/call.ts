import { Observable, firstValueFrom } from 'rxjs';
import { grpcErrorToHttp } from '@fleet/common';

export const call = async <T>(observable: Observable<T>): Promise<T> => {
  try {
    return await firstValueFrom(observable);
  } catch (error) {
    throw grpcErrorToHttp(error);
  }
};

export type Rpc<Req, Res> = (request: Req) => Observable<Res>;
