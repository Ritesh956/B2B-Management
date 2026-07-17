const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Render builds and deploys run in separate containers — Puppeteer's
  // default cache dir (~/.cache/puppeteer, outside the project) never makes
  // it from the build container to the runtime one. Keeping the cache inside
  // the project directory means it ships with the rest of dist/node_modules.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
