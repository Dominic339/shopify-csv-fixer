// src/app/presets/[id]/sample.csv/route.ts

import { getPresetById } from "@/lib/presets";

function csvEscape(value: string) {
  const s = value ?? "";
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: Record<string, string>[]) {
  const lines: string[] = [];
  lines.push(headers.map(csvEscape).join(","));

  for (const r of rows) {
    const line = headers.map((h) => csvEscape((r?.[h] ?? "").toString()));
    lines.push(line.join(","));
  }

  return lines.join("\n") + "\n";
}

export async function GET(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const preset = getPresetById(ctx.params.id);
  if (!preset) {
    return new Response("Preset not found", { status: 404 });
  }

  const headers = preset.columns ?? [];
  const rows = (preset.sampleRows && preset.sampleRows.length ? preset.sampleRows : [{}]) as Record<
    string,
    string
  >[];

  const csv = toCsv(headers, rows);

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${preset.id}_sample.csv"`,
      "cache-control": "public, max-age=3600",
    },
  });
}
