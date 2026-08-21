function extractAfterMarker(input: string, marker: string): string | null {
  const index = input.indexOf(marker);
  if (index === -1) return null;

  const rest = input.slice(index + marker.length);
  const ampersandIndex = rest.indexOf("&");
  const raw = ampersandIndex === -1 ? rest : rest.slice(0, ampersandIndex);

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Manual paste field: accepts a full invite link/URL, or a bare token typed/pasted as-is. */
export function extractInviteTokenFromInput(input: string): string {
  const trimmed = input.trim();
  return extractAfterMarker(trimmed, "inviteToken=") ?? trimmed;
}

/** Deep link handler: only treat as an invite if the URL actually carries an inviteToken param. */
export function extractInviteTokenFromUrl(url: string): string | null {
  return extractAfterMarker(url, "inviteToken=");
}
