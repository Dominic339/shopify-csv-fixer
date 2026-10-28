// Only follow redirects to paths on this site. "https://evil.example",
// "//evil.example", "/\evil.example" and "javascript:..." all fall back.
export function safeRedirectPath(value: string | null | undefined, fallback = "/app"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
