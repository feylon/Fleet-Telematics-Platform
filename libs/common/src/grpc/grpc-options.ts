import { GrpcOptions, Transport } from '@nestjs/microservices';
import { GrpcPackageName, protoDirectory, protoPathFor } from './packages';

const loaderOptions = {
  keepCase: false,
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
  arrays: true,
  objects: true,
  includeDirs: [protoDirectory()],
};

export const grpcServerOptions = (pkg: GrpcPackageName, url: string): GrpcOptions => ({
  transport: Transport.GRPC,
  options: {
    package: [pkg, 'common.v1'],
    protoPath: [protoPathFor(pkg), protoPathFor('common.v1')],
    url,
    loader: loaderOptions,
    maxReceiveMessageLength: 32 * 1024 * 1024,
    maxSendMessageLength: 32 * 1024 * 1024,
  },
});

export const grpcClientOptions = (pkg: GrpcPackageName, url: string): GrpcOptions => ({
  transport: Transport.GRPC,
  options: {
    package: [pkg, 'common.v1'],
    protoPath: [protoPathFor(pkg), protoPathFor('common.v1')],
    url,
    loader: loaderOptions,
    channelOptions: {
      'grpc.keepalive_time_ms': 30000,
      'grpc.max_reconnect_backoff_ms': 5000,
    },
  },
});
