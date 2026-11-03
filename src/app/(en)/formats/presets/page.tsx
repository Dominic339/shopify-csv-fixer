import { redirect } from "next/navigation";

export default function LegacyPresetsRedirect() {
  redirect("/presets");
}
