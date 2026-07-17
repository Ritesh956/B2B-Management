// generatePONumber/generateInvoiceNumber compute "next number" from a
// read (MAX of existing numbers) followed by a separate write (create).
// Two concurrent requests can both read the same MAX and then both try to
// create the same number - the second one fails on the unique constraint
// instead of silently succeeding with a duplicate, but without a retry the
// user just sees a raw 500. Re-running the whole attempt (which re-derives
// a fresh number) resolves the race the same way an optimistic-concurrency
// retry loop would, without needing a serializable transaction or an
// advisory lock for what's a rare collision in practice.
export const isUniqueConstraintConflict = (err: unknown, field: string): boolean => {
  const e = err as { code?: string; meta?: { target?: unknown } };
  if (e?.code !== 'P2002') return false;
  const target = e.meta?.target;
  if (Array.isArray(target)) return target.includes(field);
  if (typeof target === 'string') return target.includes(field);
  return false;
};

export async function retryOnUniqueConflict<T>(
  attempt: () => Promise<T>,
  conflictField: string,
  maxAttempts = 5
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await attempt();
    } catch (err) {
      if (!isUniqueConstraintConflict(err, conflictField)) throw err;
      lastErr = err;
    }
  }
  throw lastErr;
}
