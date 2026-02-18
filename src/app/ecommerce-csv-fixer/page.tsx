import { redirect } from "next/navigation";

// Legacy route kept for backward compatibility.
// The product now uses /presets as the single Templates hub.
export default function EcommerceCsvFixerRedirectPage() {
  redirect("/presets");
}
