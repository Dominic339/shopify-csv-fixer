import { Suspense } from "react";
import type { Metadata } from "next";
import UpdatePasswordClient from "./UpdatePasswordClient";

export const metadata: Metadata = {
  title: "Update Password | StriveFormats",
  description: "Set a new password for your StriveFormats account.",
};

export default function UpdatePasswordPage() {
  return (
    <Suspense>
      <UpdatePasswordClient />
    </Suspense>
  );
}
