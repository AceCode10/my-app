/**
 * Lazy loaded components for better performance
 * These components are loaded only when needed
 */
import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading fallback component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Lazy load heavy components - PDF related
export const LazyPDFViewer = dynamic(
  () => import('@/components/pdf-viewer').then(mod => mod.PDFViewer || mod.default),
  { loading: LoadingSpinner, ssr: false }
);

// Lazy load markdown renderer
export const LazyMarkdownRenderer = dynamic(
  () => import('@/components/markdown-renderer').then(mod => mod.MarkdownRenderer || mod.default),
  { loading: LoadingSpinner }
);

// Lazy load rich text editor (if exists)
export const LazyRichTextEditor = dynamic(
  () => import('@/components/rich-text-editor').then(mod => mod.RichTextEditor || mod.default).catch(() => () => null),
  { loading: LoadingSpinner, ssr: false }
);

// Lazy load chart components
export const LazyChart = dynamic(
  () => import('@/components/charts').then(mod => mod.Chart || mod.default).catch(() => () => null),
  { loading: LoadingSpinner, ssr: false }
);

// Lazy load confetti (celebration effect)
export const LazyConfetti = dynamic(
  () => import('canvas-confetti').then(mod => {
    // Return a wrapper component
    return function ConfettiWrapper({ fire }: { fire: boolean }) {
      if (fire && typeof mod.default === 'function') {
        mod.default({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      return null;
    };
  }),
  { ssr: false }
);

// Helper function for dynamic component loading with error handling
export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T } | T>,
  fallback: ComponentType = LoadingSpinner
) {
  return dynamic(
    () => importFn().then(mod => ('default' in mod ? mod : { default: mod as T })),
    { loading: fallback, ssr: false }
  );
}
