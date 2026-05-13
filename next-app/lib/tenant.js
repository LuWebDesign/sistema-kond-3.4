// tenant.js — exports the current tenant UUID.
// Fail-fast: if NEXT_PUBLIC_TENANT_ID is not set, the module throws at load time
// so misconfigured deployments surface the error immediately.

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID

if (!TENANT_ID) {
  throw new Error('[tenant] NEXT_PUBLIC_TENANT_ID is not set. Add it to .env.local')
}

export { TENANT_ID }
