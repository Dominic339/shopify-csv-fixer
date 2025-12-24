export function getDeviceId(): string {
  // Browser only
  if (typeof window === "undefined") return "server";

  const name = "scf_device_id=";
  const existing = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(name));

  if (existing) return decodeURIComponent(existing.slice(name.length));

  // Generate a random id once
  const id =
    (crypto?.randomUUID?.() ?? `dev_${Math.random().toString(16).slice(2)}_${Date.now()}`);

  // 400 days cookie
  document.cookie = `scf_device_id=${encodeURIComponent(
    id
  )}; Path=/; Max-Age=${60 * 60 * 24 * 400}; SameSite=Lax`;

  return id;
}
