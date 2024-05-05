export class ASCIILexicalTable {
  readonly startCode: number;

  readonly endCode: number;

  readonly maxStrWidth: number;

  private readonly widthToSize: number[];

  private readonly rangeCount: (i: number, j: number) => number;

  constructor(startCode: number, endCode: number, maxStrWidth: number) {
    if (startCode > endCode) {
      throw new Error('Invalid ASCII code! startCode is greater than endCode.');
    }
    if (startCode < 0 || endCode > 128) {
      throw new Error('Invalid ASCII code range!');
    }

    if (maxStrWidth <= 0) {
      throw new Error('Invalid max string width!');
    }

    this.maxStrWidth = maxStrWidth;
    this.startCode = startCode;
    this.endCode = endCode;

    /**
     * @param i smaller - inclusive
     * @param j larger - inclusive
     * @returns number
     */
    this.rangeCount = (i: number, j: number): number => j - i + 1;

    this.widthToSize = [];
    this.populateWidthToSize();

    if (this.size() > Number.MAX_SAFE_INTEGER) {
      console.warn(
        `[!] Warning: ASCIILexicalTable size is larger than the Number.MAX_SAFE_INTEGER: ${this.size()} > ${
          Number.MAX_SAFE_INTEGER
        }`
      );
    }
  }

  private populateWidthToSize() {
    const chars = this.rangeCount(this.startCode, this.endCode);
    for (let i = 0, count = 0; i < this.maxStrWidth; i += 1) {
      count = count * chars + chars;
      this.widthToSize[i] = count;
    }
  }

  private getWidthToSize(width: number): number {
    return this.widthToSize[width - 1];
  }

  first(): string {
    return String.fromCharCode(this.startCode);
  }

  last(): string {
    let str = '';
    for (let i = 0; i < this.maxStrWidth; i += 1) {
      str += String.fromCharCode(this.endCode);
    }
    return str;
  }

  hasIndex(index: number): boolean {
    return index >= 0 && index < this.size();
  }

  has(str: string): boolean {
    if (str.length === 0 || str.length > this.maxStrWidth) {
      return false;
    }

    let charCode: number;
    for (let i = 0; i < str.length; i += 1) {
      charCode = str.charCodeAt(i);
      if (charCode < this.startCode || charCode > this.endCode) {
        return false;
      }
    }
    return true;
  }

  size(): number {
    return this.getWidthToSize(this.maxStrWidth);
  }

  index(str: string): number {
    if (!this.has(str)) {
      return -1;
    }

    let index = 0;
    const chars = this.rangeCount(this.startCode, this.endCode);

    for (let i = 0; i < this.maxStrWidth; i += 1) {
      const code = str.charCodeAt(i);

      if (Number.isNaN(code)) {
        return index;
      }

      const opStrWidth = this.maxStrWidth - i;
      const opStrTableSize = this.getWidthToSize(opStrWidth);

      const segmentSize = opStrTableSize / chars;

      const codeIndex = code - this.startCode;
      const emptyCount = i === 0 ? 0 : 1;

      index += segmentSize * codeIndex + emptyCount;
    }

    return index;
  }

  get(index: number): string | undefined {
    if (!this.hasIndex(index)) {
      return undefined;
    }

    let str = '';
    const chars = this.rangeCount(this.startCode, this.endCode);

    for (let toIndex = index, i = 0; i < this.maxStrWidth; i += 1) {
      const opStrWidth = this.maxStrWidth - i;
      const opStrTableSize = this.getWidthToSize(opStrWidth);

      const segmentSize = opStrTableSize / chars;

      const segmentIndex = Math.floor(toIndex / segmentSize);
      str += String.fromCharCode(this.startCode + segmentIndex);

      toIndex -= segmentIndex * segmentSize;
      if (toIndex === 0) {
        break;
      }
      toIndex -= 1;
    }

    return str;
  }

  previous(str: string): string | undefined {
    if (!this.has(str)) return undefined;
    let prev = str;
    const lastCode = prev.charCodeAt(prev.length - 1);
    prev = prev.slice(0, prev.length - 1);

    if (lastCode === this.startCode) {
      if (prev.length === 0) return undefined;
      return prev;
    }

    prev += String.fromCharCode(lastCode - 1);
    while (prev.length < this.maxStrWidth) {
      prev += String.fromCharCode(this.endCode);
    }
    return prev;
  }

  next(str: string): string | undefined {
    if (!this.has(str)) return undefined;
    let next = str;

    if (next.length < this.maxStrWidth) {
      next += String.fromCharCode(this.startCode);
      return next;
    }

    for (let i = next.length - 1; i >= 0; i -= 1) {
      const lastCode = next.charCodeAt(i);
      if (lastCode !== this.endCode) {
        next = next.slice(0, i) + String.fromCharCode(lastCode + 1);
        return next;
      }
      next = next.slice(0, i);
    }
    return undefined;
  }

  between(i: string, j: string): string | undefined {
    if (!this.has(i) || !this.has(j)) {
      return undefined;
    }

    const centerIndex = Math.floor((this.index(i) + this.index(j)) / 2);

    const b = this.get(centerIndex);
    if (b === i || b === j) return undefined;
    return b;
  }
}

