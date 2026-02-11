"use client";

import React, { useEffect } from "react";

/**
 * UpgradeModal supports two calling styles:
 *
 * 1) Controlled text modal (used by HomeClient / FormatsClient)
 *    <UpgradeModal open title message onClose />
 *
 * 2) Status-driven modal (legacy)
 *    <UpgradeModal signedIn plan status onClose />
 */

type ControlledProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

type StatusDrivenProps = {
  onClose: () => void;
  signedIn: boolean | null;
  plan: "free" | "basic" | "advanced";
  status: string;
  // no `open` here in the legacy signature
};

type Props = ControlledProps | StatusDrivenProps;

function isControlled(p: Props): p is ControlledProps {
  return typeof (p as any).open === "boolean";
}

export function UpgradeModal(props: Props) {
  const open = isControlled(props) ? props.open : true;

  // Close on Escape + prevent background scroll when open
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, props]);

  if (!open) return null;

  // If the caller provided title/message, always use them (prevents “Sign in…” when already signed in).
  let title = isControlled(props) ? props.title : "Upgrade required";
  let message = isControlled(props)
    ? props.message
    : "This feature requires a higher plan.";

  // Legacy behavior (only when using the status-driven props signature)
  if (!isControlled(props)) {
    const signedIn = props.signedIn;
    const plan = props.plan;
    const status = (props.status || "").toLowerCase();

    if (!signedIn) {
      title = "Sign in required";
      message = "Please sign in to manage your plan and upgrade.";
    } else if (plan === "advanced" && status === "active") {
      title = "You're on Advanced";
      message = "You already have access to this feature.";
    } else {
      title = "Upgrade required";
      message = "This feature requires the Advanced plan. Upgrade to unlock it.";
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Darker overlay (less transparent than before) */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={props.onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="text-lg font-semibold text-[var(--text)]">
          {title}
        </div>

        <div className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">
          {message}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="rg-btn"
            onClick={props.onClose}
          >
            Close
          </button>

          {/* If the user is already on Advanced Active (legacy signature), no need to show Upgrade */}
          {!isControlled(props) &&
          props.signedIn &&
          props.plan === "advanced" &&
          (props.status || "").toLowerCase() === "active" ? null : (
            <a className="rg-btn" href="/checkout">
              Upgrade
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
