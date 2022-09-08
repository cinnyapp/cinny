import SimpleMarkdown from '@khanacademy/simple-markdown';

const {
  defaultRules, parserFor, outputFor, anyScopeRegex, blockRegex, inlineRegex,
  sanitizeText, sanitizeUrl,
} = SimpleMarkdown;

function htmlTag(tagName, content, attributes, isClosed) {
  let s = '';
  Object.entries(attributes || {}).forEach(([k, v]) => {
    if (v !== undefined) {
      s += ` ${sanitizeText(k)}`;
      if (v !== null) s += `="${sanitizeText(v)}"`;
    }
  });

  s = `<${tagName}${s}>`;

  if (isClosed === false) {
    return s;
  }
  return `${s}${content}</${tagName}>`;
}

function mathHtml(wrap, node) {
  return htmlTag(wrap, htmlTag('code', sanitizeText(node.content)), { 'data-mx-maths': node.content });
}

const plainRules = {
  Array: {
    ...defaultRules.Array,
    plain: (arr, output, state) => arr.map((node) => output(node, state)).join(''),
  },
  userMention: {
    order: defaultRules.em.order - 0.9,
    match: inlineRegex(/^(@\S+:\S+)/),
    parse: (capture, _, state) => ({ content: `@${state.userNames[capture[1]]}`, id: capture[1] }),
    plain: (node) => node.content,
    html: (node) => htmlTag('a', sanitizeText(node.content), {
      href: `https://matrix.to/#/${encodeURIComponent(node.id)}`,
    }),
  },
  roomMention: {
    order: defaultRules.em.order - 0.8,
    match: inlineRegex(/^(#\S+:\S+)/), // TODO: Handle line beginning with roomMention (instead of heading)
    parse: (capture) => ({ content: capture[1], id: capture[1] }),
    plain: (node) => node.content,
    html: (node) => htmlTag('a', sanitizeText(node.content), {
      href: `https://matrix.to/#/${encodeURIComponent(node.id)}`,
    }),
  },
  emoji: {
    order: defaultRules.em.order - 0.1,
    match: inlineRegex(/^:([\w-]+):/),
    parse: (capture, _, state) => ({ content: capture[1], emoji: state.emojis.get(capture[1]) }),
    plain: ({ emoji }) => (emoji.mxc
      ? `:${emoji.shortcode}:`
      : emoji.unicode),
    html: ({ emoji }) => (emoji.mxc
      ? htmlTag('img', null, {
        'data-mx-emoticon': null,
        src: emoji.mxc,
        alt: `:${emoji.shortcode}:`,
        title: `:${emoji.shortcode}:`,
        height: 32,
      }, false)
      : emoji.unicode),
  },
  newline: {
    ...defaultRules.newline,
    plain: () => '\n',
  },
  paragraph: {
    ...defaultRules.paragraph,
    plain: (node, output, state) => `${output(node.content, state)}\n\n`,
    html: (node, output, state) => htmlTag('p', output(node.content, state)),
  },
  br: {
    ...defaultRules.br,
    match: anyScopeRegex(/^ *\n/),
    plain: () => '\n',
  },
  text: {
    ...defaultRules.text,
    match: anyScopeRegex(/^[\s\S]+?(?=[^0-9A-Za-z\s\u00c0-\uffff]| *\n|\w+:\S|$)/),
    plain: (node) => node.content,
  },
};

const markdownRules = {
  ...defaultRules,
  ...plainRules,
  heading: {
    ...defaultRules.heading,
    plain: (node, output, state) => `${'#'.repeat(node.level)} ${output(node.content, state)}`,
  },
  hr: {
    ...defaultRules.hr,
    plain: () => '---',
  },
  codeBlock: {
    ...defaultRules.codeBlock,
    plain: (node) => `\`\`\`${node.lang || ''}\n${node.content}\n\`\`\``,
  },
  fence: {
    ...defaultRules.fence,
    match: blockRegex(/^ *(`{3,}|~{3,}) *(?:(\S+) *)?\n([\s\S]+?)\n?\1 *(?:\n *)*\n/),
  },
  blockQuote: {
    ...defaultRules.blockQuote,
    plain: (node, output, state) => `> ${output(node.content, state).replaceAll('\n', '\n> ')}`,
  },
  list: {
    ...defaultRules.list,
    plain: (node, output, state) => node.items.map((item, i) => {
      const prefix = node.ordered ? `${node.start + i + 1}. ` : '* ';
      return prefix + output(item, state).replaceAll('\n', `\n${' '.repeat(prefix.length)}`);
    }).join('\n'),
  },
  displayMath: {
    order: defaultRules.list.order + 0.5,
    match: blockRegex(/^ *\$\$ *\n?([\s\S]+?)\n?\$\$ *(?:\n *)*\n/),
    parse: (capture) => ({ content: capture[1] }),
    plain: (node) => `$$\n${node.content}\n$$`,
    html: (node) => mathHtml('div', node),
  },
  def: undefined,
  shrug: {
    order: defaultRules.escape.order - 0.5,
    match: inlineRegex(/^¯\\_\(ツ\)_\/¯/),
    parse: (capture) => ({ type: 'text', content: capture[0] }),
  },
  escape: {
    ...defaultRules.escape,
    plain: (node, output, state) => `\\${output(node.content, state)}`,
  },
  link: {
    ...defaultRules.link,
    plain: (node, output, state) => `[${output(node.content, state)}](${sanitizeUrl(node.target) || ''}${node.title ? ` "${node.title}"` : ''})`,
    html: (node, output, state) => htmlTag('a', output(node.content, state), {
      href: sanitizeUrl(node.target) || '',
      title: node.title,
    }),
  },
  image: {
    ...defaultRules.image,
    plain: (node) => `![${node.alt}](${sanitizeUrl(node.target) || ''}${node.title ? ` "${node.title}"` : ''})`,
    html: (node, output, state) => htmlTag('img', output(node.content, state), {
      src: sanitizeUrl(node.target) || '',
      alt: node.alt,
      title: node.title,
    }),
  },
  reflink: undefined,
  refimage: undefined,
  em: {
    ...defaultRules.em,
    plain: (node, output, state) => `_${output(node.content, state)}_`,
  },
  strong: {
    ...defaultRules.strong,
    plain: (node, output, state) => `**${output(node.content, state)}**`,
  },
  u: {
    ...defaultRules.u,
    plain: (node, output, state) => `__${output(node.content, state)}__`,
  },
  del: {
    ...defaultRules.del,
    plain: (node, output, state) => `~~${output(node.content, state)}~~`,
  },
  inlineCode: {
    ...defaultRules.inlineCode,
    plain: (node, output, state) => `\`${output(node.content, state)}\``,
  },
  spoiler: {
    order: defaultRules.del.order + 0.1,
    match: inlineRegex(/^\|\|([\s\S]+?)\|\|(?:\(([\s\S]+?)\))?/),
    parse: (capture, parse, state) => ({
      content: parse(capture[1], state),
      reason: capture[2],
    }),
    plain: (node, output, state) => `[spoiler${node.reason ? `: ${node.reason}` : ''}](${output(node.content, state)})`,
    html: (node, output, state) => htmlTag(
      'span',
      output(node.content, state),
      { 'data-mx-spoiler': node.reason || null },
    ),
  },
  inlineMath: {
    order: defaultRules.del.order + 0.2,
    match: inlineRegex(/^\$(\S[\s\S]+?\S|\S)\$(?!\d)/),
    parse: (capture) => ({ content: capture[1] }),
    plain: (node) => `$${node.content}$`,
    html: (node) => mathHtml('span', node),
  },
};

function genOut(rules) {
  const parser = parserFor(rules);

  const plain = outputFor(rules, 'plain');
  const html = outputFor(rules, 'html');

  return (source, state) => {
    let content = parser(source, state);
    console.debug(content);
    if (content.length === 1 && content[0].type === 'paragraph') {
      content = content[0].content;
    }

    let plainOut;
    try {
      plainOut = plain(content, state);
    } catch {
      // use source instead
    }

    return {
      plain: plainOut?.trim() || source,
      // plain: plain(content, state),
      html: html(content, state),
    };
  };
}

export const plain = genOut(plainRules);
export const markdown = genOut(markdownRules);
