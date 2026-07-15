/**
 * Only allow same-site relative paths through as a redirect target.
 * Blocks protocol-relative ("//evil.com") and absolute URLs so a
 * `?next=` param can never be used to redirect someone off yesopd.com.
 *
 * Used by both the login server action and middleware so the deep-link
 * behaviour (public search → login → book) is safe either way the
 * person hits /auth/login.
 */
export function safeRedirectPath(path: string | null | undefined): string | null {
  if (!path) return null
  if (!path.startsWith('/') || path.startsWith('//')) return null
  return path
}