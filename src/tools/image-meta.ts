export interface ImageMetadata {
  url: string;
  contentType: string | null;
  fileSize: number | null;
  fileSizeFormatted: string | null;
  lastModified: string | null;
  etag: string | null;
  cacheControl: string | null;
  acceptRanges: string | null;
  server: string | null;
  accessTime: string;
  statusCode: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

export async function getImageMetadata(url: string): Promise<ImageMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    // Use HEAD request first to avoid downloading the entire image
    let response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    // Some servers reject HEAD, fall back to GET with range
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        signal: controller.signal,
        redirect: "follow",
      });
    }

    const headers = response.headers;
    const contentLength = headers.get("content-length");
    const fileSize = contentLength ? parseInt(contentLength, 10) : null;

    return {
      url,
      contentType: headers.get("content-type"),
      fileSize,
      fileSizeFormatted: fileSize !== null ? formatBytes(fileSize) : null,
      lastModified: headers.get("last-modified"),
      etag: headers.get("etag"),
      cacheControl: headers.get("cache-control"),
      acceptRanges: headers.get("accept-ranges"),
      server: headers.get("server"),
      accessTime: new Date().toISOString(),
      statusCode: response.status,
    };
  } finally {
    clearTimeout(timeout);
  }
}
