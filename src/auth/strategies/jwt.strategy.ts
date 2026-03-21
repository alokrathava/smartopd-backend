import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'smartopd-secret-key',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findUserByEmail(payload.email);
    if (!user || !user.isActive) throw new UnauthorizedException('User is inactive or not found');
    return payload;
  }
}
