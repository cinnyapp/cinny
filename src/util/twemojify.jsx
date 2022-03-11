/* eslint-disable import/prefer-default-export */
import React, { lazy, Suspense } from 'react';

import linkifyHtml from 'linkifyjs/html';
import parse from 'html-react-parser';
import twemoji from 'twemoji';
import { sanitizeText } from './sanitize';

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

  if (sanitize) {
    content = sanitizeText(content);
  }
  content = twemoji.parse(content, opts);
  if (linkify) {
    content = linkifyHtml(content, {
      target: '_blank',
      rel: 'noreferrer noopener',
    });
  }
  return parse(content, maths ? mathOptions : null);
}
