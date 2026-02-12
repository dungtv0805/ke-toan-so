export * from './tenant-context.service';
export * from './tenant.middleware';
export * from './tenant.module';

/**
 * Entities that should NOT have tenant filtering (system-wide entities)
 */
export const TENANT_EXEMPT_ENTITIES = [
  'Tenant', // Tenant entity itself
  'User',   // Users can belong to multiple tenants
  'UserCredential', // Credentials are user-level, not tenant-level
  'UserTenant', // User-tenant membership is cross-tenant
];
