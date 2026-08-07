/**
 * Client-side token store (BAD §13.1).
 *
 * The access token lives in memory only (never localStorage — XSS surface).
 * The refresh token lives in an httpOnly cookie owned by the backend, so the
 * client never touches it. The HTTP client registers a refresh handler here
 * via the session provider; failed refreshes surface as 401s.
 */

type AccessToken = string | null;

let accessToken: AccessToken = null;
let refreshHandler: (() => Promise<AccessToken>) | null = null;
let refreshPromise: Promise<AccessToken> | null = null;

export function getAccessToken(): AccessToken {
  return accessToken;
}

export function setAccessToken(token: AccessToken): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export function setRefreshHandler(handler: () => Promise<AccessToken>): void {
  refreshHandler = handler;
}

/** Single-flight refresh: concurrent 401s trigger one refresh call. */
export async function ensureFreshAccessToken(): Promise<AccessToken> {
  if (accessToken) {
    return accessToken;
  }
  if (!refreshHandler) {
    return null;
  }
  refreshPromise ??= refreshHandler().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}
