import { Provider } from '@nestjs/common';
import { loadEnv, PlatformEnv } from '@fleet/common';

export const ENV = Symbol('ENV');

export const envProvider: Provider<PlatformEnv> = {
  provide: ENV,
  useFactory: () => loadEnv('analytics'),
};
