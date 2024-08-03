/* eslint-disable no-param-reassign */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { FormEventHandler, MouseEventHandler, useEffect, useRef, useState } from 'react';
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
  RectCords,
  Scroll,
  Spinner,
  Text,
  as,
  config,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import FileSaver from 'file-saver';
import * as css from './PdfViewer.css';
import { AsyncStatus } from '../../hooks/useAsyncCallback';
import { useZoom } from '../../hooks/useZoom';
import { createPage, usePdfDocumentLoader, usePdfJSLoader } from '../../plugins/pdfjs-dist';
import { stopPropagation } from '../../utils/keyboard';

export type PdfViewerProps = {
  name: string;
  src: string;
  requestClose: () => void;
};

export const PdfViewer = as<'div', PdfViewerProps>(
  ({ className, name, src, requestClose, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { zoom, zoomIn, zoomOut, setZoom } = useZoom(0.2);

    const [pdfJSState, loadPdfJS] = usePdfJSLoader();
    const [docState, loadPdfDocument] = usePdfDocumentLoader(
      pdfJSState.status === AsyncStatus.Success ? pdfJSState.data : undefined,
      src
    );
    const isLoading =
      pdfJSState.status === AsyncStatus.Loading || docState.status === AsyncStatus.Loading;
    const isError =
      pdfJSState.status === AsyncStatus.Error || docState.status === AsyncStatus.Error;
    const [pageNo, setPageNo] = useState(1);
    const [jumpAnchor, setJumpAnchor] = useState<RectCords>();

    useEffect(() => {
      loadPdfJS();
    }, [loadPdfJS]);
    useEffect(() => {
      if (pdfJSState.status === AsyncStatus.Success) {
        loadPdfDocument();
      }
    }, [pdfJSState, loadPdfDocument]);

    useEffect(() => {
      if (docState.status === AsyncStatus.Success) {
        const doc = docState.data;
        if (pageNo < 0 || pageNo > doc.numPages) return;
        createPage(doc, pageNo, { scale: zoom }).then((canvas) => {
          const container = containerRef.current;
          if (!container) return;
          container.textContent = '';
          container.append(canvas);
          scrollRef.current?.scrollTo({
            top: 0,
          });
        });
      }
    }, [docState, pageNo, zoom]);

    const handleDownload = () => {
      FileSaver.saveAs(src, name);
    };

    const handleJumpSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
      evt.preventDefault();
      if (docState.status !== AsyncStatus.Success) return;
      const jumpInput = evt.currentTarget.jumpInput as HTMLInputElement;
      if (!jumpInput) return;
      const jumpTo = parseInt(jumpInput.value, 10);
      setPageNo(Math.max(1, Math.min(docState.data.numPages, jumpTo)));
      setJumpAnchor(undefined);
    };

    const handlePrevPage = () => {
      setPageNo((n) => Math.max(n - 1, 1));
    };

    const handleNextPage = () => {
      if (docState.status !== AsyncStatus.Success) return;
      setPageNo((n) => Math.min(n + 1, docState.data.numPages));
    };

    const handleOpenJump: MouseEventHandler<HTMLButtonElement> = (evt) => {
      setJumpAnchor(evt.currentTarget.getBoundingClientRect());
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
            <Chip
              variant="Primary"
              onClick={handleDownload}
              radii="300"
              before={<Icon size="50" src={Icons.Download} />}
            >
              <Text size="B300">Download</Text>
            </Chip>
          </Box>
        </Header>
        <Box direction="Column" grow="Yes" alignItems="Center" justifyContent="Center" gap="200">
          {isLoading && <Spinner variant="Secondary" size="600" />}
          {isError && (
            <>
              <Text>Failed to load PDF</Text>
              <Button
                variant="Critical"
                fill="Soft"
                size="300"
                radii="300"
                before={<Icon src={Icons.Warning} size="50" />}
                onClick={loadPdfJS}
              >
                <Text size="B300">Retry</Text>
              </Button>
            </>
          )}
          {docState.status === AsyncStatus.Success && (
            <Scroll
              ref={scrollRef}
              size="300"
              direction="Both"
              variant="Surface"
              visibility="Hover"
            >
              <Box>
                <div className={css.PdfViewerContent} ref={containerRef} />
              </Box>
            </Scroll>
          )}
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
                anchor={jumpAnchor}
                align="Center"
                position="Top"
                content={
                  <FocusTrap
                    focusTrapOptions={{
                      initialFocus: false,
                      onDeactivate: () => setJumpAnchor(undefined),
                      clickOutsideDeactivates: true,
                      escapeDeactivates: stopPropagation,
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
                          min={1}
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
                <Chip
                  onClick={handleOpenJump}
                  variant="SurfaceVariant"
                  radii="300"
                  aria-pressed={jumpAnchor !== undefined}
                >
                  <Text size="B300">{`${pageNo}/${docState.data.numPages}`}</Text>
                </Chip>
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
