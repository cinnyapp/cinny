/* eslint-disable no-param-reassign */
/* eslint-disable no-undef */

import { html, markdown } from './markdown';

function mdTest(source, plain, htmlStr, state) {
  test(source, () => {
    if (typeof htmlStr === 'object') {
      state = htmlStr;
      htmlStr = undefined;
    }
    if (htmlStr === undefined) {
      htmlStr = plain;
      plain = source;
    }

    const content = markdown(source, { kind: 'edit', ...state });
    expect(content.plain).toBe(plain);
    expect(content.html).toBe(htmlStr);

    const htmlContent = html(htmlStr, { kind: 'edit', onlyPlain: true, ...state });
    expect(htmlContent.plain).toBe(plain);
  });
}

function htmlTest(source, plain, htmlStr) {
  test(source, () => {
    const content = html(source, { kind: 'edit', onlyPlain: htmlStr === undefined });
    expect(content.plain).toBe(plain);
    if (htmlStr !== undefined) {
      expect(content.html).toBe(htmlStr);
    }
  });
}

describe('text', () => {
  mdTest('some text', 'some text');

  mdTest('text\nwith\nnewlines', 'text<br>with<br>newlines');

  // mdTest('text\n\nwith many\n\n\nnewlines', 'text<br><br>with many<br><br><br>newlines');

  // mdTest('¯\\_(ツ)_/¯', '¯\\_(ツ)_/¯');
  mdTest('¯\\_(ツ)_/¯', '¯\\\\_(ツ)\\_/¯', '¯\\_(ツ)_/¯');

  mdTest('\\*escape*', '\\*escape\\*', '*escape*');
});

describe('inline', () => {
  mdTest('*italic* or _italic_', '_italic_ or _italic_', '<em>italic</em> or <em>italic</em>');
  mdTest('**bold**', '<strong>bold</strong>');
  mdTest('__underline__', '<u>underline</u>');
  mdTest('~~strikethrough~~', '<del>strikethrough</del>');
});

describe('spoiler', () => {
  mdTest('||content||', '<span data-mx-spoiler>content</span>');
  mdTest('||content||(reason)', '<span data-mx-spoiler="reason">content</span>');

  let content = markdown('||content||', { kind: 'notification', onlyPlain: true });
  expect(content.plain).toBe('<spoiler>');

  content = markdown('||content||(reason)', { kind: 'notification', onlyPlain: true });
  expect(content.plain).toBe('<spoiler: reason>');

  content = markdown('||content||', { onlyPlain: true });
  expect(content.plain).toBe('[spoiler](content)');

  content = markdown('||content||(reason)', { onlyPlain: true });
  expect(content.plain).toBe('[spoiler: reason](content)');
});

describe('hr', () => {
  mdTest('---', '<hr>');
  mdTest('***', '---', '<hr>');
  mdTest('___', '---', '<hr>');
});

describe('code', () => {
  mdTest('`inline`', '<code>inline</code>');

  mdTest('```\nprint(1)\n```', '<pre><code>print(1)</code></pre>');
  mdTest('```\nprint(1)```', '```\nprint(1)\n```', '<pre><code>print(1)</code></pre>');
  mdTest('```\nprint(1)\nprint(2)\n```', '<pre><code>print(1)\nprint(2)</code></pre>');
  mdTest('```python\nprint(1)\n```', '<pre><code class="language-python">print(1)</code></pre>');
});

describe('math', () => {
  mdTest('$inline$', '<span data-mx-maths="inline"><code>inline</code></span>');
  mdTest('$not$1', '\\$not\\$1', '$not$1');
  mdTest('$ not$', '\\$ not\\$', '$ not$');
  mdTest('$not $', '\\$not \\$', '$not $');

  mdTest('$$display$$', '<div data-mx-maths="display"><code>display</code></div>');
  mdTest('$$\ndisplay\n$$', '$$display$$', '<div data-mx-maths="display"><code>display</code></div>');
  mdTest('$$multi\nline$$', '$$\nmulti\nline\n$$', '<div data-mx-maths="multi\nline"><code>multi\nline</code></div>');
  mdTest('$$\nmulti\nline\n$$', '<div data-mx-maths="multi\nline"><code>multi\nline</code></div>');
});

describe('heading', () => {
  mdTest('# heading', '<h1>heading</h1>');
  mdTest('## sub-heading', '<h2>sub-heading</h2>');

  mdTest('heading\n===', '# heading', '<h1>heading</h1>');
  mdTest('sub-heading\n---', '## sub-heading', '<h2>sub-heading</h2>');

  mdTest('###### small heading', '<h6>small heading</h6>');

  mdTest('# heading', 'heading\n=======', '<h1>heading</h1>', { kind: '' });
  mdTest('heading\n=======', '<h1>heading</h1>', { kind: '' });
});

