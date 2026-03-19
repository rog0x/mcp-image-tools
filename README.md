# mcp-image-tools

MCP server providing image analysis tools for AI agents. Metadata inspection only -- no image processing or manipulation.

## Tools

### image_metadata
Read image metadata from a URL using HTTP headers. Returns content-type, file size, last-modified, etag, and cache info without downloading the full image.

### find_favicons
Find all favicons for any website. Checks `/favicon.ico`, parses HTML `<link>` tags, and inspects `manifest.json`. Returns all discovered favicons with sizes and types.

### extract_og_image
Extract Open Graph image, Twitter card image, and Apple touch icon from any URL. Useful for generating link previews.

### generate_placeholder
Generate placeholder image URLs via the placehold.co API. Supports custom dimensions, colors, text, format, and font. Returns the URL plus ready-to-use HTML and Markdown markup. Can generate multiple sizes at once.

### responsive_images
Generate `srcset` and `<picture>` element HTML for responsive images. Given a base image URL, produces multiple size variants with proper markup for responsive design, including multi-format `<source>` elements.

## Setup

```bash
npm install
npm run build
```

## Usage with Claude Desktop

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "image-tools": {
      "command": "node",
      "args": ["path/to/mcp-image-tools/dist/index.js"]
    }
  }
}
```

## License

MIT
