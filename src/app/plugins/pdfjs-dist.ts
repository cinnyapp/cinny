import { useCallback } from 'react';
import type * as PdfJsDist from 'pdfjs-dist';
import { useAsyncCallback } from '../hooks/useAsyncCallback';

export const usePdfJSLoader = () =>
  useAsyncCallback(
    useCallback(async () => {
      const pdf = await import('pdfjs-dist');
      pdf.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      return pdf;
    }, [])
  );

export const usePdfDocumentLoader = (pdfJS: typeof PdfJsDist | undefined, src: string) =>
  useAsyncCallback(
    useCallback(async () => {
      if (!pdfJS) {
        throw new Error('PdfJS is not loaded');
      }
      const doc = await pdfJS.getDocument(src).promise;
      return doc;
    }, [pdfJS, src])
  );
