"use client";

import Link from "next/link";

export type Props = {
  open: boolean;
  title: string;
  message: string;
  signedIn: boolean | null;
  upgradePlan: "basic" | "advanced";
  onClose: () => void;
};

export function UpgradeModal({
  open,
  title,
  message,
  signedIn,
  upgradePlan,
  onClose,
}: Props) {
  if (!open) return null;

  // If already signed in, send them to Profile so they can manage/upgrade.
  // If not signed in, send them to Login.
  const ctaHref = signedIn ? "/profile" : "/login";
  const ctaText = signedIn ? "Go to Profile" : "Sign in";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      {/* overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* card */}
      <div
        className="relative w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--popover)] p-6 text-[var(--text)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
          {message}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm"
            onClick={onClose}
          >
            Close
          </button>

          <Link href={ctaHref} className="rg-btn" onClick={onClose}>
            {ctaText}
          </Link>
        </div>

        <div className="mt-3 text-xs text-[var(--muted)]">
          Required plan: <span className="font-semibold">{upgradePlan}</span>
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
