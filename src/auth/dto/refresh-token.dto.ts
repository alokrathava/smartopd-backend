import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description:
      'Opaque refresh token received during login or previous refresh',
  })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
