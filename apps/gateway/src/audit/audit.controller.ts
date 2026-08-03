import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@fleet/database';
import { Roles } from '../common/decorators';
import { paginationOf } from '../common/tenant';
import { AuditService } from './audit.service';

@ApiTags('Superadmin')
@ApiBearerAuth()
@Roles(Role.SUPERADMIN)
@Controller('api/admin/audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Cross-tenant audit log with filters' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'resource', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  search(
    @Query('organizationId') organizationId?: string,
    @Query('userId') userId?: string,
    @Query('resource') resource?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.audit.search({ organizationId, userId, resource, from, to, ...paginationOf(page, pageSize) });
  }
}
