import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-14 border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-white/70">
          <div className="font-medium text-white/80">CSNest</div>
          <div className="mt-1">Fix imports fast.</div>
          <div className="mt-2 text-xs text-white/50">© {new Date().getFullYear()} CSNest</div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <Link className="text-white/70 hover:text-white" href="/presets">
            Preset Formats
          </Link>
          <Link className="text-white/70 hover:text-white" href="/about">
            About
          </Link>
          <Link className="text-white/70 hover:text-white" href="/privacy">
            Privacy
          </Link>
          <Link className="text-white/70 hover:text-white" href="/terms">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
