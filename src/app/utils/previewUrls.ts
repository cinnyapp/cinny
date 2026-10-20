import { URL_REG } from './regex';

/**
 * `[label](https://target)` - a Markdown link written into a plain-text body.
 * Bridges do this: mautrix-meta (Instagram) sends a reel as an m.video whose
 * caption body is `[https://www.instagram.com/reel/X/](https://www.instagram.com/reel/X/?id=...)`.
 * Matching plain URLs in that text produced one bogus
 * `https://...reel/X/](https://...reel/X/?id=...` URL, which the homeserver
 * then tried (and failed, 502 "Got error 404") to fetch a preview for.
 */
const MARKDOWN_LINK_REG = /\[[^\]\n]*\]\((https?:\/\/[^\s()]+)\)/g;

/** The URLs in a message body worth fetching a link preview for, in order, unique. */
export const extractPreviewUrls = (body: string): string[] => {
  const urls: string[] = [];
  const rest = body.replace(MARKDOWN_LINK_REG, (_match, target: string) => {
    urls.push(target);
    return ' ';
  });
  rest.match(URL_REG)?.forEach((url) => urls.push(url));
  return [...new Set(urls)];
};
