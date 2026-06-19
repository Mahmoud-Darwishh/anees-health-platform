// Stub for the `server-only` package inside the Vitest (node) environment, where
// there is no Next.js server/client boundary to enforce. The pure modules under
// test import `'server-only'` for the real build; here it is a harmless no-op.
export {};
