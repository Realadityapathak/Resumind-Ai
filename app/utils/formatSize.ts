export function formatSize(bytes: number): string {
  if (!bytes || typeof bytes !== "number" || isNaN(bytes) || bytes <= 0) {
    return "0 Bytes";
  }

  const bytesPerUnit = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const rawIndex = Math.floor(Math.log(bytes) / Math.log(bytesPerUnit));
  const unitIndex = Math.min(sizes.length - 1, Math.max(0, rawIndex));

  return parseFloat((bytes / Math.pow(bytesPerUnit, unitIndex)).toFixed(2)) + " " + sizes[unitIndex];
}
