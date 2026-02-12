export class AnyError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}
