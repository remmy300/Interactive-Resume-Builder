/**
 * A hyperlink found in an uploaded CV. Hyperlinked words such as "Live Demo" or
 * "GitHub" hold their address in the file, not in the visible text, so the
 * importer reads them separately and matches them back to the line they sit on.
 */
export interface LinkRef {
  url: string;
  /**
   * Visible text the link is attached to: the words of the link itself for Word
   * and Markdown ("Live Demo"), or the whole line for PDFs ("Live Demo | Github").
   */
  label: string;
  /** PDFs only: links with the same key sit on the same visual line. */
  lineKey?: string;
}

const CODE_HOST = /(^|[/.])(github|gitlab|bitbucket)\.(com|org)(\/|$)/i;

export const isCodeHost = (url: string) => CODE_HOST.test(url);

const isWebUrl = (value: string) => /^https?:\/\//i.test(value);

const stripTags = (html: string) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Links from the HTML Word documents are converted to. */
export function linksFromHtml(html: string): LinkRef[] {
  const links: LinkRef[] = [];
  for (const match of html.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = match[1].replace(/&amp;/g, "&");
    if (isWebUrl(url)) links.push({ url, label: stripTags(match[2]) });
  }
  return links;
}

/** Turns [label](address) into plain label text and reports the addresses. */
export function linksFromMarkdown(text: string): { text: string; links: LinkRef[] } {
  const links: LinkRef[] = [];
  const plain = text.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_match, label, url) => {
    links.push({ url, label: String(label).trim() });
    return label;
  });
  return { text: plain, links };
}

/** Splits a project's addresses into its live link and its code repository. */
export function classifyProjectLinks(urls: string[]): { link: string; github: string } {
  let link = "";
  let github = "";
  for (const raw of urls) {
    const url = raw.trim().replace(/[),.;]+$/, "");
    if (!url || /linkedin\.com/i.test(url)) continue;
    if (isCodeHost(url)) {
      if (!github) github = url;
    } else if (!link) {
      link = url;
    }
  }
  return { link, github };
}
