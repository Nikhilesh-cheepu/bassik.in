/** Same-origin proxy that forces Content-Disposition: attachment. */
export function teamDownloadHref(fileUrl: string, filename?: string): string {
  const qs = new URLSearchParams({ url: fileUrl });
  if (filename?.trim()) qs.set("filename", filename.trim());
  return `/api/team/download?${qs.toString()}`;
}
