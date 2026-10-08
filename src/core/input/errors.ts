export type InputErrorCode =
  | 'NOT_FOUND'
  | 'UNSUPPORTED_INPUT'
  | 'INVALID_ZIP'
  | 'NO_INDEX_HTML'
  | 'UNSAFE_PATH'
  | 'DUPLICATE_ENTRY';

export class InputError extends Error {
  readonly code: InputErrorCode;

  constructor(code: InputErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = 'InputError';
    this.code = code;
  }
}
