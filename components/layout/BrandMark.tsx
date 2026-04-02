type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className = '' }: BrandMarkProps) {
  const sizeClassName = className.trim().length > 0 ? className : 'h-6 w-6';

  return (
    <span
      aria-hidden="true"
      data-brand-mark="true"
      data-testid="brand-mark"
      className={`inline-flex shrink-0 items-center justify-center ${sizeClassName}`.trim()}
    >
      <img
        src="/brand/iaa-logo-light.svg"
        alt=""
        className="h-full w-full object-contain dark:hidden"
      />
      <img
        src="/brand/iaa-logo-dark.svg"
        alt=""
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  );
}
