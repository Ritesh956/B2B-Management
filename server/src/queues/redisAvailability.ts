import net from 'net';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisHostMatch = redisUrl.match(/^redis:\/\/([^:/]+)(?::(\d+))?/i);
const redisHost = redisHostMatch?.[1] || '127.0.0.1';
const redisPort = parseInt(redisHostMatch?.[2] || '6379', 10);

let availabilityPromise: Promise<boolean> | null = null;

export const isRedisAvailable = async (): Promise<boolean> => {
  if (!availabilityPromise) {
    availabilityPromise = (async () => {
      return new Promise<boolean>((resolve) => {
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
    })();
  }

  return availabilityPromise;
};