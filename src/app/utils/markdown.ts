const MIN_ANY = '(.+?)';

const BOLD_MD_1 = '**'
const BOLD_PREFIX_1 = '\\*{2}';
const BOLD_NEG_LA_1 = '(?!\\*)';
const BOLD_REG_1 = new RegExp(`${BOLD_PREFIX_1}${MIN_ANY}${BOLD_PREFIX_1}${BOLD_NEG_LA_1}`);

const ITALIC_MD_1 = '*'
const ITALIC_PREFIX_1 = '\\*';
const ITALIC_NEG_LA_1 = '(?!\\*)';
const ITALIC_REG_1 = new RegExp(`${ITALIC_PREFIX_1}${MIN_ANY}${ITALIC_PREFIX_1}${ITALIC_NEG_LA_1}`);
const ITALIC_MD_2 = '_'
const ITALIC_PREFIX_2 = '_';
const ITALIC_NEG_LA_2 = '(?!_)';
const ITALIC_REG_2 = new RegExp(`${ITALIC_PREFIX_2}${MIN_ANY}${ITALIC_PREFIX_2}${ITALIC_NEG_LA_2}`);

const UNDERLINE_MD_1 = '__';
const UNDERLINE_PREFIX_1 = '_{2}';
const UNDERLINE_NEG_LA_1 = '(?!_)';
const UNDERLINE_REG_1 = new RegExp(
  `${UNDERLINE_PREFIX_1}${MIN_ANY}${UNDERLINE_PREFIX_1}${UNDERLINE_NEG_LA_1}`
);

const STRIKE_MD_1 = '~~';
const STRIKE_PREFIX_1 = '~{2}';
const STRIKE_NEG_LA_1 = '(?!~)';
const STRIKE_REG_1 = new RegExp(`${STRIKE_PREFIX_1}${MIN_ANY}${STRIKE_PREFIX_1}${STRIKE_NEG_LA_1}`);

const CODE_MD_1 = '`';
const CODE_PREFIX_1 = '`';
const CODE_NEG_LA_1 = '(?!`)';
const CODE_REG_1 = new RegExp(`${CODE_PREFIX_1}${MIN_ANY}${CODE_PREFIX_1}${CODE_NEG_LA_1}`);

const SPOILER_MD_1 = '||';
const SPOILER_PREFIX_1 = '\\|{2}';
const SPOILER_NEG_LA_1 = '(?!\\|)';
const SPOILER_REG_1 = new RegExp(
  `${SPOILER_PREFIX_1}${MIN_ANY}${SPOILER_PREFIX_1}${SPOILER_NEG_LA_1}`
);

const LINK_ALT = `\\[${MIN_ANY}\\]`;
const LINK_URL = `\\((https?:\\/\\/.+?)\\)`;
const LINK_REG_1 = new RegExp(`${LINK_ALT}${LINK_URL}`);

const beforeMatch = (text: string, match: RegExpMatchArray | RegExpExecArray): string =>
  text.slice(0, match.index);
const afterMatch = (text: string, match: RegExpMatchArray | RegExpExecArray): string =>
  text.slice((match.index ?? 0) + match[0].length);

export const parseInlineMD = (text: string): string => {
  const boldMatch = text.match(BOLD_REG_1);
  if (boldMatch) {
    const [, g1] = boldMatch;
    const before = parseInlineMD(beforeMatch(text, boldMatch));
    const child = parseInlineMD(g1);
    const after = parseInlineMD(afterMatch(text, boldMatch));

    return `${before}<strong data-md="${BOLD_MD_1}">${child}</strong>${after}`;
  }

  const underlineMatch = text.match(UNDERLINE_REG_1);
  if (underlineMatch) {
    const [, g1] = underlineMatch;
    const before = parseInlineMD(beforeMatch(text, underlineMatch));
    const child = parseInlineMD(g1);
    const after = parseInlineMD(afterMatch(text, underlineMatch));

    return `${before}<u data-md="${UNDERLINE_MD_1}">${child}</u>${after}`;
  }

  const italicMatch = text.match(ITALIC_REG_1) ?? text.match(ITALIC_REG_2);
  if (italicMatch) {
    const [, g1] = italicMatch;
    const before = parseInlineMD(beforeMatch(text, italicMatch));
    const child = parseInlineMD(g1);
    const after = parseInlineMD(afterMatch(text, italicMatch));

    return `${before}<i data-md="${ITALIC_REG_1.test(text) ? ITALIC_MD_1 : ITALIC_MD_2}">${child}</i>${after}`;
  }

  const strikeMatch = text.match(STRIKE_REG_1);
  if (strikeMatch) {
    const [, g1] = strikeMatch;
    const before = parseInlineMD(beforeMatch(text, strikeMatch));
    const child = parseInlineMD(g1);
    const after = parseInlineMD(afterMatch(text, strikeMatch));

    return `${before}<s data-md="${STRIKE_MD_1}">${child}</s>${after}`;
  }

  const codeMatch = text.match(CODE_REG_1);
  if (codeMatch) {
    const [, g1] = codeMatch;
    const before = parseInlineMD(beforeMatch(text, codeMatch));
    const child = g1;
    const after = parseInlineMD(afterMatch(text, codeMatch));

    return `${before}<code data-md="${CODE_MD_1}">${child}</code>${after}`;
  }

  const spoilerMatch = text.match(SPOILER_REG_1);
  if (spoilerMatch) {
    const [, g1] = spoilerMatch;
    const before = parseInlineMD(beforeMatch(text, spoilerMatch));
    const child = parseInlineMD(g1);
    const after = parseInlineMD(afterMatch(text, spoilerMatch));

    return `${before}<span data-md="${SPOILER_MD_1}" data-mx-spoiler>${child}</span>${after}`;
  }

  const linkMatch = text.match(LINK_REG_1);
  if (linkMatch) {
    const [, g1, g2] = linkMatch;
    const before = parseInlineMD(beforeMatch(text, linkMatch));
    const child = parseInlineMD(g1);
    const after = parseInlineMD(afterMatch(text, linkMatch));

    return `${before}<a data-md href="${g2}">${child}</a>${after}`;
  }
  
  return text;
};
