/* eslint-disable no-param-reassign */
/* eslint-disable no-undef */

import { html, markdown } from './markdown';

function mdTest(source, plain, htmlStr) {
  test(source, () => {
    if (htmlStr === undefined) {
      htmlStr = plain;
      plain = source;
    }

    const content = markdown(source, { kind: 'edit' });
    expect(content.plain).toBe(plain);
    expect(content.html).toBe(htmlStr);

    const htmlContent = html(htmlStr, { kind: 'edit', onlyPlain: true });
    expect(htmlContent.plain).toBe(plain);
  });
}

describe('text', () => {
  mdTest('some text', 'some text');

  mdTest('text\nwith\nnewlines', 'text<br>with<br>newlines');

  // mdTest('text\n\nwith many\n\n\nnewlines', 'text<br><br>with many<br><br><br>newlines');

  // mdTest('¯\\_(ツ)_/¯', '¯\\_(ツ)_/¯');
  mdTest('¯\\_(ツ)_/¯', '¯\\\\_(ツ)\\_/¯', '¯\\_(ツ)_/¯');
});

describe('inline', () => {
  mdTest('*italic* or _italic_', '_italic_ or _italic_', '<em>italic</em> or <em>italic</em>');
  mdTest('**bold**', '<strong>bold</strong>');
  mdTest('__underline__', '<u>underline</u>');
  mdTest('~~strikethrough~~', '<del>strikethrough</del>');
  mdTest('||spoiler||', '<span data-mx-spoiler>spoiler</span>');
  mdTest('||spoiler||(reason)', '<span data-mx-spoiler="reason">spoiler</span>');
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

// describe('blockquote', () => {
//   mdTest('> quote', '<blockquote>quote</blockquote>');
//   mdTest('>quote', '> quote', '<blockquote>quote</blockquote>');
//   mdTest('>    quote', '> quote', '<blockquote>quote</blockquote>');

//   mdTest('> multiline\nquote', '> multiline\n> quote', '<blockquote>multiline<br>quote</blockquote>');

//   mdTest('> quote\n\ntext after', '<blockquote>quote</blockquote>text after');
// });

describe('list', () => {
  mdTest('* item1\n* item2', '<ul><li>item1</li><li>item2</li></ul>');
  mdTest('- item1\n- item2', '* item1\n* item2', '<ul><li>item1</li><li>item2</li></ul>');

  mdTest('1. item1\n2. item2', '<ol><li>item1</li><li>item2</li></ol>');
  mdTest('2. item2\n3. item3', '<ol start="2"><li>item2</li><li>item3</li></ol>');

  // mdTest('* item1\n  * subitem1\n  * subitem2\n* item2', '<ul><li>item1<ul><li>subitem1</li><li>subitem2</li></ul></li><li>item2</li></ul>');

  const elementHtml = '<ul><li>item1<ul><li>subitem1</li><li>subitem2</li></ul></li><li>item2</li></ul>';
  test(elementHtml, () => {
    const content = html(elementHtml, { kind: 'edit', onlyPlain: true });
    expect(content.plain).toBe('* item1\n  * subitem1\n  * subitem2\n* item2');
  });
});
