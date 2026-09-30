// Generates public/app-config.json from environment variables (or a local .env file) so the
// API URL and Google Maps key can be configured without editing source code.
// Runs automatically before `npm start` and `npm run build`.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readDotEnv(file) {
  if (!existsSync(file)) return {};
  const values = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || line.trim().startsWith('#')) continue;
    values[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return values;
}

const env = { ...readDotEnv(resolve(root, '.env')), ...process.env };

const config = {
  apiBaseUrl: (env.API_BASE_URL || 'http://localhost:8080/api').replace(/\/+$/, ''),
  googleMapsApiKey: env.GOOGLE_MAPS_API_KEY || '',
  googleMapsMapId: env.GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
  defaultMapCenter: {
    lat: Number(env.DEFAULT_MAP_LAT || 13.0827),
    lng: Number(env.DEFAULT_MAP_LNG || 80.2707),
  },
};

writeFileSync(resolve(root, 'public', 'app-config.json'), JSON.stringify(config, null, 2) + '\n');
console.log(
  `[config] apiBaseUrl=${config.apiBaseUrl} googleMaps=${config.googleMapsApiKey ? 'configured' : 'not configured'}`,
);
