//////////////////////////////////////
// Config models

enum Environment {
  local = 'localhost',
  production = 'www.baita.help',
}

enum ApiUrl {
  remote = 'https://api.baita.help',
  local = 'http://localhost:5000/prod',
  mock = 'http://localhost:3000',
}

enum Language {
  'en-US' = 'en',
  'pt-BR' = 'pt',
}

//////////////////////////////////////
// Default values

const defaultLanguage = Language['en-US']

//////////////////////////////////////
// Configs
interface EnvConfig {
  isProduction: boolean
  apiUrl: string
}

interface AppConfig extends EnvConfig {
  language: Language
}

export interface Labels {
  [key: string]: { [key: string]: string }
}

export const configMapping: { [key in Environment]: EnvConfig } = {
  [Environment.local]: {
    isProduction: false,
    apiUrl: ApiUrl.local,
  },
  [Environment.production]: {
    isProduction: true,
    apiUrl: ApiUrl.remote,
  },
}

export const PRODUCTION_API_URL = ApiUrl.remote

// Google Maps: API keys for Maps JavaScript API are inherently public (loaded in browser).
// Security is enforced via HTTP referrer restrictions in Google Cloud Console.
// Restrict to: https://www.baita.help/*, http://localhost:3000/*
// Set VITE_GOOGLE_MAPS_API_KEY in:
//   - Local: apps/frontend/.env.local
//   - Production: AWS Amplify Console > App settings > Environment variables
export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
export const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || ''
export const FILES_BASE_URL =
  'https://baita-backend-prod-files.s3.us-east-1.amazonaws.com'

const appConfig: AppConfig = {
  language:
    Language[navigator.language as keyof typeof Language] || defaultLanguage,
  ...configMapping[window.location.hostname as Environment],
}

export default appConfig
