import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSetting } from '@fleet/database';
import { UpdateBrandingDto } from './branding.dto';

const ALLOWED_LOGO_PREFIXES = ['data:image/png;base64,', 'data:image/svg+xml;base64,', 'data:image/jpeg;base64,', 'data:image/webp;base64,'];

@Injectable()
export class BrandingService {
  private cache: { value: PlatformSetting; at: number } | null = null;

  constructor(@InjectRepository(PlatformSetting) private readonly settings: Repository<PlatformSetting>) {}

  async get(): Promise<PlatformSetting> {
    if (this.cache && Date.now() - this.cache.at < 15000) return this.cache.value;
    const row = (await this.settings.findOne({ where: { id: 1 } })) ?? (await this.settings.save(this.settings.create({ id: 1, platformName: 'FleetView' })));
    this.cache = { value: row, at: Date.now() };
    return row;
  }

  async update(dto: UpdateBrandingDto): Promise<PlatformSetting> {
    if (dto.logoDataUrl && !ALLOWED_LOGO_PREFIXES.some((prefix) => dto.logoDataUrl?.startsWith(prefix))) {
      throw new BadRequestException('Logo must be a PNG, JPEG, WEBP or SVG data URL');
    }
    const current = await this.get();
    Object.assign(current, dto);
    const saved = await this.settings.save(current);
    this.cache = null;
    return saved;
  }
}
