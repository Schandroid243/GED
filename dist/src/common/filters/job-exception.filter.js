"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleJobError = handleJobError;
exports.isNonRetriable = isNonRetriable;
const non_retriable_error_1 = require("../errors/non-retriable.error");
function handleJobError(error, logger, correlationId) {
    if (error instanceof non_retriable_error_1.NonRetriableError) {
        logger.error(`[${correlationId}] Erreur non-retriable détectée : ${error.message}`);
        throw error;
    }
    if (error instanceof Error) {
        logger.warn(`[${correlationId}] Erreur transitoire, retry planifié : ${error.message}`);
        throw error;
    }
    logger.error(`[${correlationId}] Erreur inconnue (non-Error) : ${String(error)}`);
    throw new Error(String(error));
}
function isNonRetriable(error) {
    return error instanceof non_retriable_error_1.NonRetriableError;
}
//# sourceMappingURL=job-exception.filter.js.map