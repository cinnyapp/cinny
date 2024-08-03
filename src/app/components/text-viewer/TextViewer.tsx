/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { Suspense, lazy } from 'react';
import classNames from 'classnames';
import { Box, Chip, Header, Icon, IconButton, Icons, Scroll, Text, as } from 'folds';
import { ErrorBoundary } from 'react-error-boundary';
import * as css from './TextViewer.css';
import { copyToClipboard } from '../../utils/dom';

const ReactPrism = lazy(() => import('../../plugins/react-prism/ReactPrism'));

export type TextViewerProps = {
  name: string;
  text: string;
  langName: string;
  requestClose: () => void;
};

export const TextViewer = as<'div', TextViewerProps>(
  ({ className, name, text, langName, requestClose, ...props }, ref) => {
    const handleCopy = () => {
      copyToClipboard(text);
    };

    return (
      <Box
        className={classNames(css.TextViewer, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.TextViewerHeader} size="400">
          <Box grow="Yes" alignItems="Center" gap="200">
            <IconButton size="300" radii="300" onClick={requestClose}>
              <Icon size="50" src={Icons.ArrowLeft} />
            </IconButton>
            <Text size="T300" truncate>
              {name}
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center" gap="200">
            <Chip variant="Primary" radii="300" onClick={handleCopy}>
              <Text size="B300">Copy All</Text>
            </Chip>
          </Box>
        </Header>
        <Box
          grow="Yes"
          className={css.TextViewerContent}
          justifyContent="Center"
          alignItems="Center"
        >
          <Scroll hideTrack variant="Background" visibility="Hover">
            <Text as="pre" className={classNames(css.TextViewerPre, `language-${langName}`)}>
              <ErrorBoundary fallback={<code>{text}</code>}>
                <Suspense fallback={<code>{text}</code>}>
                  <ReactPrism>{(codeRef) => <code ref={codeRef}>{text}</code>}</ReactPrism>
                </Suspense>
              </ErrorBoundary>
            </Text>
          </Scroll>
        </Box>
      </Box>
    );
  }
);
