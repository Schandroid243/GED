"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
const non_retriable_error_1 = require("../../common/errors/non-retriable.error");
const TEMPLATE_CATALOG = {
    document_classified: {
        subject: 'Document classifié',
        body: 'Le document {{documentId}} a été classifié avec le statut {{newStatus}}.',
    },
    document_archived: {
        subject: 'Document archivé',
        body: 'Le document {{documentId}} a été archivé.',
    },
    document_error: {
        subject: 'Erreur document',
        body: 'Une erreur est survenue sur le document {{documentId}} : {{errorMessage}}.',
    },
    approval_required: {
        subject: 'Approbation requise',
        body: 'Le document {{documentId}} nécessite votre approbation.',
    },
};
let NotificationService = NotificationService_1 = class NotificationService {
    config;
    logger = new common_1.Logger(NotificationService_1.name);
    emailTransporter = null;
    emailInitialized = false;
    constructor(config) {
        this.config = config;
    }
    async send(data, onProgress) {
        const { templateName, data: templateVars, channels, correlationId } = data;
        onProgress(10);
        const template = this.resolveTemplate(templateName);
        if (!template) {
            throw new non_retriable_error_1.NonRetriableError(`Template introuvable : ${templateName}`);
        }
        onProgress(30);
        const subject = this.interpolate(template.subject, templateVars);
        const body = this.interpolate(template.body, templateVars);
        onProgress(50);
        let successCount = 0;
        const channelErrors = [];
        for (const channel of channels) {
            try {
                switch (channel) {
                    case 'email':
                        await this.sendEmail(data, subject, body);
                        break;
                    case 'inapp':
                        await this.sendInApp(data, subject, body);
                        break;
                    case 'webhook':
                        await this.sendWebhook(data, subject, body);
                        break;
                    default:
                        this.logger.warn(`[${correlationId}] Canal inconnu : ${channel}`);
                        continue;
                }
                successCount++;
                this.logger.debug(`[${correlationId}] Notification envoyée via ${channel}`);
            }
            catch (err) {
                if (err instanceof Error) {
                    const errorMsg = `Échec ${channel} : ${err.message}`;
                    channelErrors.push(errorMsg);
                    this.logger.warn(`[${correlationId}] ${errorMsg}`);
                }
            }
        }
        onProgress(80);
        const logEntry = {
            templateName,
            channels,
            successCount,
            totalChannels: channels.length,
            errors: channelErrors.length > 0 ? channelErrors : undefined,
            correlationId,
        };
        this.logger.log(`[${correlationId}] Notification : ${successCount}/${channels.length} canaux réussis`);
        if (successCount === 0 && channels.length > 0) {
            throw new Error(`Échec de tous les canaux de notification : ${channelErrors.join('; ')}`);
        }
        onProgress(100);
    }
    resolveTemplate(templateName) {
        if (TEMPLATE_CATALOG[templateName]) {
            return TEMPLATE_CATALOG[templateName];
        }
        this.logger.warn(`Template "${templateName}" non trouvé dans le catalogue`);
        return null;
    }
    interpolate(text, vars) {
        return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
            const value = vars[key];
            return value !== undefined ? String(value) : `{{${key}}}`;
        });
    }
    async sendEmail(data, subject, body) {
        if (!this.emailInitialized) {
            this.initEmailTransporter();
        }
        if (!this.emailTransporter) {
            throw new Error('Transporteur SMTP non configuré');
        }
        const { tenantId, userIds } = data;
        const to = userIds.length > 0
            ? `${userIds[0]}@${tenantId}.ged.internal`
            : 'noreply@ged.internal';
        await this.emailTransporter.sendMail({
            from: '"GED Notification" <noreply@ged.internal>',
            to,
            subject,
            html: body.replace(/\n/g, '<br/>'),
        });
    }
    initEmailTransporter() {
        this.emailInitialized = true;
        const host = this.config.get('SMTP_HOST');
        const port = this.config.get('SMTP_PORT');
        const user = this.config.get('SMTP_USER');
        const pass = this.config.get('SMTP_PASS');
        if (!host || !port) {
            this.logger.warn('SMTP non configuré — les notifications email seront ignorées');
            this.emailTransporter = null;
            return;
        }
        this.emailTransporter = nodemailer.createTransport({
            host,
            port: port || 587,
            secure: port === 465,
            auth: user && pass ? { user, pass } : undefined,
        });
        this.logger.log(`Transporteur SMTP initialisé : ${host}:${port}`);
    }
    async sendInApp(data, subject, body) {
        const { tenantId, userIds, correlationId } = data;
        for (const userId of userIds) {
            this.logger.debug(`[${correlationId}] Notification in-app pour ${userId} : ${subject}`);
        }
    }
    async sendWebhook(data, subject, body) {
        const { correlationId } = data;
        this.logger.debug(`[${correlationId}] Webhook non implémenté : ${subject}`);
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map