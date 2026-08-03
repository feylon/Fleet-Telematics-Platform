import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { hashPassword } from '@fleet/common';
import { LoginHistory, Role, User, UserSession } from '@fleet/database';
import { AuthUser } from '../common/auth-user';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto, CredentialsDto, UpdateUserDto } from './users.dto';

const MANAGEABLE_BY: Record<Role, Role[]> = {
  [Role.SUPERADMIN]: [Role.SUPERADMIN, Role.DISPATCHER, Role.FLEET_MANAGER, Role.DRIVER],
  [Role.FLEET_MANAGER]: [Role.DISPATCHER, Role.DRIVER],
  [Role.DISPATCHER]: [],
  [Role.DRIVER]: [],
};

export const canManageRole = (actor: Role, target: Role): boolean => MANAGEABLE_BY[actor].includes(target);

export const publicUser = (user: User) => ({
  id: user.id,
  organizationId: user.organizationId,
  login: user.login,
  role: user.role,
  fullName: user.fullName,
  phone: user.phone,
  email: user.email,
  locale: user.locale,
  isActive: user.isActive,
  mustChangePassword: user.mustChangePassword,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserSession) private readonly sessions: Repository<UserSession>,
    @InjectRepository(LoginHistory) private readonly history: Repository<LoginHistory>,
    private readonly auth: AuthService,
  ) {}

  async list(actor: AuthUser, organizationId: string | null, role?: Role, search?: string, page = 1, pageSize = 25) {
    const base: FindOptionsWhere<User> = {};
    if (actor.role !== Role.SUPERADMIN) base.organizationId = actor.organizationId ?? undefined;
    else if (organizationId) base.organizationId = organizationId;
    if (role) base.role = role;
    const where = search ? [{ ...base, login: ILike(`%${search}%`) }, { ...base, fullName: ILike(`%${search}%`) }] : base;
    const [items, total] = await this.users.findAndCount({ where, order: { createdAt: 'DESC' }, skip: (page - 1) * pageSize, take: pageSize });
    return { items: items.map(publicUser), meta: { page, pageSize, total } };
  }

  async get(actor: AuthUser, id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (actor.role !== Role.SUPERADMIN && user.organizationId !== actor.organizationId) throw new NotFoundException('User not found');
    return user;
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    if (!canManageRole(actor.role, dto.role)) throw new ForbiddenException('Not allowed to create this role');
    const organizationId = dto.role === Role.SUPERADMIN ? null : actor.role === Role.SUPERADMIN ? dto.organizationId ?? null : actor.organizationId;
    if (dto.role !== Role.SUPERADMIN && !organizationId) throw new ForbiddenException('organizationId is required');
    const exists = await this.users.findOne({ where: { login: dto.login } });
    if (exists) throw new ConflictException('Login already taken');
    const user = await this.users.save(
      this.users.create({
        organizationId,
        login: dto.login,
        passwordHash: await hashPassword(dto.password),
        role: dto.role,
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        locale: dto.locale ?? 'uz',
        isActive: true,
        mustChangePassword: dto.role === Role.DRIVER,
      }),
    );
    return publicUser(user);
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const user = await this.get(actor, id);
    if (!canManageRole(actor.role, user.role)) throw new ForbiddenException('Not allowed to manage this user');
    if (dto.role && !canManageRole(actor.role, dto.role)) throw new ForbiddenException('Not allowed to assign this role');
    Object.assign(user, dto);
    const saved = await this.users.save(user);
    if (dto.isActive === false) await this.revokeAll(user.id);
    return publicUser(saved);
  }

  async setCredentials(actor: AuthUser, id: string, dto: CredentialsDto) {
    const user = await this.get(actor, id);
    if (!canManageRole(actor.role, user.role)) throw new ForbiddenException('Not allowed to manage this user');
    if (dto.login && dto.login !== user.login) {
      const exists = await this.users.findOne({ where: { login: dto.login } });
      if (exists) throw new ConflictException('Login already taken');
      user.login = dto.login;
    }
    if (dto.password) {
      user.passwordHash = await hashPassword(dto.password);
      user.mustChangePassword = true;
    }
    const saved = await this.users.save(user);
    await this.revokeAll(user.id);
    return publicUser(saved);
  }

  async remove(actor: AuthUser, id: string): Promise<void> {
    const user = await this.get(actor, id);
    if (!canManageRole(actor.role, user.role)) throw new ForbiddenException('Not allowed to manage this user');
    if (user.id === actor.sub) throw new ForbiddenException('Cannot delete yourself');
    await this.users.delete(user.id);
  }

  async loginHistory(actor: AuthUser, id: string, page: number, pageSize: number) {
    const user = await this.get(actor, id);
    const [items, total] = await this.history.findAndCount({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, meta: { page, pageSize, total } };
  }

  async activeSessions(actor: AuthUser, id: string) {
    const user = await this.get(actor, id);
    const rows = await this.sessions.find({ where: { userId: user.id }, order: { createdAt: 'DESC' } });
    return rows.filter((row) => !row.revokedAt && row.expiresAt.getTime() > Date.now());
  }

  async terminateSessions(actor: AuthUser, id: string): Promise<void> {
    const user = await this.get(actor, id);
    if (!canManageRole(actor.role, user.role)) throw new ForbiddenException('Not allowed to manage this user');
    await this.revokeAll(user.id);
  }

  private async revokeAll(userId: string): Promise<void> {
    const rows = await this.sessions.find({ where: { userId } });
    for (const row of rows) {
      if (!row.revokedAt) await this.auth.revokeSession(row.id);
    }
  }
}
