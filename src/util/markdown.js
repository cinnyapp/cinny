import SimpleMarkdown from '@khanacademy/simple-markdown';

const {
  defaultRules, parserFor, outputFor, anyScopeRegex, blockRegex, inlineRegex, htmlTag, sanitizeText,
} = SimpleMarkdown;

function mathHtml(wrap, node) {
  return htmlTag(wrap, htmlTag('code', sanitizeText(node.content)), { 'data-mx-maths': node.content });
}

const rules = {
  ...defaultRules,
  Array: {
    ...defaultRules.Array,
    plain: (arr, output, state) => arr.map((node) => output(node, state)).join(''),
  },
  displayMath: {
    order: defaultRules.list.order + 0.5,
    match: blockRegex(/^\$\$\n*([\s\S]+?)\n*\$\$/),
    parse: (capture) => ({ content: capture[1] }),
    plain: (node) => `$$\n${node.content}\n$$`,
    html: (node) => mathHtml('div', node),
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
  escape: {
    ...defaultRules.escape,
    plain: (node, output, state) => `\\${output(node.content, state)}`,
  },
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
  spoiler: {
    order: defaultRules.em.order - 0.5,
    match: inlineRegex(/^\|\|([\s\S]+?)\|\|(?:\(([\s\S]+?)\))?/),
    parse: (capture, parse, state) => ({
      content: parse(capture[1], state),
      reason: capture[2],
    }),
    plain: (node) => `[spoiler${node.reason ? `: ${node.reason}` : ''}](mxc://somewhere)`,
    html: (node, output, state) => `<span data-mx-spoiler${node.reason ? `="${sanitizeText(node.reason)}"` : ''}>${output(node.content, state)}</span>`,
  },
  inlineMath: {
    order: defaultRules.del.order + 0.5,
    match: inlineRegex(/^\$(\S[\s\S]+?\S|\S)\$(?!\d)/),
    parse: (capture) => ({ content: capture[1] }),
    plain: (node) => `$${node.content}$`,
    html: (node) => mathHtml('span', node),
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

const parser = parserFor(rules);

const plainOutput = outputFor(rules, 'plain');
const htmlOutput = outputFor(rules, 'html');

export {
  parser, plainOutput, htmlOutput,
};
