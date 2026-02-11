"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PricingCards } from "@/components/ui/PricingCards";
import { UpgradeModal } from "@/components/UpgradeModal";

type SubStatus = {
  ok: boolean;
  plan?: "free" | "basic" | "advanced";
  status?: string;
  signedIn?: boolean;
};

export default function HomeClient() {
  // null = not yet loaded (prevents wrong "sign in" UI flash)
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [subStatus, setSubStatus] = useState<SubStatus>({
    ok: true,
    plan: "free",
    status: "none",
    signedIn: false,
  });
  const [showUpgrade, setShowUpgrade] = useState(false);

  async function refreshSub() {
    try {
      const s = (await fetch("/api/subscription/status", { cache: "no-store" }).then((r) =>
        r.json()
      )) as SubStatus;

      setSubStatus(s ?? { ok: true, plan: "free", status: "none", signedIn: false });
      setSignedIn(typeof s?.signedIn === "boolean" ? s.signedIn : false);
    } catch {
      // Treat errors as unknown/unauth until proven otherwise
      setSubStatus({ ok: true, plan: "free", status: "unknown", signedIn: false });
      setSignedIn(false);
    }
  }

  useEffect(() => {
    void refreshSub();
  }, []);

  const isAdvanced = useMemo(() => {
    return (subStatus?.plan ?? "free") === "advanced" && (subStatus?.status ?? "").toLowerCase() === "active";
  }, [subStatus]);

  const canAccessCustomFormats = isAdvanced;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <header className="flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <img src="/CS Nest Logo.png" alt="CSNest" className="h-10 w-10 rounded-xl" />
            <div>
              <div className="text-xl font-semibold text-[var(--text)]">CSNest</div>
              <div className="text-sm text-[color:rgba(var(--muted-rgb),1)]">Fix imports fast</div>
            </div>
          </div>

          <h1 className="mt-10 text-4xl font-semibold tracking-tight text-[var(--text)]">
            CSV cleanup that feels instant
          </h1>
          <p className="mt-4 max-w-xl text-[color:rgba(var(--muted-rgb),1)]">
            Pick a format, upload your file, auto-fix safe issues, and export a clean CSV.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/app" className="rg-btn">
              Open CSV Fixer
            </Link>

            <button
              type="button"
              className="rg-btn"
              onClick={() => {
                if (canAccessCustomFormats) {
                  window.location.href = "/formats";
                  return;
                }
                setShowUpgrade(true);
              }}
            >
              Custom Formats
            </button>
          </div>

          {!canAccessCustomFormats ? (
            <p className="mt-3 text-sm text-[color:rgba(var(--muted-rgb),1)]">
              Custom formats are included with the Advanced plan.
            </p>
          ) : null}
        </div>

        <div className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="text-sm font-semibold text-[var(--text)]">Your plan</div>

          {signedIn === null ? (
            <div className="mt-2 text-sm text-[color:rgba(var(--muted-rgb),1)]">Checking…</div>
          ) : signedIn ? (
            <>
              <div className="mt-2 text-2xl font-semibold text-[var(--text)]">{subStatus?.plan ?? "free"}</div>
              <div className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                Status: {subStatus?.status ?? "unknown"}
              </div>
              <div className="mt-4">
                <Link href="/account" className="rg-btn">
                  Manage account
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 text-2xl font-semibold text-[var(--text)]">Free</div>
              <div className="mt-1 text-sm text-[color:rgba(var(--muted-rgb),1)]">
                Sign in to manage your plan and exports.
              </div>
              <div className="mt-4">
                <Link href="/login" className="rg-btn">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </header>

      <section id="pricing" className="mt-16">
        <PricingCards />
      </section>

      {showUpgrade ? (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          signedIn={signedIn}
          plan={(subStatus?.plan ?? "free") as "free" | "basic" | "advanced"}
          status={subStatus?.status ?? "unknown"}
        />
      ) : null}
    </div>
  );
}
