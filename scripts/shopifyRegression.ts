import fs from "node:fs";
import path from "node:path";

import { parseCsv, toCsv } from "../src/lib/csv";
import { validateAndFixShopifyBasic } from "../src/lib/shopifyBasic";
import { validateShopifyStrict } from "../src/lib/shopifyStrictValidate";
import { SHOPIFY_CANONICAL_HEADERS } from "../src/lib/shopifySchema";

type CaseResult = {
  name: string;
  ok: boolean;
  details: string[];
};

function readText(p: string) {
  return fs.readFileSync(p, "utf8");
}

function assert(condition: any, message: string, details: string[]) {
  if (!condition) details.push(message);
}

function runOne(name: string, csvText: string): CaseResult {
  const details: string[] = [];

  const parsed = parseCsv(csvText);
  assert(parsed.parseErrors.length === 0, `Parse errors: ${parsed.parseErrors.join(" | ")}`, details);

  const basic = validateAndFixShopifyBasic(parsed.headers, parsed.rows);
  const strictIssues = validateShopifyStrict(basic.fixedHeaders, basic.fixedRows);

  // 1) Canonical headers must be present at the start, in-order
  const fixedHeaders = basic.fixedHeaders;
  for (let i = 0; i < SHOPIFY_CANONICAL_HEADERS.length; i++) {
    assert(
      fixedHeaders[i] === SHOPIFY_CANONICAL_HEADERS[i],
      `Header mismatch at index ${i}: expected "${SHOPIFY_CANONICAL_HEADERS[i]}", got "${fixedHeaders[i]}"`,
      details
    );
  }

  // 2) No header is dropped: output must include every parsed header (possibly canonicalized)
  // We can't require exact names because aliases normalize, but unknown headers must survive.
  const inputHeaderSet = new Set(parsed.headers.map((h) => String(h).trim()));
  const outputHeaderSet = new Set(fixedHeaders.map((h) => String(h).trim()));

  // unknown headers are those that are not part of canonical list.
  const canonicalSet = new Set(SHOPIFY_CANONICAL_HEADERS);
  const inputUnknown = [...inputHeaderSet].filter((h) => !canonicalSet.has(h));

  for (const uh of inputUnknown) {
    assert(outputHeaderSet.has(uh), `Unknown header was dropped: "${uh}"`, details);
  }

  // 3) Output CSV round-trips (no throw) and preserves column count
  const outCsv = toCsv(fixedHeaders, basic.fixedRows);
  const reparsed = parseCsv(outCsv);
  assert(reparsed.parseErrors.length === 0, `Re-parse errors: ${reparsed.parseErrors.join(" | ")}`, details);
  assert(
    reparsed.headers.length === fixedHeaders.length,
    `Round-trip header count changed: expected ${fixedHeaders.length}, got ${reparsed.headers.length}`,
    details
  );

  // 4) Strict issues should never be fatal regressions for our known fixtures.
  // We allow warnings, but errors should be zero after the basic auto-fixes for these cases.
  const strictErrors = strictIssues.filter((i) => i.severity === "error");
  assert(strictErrors.length === 0, `Strict errors remain: ${strictErrors.map((e) => e.code).join(", ")}`, details);

  // 5) Basic issues should not include missing required headers after canonicalization.
  const missingHeaderErrors = basic.issues.filter((i) => i.code === "shopify/missing_required_header");
  assert(missingHeaderErrors.length === 0, `Missing required headers after fix.`, details);

  return { name, ok: details.length === 0, details };
}

function main() {
  const fixturesDir = path.join(process.cwd(), "scripts", "fixtures", "shopify");
  const files = fs
    .readdirSync(fixturesDir)
    .filter((f) => f.toLowerCase().endsWith(".csv"))
    .sort();

  if (!files.length) {
    console.error("No fixtures found in scripts/fixtures/shopify");
    process.exit(2);
  }

  const results: CaseResult[] = [];
  for (const f of files) {
    const full = path.join(fixturesDir, f);
    const text = readText(full);
    results.push(runOne(f, text));
  }

  const failed = results.filter((r) => !r.ok);

  for (const r of results) {
    if (r.ok) {
      console.log(`✅ ${r.name}`);
    } else {
      console.log(`❌ ${r.name}`);
      for (const d of r.details) console.log(`   - ${d}`);
    }
  }

  if (failed.length) {
    console.error(`\n${failed.length} regression case(s) failed.`);
    process.exit(1);
  }

  console.log(`\nAll ${results.length} regression case(s) passed.`);
}

main();
