import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface RefreshPayload {
  sub: string;      // userId
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET')!,
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    payload: RefreshPayload,
  ): Promise<{ userId: string; refreshToken: string }> {
    if (!payload.sub) {
      throw new UnauthorizedException('Payload refresh token invalide.');
    }

    const refreshToken = request.body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token manquant dans le corps de la requête.');
    }

    return {
      userId: payload.sub,
      refreshToken,
    };
  }
}

