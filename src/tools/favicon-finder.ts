export interface FaviconResult {
  domain: string;
  favicons: FaviconEntry[];
  checkedLocations: string[];
}

export interface FaviconEntry {
  url: string;
  source: string;
  type: string | null;
  sizes: string | null;
}

async function fetchText(url: string, timeoutMs = 10000): Promise<{ text: string; ok: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "MCP-Image-Tools/1.0" },
    });
    if (!response.ok) return { text: "", ok: false };
    const text = await response.text();
    return { text, ok: true };
  } catch {
    return { text: "", ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkUrl(url: string, timeoutMs = 8000): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function extractLinkTags(html: string, baseUrl: string): FaviconEntry[] {
  const entries: FaviconEntry[] = [];
  // Match <link> tags with rel containing "icon" or "apple-touch-icon"
  const linkRegex = /<link\s+[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const tag = match[0];
    const relMatch = tag.match(/rel\s*=\s*["']([^"']+)["']/i);
    if (!relMatch) continue;

    const rel = relMatch[1].toLowerCase();
    if (!rel.includes("icon")) continue;

    const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;

    const href = hrefMatch[1];
    const typeMatch = tag.match(/type\s*=\s*["']([^"']+)["']/i);
    const sizesMatch = tag.match(/sizes\s*=\s*["']([^"']+)["']/i);

    let resolvedUrl: string;
    try {
      resolvedUrl = new URL(href, baseUrl).href;
    } catch {
      continue;
    }

    entries.push({
      url: resolvedUrl,
      source: `HTML link[rel="${rel}"]`,
      type: typeMatch ? typeMatch[1] : null,
      sizes: sizesMatch ? sizesMatch[1] : null,
    });
  }

  return entries;
}

function extractManifestIcons(manifestJson: string, baseUrl: string): FaviconEntry[] {
  const entries: FaviconEntry[] = [];
  try {
    const manifest = JSON.parse(manifestJson);
    const icons = manifest.icons as Array<{ src: string; sizes?: string; type?: string }>;
    if (!Array.isArray(icons)) return entries;

    for (const icon of icons) {
      if (!icon.src) continue;
      let resolvedUrl: string;
      try {
        resolvedUrl = new URL(icon.src, baseUrl).href;
      } catch {
        continue;
      }
      entries.push({
        url: resolvedUrl,
        source: "manifest.json",
        type: icon.type || null,
        sizes: icon.sizes || null,
      });
    }
  } catch {
    // Invalid JSON
  }
  return entries;
}

export async function findFavicons(websiteUrl: string): Promise<FaviconResult> {
  const parsed = new URL(websiteUrl);
  const origin = parsed.origin;
  const domain = parsed.hostname;
  const checkedLocations: string[] = [];
  const favicons: FaviconEntry[] = [];
  const seenUrls = new Set<string>();

  function addFavicon(entry: FaviconEntry): void {
    if (!seenUrls.has(entry.url)) {
      seenUrls.add(entry.url);
      favicons.push(entry);
    }
  }

  // 1. Check /favicon.ico
  const faviconIcoUrl = `${origin}/favicon.ico`;
  checkedLocations.push(faviconIcoUrl);
  const icoExists = await checkUrl(faviconIcoUrl);
  if (icoExists) {
    addFavicon({
      url: faviconIcoUrl,
      source: "default /favicon.ico",
      type: "image/x-icon",
      sizes: null,
    });
  }

  // 2. Parse HTML for link tags
  checkedLocations.push(websiteUrl);
  const { text: html, ok: htmlOk } = await fetchText(websiteUrl);
  if (htmlOk) {
    const htmlFavicons = extractLinkTags(html, websiteUrl);
    for (const f of htmlFavicons) {
      addFavicon(f);
    }

    // 3. Check for manifest.json reference
    const manifestMatch = html.match(/<link\s+[^>]*rel\s*=\s*["']manifest["'][^>]*href\s*=\s*["']([^"']+)["']/i)
      || html.match(/<link\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']manifest["']/i);

    if (manifestMatch) {
      let manifestUrl: string;
      try {
        manifestUrl = new URL(manifestMatch[1], websiteUrl).href;
      } catch {
        manifestUrl = "";
      }

      if (manifestUrl) {
        checkedLocations.push(manifestUrl);
        const { text: manifestText, ok: manifestOk } = await fetchText(manifestUrl);
        if (manifestOk) {
          const manifestIcons = extractManifestIcons(manifestText, manifestUrl);
          for (const f of manifestIcons) {
            addFavicon(f);
          }
        }
      }
    }
  }

  // 4. Check common manifest location
  const defaultManifest = `${origin}/manifest.json`;
  if (!checkedLocations.includes(defaultManifest)) {
    checkedLocations.push(defaultManifest);
    const { text: manifestText, ok: manifestOk } = await fetchText(defaultManifest);
    if (manifestOk) {
      const manifestIcons = extractManifestIcons(manifestText, defaultManifest);
      for (const f of manifestIcons) {
        addFavicon(f);
      }
    }
  }

  return { domain, favicons, checkedLocations };
}
