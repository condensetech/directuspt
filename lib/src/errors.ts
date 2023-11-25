export class CommandSectionError extends Error {
  constructor(message: string, readonly baseError?: Error) {
    super(message);
    this.name = 'CommandSectionError';
  }
}
