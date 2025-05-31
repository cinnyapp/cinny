import { React, useEffect } from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { OverlayContainerProvider, PopOutContainerProvider, TooltipContainerProvider } from 'folds';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { ClientConfigLoader } from '../components/ClientConfigLoader';
import { ClientConfigProvider } from '../hooks/useClientConfig';
import { ConfigConfigError, ConfigConfigLoading } from './ConfigConfig';
import { FeatureCheck } from './FeatureCheck';
import { createRouter } from './Router';
import { ScreenSizeProvider, useScreenSize } from '../hooks/useScreenSize';
import { useCompositionEndTracking } from '../hooks/useComposingCheck';

const queryClient = new QueryClient();

/**
 * Prevents file drag/drop behavior across the entire document,
 * this could otherwise lead to unintended browser behaviors.
 *
 * Note that any drag/drop operation that uses files
 * must use evt.stopPropagation() to override this behavior.
 */
const usePreventFileDragDrop = () => {
  useEffect(() => {
    const handleDragDrop = (evt: DragEvent) => {
      if (evt.dataTransfer?.types.includes('Files')) {
        evt.preventDefault();

        // Block the cursor effect for drag/drop.
        const { dataTransfer } = evt;
        dataTransfer.dropEffect = 'none';
      }
    };
    document.addEventListener('dragenter', handleDragDrop);
    document.addEventListener('dragleave', handleDragDrop);
    document.addEventListener('dragover', handleDragDrop);
    document.addEventListener('drop', handleDragDrop);
    return () => {
      document.removeEventListener('dragenter', handleDragDrop);
      document.removeEventListener('dragleave', handleDragDrop);
      document.removeEventListener('dragover', handleDragDrop);
      document.removeEventListener('drop', handleDragDrop);
    };
  }, []);
};

function App() {
  const screenSize = useScreenSize();
  usePreventFileDragDrop();
  useCompositionEndTracking();

  const portalContainer = document.getElementById('portalContainer') ?? undefined;

  return (
    <TooltipContainerProvider value={portalContainer}>
      <PopOutContainerProvider value={portalContainer}>
        <OverlayContainerProvider value={portalContainer}>
          <ScreenSizeProvider value={screenSize}>
            <FeatureCheck>
              <ClientConfigLoader
                fallback={() => <ConfigConfigLoading />}
                error={(err, retry, ignore) => (
                  <ConfigConfigError error={err} retry={retry} ignore={ignore} />
                )}
              >
                {(clientConfig) => (
                  <ClientConfigProvider value={clientConfig}>
                    <QueryClientProvider client={queryClient}>
                      <JotaiProvider>
                        <RouterProvider router={createRouter(clientConfig, screenSize)} />
                      </JotaiProvider>
                      <ReactQueryDevtools initialIsOpen={false} />
                    </QueryClientProvider>
                  </ClientConfigProvider>
                )}
              </ClientConfigLoader>
            </FeatureCheck>
          </ScreenSizeProvider>
        </OverlayContainerProvider>
      </PopOutContainerProvider>
    </TooltipContainerProvider>
  );
}

export default App;
