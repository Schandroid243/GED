import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest<TUser = any>(err: Error | null, user: TUser | false, info: any): TUser {
    if (err || !user) {
      const message =
        info?.name === 'TokenExpiredError'
          ? 'Votre session a expiré. Veuillez vous reconnecter.'
          : 'Authentification requise. Token invalide ou manquant.';

      this.logger.warn(`Échec d'authentification : ${info?.message || err?.message}`);
      throw new UnauthorizedException(message);
    }
    return user;
  }
}
