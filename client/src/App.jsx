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

// Keeps the static splash from index.html up for a minimum beat so it reads as
// an intentional brand moment rather than a flash, then hands off to the app.
function useHideInitialLoader() {
  useEffect(() => {
    const loader = document.getElementById('initial-loader');
    if (!loader) return;
    const timer = setTimeout(() => {
      loader.classList.add('is-hidden');
      loader.addEventListener('transitionend', () => loader.remove(), { once: true });
    }, 550);
    return () => clearTimeout(timer);
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
