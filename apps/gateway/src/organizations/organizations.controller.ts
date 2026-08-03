import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Organization, Role, User, Vehicle, Driver } from '@fleet/database';
import { Roles } from '../common/decorators';
import { paginationOf } from '../common/tenant';
import { CreateOrganizationDto, UpdateOrganizationDto } from './organizations.dto';

@ApiTags('Superadmin')
@ApiBearerAuth()
@Roles(Role.SUPERADMIN)
@Controller('api/admin/organizations')
export class OrganizationsController {
  constructor(
    @InjectRepository(Organization) private readonly organizations: Repository<Organization>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List tenant organizations' })
  async list(@Query('search') search?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const { page: p, pageSize: size } = paginationOf(page, pageSize);
    const [items, total] = await this.organizations.findAndCount({
      where: search ? [{ name: ILike(`%${search}%`) }, { slug: ILike(`%${search}%`) }] : undefined,
      order: { createdAt: 'DESC' },
      skip: (p - 1) * size,
      take: size,
    });
    const enriched = await Promise.all(
      items.map(async (org) => ({
        ...org,
        usersCount: await this.users.count({ where: { organizationId: org.id } }),
        vehiclesCount: await this.vehicles.count({ where: { organizationId: org.id } }),
        driversCount: await this.drivers.count({ where: { organizationId: org.id } }),
      })),
    );
    return { items: enriched, meta: { page: p, pageSize: size, total } };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by id' })
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const org = await this.organizations.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  @Post()
  @ApiOperation({ summary: 'Create organization' })
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizations.save(this.organizations.create({ ...dto, defaultLocale: dto.defaultLocale ?? 'uz' }));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update organization' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrganizationDto) {
    const org = await this.get(id);
    Object.assign(org, dto);
    return this.organizations.save(org);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete organization and all tenant data' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.get(id);
    await this.organizations.delete(id);
  }
}
