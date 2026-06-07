/**
 * Connectors — Re-exports connector schemas + shared types
 *
 * Schema definitions live in `schemas/connector.ts`. This file re-exports
 * them for backward compatibility and provides the namespace for connector
 * instance files (baita.ts, google.ts, etc.).
 */
export * from '../schemas/connector'
