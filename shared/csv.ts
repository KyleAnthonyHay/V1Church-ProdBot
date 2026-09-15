/** Quote a cell when it holds a comma, quote or line break (RFC 4180). */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Header row plus one line per row, CRLF-separated as spreadsheets expect. */
export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}
