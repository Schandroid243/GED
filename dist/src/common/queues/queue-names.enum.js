"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueName = void 0;
var QueueName;
(function (QueueName) {
    QueueName["DOCUMENT_INGESTION"] = "document-ingestion";
    QueueName["OCR_EXTRACTION"] = "ocr-extraction";
    QueueName["CLASSIFICATION"] = "classification";
    QueueName["INDEXING"] = "indexing";
    QueueName["WORKFLOW_ENGINE"] = "workflow-engine";
    QueueName["NOTIFICATION"] = "notification";
    QueueName["ARCHIVE"] = "archive";
    QueueName["DEAD_LETTER"] = "dead-letter";
})(QueueName || (exports.QueueName = QueueName = {}));
//# sourceMappingURL=queue-names.enum.js.map