/**
 * Lazy loaded components for better performance
 * These components are loaded only when needed
 */
import dynamic from 'next/dynamic';

// Loading fallback component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Skeleton loading for charts
const ChartSkeleton = () => (
  <div className="w-full h-[300px] bg-muted animate-pulse rounded-lg" />
);

// Lazy load recharts components (heavy ~300KB)
export const LazyBarChart = dynamic(
  () => import('recharts').then(mod => mod.BarChart),
  { loading: ChartSkeleton, ssr: false }
);

export const LazyLineChart = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  { loading: ChartSkeleton, ssr: false }
);

export const LazyPieChart = dynamic(
  () => import('recharts').then(mod => mod.PieChart),
  { loading: ChartSkeleton, ssr: false }
);

export const LazyResponsiveContainer = dynamic(
  () => import('recharts').then(mod => mod.ResponsiveContainer),
  { ssr: false }
);

// Lazy load framer-motion (heavy ~150KB)
export const LazyMotionDiv = dynamic(
  () => import('framer-motion').then(mod => {
    const { motion } = mod;
    return motion.div;
  }),
  { ssr: false }
);

// Lazy load react-markdown (heavy with plugins)
export const LazyMarkdown = dynamic(
  () => import('react-markdown'),
  { loading: LoadingSpinner }
);

// Lazy load KaTeX for math rendering
export const LazyKatex = dynamic(
  () => import('katex').then(mod => {
    // Return a wrapper component for KaTeX
    return function KatexWrapper({ math, displayMode = false }: { math: string; displayMode?: boolean }) {
      const html = mod.default.renderToString(math, { displayMode, throwOnError: false });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    };
  }),
  { ssr: false }
);

// Lazy load jsPDF for PDF generation
export const getJsPDF = () => import('jspdf').then(mod => mod.default);

// Lazy load html2canvas
export const getHtml2Canvas = () => import('html2canvas').then(mod => mod.default);

// Lazy load confetti (celebration effect)
export const fireConfetti = async () => {
  const confetti = (await import('canvas-confetti')).default;
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
};

// Export loading components for reuse
export { LoadingSpinner, ChartSkeleton };
