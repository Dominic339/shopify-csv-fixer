"use client";

import React, { useEffect, useMemo } from "react";

/**
 * UpgradeModal supports two calling styles:
 *
 * 1) Controlled text modal (used by HomeClient / TopBar / FormatsClient)
 *    <UpgradeModal open title message signedIn upgradePlan onClose />
 *
 * 2) Status-driven modal (legacy)
 *    <UpgradeModal signedIn plan status onClose />
 */

type ControlledProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;

  // Optional extras some callers pass (ex: TopBar)
  signedIn?: boolean;
  upgradePlan?: "basic" | "advanced" | string;
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

  // Prefer caller-provided title/message when in controlled mode
  let title = isControlled(props) ? props.title : "Upgrade required";
  let message = isControlled(props) ? props.message : "This feature requires a higher plan.";

  // Derive CTA behavior
  const { ctaHref, ctaLabel } = useMemo(() => {
    const controlled = isControlled(props);

    // Signed-in signal:
    // - controlled: optional boolean (TopBar passes a real boolean)
    // - legacy: boolean|null
    const signedIn = controlled ? Boolean(props.signedIn) : Boolean(props.signedIn);

    if (!signedIn) {
      return { ctaHref: "/login", ctaLabel: "Sign in" };
    }

    // If signed in, go to checkout. Some callers tell us which plan they want.
    const upgradePlan = controlled ? props.upgradePlan : "advanced";
    const planParam =
      typeof upgradePlan === "string" && upgradePlan.length ? `?plan=${encodeURIComponent(upgradePlan)}` : "";

    return { ctaHref: `/checkout${planParam}`, ctaLabel: "Upgrade" };
  }, [props]);

  // Legacy message logic only when not controlled
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

  // If legacy mode says already advanced+active, don’t show CTA
  const hideCta =
    !isControlled(props) &&
    Boolean(props.signedIn) &&
    props.plan === "advanced" &&
    (props.status || "").toLowerCase() === "active";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Darker overlay (less transparent than before) */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={props.onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="text-lg font-semibold text-[var(--text)]">{title}</div>

        <div className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">{message}</div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" className="rg-btn" onClick={props.onClose}>
            Close
          </button>

          {hideCta ? null : (
            <a className="rg-btn" href={ctaHref}>
              {ctaLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
