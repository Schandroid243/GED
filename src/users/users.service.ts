import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** Crée un nouvel utilisateur */
  async create(dto: CreateUserDto): Promise<User> {
    // Vérifier unicité email
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`L'email ${dto.email} est déjà utilisé`);
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Créer l'utilisateur via new User() pour éviter DeepPartial strict avec exactOptionalPropertyTypes
    const user = new User();
    user.id = uuidv4();
    user.tenantId = dto.tenantId;
    user.email = dto.email;
    user.passwordHash = passwordHash;
    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    user.role = dto.role ?? UserRole.VIEWER;
    user.isActive = true;
    const saved = await this.userRepo.save(user);
    this.logger.log(`Utilisateur créé : ${saved.id} (${saved.email})`);
    return saved;
  }

  /** Récupère tous les utilisateurs d'un tenant */
  async findByTenant(tenantId: string): Promise<User[]> {
    return this.userRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Récupère un utilisateur par son ID */
  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Utilisateur ${id} introuvable`);
    }
    return user;
  }

  /** Récupère un utilisateur par son email */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  /** Met à jour un utilisateur */
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    return this.userRepo.save(user);
  }

  /** Supprime un utilisateur */
  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepo.remove(user);
    this.logger.log(`Utilisateur ${id} supprimé`);
  }

  /** Vérifie un mot de passe */
  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /** Met à jour la date de dernière connexion */
  async updateLastLogin(id: string): Promise<void> {
    await this.userRepo.update(id, { lastLoginAt: new Date() });
  }

  /** Met à jour le refresh token */
  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    // TypeORM update() accepte les valeurs null pour les colonnes nullable
    await this.userRepo.update(
      id,
      { refreshToken } as unknown as Partial<User>,
    );
  }

  /** Compte le nombre d'utilisateurs d'un tenant */
  async countByTenant(tenantId: string): Promise<number> {
    return this.userRepo.count({ where: { tenantId } });
  }
}

