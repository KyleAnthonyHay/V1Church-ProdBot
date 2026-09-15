/** Saves text to the user's device as a file. */
export function downloadText(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CSV with a BOM so Excel reads non-ASCII text as UTF-8. */
export function downloadCsv(csv: string, filename: string) {
  downloadText(`﻿${csv}`, filename, "text/csv;charset=utf-8");
}
