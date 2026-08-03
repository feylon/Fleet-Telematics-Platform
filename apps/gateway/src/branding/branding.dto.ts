import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBrandingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  platformName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Logo as data URL (image/png or image/svg+xml), max 300 KB' })
  @IsOptional()
  @IsString()
  @MaxLength(400000)
  logoDataUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  supportEmail?: string;
}
