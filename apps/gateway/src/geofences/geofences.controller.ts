import { Body, Controller, Delete, Get, HttpCode, Inject, OnModuleInit, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { Role } from '@fleet/database';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/auth-user';
import { resolveOrganizationId } from '../common/tenant';
import { call } from '../grpc/call';
import { GEOFENCE_GRPC } from '../grpc/grpc-clients.module';
import { GeofenceDto } from './geofences.dto';

interface GeofenceGrpc {
  create(input: Record<string, unknown>): Observable<Record<string, unknown>>;
  update(request: { id: string; input: Record<string, unknown> }): Observable<Record<string, unknown>>;
  get(request: { id: string; organizationId: string }): Observable<Record<string, unknown>>;
  list(request: { organizationId: string; onlyActive: boolean }): Observable<{ items: Record<string, unknown>[] }>;
  delete(request: { id: string; organizationId: string }): Observable<{ deleted: boolean }>;
  vehicleState(request: { organizationId: string; vehicleId: string }): Observable<Record<string, unknown>>;
}

const present = (geofence: Record<string, unknown>) => ({ ...geofence, polygon: JSON.parse(geofence.polygonGeojson as string), polygonGeojson: undefined });

const toInput = (dto: GeofenceDto, organizationId: string) => ({
  organizationId,
  name: dto.name,
  description: dto.description ?? '',
  polygonGeojson: JSON.stringify(dto.polygon),
  speedLimitKmh: dto.speedLimitKmh ?? 0,
  allowedFrom: dto.allowedFrom ?? '',
  allowedTo: dto.allowedTo ?? '',
  alertOnEnter: dto.alertOnEnter,
  alertOnExit: dto.alertOnExit,
  color: dto.color ?? '',
  isActive: dto.isActive,
});

@ApiTags('Geofences')
@ApiBearerAuth()
@Controller('api/geofences')
export class GeofencesController implements OnModuleInit {
  private service: GeofenceGrpc;

  constructor(@Inject(GEOFENCE_GRPC) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.service = this.client.getService<GeofenceGrpc>('GeofenceService');
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.DISPATCHER, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'List geofences of the tenant' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'onlyActive', required: false })
  async list(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string, @Query('onlyActive') onlyActive?: string) {
    const response = await call(this.service.list({ organizationId: resolveOrganizationId(user, organizationId), onlyActive: onlyActive === 'true' }));
    return { items: (response.items ?? []).map(present) };
  }

  @Get('vehicle-state/:vehicleId')
  @Roles(Role.SUPERADMIN, Role.DISPATCHER, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Geofences a vehicle is currently inside' })
  @ApiQuery({ name: 'organizationId', required: false })
  vehicleState(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Query('organizationId') organizationId?: string) {
    return call(this.service.vehicleState({ organizationId: resolveOrganizationId(user, organizationId), vehicleId }));
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.DISPATCHER, Role.FLEET_MANAGER)
  @ApiOperation({ summary: 'Geofence details' })
  @ApiQuery({ name: 'organizationId', required: false })
  async get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('organizationId') organizationId?: string) {
    return present(await call(this.service.get({ id, organizationId: resolveOrganizationId(user, organizationId) })));
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Create a polygonal geofence with speed limit and allowed hours' })
  @ApiQuery({ name: 'organizationId', required: false })
  async create(@CurrentUser() user: AuthUser, @Body() dto: GeofenceDto, @Query('organizationId') organizationId?: string) {
    return present(await call(this.service.create(toInput(dto, resolveOrganizationId(user, organizationId)))));
  }

  @Put(':id')
  @Roles(Role.SUPERADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Update a geofence' })
  @ApiQuery({ name: 'organizationId', required: false })
  async update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: GeofenceDto, @Query('organizationId') organizationId?: string) {
    return present(await call(this.service.update({ id, input: toInput(dto, resolveOrganizationId(user, organizationId)) })));
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.SUPERADMIN, Role.DISPATCHER)
  @ApiOperation({ summary: 'Delete a geofence' })
  @ApiQuery({ name: 'organizationId', required: false })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('organizationId') organizationId?: string): Promise<void> {
    await call(this.service.delete({ id, organizationId: resolveOrganizationId(user, organizationId) }));
  }
}
