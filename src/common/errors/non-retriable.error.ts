export class NonRetriableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetriableError';
    // Indispensable pour que instanceof fonctionne après transpilation TS
    Object.setPrototypeOf(this, NonRetriableError.prototype);
  }
}