// const printLex = (lex: ASCIILexicalTable) => {
//   const padRight = (s: string, maxWidth: number, padding: string): string => {
//     let ns = s;
//     for (let i = s.length; i < maxWidth; i += 1) {
//       ns += padding;
//     }
//     return ns;
//   };

//   const formattedLine = (n: number, item: string): string =>
//     `|${padRight(n.toString(), lex.size().toString().length, ' ')}|${item}|`;

//   const hr = `|${padRight('-', lex.size().toString().length, '-')}|${padRight(
//     '-',
//     lex.maxStrWidth,
//     '-'
//   )}|`;

//   console.log(`All lexicographic string combination in order.`);
//   console.log(`Start ASCII code: "${lex.startCode}"`);
//   console.log(`End ASCII code: "${lex.endCode}"`);
//   console.log(`Max string width: ${lex.maxStrWidth}`);
//   console.log(`Total String Combination Count: ${lex.size()}\n`);
//   console.log('Table:');
//   console.log(hr);
//   for (let i = 0; i < lex.size(); i += 1) {
//     const str = lex.get(i);
//     if (str) {
//       console.log(formattedLine(i, padRight(str, lex.maxStrWidth, '_')));
//     }
//   }
//   console.log(hr);
// };

// console.log('\n');

// const lex = new ASCIILexicalTable('a'.charCodeAt(0), 'c'.charCodeAt(0), 5);
// printLex(lex);
// console.log(lex.between('a', 'aacb'));
// console.log(lex.get(123) === 'baa');
// console.log(lex.get(11) === 'aaac');

// const lex4 = new ASCIILexicalTable(' '.charCodeAt(0), '~'.charCodeAt(0), 5);
// console.log('Size: ', lex4.size());
// console.log('Between: ', lex4.between('7g7g5', 'caccc'));
// printLex(lex4);

// console.log('\n');

// const perf = () => {
//   const loopLength = 99999;
//   const lexT = new ASCIILexicalTable('a'.charCodeAt(0), 'z'.charCodeAt(0), 9);
//   console.log(lexT.size());
//   const str = 'bcbba';
//   const strI = lexT.index(str);
//   console.log('================');
//   console.time('index');
//   console.log(lexT.index(str));
//   for (let i = 0; i < loopLength; i += 1) {
//     lexT.index(str);
//   }
//   console.timeEnd('index');
//   console.log('================');
//   console.time('get');
//   console.log(lexT.get(strI));
//   for (let i = 0; i < loopLength; i += 1) {
//     lexT.get(strI);
//   }
//   console.timeEnd('get');
//   console.log('================');
//   console.time('previous');
//   console.log(lexT.previous(str));
//   for (let i = 0; i < loopLength; i += 1) {
//     lexT.previous(str);
//   }
//   console.timeEnd('previous');
//   console.log('================');
//   console.time('next');
//   console.log(lexT.next(str));
//   for (let i = 0; i < loopLength; i += 1) {
//     lexT.next(str);
//   }
//   console.timeEnd('next');
//   console.log('================');
//   console.time('between');
//   console.log(lexT.between(str, 'cbbca'));
//   for (let i = 0; i < loopLength; i += 1) {
//     lexT.between(str, 'cbbca');
//   }
//   console.timeEnd('between');
// };

// perf();
