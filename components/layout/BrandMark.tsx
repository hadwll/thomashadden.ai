type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className = '' }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      data-brand-mark="true"
      data-testid="brand-mark"
      className={`relative inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-default bg-bg-elevated ${className}`.trim()}
    >
      <img
        src="/brand/iaa-logo-light.svg"
        alt=""
        className="h-full w-full object-contain p-0.5 dark:hidden"
      />
      <img
        src="/brand/iaa-logo-dark.svg"
        alt=""
        className="hidden h-full w-full object-contain p-0.5 dark:block"
      />
    </span>
  );
}
