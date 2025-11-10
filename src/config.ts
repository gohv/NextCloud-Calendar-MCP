import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface NextcloudConfig {
  serverUrl: string;
  username: string;
  password: string;
  calendarPath: string;
}

export interface Config {
  nextcloud: NextcloudConfig;
}

let config: Config | null = null;

export function loadConfig(): Config {
  if (config) {
    return config;
  }

  const configPath = join(__dirname, '..', 'config.json');

  try {
    const configData = readFileSync(configPath, 'utf-8');
    config = JSON.parse(configData) as Config;
    return config;
  } catch (error) {
    console.error('Failed to load config.json. Please copy config.example.json to config.json and fill in your credentials.');
    throw error;
  }
}

export function getConfig(): Config {
  if (!config) {
    throw new Error('Config not loaded. Call loadConfig() first.');
  }
  return config;
}
