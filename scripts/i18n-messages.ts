// Extracts every English issue message, suggestion and fix-log line from the validators
// into src/i18n/messages/templates.json. Run after changing a message:
//
//   npx tsx scripts/i18n-messages.ts
//
// Each template is the English text with ${...} parts replaced by {0}, {1}, ...
// The fixer matches a message against these templates and fills the captured values
// into the translated template (src/i18n/messages/<locale>.json).
// src/lib/i18n/messageTemplates.test.ts fails if this file is out of date.

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

export const MESSAGE_SOURCES = [
  "src/lib/csv.ts",
  "src/lib/shopifyBasic.ts",
  "src/lib/shopifyStrictValidate.ts",
  "src/lib/shopifyOptimizer.ts",
  "src/lib/validation/fixAllShopify.ts",
  "src/lib/woocommerceOptimizer.ts",
  "src/lib/etsyOptimizer.ts",
  "src/lib/ebayOptimizer.ts",
  "src/lib/amazonOptimizer.ts",
  "src/lib/formats/engine.ts",
  "src/lib/formats/customUser.ts",
  "src/lib/convertCsv.ts",
  "src/lib/mergeCsv.ts",
];

/** Property names and call targets whose string arguments are user-facing messages. */
const MESSAGE_PROPS = new Set(["message", "suggestion"]);
const MESSAGE_CALLS = new Set(["push", "unshift"]);
const MESSAGE_ARRAYS = /^(fixesApplied|fixes|warnings|notes|fixLog|log)$/;

const MAX_VARIANTS = 16;

/** All English forms of a string-ish expression, with placeholders for dynamic parts. */
function forms(node: ts.Expression, counter: { n: number }): string[] | null {
  if (ts.isParenthesizedExpression(node)) return forms(node.expression, counter);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isTemplateExpression(node)) {
    let acc = [node.head.text];
    for (const span of node.templateSpans) {
      const inner = innerForms(span.expression, counter);
      const next: string[] = [];
      for (const a of acc) for (const i of inner) next.push(a + i + span.literal.text);
      acc = next.slice(0, MAX_VARIANTS);
    }
    return acc;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const l = forms(node.left, counter) ?? [placeholder(counter)];
    const r = forms(node.right, counter) ?? [placeholder(counter)];
    const out: string[] = [];
    for (const a of l) for (const b of r) out.push(a + b);
    return out.slice(0, MAX_VARIANTS);
  }
  if (ts.isConditionalExpression(node)) {
    const a = forms(node.whenTrue, counter);
    const b = forms(node.whenFalse, counter);
    if (a && b) return [...a, ...b].slice(0, MAX_VARIANTS);
  }
  return null;
}

/** Inside ${...}: an English literal stays literal, anything else becomes a placeholder. */
function innerForms(expr: ts.Expression, counter: { n: number }): string[] {
  const f = forms(expr, counter);
  if (f && f.every((s) => /[a-z]{2}/i.test(s) || s === "")) return f;
  return [placeholder(counter)];
}

function placeholder(counter: { n: number }) {
  return `{${counter.n++}}`;
}

/** Renumber placeholders 0..n in order of appearance (branches may skip numbers). */
function renumber(s: string): string {
  let i = 0;
  return s.replace(/\{\d+\}/g, () => `{${i++}}`);
}

function isMessageArg(node: ts.Node): boolean {
  const parent = node.parent;
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    return MESSAGE_PROPS.has(parent.name.getText());
  }
  // const warnings = ["...", `...`]
  if (ts.isArrayLiteralExpression(parent) && ts.isVariableDeclaration(parent.parent)) {
    return MESSAGE_ARRAYS.test(parent.parent.name.getText());
  }
  if (ts.isCallExpression(parent) && parent.arguments.includes(node as ts.Expression)) {
    const callee = parent.expression;
    if (ts.isPropertyAccessExpression(callee) && MESSAGE_CALLS.has(callee.name.text)) {
      return MESSAGE_ARRAYS.test(callee.expression.getText().replace(/^.*\./, ""));
    }
  }
  return false;
}

export function extractTemplates(root: string): string[] {
  const out = new Set<string>();
  for (const rel of MESSAGE_SOURCES) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const src = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if (ts.isExpression(node) && node.parent && isMessageArg(node)) {
        const f = forms(node, { n: 0 });
        for (const s of f ?? []) {
          const t = renumber(s).trim();
          if (/[a-z]{3}/i.test(t.replace(/\{\d+\}/g, ""))) out.add(t);
          // The fixer collapses "... on row N" lines into "... on N rows".
          const base = t.match(/^(.*) on row \{\d+\}\.?$/);
          if (base) out.add(base[1]);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(src);
  }
  return [...out].sort();
}

if (process.argv[1]?.endsWith("i18n-messages.ts")) {
  const root = process.cwd();
  const templates = extractTemplates(root);
  const target = path.join(root, "src/i18n/messages/templates.json");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(templates, null, 1) + "\n");
  console.log(`${templates.length} templates -> ${path.relative(root, target)}`);
}
