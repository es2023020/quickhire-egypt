---
name: TanStack Start hydration mismatch
description: Dev-mode data-tsd-source attribute differences between SSR and client cause hydration warnings that are benign.
---

In TanStack Start dev mode, `data-tsd-source` attributes are injected for debugging.
These differ between SSR and client renders, causing "hydration mismatch" console warnings.

**Why:** This is a TanStack Start framework behavior in development mode only.

**How to apply:** Ignore these warnings in dev logs. They do not appear in production builds. Do not try to "fix" them.
