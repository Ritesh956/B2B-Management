import { describe, it, expect, vi } from 'vitest';
import { retryOnUniqueConflict, isUniqueConstraintConflict } from '../src/utils/retryOnUniqueConflict';

const poNumberConflict = { code: 'P2002', meta: { target: ['poNumber'] } };
const otherFieldConflict = { code: 'P2002', meta: { target: ['email'] } };
const genericError = new Error('db is down');

describe('isUniqueConstraintConflict', () => {
  it('matches a P2002 error on the given field', () => {
    expect(isUniqueConstraintConflict(poNumberConflict, 'poNumber')).toBe(true);
  });

  it('does not match a P2002 error on a different field', () => {
    expect(isUniqueConstraintConflict(otherFieldConflict, 'poNumber')).toBe(false);
  });

  it('does not match a non-P2002 error', () => {
    expect(isUniqueConstraintConflict(genericError, 'poNumber')).toBe(false);
  });
});

describe('retryOnUniqueConflict', () => {
  it('returns the result on first success without retrying', async () => {
    const attempt = vi.fn().mockResolvedValue('ok');
    const result = await retryOnUniqueConflict(attempt, 'poNumber');
    expect(result).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('retries on a conflict for the watched field and succeeds once it clears', async () => {
    const attempt = vi.fn()
      .mockRejectedValueOnce(poNumberConflict)
      .mockRejectedValueOnce(poNumberConflict)
      .mockResolvedValueOnce('ok-on-third-try');

    const result = await retryOnUniqueConflict(attempt, 'poNumber');
    expect(result).toBe('ok-on-third-try');
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it('does not retry and rethrows immediately for an unrelated error', async () => {
    const attempt = vi.fn().mockRejectedValue(genericError);
    await expect(retryOnUniqueConflict(attempt, 'poNumber')).rejects.toBe(genericError);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('gives up after maxAttempts and throws the last conflict error', async () => {
    const attempt = vi.fn().mockRejectedValue(poNumberConflict);
    await expect(retryOnUniqueConflict(attempt, 'poNumber', 3)).rejects.toBe(poNumberConflict);
    expect(attempt).toHaveBeenCalledTimes(3);
  });
});
