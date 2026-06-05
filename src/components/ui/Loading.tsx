import { LogoIcon } from '../branding/Logo';

interface LoadingProps {
  fullscreen?: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ fullscreen = false, message = 'Loading...', size = 'md' }: LoadingProps) {
  const sizeClass = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }[size];

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${sizeClass} animate-spin`}>
        <LogoIcon size={size === 'sm' ? 'sm' : size === 'md' ? 'md' : 'lg'} />
      </div>
      {message && (
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{message}</p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  return (
    <div className={`${sizeClass} animate-spin ${className}`}>
      <LogoIcon size={size === 'sm' ? 'xs' : size === 'md' ? 'sm' : 'md'} />
    </div>
  );
}

export function SplashScreen({ message = 'TRAXXO' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 mb-6">
          <LogoIcon size="xl" className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">TRAXXO</h1>
        <p className="text-blue-100 text-sm">{message}</p>
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  count?: number;
}

export function Skeleton({ className = '', width = 'w-full', height = 'h-4', count = 1 }: SkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${width} ${height} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`}
        />
      ))}
    </div>
  );
}