describe('link', () => {
  mdTest('example.com', 'example.com');
  mdTest('http://example.com', 'http://example.com');
  mdTest('https://example.com', 'https://example.com');
  mdTest('mailto:mail@example.com', 'mailto:mail@example.com');
  mdTest('tel:911', 'tel:911');

  mdTest('<https://example.com>', 'https://example.com', 'https://example.com');
  mdTest('[https://example.com](https://example.com)', 'https://example.com', 'https://example.com');
  mdTest('[example](https://example.com)', '<a href="https://example.com">example</a>');

  mdTest('[empty]()', '<a href="">empty</a>');
});

describe('emoji', () => {
  const emojis = new Map();

  emojis.set('unicode', { unicode: 'u' });
  mdTest(':unicode:', 'u', 'u', { emojis });

  emojis.set('emoticon', { shortcode: 'shortcode', mxc: 'mxc://' });
  mdTest(':emoticon:', ':shortcode:', '<img data-mx-emoticon src="mxc://" alt=":shortcode:" title=":shortcode:" height="32">', { emojis });

  mdTest(':unknown:', ':unknown:', { emojis });
  mdTest(':unicode:unknown:', 'uunknown:', 'uunknown:', { emojis });
  mdTest(':unknown:unicode:', ':unknownu', ':unknownu', { emojis });
});

describe('mention', () => {
  mdTest('#room:example.com', '<a href="https://matrix.to/#/%23room%3Aexample.com">#room:example.com</a>');
});

describe('image', () => {
  mdTest('![alt](https://example.com)', '<img src="https://example.com" alt="alt">');

  mdTest('![empty]()', '<img src="" alt="empty">');
});

// describe('blockquote', () => {
//   mdTest('> quote', '<blockquote>quote</blockquote>');
//   mdTest('>quote', '> quote', '<blockquote>quote</blockquote>');
//   mdTest('>    quote', '> quote', '<blockquote>quote</blockquote>');

// mdTest(
//   '> multiline\nquote',
//   '> multiline\n> quote',
//   '<blockquote>multiline<br>quote</blockquote>',
// );

//   mdTest('> quote\n\ntext after', '<blockquote>quote</blockquote>text after');
// });

describe('list', () => {
  mdTest('* item1\n* item2', '<ul><li>item1</li><li>item2</li></ul>');
  mdTest('- item1\n- item2', '* item1\n* item2', '<ul><li>item1</li><li>item2</li></ul>');

  mdTest('1. item1\n2. item2', '<ol><li>item1</li><li>item2</li></ol>');
  mdTest('2. item2\n3. item3', '<ol start="2"><li>item2</li><li>item3</li></ol>');

  // mdTest(
  //   '* item1\n  * subitem1\n  * subitem2\n* item2',
  //   '<ul><li>item1<ul><li>subitem1</li><li>subitem2</li></ul></li><li>item2</li></ul>',
  // );

  htmlTest(
    '<ul><li>item1<ul><li>subitem1</li><li>subitem2</li></ul></li><li>item2</li></ul>',
    '* item1\n  * subitem1\n  * subitem2\n* item2',
  );
});

describe('table', () => {
  mdTest(
    '|head1|head2|\n|-|-|\n|cell1|cell2|\n|cell3|cell4|',
    '| head1 | head2 |\n| ----- | ----- |\n| cell1 | cell2 |\n| cell3 | cell4 |',
    '<table><thead><tr><th scope="col">head1</th><th scope="col">head2</th></tr></thead><tbody><tr><td>cell1</td><td>cell2</td></tr><tr><td>cell3</td><td>cell4</td></tr></tbody></table>',
  );

  mdTest(
    '| left | center | right |\n| :--- | :----: | ----: |\n| l    |   c    |     r |',
    '<table><thead><tr><th scope="col" align="left">left</th><th scope="col" align="center">center</th><th scope="col" align="right">right</th></tr></thead><tbody><tr><td align="left">l</td><td align="center">c</td><td align="right">r</td></tr></tbody></table>',
  );

  htmlTest(
    '<table><thead><tr><th align="unknown">head</th></tr></thead><tbody><tr><td>cell</td></tr></tbody></table>',
    '| head |\n| ---- |\n| cell |',
    '<table><thead><tr><th scope="col">head</th></tr></thead><tbody><tr><td>cell</td></tr></tbody></table>',
  );
});

describe('html', () => {
  htmlTest('<div>text</div>', 'text');
  htmlTest('<span>text</span>', 'text');

  htmlTest('<!-- comment -->', '');

  htmlTest('<mx-reply>reply</mx-reply>', '', '');
});
