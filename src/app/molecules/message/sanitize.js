import sanitizeHtml from 'sanitize-html';
import initMatrix from '../../../client/initMatrix';

function sanitizeColorizedTag(tagName, attributes) {
  const attribs = { ...attributes };
  const styles = [];
  if (attributes['data-mx-color']) {
    styles.push(`color: ${attributes['data-mx-color']};`);
  }
  if (attributes['data-mx-bg-color']) {
    styles.push(`background-color: ${attributes['data-mx-bg-color']};`);
  }
  attribs.style = styles.join(' ');

  return { tagName, attribs };
}

function sanitizeLinkTag(tagName, attribs) {
  const userLink = attribs.href.match(/^https?:\/\/matrix.to\/#\/(@.+:.+)/);
  if (userLink !== null) {
    // convert user link to pill
    const userId = userLink[1];
    return {
      tagName: 'span',
      attribs: {
        'data-mx-pill': userId,
      },
    };
  }

  return {
    tagName,
    attribs: {
      ...attribs,
      target: '_blank',
      rel: 'noreferrer noopener',
    },
  };
}

function sanitizeCodeTag(tagName, attributes) {
  const attribs = { ...attributes };
  let classes = [];
  if (attributes.class) {
    classes = attributes.class.split(/\s+/).filter((className) => className.match(/^language-(\w+)/));
  }

  return {
    tagName,
    attribs: {
      ...attribs,
      class: classes.join(' '),
    },
  };
}

function sanitizeImgTag(tagName, attributes) {
  const mx = initMatrix.matrixClient;
  const { src } = attributes;
  const attribs = { ...attributes };
  delete attribs.src;

  if (src.match(/^mxc:\/\//)) {
    attribs.src = mx.mxcUrlToHttp(src);
  }

  return { tagName, attribs };
}

export default function sanitize(body) {
  return sanitizeHtml(body, {
    allowedTags: [
      'font',
      'del',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'p',
      'a',
      'ul',
      'ol',
      'sup',
      'sub',
      'li',
      'b',
      'i',
      'u',
      'strong',
      'em',
      'strike',
      'code',
      'hr',
      'br',
      'div',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'caption',
      'pre',
      'span',
      'img',
      'details',
      'summary',
    ],
    allowedClasses: {},
    allowedAttributes: {
      ol: ['start'],
      img: ['width', 'height', 'alt', 'title', 'src', 'data-mx-emoticon'],
      a: ['name', 'target', 'href', 'rel'],
      code: ['class'],
      font: ['data-mx-bg-color', 'data-mx-color', 'color', 'style'],
      span: ['data-mx-bg-color', 'data-mx-color', 'data-mx-spoiler', 'style', 'data-mx-pill'],
    },
    allowProtocolRelative: false,
    allowedSchemesByTag: {
      a: ['https', 'http', 'ftp', 'mailto', 'magnet'],
      img: ['https', 'http'],
    },
    allowedStyles: {
      '*': {
        color: [/^#(0x)?[0-9a-f]+$/i],
        'background-color': [/^#(0x)?[0-9a-f]+$/i],
      },
    },
    nestingLimit: 100,
    nonTextTags: [
      'style', 'script', 'textarea', 'option', 'mx-reply',
    ],
    transformTags: {
      a: sanitizeLinkTag,
      img: sanitizeImgTag,
      code: sanitizeCodeTag,
      font: sanitizeColorizedTag,
      span: sanitizeColorizedTag,
    },
  });
}
