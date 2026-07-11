// Supabase removed — auth is handled via localStorage (built-in backend).
// This stub is kept to avoid import errors if referenced elsewhere.
import { createMiddleware } from '@tanstack/react-start'

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    return next({ context: { userId: 'admin', claims: {} } })
  },
)
