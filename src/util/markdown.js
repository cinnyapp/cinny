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

const emojiRegex = /^:([\w-]+):/;

const plainRules = {
  Array: {
    ...defaultRules.Array,
    plain: (arr, output, state) => arr.map((node) => output(node, state)).join(''),
  },
  userMention: {
    order: defaultRules.em.order - 0.9,
    match: inlineRegex(/^(@\S+:\S+)/),
    parse: (capture, _, state) => ({
      content: state.userNames[capture[1]] ? `@${state.userNames[capture[1]]}` : capture[1],
      id: capture[1],
    }),
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
    match: (source, state) => {
      if (!state.inline) return null;
      const capture = emojiRegex.exec(source);
      if (!capture) return null;
      const emoji = state.emojis.get(capture[1]);
      if (emoji) return capture;
      return null;
    },
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
    plain: (node, output, state) => {
      const out = output(node.content, state);
      if (node.level <= 2) {
        return `${out}\n${(node.level === 1 ? '=' : '-').repeat(out.length)}\n\n`;
      }
      return `${'#'.repeat(node.level)} ${out}\n\n`;
    },
  },
  hr: {
    ...defaultRules.hr,
    plain: () => '---\n\n',
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
    plain: (node, output, state) => `> ${output(node.content, state).trim().replace(/\n/g, '\n> ')}\n\n`,
  },
  list: {
    ...defaultRules.list,
    plain: (node, output, state) => `${node.items.map((item, i) => {
      const prefix = node.ordered ? `${node.start + i + 1}. ` : '* ';
      return prefix + output(item, state).replace(/\n/g, `\n${' '.repeat(prefix.length)}`);
    }).join('\n')}\n`,
  },
  def: undefined,
  table: {
    ...defaultRules.table,
    plain: (node, output, state) => {
      const header = node.header.map((content) => output(content, state));

      function lineWidth(i) {
        switch (node.align[i]) {
          case 'left':
          case 'right':
            return 2;
          case 'center':
            return 3;
          default:
            return 1;
        }
      }
      const colWidth = header.map((s, i) => Math.max(s.length, lineWidth(i)));

      const cells = node.cells.map((row) => row.map((content, i) => {
        const s = output(content, state);
        if (s.length > colWidth[i]) {
          colWidth[i] = s.length;
        }
        return s;
      }));

      function pad(s, i) {
        switch (node.align[i]) {
          case 'right':
            return s.padStart(colWidth[i]);
          case 'center':
            return s
              .padStart(s.length + Math.floor((colWidth[i] - s.length) / 2))
              .padEnd(colWidth[i]);
          default:
            return s.padEnd(colWidth[i]);
        }
      }

      const line = colWidth.map((len, i) => {
        switch (node.align[i]) {
          case 'left':
            return `:${'-'.repeat(len - 1)}`;
          case 'center':
            return `:${'-'.repeat(len - 2)}:`;
          case 'right':
            return `${'-'.repeat(len - 1)}:`;
          default:
            return '-'.repeat(len);
        }
      });

      const table = [
        header.map(pad),
        line,
        ...cells.map((row) => row.map(pad))];

      return table.map((row) => `| ${row.join(' | ')} |\n`).join('');
    },
  },
  displayMath: {
    order: defaultRules.table.order + 0.1,
    match: blockRegex(/^ *\$\$ *\n?([\s\S]+?)\n?\$\$ *(?:\n *)*\n/),
    parse: (capture) => ({ content: capture[1] }),
    plain: (node) => (node.content.includes('\n')
      ? `$$\n${node.content}\n$$\n`
      : `$$${node.content}$$\n`),
    html: (node) => mathHtml('div', node),
  },
  shrug: {
    order: defaultRules.escape.order - 0.1,
    match: inlineRegex(/^¯\\_\(ツ\)_\/¯/),
    parse: (capture) => ({ type: 'text', content: capture[0] }),
  },
  escape: {
    ...defaultRules.escape,
    plain: (node, output, state) => `\\${output(node.content, state)}`,
  },
  tableSeparator: {
    ...defaultRules.tableSeparator,
    plain: () => ' | ',
  },
  link: {
    ...defaultRules.link,
    plain: (node, output, state) => {
      const out = output(node.content, state);
      const target = sanitizeUrl(node.target) || '';
      if (out !== target || node.title) {
        return `[${out}](${target}${node.title ? ` "${node.title}"` : ''})`;
      }
      return out;
    },
    html: (node, output, state) => htmlTag('a', output(node.content, state), {
      href: sanitizeUrl(node.target) || '',
      title: node.title,
    }),
  },
  image: {
    ...defaultRules.image,
    plain: (node) => `![${node.alt}](${sanitizeUrl(node.target) || ''}${node.title ? ` "${node.title}"` : ''})`,
    html: (node) => htmlTag('img', '', {
      src: sanitizeUrl(node.target) || '',
      alt: node.alt,
      title: node.title,
    }, false),
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
    plain: (node) => `\`${node.content}\``,
  },
  spoiler: {
    order: defaultRules.inlineCode.order + 0.1,
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

  const plainOut = outputFor(rules, 'plain');
  const htmlOut = outputFor(rules, 'html');

  return (source, state) => {
    let content = parser(source, state);

    if (content.length === 1 && content[0].type === 'paragraph') {
      content = content[0].content;
    }

    const plain = plainOut(content, state).trim();
    const html = htmlOut(content, state);

    const plainHtml = html.replace(/<br>/g, '\n').replace(/<\/p><p>/g, '\n\n').replace(/<\/?p>/g, '');
    const onlyPlain = sanitizeText(plain) === plainHtml;

    return {
      onlyPlain,
      plain,
      html,
    };
  };
}

export const plain = genOut(plainRules);
export const markdown = genOut(markdownRules);
