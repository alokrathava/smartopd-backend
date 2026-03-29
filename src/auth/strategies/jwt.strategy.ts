import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'smartopd-secret-key'),
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload) {
    // Check JWT blacklist (token was explicitly revoked via logout)
    if (payload.jti) {
      const blacklisted = await this.redisService.isTokenBlacklisted(payload.jti);
      if (blacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    // Verify user still exists and is active
    const user = await this.usersService.findUserByIdOnly(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is inactive or not found');
    }

    return payload;
  }
}
