// src/app/presets/[id]/sample.csv/route.ts
import { NextRequest } from "next/server";
import { getPresetById } from "@/lib/presets";

function escapeCsvCell(value: string) {
  // Minimal CSV escaping: wrap if contains comma, quote, or newline
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

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const preset = getPresetById(id);
  if (!preset) {
    return new Response("Not found", { status: 404 });
  }

  const csv = toCsv(preset.columns, preset.sampleRows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${preset.id}_sample.csv"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
