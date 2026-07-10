---
name: Admin route layout pattern
description: How the admin sidebar layout is structured with TanStack Router file-based routing.
---

Admin pages live at `src/routes/_authenticated/admin/`.
`src/routes/_authenticated/admin/route.tsx` acts as the layout wrapper — it renders `<AdminSidebar />` + `<Outlet />`.
All admin sub-pages (index, applicants, offers, pipeline, interviews, analytics) render inside this layout automatically.

**Why:** TanStack Router's file-based routing uses `route.tsx` as a layout when placed alongside page files in the same directory.

**How to apply:** Any new admin page created at `src/routes/_authenticated/admin/newpage.tsx` will automatically get the sidebar layout.
