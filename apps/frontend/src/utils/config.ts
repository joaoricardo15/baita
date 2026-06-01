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

const appConfig: AppConfig = {
  language:
    Language[navigator.language as keyof typeof Language] || defaultLanguage,
  ...configMapping[window.location.hostname as Environment],
}

export default appConfig
