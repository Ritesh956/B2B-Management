import net from 'net';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisHostMatch = redisUrl.match(/^redis:\/\/(?:[^@/]*@)?([^:/]+)(?::(\d+))?/i);
const redisHost = redisHostMatch?.[1] || '127.0.0.1';
const redisPort = parseInt(redisHostMatch?.[2] || '6379', 10);

// Re-probe on a TTL instead of caching the very first result forever. The
// old permanent cache meant that if the server booted a moment before Redis
// was reachable (routine on Render cold starts), every email/notification
// enqueue was silently skipped until the next manual redeploy.
const SUCCESS_TTL_MS = 60_000; // a healthy Redis rarely vanishes — probe once a minute
const FAILURE_TTL_MS = 10_000; // an unreachable Redis should be retried quickly

let cached: { value: boolean; at: number } | null = null;
let inflight: Promise<boolean> | null = null;

const probe = (): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host: redisHost, port: redisPort });
    const finish = (value: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(300);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });

export const isRedisAvailable = async (): Promise<boolean> => {
  const now = Date.now();
  if (cached && now - cached.at < (cached.value ? SUCCESS_TTL_MS : FAILURE_TTL_MS)) {
    return cached.value;
  }

  if (!inflight) {
    inflight = probe().then((value) => {
      cached = { value, at: Date.now() };
      inflight = null;
      return value;
    });
  }

  return inflight;
};
