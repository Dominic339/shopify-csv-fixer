export function mergeCsvFiles(
  headers1: string[],
  rows1: Record<string, string>[],
  headers2: string[],
  rows2: Record<string, string>[]
) {
  const allHeaders = Array.from(new Set([...headers1, ...headers2]));

  function normalizeRows(
    rows: Record<string, string>[]
  ): Record<string, string>[] {
    return rows.map((r) => {
      const obj: Record<string, string> = {};
      for (const h of allHeaders) {
        obj[h] = r[h] ?? "";
      }
      return obj;
    });
  }

  return {
    headers: allHeaders,
    rows: [...normalizeRows(rows1), ...normalizeRows(rows2)]
  };
}
