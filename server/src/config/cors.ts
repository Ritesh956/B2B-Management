// Single source of truth for which browser origins may call this API —
// shared by the Express CORS middleware and the Socket.io handshake so the
// two can never drift apart.
//
// Previously ANY https://*.vercel.app origin was allowed, which meant any
// stranger's Vercel deployment could make credentialed cross-origin calls.
// Now: the real production client, this project's own Vercel preview
// deployments (project `client`, account riteshgupta0510-6586), and local dev.
const staticAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://rit-vendor.vercel.app',
];

// Vercel preview URLs for this specific project look like
// https://client-<hash>-riteshgupta0510-6586.vercel.app
const previewOriginPattern = /^https:\/\/client-[a-z0-9]+-riteshgupta0510-6586\.vercel\.app$/;

export const isAllowedOrigin = (origin: string): boolean => {
  if (staticAllowedOrigins.includes(origin)) return true;
  if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL.replace(/\/$/, '')) return true;
  return previewOriginPattern.test(origin);
};

export const allowedOriginsForSocketIo = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
  // No Origin header (server-to-server, curl) — allow, same as the REST API.
  if (!origin) return callback(null, true);
  if (isAllowedOrigin(origin)) return callback(null, true);
  callback(new Error('Not allowed by CORS'));
};
