import { isAxiosError } from 'axios';

// Every catch block around an API call reads the same shape off an axios
// error (err.response.data.error) before falling back to a generic message -
// centralized here instead of `catch (err: any)` at every call site.
export const getErrorMessage = (err: unknown, fallback: string): string => {
  if (isAxiosError(err)) {
    const message = err.response?.data?.error;
    if (typeof message === 'string') return message;
  }
  return fallback;
};
