import sanitizeHtml, { Transformer } from 'sanitize-html';

const MAX_TAG_NESTING = 100;

const permittedHtmlTags = [
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
  's',
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
];

const urlSchemes = ['https', 'http', 'ftp', 'mailto', 'magnet'];

const permittedTagToAttributes = {
  font: ['style', 'data-mx-bg-color', 'data-mx-color', 'color'],
  span: [
    'style',
    'data-mx-bg-color',
    'data-mx-color',
    'data-mx-spoiler',
    'data-mx-maths',
    'data-mx-pill',
    'data-mx-ping',
    'data-md',
  ],
  div: ['data-mx-maths'],
  blockquote: ['data-md'],
  h1: ['data-md'],
  h2: ['data-md'],
  h3: ['data-md'],
  h4: ['data-md'],
  h5: ['data-md'],
  h6: ['data-md'],
  pre: ['data-md', 'class'],
  ol: ['start', 'type', 'data-md'],
  ul: ['data-md'],
  a: ['name', 'target', 'href', 'rel', 'data-md'],
  img: ['width', 'height', 'alt', 'title', 'src', 'data-mx-emoticon'],
  code: ['class', 'data-md'],
  strong: ['data-md'],
  i: ['data-md'],
  em: ['data-md'],
  u: ['data-md'],
  s: ['data-md'],
  del: ['data-md'],
};

const transformFontTag: Transformer = (tagName, attribs) => ({
  tagName,
  attribs: {
    ...attribs,
    style: `background-color: ${attribs['data-mx-bg-color']}; color: ${attribs['data-mx-color']}`,
  },
});

const transformSpanTag: Transformer = (tagName, attribs) => ({
  tagName,
  attribs: {
    ...attribs,
    style: `background-color: ${attribs['data-mx-bg-color']}; color: ${attribs['data-mx-color']}`,
  },
});

const transformATag: Transformer = (tagName, attribs) => ({
  tagName,
  attribs: {
    ...attribs,
    rel: 'noopener',
    target: '_blank',
  },
});

const transformImgTag: Transformer = (tagName, attribs) => {
  const { src } = attribs;
  if (typeof src === 'string' && src.startsWith('mxc://') === false) {
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
    },
  };
};

export const sanitizeCustomHtml = (customHtml: string): string =>
  sanitizeHtml(customHtml, {
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

export const sanitizeText = (body: string) => {
  const tagsToReplace: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return body.replace(/[&<>'"]/g, (tag) => tagsToReplace[tag] || tag);
};
