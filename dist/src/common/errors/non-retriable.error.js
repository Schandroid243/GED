"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NonRetriableError = void 0;
class NonRetriableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NonRetriableError';
        Object.setPrototypeOf(this, NonRetriableError.prototype);
    }
}
exports.NonRetriableError = NonRetriableError;
//# sourceMappingURL=non-retriable.error.js.map