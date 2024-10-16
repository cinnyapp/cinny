import React, { MutableRefObject, ReactNode, useEffect, useRef } from 'react';

import Prism from 'prismjs';

import 'prismjs/components/prism-json';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-sass';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';

import './ReactPrism.css';
// using classNames .prism-dark .prism-light from ReactPrism.css

export default function ReactPrism({
  children,
}: {
  children: (ref: MutableRefObject<null>) => ReactNode;
}) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = codeRef.current;
    if (el) Prism.highlightElement(el);
  }, []);

  return <>{children(codeRef as MutableRefObject<null>)}</>;
}
