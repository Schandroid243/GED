"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentStatus = void 0;
var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["UPLOADING"] = "UPLOADING";
    DocumentStatus["RECEIVED"] = "RECEIVED";
    DocumentStatus["SCANNING"] = "SCANNING";
    DocumentStatus["SCAN_FAILED"] = "SCAN_FAILED";
    DocumentStatus["OCR_IN_PROGRESS"] = "OCR_IN_PROGRESS";
    DocumentStatus["OCR_COMPLETED"] = "OCR_COMPLETED";
    DocumentStatus["OCR_PARTIAL"] = "OCR_PARTIAL";
    DocumentStatus["CLASSIFIED"] = "CLASSIFIED";
    DocumentStatus["INDEXED"] = "INDEXED";
    DocumentStatus["ARCHIVED"] = "ARCHIVED";
    DocumentStatus["DOCUMENT_ERROR"] = "DOCUMENT_ERROR";
})(DocumentStatus || (exports.DocumentStatus = DocumentStatus = {}));
//# sourceMappingURL=document-status.enum.js.map