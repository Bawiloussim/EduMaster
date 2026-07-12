import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import AppRouter from './routes/AppRouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
});

// Removes the static splash from index.html the moment the app has mounted —
// no artificial minimum delay, so it never adds perceived load time on top of
// however long the bundle actually took to arrive.
function useHideInitialLoader() {
  useEffect(() => {
    const loader = document.getElementById('initial-loader');
    if (!loader) return;
    loader.classList.add('is-hidden');
    loader.addEventListener('transitionend', () => loader.remove(), { once: true });
  }, []);
}

export default function App() {
  useHideInitialLoader();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
