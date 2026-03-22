import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInviteDto {
  @ApiProperty({ description: 'Invite token from the invite email/SMS' })
  @IsNotEmpty() @IsString() inviteToken: string;

  @ApiProperty({ description: 'New password (min 8 chars)', example: 'MyPass@123' })
  @IsNotEmpty() @IsString() @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/, {
    message: 'Password must have uppercase, lowercase, digit, and special character',
  })
  password: string;
}
