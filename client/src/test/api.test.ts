import { z } from 'zod';
import { parseApiResponse } from '../services/api';

describe('parseApiResponse', () => {
  it('returns parsed data for valid payloads', () => {
    const schema = z.object({ value: z.number() });

    const parsed = parseApiResponse(schema, { value: 42 });

    expect(parsed.value).toBe(42);
  });

  it('throws for invalid payloads', () => {
    const schema = z.object({ value: z.number() });

    expect(() => parseApiResponse(schema, { value: 'x' })).toThrow('Invalid API response payload');
  });
});
