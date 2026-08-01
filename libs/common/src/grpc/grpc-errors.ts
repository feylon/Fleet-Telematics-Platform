import { HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

export const rpcNotFound = (message: string): RpcException => new RpcException({ code: GrpcStatus.NOT_FOUND, message });
export const rpcInvalid = (message: string): RpcException => new RpcException({ code: GrpcStatus.INVALID_ARGUMENT, message });
export const rpcConflict = (message: string): RpcException => new RpcException({ code: GrpcStatus.ALREADY_EXISTS, message });
export const rpcDenied = (message: string): RpcException => new RpcException({ code: GrpcStatus.PERMISSION_DENIED, message });
export const rpcFailed = (message: string): RpcException => new RpcException({ code: GrpcStatus.FAILED_PRECONDITION, message });

const grpcToHttp: Record<number, HttpStatus> = {
  [GrpcStatus.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [GrpcStatus.INVALID_ARGUMENT]: HttpStatus.BAD_REQUEST,
  [GrpcStatus.ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [GrpcStatus.PERMISSION_DENIED]: HttpStatus.FORBIDDEN,
  [GrpcStatus.UNAUTHENTICATED]: HttpStatus.UNAUTHORIZED,
  [GrpcStatus.FAILED_PRECONDITION]: HttpStatus.UNPROCESSABLE_ENTITY,
  [GrpcStatus.UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
  [GrpcStatus.DEADLINE_EXCEEDED]: HttpStatus.GATEWAY_TIMEOUT,
};

export const grpcErrorToHttp = (error: unknown): HttpException => {
  const err = error as { code?: number; details?: string; message?: string };
  const httpStatus = err.code !== undefined ? grpcToHttp[err.code] ?? HttpStatus.BAD_GATEWAY : HttpStatus.BAD_GATEWAY;
  const message = err.details ?? err.message ?? 'Upstream service error';
  return new HttpException({ statusCode: httpStatus, message, code: err.code }, httpStatus);
};
