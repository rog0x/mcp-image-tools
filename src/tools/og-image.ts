export interface OgImageResult {
  url: string;
  ogImage: string | null;
  ogImageAlt: string | null;
  ogImageWidth: string | null;
  ogImageHeight: string | null;
  ogImageType: string | null;
  twitterImage: string | null;
  twitterCard: string | null;
  appleTouchIcon: string | null;
  allImages: ImageEntry[];
}

export interface ImageEntry {
  url: string;
  source: string;
  alt: string | null;
}

function extractMetaContent(html: string, property: string): string | null {
  // Match both property="..." and name="..." attributes
  const patterns = [
    new RegExp(`<meta\\s+[^>]*property\\s*=\\s*["']${escapeRegex(property)}["'][^>]*content\\s*=\\s*["']([^"']+)["']`, "i"),
    new RegExp(`<meta\\s+[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*property\\s*=\\s*["']${escapeRegex(property)}["']`, "i"),
    new RegExp(`<meta\\s+[^>]*name\\s*=\\s*["']${escapeRegex(property)}["'][^>]*content\\s*=\\s*["']([^"']+)["']`, "i"),
    new RegExp(`<meta\\s+[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*name\\s*=\\s*["']${escapeRegex(property)}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractAppleTouchIcon(html: string, baseUrl: string): string | null {
  const match = html.match(/<link\s+[^>]*rel\s*=\s*["']apple-touch-icon["'][^>]*href\s*=\s*["']([^"']+)["']/i)
    || html.match(/<link\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']apple-touch-icon["']/i);

  if (match) {
    try {
      return new URL(match[1], baseUrl).href;
    } catch {
      return null;
    }
  }
  return null;
}

function resolveUrl(href: string | null, baseUrl: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

export async function extractOgImage(url: string): Promise<OgImageResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "MCP-Image-Tools/1.0" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const allImages: ImageEntry[] = [];

    // Extract OG image properties
    const ogImage = resolveUrl(extractMetaContent(html, "og:image"), url);
    const ogImageAlt = extractMetaContent(html, "og:image:alt");
    const ogImageWidth = extractMetaContent(html, "og:image:width");
    const ogImageHeight = extractMetaContent(html, "og:image:height");
    const ogImageType = extractMetaContent(html, "og:image:type");

    if (ogImage) {
      allImages.push({ url: ogImage, source: "og:image", alt: ogImageAlt });
    }

    // Extract Twitter card image
    const twitterImage = resolveUrl(extractMetaContent(html, "twitter:image"), url);
    const twitterCard = extractMetaContent(html, "twitter:card");

    if (twitterImage && twitterImage !== ogImage) {
      allImages.push({ url: twitterImage, source: "twitter:image", alt: null });
    }

    // Extract Apple touch icon
    const appleTouchIcon = extractAppleTouchIcon(html, url);

    if (appleTouchIcon) {
      allImages.push({ url: appleTouchIcon, source: "apple-touch-icon", alt: null });
    }

    return {
      url,
      ogImage,
      ogImageAlt,
      ogImageWidth,
      ogImageHeight,
      ogImageType,
      twitterImage,
      twitterCard,
      appleTouchIcon,
      allImages,
    };
  } finally {
    clearTimeout(timeout);
  }
}
