import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'superadmin01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  login: string;

  @ApiProperty({ example: 'superadmin01' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ enum: ['web', 'mobile', 'device'], default: 'web' })
  @IsOptional()
  @IsIn(['web', 'mobile', 'device'])
  client?: 'web' | 'mobile' | 'device';
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

export class TokenPairDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  tokenType: string;
}
