#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getImageMetadata } from "./tools/image-meta.js";
import { findFavicons } from "./tools/favicon-finder.js";
import { extractOgImage } from "./tools/og-image.js";
import { generatePlaceholder, generatePlaceholderSet } from "./tools/placeholder-generator.js";
import { generateResponsiveImages } from "./tools/responsive-images.js";

const server = new Server(
  {
    name: "mcp-image-tools",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "image_metadata",
      description:
        "Read image metadata from a URL via HTTP headers: content-type, file size, last-modified, etag, cache info. No image downloading required.",
      inputSchema: {
        type: "object" as const,
        properties: {
          url: {
            type: "string",
            description: "Direct URL to an image file",
          },
        },
        required: ["url"],
      },
    },
    {
      name: "find_favicons",
      description:
        "Find all favicons for a website. Checks /favicon.ico, parses HTML link tags, and inspects manifest.json. Returns all found favicons with sizes and types.",
      inputSchema: {
        type: "object" as const,
        properties: {
          url: {
            type: "string",
            description: "Website URL to find favicons for (e.g. https://example.com)",
          },
        },
        required: ["url"],
      },
    },
    {
      name: "extract_og_image",
      description:
        "Extract Open Graph image, Twitter card image, and Apple touch icon from any URL. Returns all social media preview images found on the page.",
      inputSchema: {
        type: "object" as const,
        properties: {
          url: {
            type: "string",
            description: "URL of the web page to extract images from",
          },
        },
        required: ["url"],
      },
    },
    {
      name: "generate_placeholder",
      description:
        "Generate placeholder image URLs via placehold.co. Supports custom size, colors, text, format, and font. Returns URL plus ready-to-use HTML and Markdown markup.",
      inputSchema: {
        type: "object" as const,
        properties: {
          width: {
            type: "number",
            description: "Image width in pixels (1-4000)",
          },
          height: {
            type: "number",
            description: "Image height in pixels (1-4000). Defaults to same as width.",
          },
          backgroundColor: {
            type: "string",
            description: "Background color hex without # (e.g. 'cccccc'). Default: cccccc",
          },
          textColor: {
            type: "string",
            description: "Text color hex without # (e.g. '333333'). Default: 333333",
          },
          text: {
            type: "string",
            description: "Custom text to display on the image. Default: WIDTHxHEIGHT",
          },
          format: {
            type: "string",
            description: "Image format: png, jpg, jpeg, gif, webp, svg. Default: png",
            enum: ["png", "jpg", "jpeg", "gif", "webp", "svg"],
          },
          font: {
            type: "string",
            description: "Font name (e.g. 'roboto', 'open-sans', 'montserrat')",
          },
          fontSize: {
            type: "number",
            description: "Font size in pixels",
          },
          sizes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                width: { type: "number" },
                height: { type: "number" },
              },
              required: ["width"],
            },
            description:
              "Generate multiple placeholders at once. If provided, width/height params are ignored.",
          },
        },
        required: ["width"],
      },
    },
    {
      name: "responsive_images",
      description:
        "Generate srcset and <picture> element HTML for responsive images. Given a base image URL, produces multiple size variants with proper HTML markup for responsive design.",
      inputSchema: {
        type: "object" as const,
        properties: {
          baseUrl: {
            type: "string",
            description: "Base image URL that accepts width/format query parameters",
          },
          alt: {
            type: "string",
            description: "Alt text for the image",
          },
          widths: {
            type: "array",
            items: { type: "number" },
            description:
              "Array of widths to generate (default: [320, 640, 768, 1024, 1280, 1536, 1920])",
          },
          sizes: {
            type: "string",
            description:
              "CSS sizes attribute (default: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw')",
          },
          className: {
            type: "string",
            description: "CSS class name to add to the element",
          },
          loading: {
            type: "string",
            description: "Loading strategy: 'lazy' or 'eager' (default: lazy)",
            enum: ["lazy", "eager"],
          },
          formats: {
            type: "array",
            items: { type: "string" },
            description:
              "Image formats for <picture> sources (default: ['webp', auto-detected original format])",
          },
        },
        required: ["baseUrl"],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "image_metadata": {
        const result = await getImageMetadata(args?.url as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "find_favicons": {
        const result = await findFavicons(args?.url as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "extract_og_image": {
        const result = await extractOgImage(args?.url as string);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "generate_placeholder": {
        const sizes = args?.sizes as Array<{ width: number; height?: number }> | undefined;
        if (sizes && sizes.length > 0) {
          const results = generatePlaceholderSet(sizes, {
            backgroundColor: args?.backgroundColor as string | undefined,
            textColor: args?.textColor as string | undefined,
            text: args?.text as string | undefined,
            format: args?.format as "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | undefined,
            font: args?.font as string | undefined,
            fontSize: args?.fontSize as number | undefined,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
          };
        }
        const result = generatePlaceholder({
          width: args?.width as number,
          height: args?.height as number | undefined,
          backgroundColor: args?.backgroundColor as string | undefined,
          textColor: args?.textColor as string | undefined,
          text: args?.text as string | undefined,
          format: args?.format as "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | undefined,
          font: args?.font as string | undefined,
          fontSize: args?.fontSize as number | undefined,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "responsive_images": {
        const result = generateResponsiveImages({
          baseUrl: args?.baseUrl as string,
          alt: args?.alt as string | undefined,
          widths: args?.widths as number[] | undefined,
          sizes: args?.sizes as string | undefined,
          className: args?.className as string | undefined,
          loading: args?.loading as "lazy" | "eager" | undefined,
          formats: args?.formats as string[] | undefined,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Image Tools server running on stdio");
}

main().catch(console.error);
