/* eslint-disable no-param-reassign */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import {
  Box,
  Button,
  Chip,
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Menu,
  PopOut,
  Scroll,
  Text,
  as,
  config,
} from 'folds';
import type * as PdfJsDist from 'pdfjs-dist';
import FocusTrap from 'focus-trap-react';
import * as css from './PdfViewer.css';
import { AsyncStatus } from '../../hooks/useAsyncCallback';
import { useZoom } from '../../hooks/useZoom';
import { usePdfDocumentLoader, usePdfJSLoader } from '../../plugins/pdfjs-dist';

export type PdfViewerProps = {
  name: string;
  src: string;
  requestClose: () => void;
};

export const PdfViewer = as<'div', PdfViewerProps>(
  ({ className, name, src, requestClose, ...props }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { zoom, zoomIn, zoomOut, setZoom } = useZoom(0.2);

    const [pdfJSState, loadPdfJS] = usePdfJSLoader();
    const [docState, loadPdfDocument] = usePdfDocumentLoader(
      pdfJSState.status === AsyncStatus.Success ? pdfJSState.data : undefined,
      src
    );
    const [pageNo, setPageNo] = useState(1);
    const [openJump, setOpenJump] = useState(false);

    useEffect(() => {
      loadPdfJS();
    }, [loadPdfJS]);
    useEffect(() => {
      if (pdfJSState.status === AsyncStatus.Success) {
        loadPdfDocument();
      }
    }, [pdfJSState, loadPdfDocument]);

    const loadPage = useCallback(
      async (doc: PdfJsDist.PDFDocumentProxy, canvas: HTMLCanvasElement, pNo: number) => {
        const page = await doc.getPage(pNo);
        const pageViewport = page.getViewport({ scale: zoom });
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = pageViewport.width;
        canvas.height = pageViewport.height;

        page.render({
          canvasContext: context,
          viewport: pageViewport,
        });
        scrollRef.current?.scrollTo({
          top: 0,
        });
      },
      [zoom]
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas && docState.status === AsyncStatus.Success) {
        const doc = docState.data;
        if (pageNo < 0 || pageNo > doc.numPages) return;
        loadPage(doc, canvas, pageNo);
      }
    }, [docState, pageNo, loadPage]);

    const handleJumpSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
      evt.preventDefault();
      if (docState.status !== AsyncStatus.Success) return;
      const jumpInput = evt.currentTarget.jumpInput as HTMLInputElement;
      if (!jumpInput) return;
      const jumpTo = parseInt(jumpInput.value, 10);
      setPageNo(Math.max(0, Math.min(docState.data.numPages, jumpTo)));
      setOpenJump(false);
    };

    const handlePrevPage = () => {
      setPageNo((n) => Math.max(n - 1, 0));
    };

    const handleNextPage = () => {
      if (docState.status !== AsyncStatus.Success) return;
      setPageNo((n) => Math.min(n + 1, docState.data.numPages));
    };

    return (
      <Box className={classNames(css.PdfViewer, className)} direction="Column" {...props} ref={ref}>
        <Header className={css.PdfViewerHeader} size="400">
          <Box grow="Yes" alignItems="Center" gap="200">
            <IconButton size="300" radii="300" onClick={requestClose}>
              <Icon size="50" src={Icons.ArrowLeft} />
            </IconButton>
            <Text size="T300" truncate>
              {name}
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center" gap="200">
            <IconButton
              variant={zoom < 1 ? 'Success' : 'SurfaceVariant'}
              outlined={zoom < 1}
              size="300"
              radii="Pill"
              onClick={zoomOut}
              aria-label="Zoom Out"
            >
              <Icon size="50" src={Icons.Minus} />
            </IconButton>
            <Chip variant="SurfaceVariant" radii="Pill" onClick={() => setZoom(zoom === 1 ? 2 : 1)}>
              <Text size="B300">{Math.round(zoom * 100)}%</Text>
            </Chip>
            <IconButton
              variant={zoom > 1 ? 'Success' : 'SurfaceVariant'}
              outlined={zoom > 1}
              size="300"
              radii="Pill"
              onClick={zoomIn}
              aria-label="Zoom In"
            >
              <Icon size="50" src={Icons.Plus} />
            </IconButton>
          </Box>
        </Header>
        <Box
          grow="Yes"
          className={css.PdfViewerContent}
          justifyContent="Center"
          alignItems="Center"
        >
          <Scroll
            ref={scrollRef}
            size="0"
            direction="Both"
            hideTrack
            variant="Surface"
            visibility="Hover"
          >
            <Box alignItems="Start" justifyContent="Center">
              <canvas ref={canvasRef} />
            </Box>
          </Scroll>
        </Box>
        {docState.status === AsyncStatus.Success && (
          <Header as="footer" className={css.PdfViewerFooter} size="400">
            <Chip
              variant="Secondary"
              radii="300"
              before={<Icon size="50" src={Icons.ChevronLeft} />}
              onClick={handlePrevPage}
              aria-disabled={pageNo <= 1}
            >
              <Text size="B300">Previous</Text>
            </Chip>
            <Box grow="Yes" justifyContent="Center" alignItems="Center" gap="200">
              <PopOut
                open={openJump}
                align="Center"
                position="Top"
                content={
                  <FocusTrap
                    focusTrapOptions={{
                      initialFocus: false,
                      onDeactivate: () => setOpenJump(false),
                      clickOutsideDeactivates: true,
                    }}
                  >
                    <Menu variant="Surface">
                      <Box
                        as="form"
                        onSubmit={handleJumpSubmit}
                        style={{ padding: config.space.S200 }}
                        direction="Column"
                        gap="200"
                      >
                        <Input
                          name="jumpInput"
                          size="300"
                          variant="Background"
                          defaultValue={pageNo}
                          min={0}
                          max={docState.data.numPages}
                          step={1}
                          outlined
                          type="number"
                          radii="300"
                          aria-label="Page Number"
                        />
                        <Button type="submit" size="300" variant="Primary" radii="300">
                          <Text size="B300">Jump To Page</Text>
                        </Button>
                      </Box>
                    </Menu>
                  </FocusTrap>
                }
              >
                {(anchorRef) => (
                  <Chip
                    onClick={() => setOpenJump(!openJump)}
                    ref={anchorRef}
                    variant="SurfaceVariant"
                    radii="300"
                    aria-pressed={openJump}
                  >
                    <Text size="B300">{`${pageNo}/${docState.data.numPages}`}</Text>
                  </Chip>
                )}
              </PopOut>
            </Box>
            <Chip
              variant="Primary"
              radii="300"
              after={<Icon size="50" src={Icons.ChevronRight} />}
              onClick={handleNextPage}
              aria-disabled={pageNo >= docState.data.numPages}
            >
              <Text size="B300">Next</Text>
            </Chip>
          </Header>
        )}
      </Box>
    );
  }
);
