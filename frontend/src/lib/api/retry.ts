/**
 * Retry utility with exponential backoff for API calls.
 * Used by form-response save operations to mitigate transient network failures.
 *
 * @param fn - The async function to retry
 * @param options - Optional configuration for retry behavior
 * @returns The result of the function if successful
 * @throws The last error encountered if all attempts fail
 */

export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 4,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...defaultOptions, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
