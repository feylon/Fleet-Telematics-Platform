import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginHistory, UserSession } from '@fleet/database';
import { AuthModule } from '../auth/auth.module';
import { SessionsController } from './sessions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserSession, LoginHistory]), AuthModule],
  controllers: [SessionsController],
})
export class MobileModule {}
