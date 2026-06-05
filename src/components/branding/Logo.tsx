
interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon' | 'full';
  color?: 'default' | 'inverted' | 'monochrome';
  className?: string;
}

const sizeMap = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};

export function Logo({ size = 'md', variant = 'icon', color = 'default', className = '' }: LogoProps) {
  const dimension = sizeMap[size];

  const colorClass = {
    default: 'text-blue-600',
    inverted: 'text-white',
    monochrome: 'text-gray-900 dark:text-gray-100',
  }[color];

  if (variant === 'full') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className={`flex-shrink-0 w-${size === 'xs' ? 5 : size === 'sm' ? 6 : size === 'md' ? 8 : size === 'lg' ? 10 : 12} h-${size === 'xs' ? 5 : size === 'sm' ? 6 : size === 'md' ? 8 : size === 'lg' ? 10 : 12}`}>
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className={colorClass}
            aria-label="TRAXXO logo"
          >
            <path d="M12 2L2 22h8l2-4h2l2 4h8L12 2zm0 6l4 8h-8l4-8z" />
          </svg>
        </div>
        <span className={`font-bold tracking-tight ${size === 'xs' ? 'text-sm' : size === 'sm' ? 'text-base' : size === 'md' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-3xl'} ${colorClass}`}>
          TRAXXO
        </span>
      </div>
    );
  }

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={`${colorClass} ${className}`}
      aria-label="TRAXXO icon"
    >
      <path d="M12 2L2 22h8l2-4h2l2 4h8L12 2zm0 6l4 8h-8l4-8z" />
    </svg>
  );
}

export function LogoIcon({ size = 'md', className = '' }: Omit<LogoProps, 'variant'>) {
  return <Logo size={size} variant="icon" className={className} />;
}

export function LogoFull({ size = 'md', className = '' }: Omit<LogoProps, 'variant'>) {
  return <Logo size={size} variant="full" className={className} />;
}
