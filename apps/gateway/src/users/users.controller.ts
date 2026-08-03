import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@fleet/database';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { paginationOf } from '../common/tenant';
import { UsersService, publicUser } from './users.service';
import { CreateUserDto, CredentialsDto, UpdateUserDto } from './users.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Roles(Role.SUPERADMIN, Role.FLEET_MANAGER)
@Controller('api/admin/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (superadmin: any tenant, fleet manager: own tenant)' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  list(
    @CurrentUser() actor: AuthUser,
    @Query('organizationId') organizationId?: string,
    @Query('role') role?: Role,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const { page: p, pageSize: size } = paginationOf(page, pageSize);
    return this.users.list(actor, organizationId ?? null, role, search, p, size);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lookup a user by id' })
  async get(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return publicUser(await this.users.get(actor, id));
  }

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(actor, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user profile' })
  update(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(actor, id, dto);
  }

  @Put(':id/credentials')
  @ApiOperation({ summary: 'Set login and/or password of a user by id' })
  setCredentials(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CredentialsDto) {
    return this.users.setCredentials(actor, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a user' })
  remove(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.remove(actor, id);
  }

  @Get(':id/login-history')
  @ApiOperation({ summary: 'Login history of a user' })
  loginHistory(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const { page: p, pageSize: size } = paginationOf(page, pageSize);
    return this.users.loginHistory(actor, id, p, size);
  }

  @Get(':id/sessions')
  @ApiOperation({ summary: 'Active sessions of a user' })
  sessions(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.activeSessions(actor, id);
  }

  @Delete(':id/sessions')
  @HttpCode(204)
  @ApiOperation({ summary: 'Terminate all sessions of a user' })
  terminate(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.terminateSessions(actor, id);
  }
}
