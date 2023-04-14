/* eslint-disable import/prefer-default-export */
import React, { lazy, Suspense } from 'react';

import linkifyHtml from 'linkify-html';
import parse from 'html-react-parser';
import twemoji from 'twemoji';
import { sanitizeText } from './sanitize';

export const TWEMOJI_BASE_URL = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/';

const Math = lazy(() => import('../app/atoms/math/Math'));

const mathOptions = {
  replace: (node) => {
    const maths = node.attribs?.['data-mx-maths'];
    if (maths) {
      return (
        <Suspense fallback={<code>{maths}</code>}>
          <Math
            content={maths}
            throwOnError={false}
            errorColor="var(--tc-danger-normal)"
            displayMode={node.name === 'div'}
          />
        </Suspense>
      );
    }
    return null;
  },
};

/**
 * @param {string} text - text to twemojify
 * @param {object|undefined} opts - options for tweomoji.parse
 * @param {boolean} [linkify=false] - convert links to html tags (default: false)
 * @param {boolean} [sanitize=true] - sanitize html text (default: true)
 * @param {boolean} [maths=false] - render maths (default: false)
 * @returns React component
 */
export function twemojify(text, opts, linkify = false, sanitize = true, maths = false) {
  if (typeof text !== 'string') return text;
  let content = text;
  const options = opts ?? { base: TWEMOJI_BASE_URL };
  if (!options.base) {
    options.base = TWEMOJI_BASE_URL;
  }

  if (sanitize) {
    content = sanitizeText(content);
  }

  content = twemoji.parse(content, options);
  if (linkify) {
    content = linkifyHtml(content, {
      target: '_blank',
      rel: 'noreferrer noopener',
    });
  }
  return parse(content, maths ? mathOptions : null);
}
