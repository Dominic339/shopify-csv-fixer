export function generateCsvReport(summary: {
  totalRows: number;
  issuesFound: number;
  fixesApplied: number;
  flagged: number;
}) {
  return {
    generatedAt: new Date().toISOString(),
    ...summary
  };
}

export function downloadReport(data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "csv-report.json";
  a.click();
  URL.revokeObjectURL(url);
}
