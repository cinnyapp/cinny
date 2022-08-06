import SimpleMarkdown from '@khanacademy/simple-markdown';

const {
  inlineRegex, parseCaptureInline, blockRegex, defaultRules, parserFor, outputFor,
} = SimpleMarkdown;

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
    html: (node) => `<div data-mx-maths="${node.content}"><code>${node.content}</code></div>`,
  },
  newline: {
    ...defaultRules.newline,
    plain: () => '\n',
  },
  paragraph: {
    ...defaultRules.paragraph,
    plain: (node, output, state) => output(node.content, state),
    html: (node, output, state) => `<p>${output(node.content, state)}</p>`,
    // html: (node, output, state) => output(node.content, state),
  },
  spoiler: {
    order: defaultRules.em.order - 0.5,
    match: inlineRegex(/^\|\|([\s\S]+?)\|\|/),
    parse: parseCaptureInline,
    plain: () => '<spoiler>',
    html: (node, output, state) => `<span data-mx-spoiler>${output(node.content, state)}</span>`,
  },
  sup: {
    order: defaultRules.del.order + 0.5,
    match: inlineRegex(/^\^([\s\S]+?)\^(?!\^)/),
    parse: parseCaptureInline,
    html: (node, output, state) => `<sup>${output(node.content, state)}</sup>`,
  },
  sub: {
    order: defaultRules.del.order + 0.5,
    match: inlineRegex(/^~([\s\S]+?)~(?!~)/),
    parse: parseCaptureInline,
    html: (node, output, state) => `<sub>${output(node.content, state)}</sub>`,
  },
  math: {
    order: defaultRules.del.order + 0.5,
    match: inlineRegex(/^\$(\S[\s\S]+?\S|\S)\$(?!\d)/),
    parse: (capture) => ({ content: capture[1] }),
    plain: (node) => `$${node.content}$`,
    html: (node) => `<span data-mx-maths="${node.content}"><code>${node.content}</code></span>`,
  },
  text: {
    ...defaultRules.text,
    plain: (node) => node.content,
  },
};

const parser = parserFor(rules);

const plainOutput = outputFor(rules, 'plain');
const htmlOutput = outputFor(rules, 'html');

export {
  parser, plainOutput, htmlOutput,
};
