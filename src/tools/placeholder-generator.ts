export interface PlaceholderConfig {
  width: number;
  height?: number;
  backgroundColor?: string;
  textColor?: string;
  text?: string;
  format?: "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg";
  font?: string;
  fontSize?: number;
}

export interface PlaceholderResult {
  url: string;
  width: number;
  height: number;
  backgroundColor: string;
  textColor: string;
  text: string;
  format: string;
  htmlImg: string;
  markdownImg: string;
}

export function generatePlaceholder(config: PlaceholderConfig): PlaceholderResult {
  const width = Math.max(1, Math.min(config.width, 4000));
  const height = config.height ? Math.max(1, Math.min(config.height, 4000)) : width;
  const bgColor = (config.backgroundColor || "cccccc").replace(/^#/, "");
  const txtColor = (config.textColor || "333333").replace(/^#/, "");
  const format = config.format || "png";
  const text = config.text || `${width}x${height}`;

  // Build placehold.co URL
  let url = `https://placehold.co/${width}x${height}/${bgColor}/${txtColor}`;

  // Add format
  url += `.${format}`;

  // Add query params
  const params = new URLSearchParams();
  if (config.text) {
    params.set("text", config.text);
  }
  if (config.font) {
    params.set("font", config.font);
  }
  if (config.fontSize) {
    params.set("font-size", config.fontSize.toString());
  }

  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  const alt = `Placeholder ${width}x${height}`;

  return {
    url,
    width,
    height,
    backgroundColor: `#${bgColor}`,
    textColor: `#${txtColor}`,
    text,
    format,
    htmlImg: `<img src="${url}" alt="${alt}" width="${width}" height="${height}" />`,
    markdownImg: `![${alt}](${url})`,
  };
}

export function generatePlaceholderSet(
  sizes: Array<{ width: number; height?: number }>,
  options?: Omit<PlaceholderConfig, "width" | "height">
): PlaceholderResult[] {
  return sizes.map((size) =>
    generatePlaceholder({
      ...options,
      width: size.width,
      height: size.height,
    })
  );
}
