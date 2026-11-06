// Customer-facing error message hygiene. Canonical pattern — see
// SPOKE-DOCUMENTATION.md "Customer-facing error hygiene"; first shipped in
// zenbar (2026-07-12), copied from millewee for indies R4.
//
// Browser fetch failures surface as terse technical TypeErrors — Chrome:
// "Failed to fetch", Safari: "Load failed", Firefox: "NetworkError when
// attempting to fetch resource." A customer mid-order must never see those;
// they get the gentle localized message instead. Deliberate messages (thrown
// by our own flow code or relayed from hub API responses) pass through
// unchanged because they are already written for humans.

const TECHNICAL_FETCH_ERROR = /failed to fetch|load failed|networkerror|network request failed/i;

export function customerFacingError(err: unknown, connectionMessage: string, fallback: string): string {
  if (!(err instanceof Error) || !err.message) return fallback;
  return TECHNICAL_FETCH_ERROR.test(err.message) ? connectionMessage : err.message;
}
