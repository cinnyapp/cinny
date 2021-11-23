/* eslint-disable import/prefer-default-export */
import linkifyHtml from 'linkifyjs/html';
import parse from 'html-react-parser';
import twemoji from 'twemoji';
import { sanitizeText } from './sanitize';

/**
 * @param {string} text - text to twemojify
 * @param {object|undefined} opts - options for tweomoji.parse
 * @param {boolean} [linkify=false] - convert links to html tags (default: false)
 * @param {boolean} [sanitize=true] - sanitize html text (default: true)
 * @returns React component
 */
export function twemojify(text, opts, linkify = false, sanitize = true) {
  if (typeof text !== 'string') return text;
  let content = sanitize ? twemoji.parse(sanitizeText(text), opts) : twemoji.parse(text, opts);
  if (linkify) {
    content = linkifyHtml(content, { target: '_blank', rel: 'noreferrer noopener' });
  }
  return parse(content);
}
