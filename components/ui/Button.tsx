import type { ReactNode } from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
  ariaLabel?: string;
  type?: 'button' | 'submit';
  className?: string;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent-primary text-white hover:bg-accent-hover',
  secondary: 'border border-accent-primary text-accent-primary hover:bg-accent-subtle',
  ghost: 'text-text-secondary hover:text-text-primary'
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-[15px]'
};

function resolveClassName({
  variant,
  size,
  fullWidth,
  disabled,
  className
}: {
  variant: ButtonVariant;
  size: ButtonSize;
  fullWidth: boolean;
  disabled: boolean;
  className?: string;
}) {
  return [
    'inline-flex items-center justify-center rounded-pill font-medium no-underline transition-colors duration-normal',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth ? 'w-full' : '',
    disabled ? 'cursor-not-allowed opacity-50' : '',
    className ?? ''
  ]
    .filter(Boolean)
    .join(' ');
}

export function Button({
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  children,
  ariaLabel,
  type = 'button',
  className
}: ButtonProps) {
  const label = loading ? 'Loading...' : children;
  const resolvedClassName = resolveClassName({
    variant,
    size,
    fullWidth,
    disabled,
    className
  });

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        aria-disabled={disabled ? 'true' : undefined}
        className={resolvedClassName + (disabled ? ' pointer-events-none' : '')}
        onClick={disabled ? (event) => event.preventDefault() : onClick ? () => onClick() : undefined}
      >
        {label}
      </Link>
    );
  }

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled || loading}
      className={resolvedClassName}
      onClick={onClick ? () => onClick() : undefined}
    >
      {label}
    </button>
  );
}
