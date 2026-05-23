import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { Tenant } from '../tenants/entities/tenant.entity';
import { TenantPlan } from '../tenants/enums/tenant-plan.enum';

import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,

    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Inscription ───────────────────────────────────────────
  async signUp(dto: SignUpDto): Promise<AuthResponseDto> {
    // 1. Vérifier que l'email n'existe pas déjà (global)
    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email déjà utilisé');
    }

    // 2. Créer le Tenant
    const slug = this.generateSlug(dto.tenantName);
    const tenant = this.tenantRepo.create({
      name: dto.tenantName,
      slug,
      plan: TenantPlan.FREE,
      isActive: true,
      maxUsers: 5,
    });
    await this.tenantRepo.save(tenant);

    // 3. Hasher le mot de passe
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // 4. Créer l'User (OWNER)
    const user = this.userRepo.create({
      tenantId: tenant.id,
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.OWNER,
      isActive: true,
      lastLoginAt: new Date(),
    });

    // 5. Générer les tokens
    const tokens = await this.generateTokens(user.id, user.email, tenant.id, user.role);

    // 6. Hasher et stocker le refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    user.refreshToken = hashedRefreshToken;

    await this.userRepo.save(user);

    this.logger.log(`Nouvel utilisateur inscrit : ${user.email} (tenant: ${tenant.slug})`);

    return this.buildAuthResponse(user, tenant, tokens);
  }

  // ── Connexion ─────────────────────────────────────────────
  async signIn(dto: SignInDto): Promise<AuthResponseDto> {
    // 1. Trouver l'user par email
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // 2. Vérifier le mot de passe
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: user.tenantId } });

    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Votre organisation est inactive.');
    }

    // 3. Générer les tokens
    const tokens = await this.generateTokens(user.id, user.email, tenant.id, user.role);

    // 4. Hasher et stocker le refresh token
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    user.refreshToken = hashedRefreshToken;
    user.lastLoginAt = new Date();

    await this.userRepo.save(user);

    this.logger.log(`Connexion : ${user.email}`);

    return this.buildAuthResponse(user, tenant, tokens);
  }

  // ── Rafraîchir les tokens ─────────────────────────────────
  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<AuthResponseDto> {
    // 1. Trouver l'user
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Accès refusé');
    }

    // 2. Vérifier le refresh token
    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      throw new ForbiddenException('Accès refusé');
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: user.tenantId } });

    if (!tenant || !tenant.isActive) {
      throw new ForbiddenException('Votre organisation est inactive.');
    }

    // 3. Rotation : générer nouveaux tokens
    const tokens = await this.generateTokens(user.id, user.email, tenant.id, user.role);

    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    user.refreshToken = hashedRefreshToken;

    await this.userRepo.save(user);

    return this.buildAuthResponse(user, tenant, tokens);
  }

  // ── Déconnexion ───────────────────────────────────────────
  async signOut(userId: string): Promise<void> {
    await this.userRepo.update(userId, { refreshToken: null as any });
    this.logger.log(`Déconnexion : userId ${userId}`);
  }

  // ── Validation utilisateur (utilisé par JwtStrategy) ──────
  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Utilisateur introuvable ou inactif.');
    }
    return user;
  }

  // ── Méthodes privées ──────────────────────────────────────

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async generateTokens(
    userId: string,
    email: string,
    tenantId: string,
    role: UserRole,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email, tenantId, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET')!,
      expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') ?? '8h') as never,
    });

    const refreshPayload = { sub: userId };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET')!,
      expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as never,
    });

    return { accessToken, refreshToken };
  }

  private buildAuthResponse(
    user: User,
    tenant: Tenant,
    tokens: { accessToken: string; refreshToken: string },
  ): AuthResponseDto {
    const response = new AuthResponseDto();
    response.accessToken = tokens.accessToken;
    response.refreshToken = tokens.refreshToken;
    response.expiresIn = 28800; // 8 heures en secondes

    response.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
    };

    response.tenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
    };

    return response;
  }
}
