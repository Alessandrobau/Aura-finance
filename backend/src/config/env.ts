import { config } from 'dotenv';
config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: optionalEnv('JWT_EXPIRES_IN', '7d'),

  GEMINI_API_KEY: optionalEnv('GEMINI_API_KEY', ''),
  OLLAMA_BASE_URL: optionalEnv('OLLAMA_BASE_URL', 'http://localhost:11434'),
  OLLAMA_MODEL: optionalEnv('OLLAMA_MODEL', 'llama3.2'),

  BRAPI_TOKEN: optionalEnv('BRAPI_TOKEN', ''),
  COINGECKO_API_KEY: optionalEnv('COINGECKO_API_KEY', ''),

  PORT: parseInt(optionalEnv('PORT', '3000'), 10),
  HOST: optionalEnv('HOST', '0.0.0.0'),
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  CORS_ORIGIN: optionalEnv('CORS_ORIGIN', ''),
};
