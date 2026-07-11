/**
 * Error reporting utility for Talent Bridge Egypt.
 * Logs errors to the console and can be extended to integrate
 * with Sentry, Datadog, or any other monitoring service.
 */
export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  console.error("[TalentBridge] Error captured:", error, context);
}
