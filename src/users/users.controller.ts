import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from './enums/user-role.enum';
import { JwtValidatedUser } from '../auth/strategies/jwt.strategy';
import { UsersService, CreateUserDto, UpdateUserDto } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /** GET /api/users – Liste des utilisateurs du tenant */
  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async findAll(@CurrentUser() user: JwtValidatedUser) {
    const users = await this.usersService.findByTenant(user.tenantId);
    return users.map((u) => u.toPublic());
  }

  /** GET /api/users/:id – Détail d'un utilisateur */
  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: JwtValidatedUser,
  ) {
    const u = await this.usersService.findById(id);
    // Vérification cross-tenant
    if (u.tenantId !== user.tenantId && user.role !== UserRole.OWNER) {
      throw new (await import('@nestjs/common')).NotFoundException(`Utilisateur ${id} introuvable`);
    }
    return u.toPublic();
  }

  /** POST /api/users – Créer un utilisateur dans le tenant */
  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: JwtValidatedUser,
  ) {
    // Forcer le tenantId à celui du créateur
    dto.tenantId = user.tenantId;

    // Seul OWNER peut créer des ADMIN
    if (dto.role === UserRole.ADMIN && user.role !== UserRole.OWNER) {
      dto.role = UserRole.EDITOR;
    }

    // OWNER et ADMIN ne peuvent pas créer un autre OWNER
    if (dto.role === UserRole.OWNER) {
      dto.role = UserRole.ADMIN;
    }

    const newUser = await this.usersService.create(dto);
    return newUser.toPublic();
  }

  /** PATCH /api/users/:id – Modifier un utilisateur */
  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtValidatedUser,
  ) {
    // On ne peut pas se modifier soi-même via cette route
    if (id === user.userId) {
      throw new (await import('@nestjs/common')).ForbiddenException(
        'Utilisez le profil pour vous modifier',
      );
    }

    const target = await this.usersService.findById(id);
    if (target.tenantId !== user.tenantId) {
      throw new (await import('@nestjs/common')).NotFoundException(`Utilisateur ${id} introuvable`);
    }

    // Seul OWNER peut promouvoir ADMIN
    if (dto.role === UserRole.ADMIN && user.role !== UserRole.OWNER) {
      throw new (await import('@nestjs/common')).ForbiddenException(
        'Seul le propriétaire peut attribuer le rôle ADMIN',
      );
    }

    // Personne ne peut créer un OWNER
    if (dto.role === UserRole.OWNER) {
      throw new (await import('@nestjs/common')).ForbiddenException(
        'Impossible de créer un propriétaire',
      );
    }

    const updated = await this.usersService.update(id, dto);
    return updated.toPublic();
  }

  /** DELETE /api/users/:id – Supprimer un utilisateur */
  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: JwtValidatedUser,
  ) {
    if (id === user.userId) {
      throw new (await import('@nestjs/common')).ForbiddenException(
        'Vous ne pouvez pas vous supprimer vous-même',
      );
    }

    const target = await this.usersService.findById(id);
    if (target.tenantId !== user.tenantId) {
      throw new (await import('@nestjs/common')).NotFoundException(`Utilisateur ${id} introuvable`);
    }

    await this.usersService.delete(id);
  }
}
