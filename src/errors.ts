import { AxiosError, AxiosResponse } from 'axios';

export class CommandSectionError extends Error {
  constructor(message: string, readonly baseError?: Error) {
    super(message);
    this.name = 'CommandSectionError';
  }
}

function errorToStringMessage(error: Error): string | undefined {
  if (error instanceof CommandSectionError) {
    if (!error.baseError) {
      return error.message;
    }
    return `${error.message}: ${errorToStringMessage(error.baseError)}`;
  }
  if ('errors' in error) {
    const errors = error.errors as { message: string; extensions: { code: string } }[];
    if (errors.length > 0) {
      const codes = errors.map((e) => e.extensions.code);
      if (codes.includes('INVALID_CREDENTIALS')) {
        return 'Invalid credentials';
      } else {
        return JSON.stringify(errors, null, 2);
      }
    } else if ('parent' in error) {
      return errorToStringMessage(error.parent as Error);
    }
  } else if ('response' in error && error.response) {
    const response = error.response as AxiosResponse;
    // console.debug(response.data)
    return `Received ${response.status} ${response.statusText} from ${response.config.url}`;
  } else if ('message' in error) {
    return error.message;
  } else if ('code' in error) {
    const axiosError = error as AxiosError;
    if (axiosError.code === 'ECONNREFUSED') {
      return `Connection refused on host '${axiosError.config?.baseURL}'`;
    } else {
      return `Unknown error ${axiosError.code} during request to ${axiosError.config?.url}`;
    }
  } else {
    return JSON.stringify(error, null, 2);
  }
}

export function printError(error: Error) {
  console.error(errorToStringMessage(error));
}
