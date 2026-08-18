import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Telegram chat id receiving this organization\'s urgent alerts' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  telegramChatId?: string;

  @ApiProperty({ example: 'uztrans' })
  @IsString()
  @Matches(/^[a-z0-9-]{2,80}$/)
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ enum: ['uz', 'ru'] })
  @IsOptional()
  @IsIn(['uz', 'ru'])
  defaultLocale?: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ enum: ['uz', 'ru'] })
  @IsOptional()
  @IsIn(['uz', 'ru'])
  defaultLocale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Telegram chat id receiving this organization\'s urgent alerts' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  telegramChatId?: string;
}
