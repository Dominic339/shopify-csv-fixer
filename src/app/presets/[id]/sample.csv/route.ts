// src/app/presets/[id]/sample.csv/route.ts
import { NextRequest } from "next/server";
import { getPresetById } from "@/lib/presets";
import { getFormatById } from "@/lib/formats";
import { readFile } from "fs/promises";
import path from "path";

function escapeCsvCell(value: string) {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function toCsv(headers: string[], rows: Record<string, string>[]) {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvCell).join(","));
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCsvCell(r?.[h] ?? "")).join(","));
  }
  return lines.join("\n") + "\n";
}

function sampleValueFor(header: string) {
  const h = header.toLowerCase();
  if (h.includes("title") || h.includes("name") || h.includes("item")) return "Sample Product";
  if (h.includes("sku")) return "SKU-1001";
  if (h.includes("handle")) return "sample-product";
  if (h.includes("price")) return "19.99";
  if (h.includes("quantity") || h.includes("stock") || h.includes("inventory")) return "10";
  if (h.includes("published")) return "TRUE";
  if (h.includes("url") || h.includes("image")) return "https://example.com/image.jpg";
  if (h.includes("category")) return "Example Category";
  if (h.includes("tag")) return "tag-one, tag-two";
  return "";
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const preset = getPresetById(id);
  if (!preset) {
    return new Response("Not found", { status: 404 });
  }

  // ✅ Shopify official sample CSV (exact match)
  if (preset.id === "shopify_products") {
    const filePath = path.join(process.cwd(), "public", "samples", "shopify_product_template.csv");
    const csv = await readFile(filePath, "utf8");

    return new Response(csv.endsWith("\n") ? csv : csv + "\n", {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shopify_product_template.csv"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Default behavior: build a simple sample from the format's expected headers.
  const fmt = getFormatById(preset.formatId);
  const headers = ((fmt as any)?.expectedHeaders as string[] | undefined) ?? [];
  const cols = Array.isArray(headers) && headers.length ? headers : ["Column A", "Column B", "Column C"];

  const rows = [0, 1, 2].map((i) => {
    const r: Record<string, string> = {};
    for (const h of cols) r[h] = i === 0 ? sampleValueFor(h) : "";
    return r;
  });

  const csv = toCsv(cols, rows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${preset.id}_sample.csv"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
