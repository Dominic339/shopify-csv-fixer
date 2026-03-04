// src/lib/guides/mdxLoader.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type CuratedGuideFrontmatter = {
  title: string;
  description: string;
  keywords: string[];
  lastUpdated: string;
  kind: "curated";
  // Optional summary enrichment (shown in the Guide Summary card)
  whatYouLearn?: string[];
  bestFor?: string;
  timeToComplete?: string;
};

export type CuratedGuideEntry = CuratedGuideFrontmatter & {
  platform: string;
  slug: string;
  filePath: string;
};

const GUIDES_CONTENT_DIR = path.join(process.cwd(), "src", "content", "guides");

function listMdxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMdxFiles(fullPath));
    } else if (entry.name.endsWith(".mdx")) {
      files.push(fullPath);
    }
  }
  return files;
}

/** Strip a UTF-8 BOM (U+FEFF) if present. Excel sometimes writes one. */
function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export function listCuratedGuides(): CuratedGuideEntry[] {
  const files = listMdxFiles(GUIDES_CONTENT_DIR);
  return files.map((filePath) => {
    const raw = stripBom(fs.readFileSync(filePath, "utf-8"));
    const { data } = matter(raw);
    const fm = data as CuratedGuideFrontmatter;
    // Derive platform + slug from path relative to GUIDES_CONTENT_DIR
    // e.g. src/content/guides/general/csv-basics-for-imports.mdx
    //      → platform: "general", slug: "csv-basics-for-imports"
    const rel = path.relative(GUIDES_CONTENT_DIR, filePath);
    const parts = rel.replace(/\\/g, "/").split("/");
    const platform = parts[0];
    const slug = parts[parts.length - 1].replace(/\.mdx$/, "");
    return { ...fm, platform, slug, filePath };
  });
}

export function readCuratedGuide(
  platform: string,
  slug: string,
): { frontmatter: CuratedGuideFrontmatter; rawMdx: string } | null {
  const filePath = path.join(GUIDES_CONTENT_DIR, platform, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = stripBom(fs.readFileSync(filePath, "utf-8"));
  const { data, content } = matter(raw);
  return { frontmatter: data as CuratedGuideFrontmatter, rawMdx: content };
}
