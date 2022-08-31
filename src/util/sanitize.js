import sanitizeHtml from 'sanitize-html';

const MAX_TAG_NESTING = 100;
let mx = null;

const permittedHtmlTags = [
  'font', 'del', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'p', 'a', 'ul', 'ol', 'sup', 'sub',
  'li', 'b', 'i', 'u', 'strong', 'em', 'strike', 'code',
  'hr', 'br', 'div', 'table', 'thead', 'tbody', 'tr', 'th',
  'td', 'caption', 'pre', 'span', 'img', 'details', 'summary',
];

const urlSchemes = ['https', 'http', 'ftp', 'mailto', 'magnet'];

const permittedTagToAttributes = {
  font: ['style', 'data-mx-bg-color', 'data-mx-color', 'color'],
  span: ['style', 'data-mx-bg-color', 'data-mx-color', 'data-mx-spoiler', 'data-mx-maths', 'data-mx-pill', 'data-mx-ping'],
  div: ['data-mx-maths'],
  a: ['name', 'target', 'href', 'rel'],
  img: ['width', 'height', 'alt', 'title', 'src', 'data-mx-emoticon'],
  ol: ['start'],
  code: ['class'],
};

function transformFontTag(tagName, attribs) {
  return {
    tagName,
    attribs: {
      ...attribs,
      style: `background-color: ${attribs['data-mx-bg-color']}; color: ${attribs['data-mx-color']}`,
    },
  };
}

function transformSpanTag(tagName, attribs) {
  return {
    tagName,
    attribs: {
      ...attribs,
      style: `background-color: ${attribs['data-mx-bg-color']}; color: ${attribs['data-mx-color']}`,
    },
  };
}

function transformATag(tagName, attribs) {
  const userLink = decodeURIComponent(attribs.href).match(/^https?:\/\/matrix.to\/#\/(@.+:.+)/);
  if (userLink !== null) {
    // convert user link to pill
    const userId = userLink[1];
    const pill = {
      tagName: 'span',
      attribs: {
        'data-mx-pill': userId,
      },
    };
    if (userId === mx?.getUserId()) {
      pill.attribs['data-mx-ping'] = undefined;
    }
    return pill;
  }

  const rex = /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/ug;
  const newHref = attribs.href.replace(rex, (match) => `[e-${match.codePointAt(0).toString(16)}]`);

  return {
    tagName,
    attribs: {
      ...attribs,
      href: newHref,
      rel: 'noopener',
      target: '_blank',
    },
  };
}

function transformImgTag(tagName, attribs) {
  const { src } = attribs;
  if (src.startsWith('mxc://') === false) {
    return {
      tagName: 'a',
      attribs: {
        href: src,
        rel: 'noopener',
        target: '_blank',
      },
      text: attribs.alt || src,
    };
  }
  return {
    tagName,
    attribs: {
      ...attribs,
      src: mx?.mxcUrlToHttp(src),
    },
  };
}

export function sanitizeCustomHtml(matrixClient, body) {
  mx = matrixClient;
  return sanitizeHtml(body, {
    allowedTags: permittedHtmlTags,
    allowedAttributes: permittedTagToAttributes,
    disallowedTagsMode: 'discard',
    allowedSchemes: urlSchemes,
    allowedSchemesByTag: {
      a: urlSchemes,
    },
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    allowedClasses: {
      code: ['language-*'],
    },
    allowedStyles: {
      '*': {
        color: [/^#(?:[0-9a-fA-F]{3}){1,2}$/],
        'background-color': [/^#(?:[0-9a-fA-F]{3}){1,2}$/],
      },
    },
    transformTags: {
      font: transformFontTag,
      span: transformSpanTag,
      a: transformATag,
      img: transformImgTag,
    },
    nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript', 'mx-reply'],
    nestingLimit: MAX_TAG_NESTING,
  });
}

export function sanitizeText(body) {
  const tagsToReplace = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return body.replace(/[&<>'"]/g, (tag) => tagsToReplace[tag] || tag);
}
