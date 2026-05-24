import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { JwtValidatedUser } from '../auth/strategies/jwt.strategy';

import { DocumentsService } from './documents.service';
import { DocumentStatus } from './enums/document-status.enum';
import { DocumentType } from './enums/document-type.enum';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /** GET /api/documents – Liste paginée */
  @Get()
  async findAll(
    @CurrentUser() user: JwtValidatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: DocumentStatus,
    @Query('type') type?: DocumentType,
    @Query('search') search?: string,
    @Query('sort') sort = 'createdAt',
    @Query('order') order: 'ASC' | 'DESC' = 'DESC',
  ) {
    const tenantId = user.role === UserRole.VIEWER ? undefined : user.tenantId;

    return this.documentsService.findAll({
      page: +page,
      limit: Math.min(+limit, 100),
      status,
      type,
      search,
      tenantId,
      sort,
      order,
    });
  }

  /** GET /api/documents/:id – Détail d'un document */
  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: JwtValidatedUser,
  ) {
    const doc = await this.documentsService.findById(id);
    if (doc.tenantId !== user.tenantId && user.role !== UserRole.OWNER) {
      throw new NotFoundException(`Document ${id} introuvable`);
    }
    return doc;
  }

  /** POST /api/documents/upload – Upload d'un document */
  @Post('upload')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'tmp', 'uploads'),
        filename: (_req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'image/tiff',
          'image/png',
          'image/jpeg',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Type MIME non supporté : ${file.mimetype}`), false);
        }
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @CurrentUser() user: JwtValidatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('metadata') metadataStr?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Fichier requis');
    }

    let metadata: Record<string, string> | undefined;
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch {
        metadata = {};
      }
    }

    return this.documentsService.create(file, user.tenantId, user.userId, metadata);
  }

  /** DELETE /api/documents/:id – Supprimer un document */
  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: JwtValidatedUser,
  ) {
    const doc = await this.documentsService.findById(id);
    if (doc.tenantId !== user.tenantId) {
      throw new NotFoundException(`Document ${id} introuvable`);
    }
    await this.documentsService.delete(id);
  }

  /** GET /api/documents/:id/ocr – Texte OCR d'un document */
  @Get(':id/ocr')
  async findOcr(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: JwtValidatedUser,
  ) {
    const doc = await this.documentsService.findById(id);
    if (doc.tenantId !== user.tenantId && user.role !== UserRole.OWNER) {
      throw new NotFoundException(`Document ${id} introuvable`);
    }
    return this.documentsService.findOcrByDocumentId(id);
  }

  /** POST /api/documents/:id/metadata – Mise à jour métadonnées */
  @Post(':id/metadata')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.EDITOR)
  async updateMetadata(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() metadata: Record<string, string>,
    @CurrentUser() user: JwtValidatedUser,
  ) {
    const doc = await this.documentsService.findById(id);
    if (doc.tenantId !== user.tenantId) {
      throw new NotFoundException(`Document ${id} introuvable`);
    }
    return this.documentsService.updateMetadata(id, metadata);
  }
}
