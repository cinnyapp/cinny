/* eslint-disable import/prefer-default-export */
import React from 'react';
import linkifyHtml from 'linkify-html';
import parse from 'html-react-parser';
import PropTypes from 'prop-types';
import { sanitizeText } from './sanitize';

export const TWEMOJI_BASE_URL = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/';

/**
 * @param {string} text - text to twemojify
 * @param {object|undefined} opts - DEPRECATED - options for tweomoji.parse
 * @param {boolean} [linkify=false] - convert links to html tags (default: false)
 * @param {boolean} [sanitize=true] - sanitize html text (default: true)
 * @param {boolean} [maths=false] - DEPRECATED - render maths (default: false)
 * @returns React component
 */
export function twemojify(text, opts, linkify = false, sanitize = true) {
  if (typeof text !== 'string') return text;
  let content = text;

  if (sanitize) {
    content = sanitizeText(content);
  }

  if (linkify) {
    content = linkifyHtml(content, {
      target: '_blank',
      rel: 'noreferrer noopener',
    });
  }
  return parse(content);
}

export function Twemojify({ text }) {
  return (
    <>
      {twemojify(text)}
    </>
  );
}

Twemojify.defaultProps = {
  text: null,
};

Twemojify.propTypes = {
  text: PropTypes.string,
};