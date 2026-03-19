export interface ResponsiveConfig {
  baseUrl: string;
  alt?: string;
  widths?: number[];
  sizes?: string;
  className?: string;
  loading?: "lazy" | "eager";
  formats?: string[];
}

export interface ResponsiveResult {
  baseUrl: string;
  variants: ImageVariant[];
  srcsetAttr: string;
  imgTag: string;
  pictureTag: string;
}

export interface ImageVariant {
  url: string;
  width: number;
  descriptor: string;
}

function inferImageFormat(url: string): string {
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".webp")) return "webp";
  if (pathname.endsWith(".avif")) return "avif";
  if (pathname.endsWith(".png")) return "png";
  if (pathname.endsWith(".gif")) return "gif";
  if (pathname.endsWith(".svg")) return "svg";
  return "jpeg";
}

function buildVariantUrl(baseUrl: string, width: number): string {
  // Append width parameter - handles both existing and new query strings
  const url = new URL(baseUrl);
  url.searchParams.set("w", width.toString());
  return url.href;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function generateResponsiveImages(config: ResponsiveConfig): ResponsiveResult {
  const defaultWidths = [320, 640, 768, 1024, 1280, 1536, 1920];
  const widths = config.widths || defaultWidths;
  const alt = config.alt || "";
  const sizes = config.sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw";
  const loading = config.loading || "lazy";
  const className = config.className || "";
  const formats = config.formats || ["webp", inferImageFormat(config.baseUrl)];
  const sortedWidths = [...widths].sort((a, b) => a - b);

  // Generate variants
  const variants: ImageVariant[] = sortedWidths.map((width) => ({
    url: buildVariantUrl(config.baseUrl, width),
    width,
    descriptor: `${width}w`,
  }));

  // Build srcset attribute
  const srcsetAttr = variants
    .map((v) => `${v.url} ${v.descriptor}`)
    .join(",\n    ");

  // Build simple <img> tag with srcset
  const classAttr = className ? ` class="${escapeHtml(className)}"` : "";
  const imgTag = [
    `<img`,
    `  src="${escapeHtml(config.baseUrl)}"`,
    `  srcset="${srcsetAttr}"`,
    `  sizes="${escapeHtml(sizes)}"`,
    `  alt="${escapeHtml(alt)}"`,
    `  loading="${loading}"`,
    className ? `  class="${escapeHtml(className)}"` : null,
    `/>`,
  ]
    .filter(Boolean)
    .join("\n");

  // Build <picture> element with multiple formats
  const sourceElements = formats.map((format) => {
    const formatVariants = sortedWidths.map((width) => {
      const url = new URL(config.baseUrl);
      url.searchParams.set("w", width.toString());
      url.searchParams.set("fm", format);
      return `${url.href} ${width}w`;
    });
    const formatSrcset = formatVariants.join(",\n      ");
    const mimeType =
      format === "jpg" || format === "jpeg"
        ? "image/jpeg"
        : format === "avif"
          ? "image/avif"
          : format === "webp"
            ? "image/webp"
            : format === "png"
              ? "image/png"
              : `image/${format}`;
    return `  <source\n    type="${mimeType}"\n    srcset="${formatSrcset}"\n    sizes="${escapeHtml(sizes)}"\n  />`;
  });

  const pictureTag = [
    `<picture${classAttr}>`,
    ...sourceElements,
    `  <img`,
    `    src="${escapeHtml(config.baseUrl)}"`,
    `    alt="${escapeHtml(alt)}"`,
    `    loading="${loading}"`,
    `  />`,
    `</picture>`,
  ].join("\n");

  return {
    baseUrl: config.baseUrl,
    variants,
    srcsetAttr,
    imgTag,
    pictureTag,
  };
}
