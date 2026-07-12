/**
 * Error reporting utility for QuickHire.
 * Logs errors to the console and can be extended to integrate
 * with Sentry, Datadog, or any other monitoring service.
 */
export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  console.error("[QuickHire] Error captured:", error, context);
}
