import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RefreshDto, TokenPairDto } from './auth.dto';
import { CurrentUser, Public, ReqMeta, SkipAudit } from '../common/decorators';
import { AuthUser, RequestMeta } from '../common/auth-user';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @SkipAudit()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with login and password, returns access and refresh tokens' })
  @ApiOkResponse({ type: TokenPairDto })
  login(@Body() dto: LoginDto, @ReqMeta() meta: RequestMeta): Promise<TokenPairDto> {
    return this.auth.login(dto.login, dto.password, dto.client ?? 'web', meta);
  }

  @Public()
  @SkipAudit()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  @ApiOkResponse({ type: TokenPairDto })
  refresh(@Body() dto: RefreshDto, @ReqMeta() meta: RequestMeta): Promise<TokenPairDto> {
    return this.auth.refresh(dto.refreshToken, meta);
  }

  @ApiBearerAuth()
  @SkipAudit()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Terminate the current session' })
  async logout(@CurrentUser() user: AuthUser): Promise<void> {
    await this.auth.logout(user.sessionId);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Current user profile' })
  async me(@CurrentUser() user: AuthUser) {
    const profile = await this.auth.profile(user.sub);
    return {
      id: user.sub,
      login: user.login,
      role: user.role,
      organizationId: user.organizationId,
      fullName: profile?.fullName ?? user.fullName,
      locale: profile?.locale ?? user.locale,
      phone: profile?.phone ?? null,
      email: profile?.email ?? null,
      mustChangePassword: profile?.mustChangePassword ?? false,
      sessionId: user.sessionId,
    };
  }

  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Change own password, terminates other sessions' })
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto): Promise<void> {
    await this.auth.changePassword(user.sub, dto.currentPassword, dto.newPassword, user.sessionId);
  }
}
