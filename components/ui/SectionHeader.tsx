import Link from 'next/link';

export type SectionHeaderProps = {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
};

export function SectionHeader({
  title,
  viewAllHref,
  viewAllLabel = 'View all ->'
}: SectionHeaderProps) {
  return (
    <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <h2 className="text-h3 font-semibold text-text-primary">{title}</h2>
      {viewAllHref ? (
        <Link href={viewAllHref} className="text-sm font-medium text-text-secondary no-underline hover:text-accent-primary">
          {viewAllLabel}
        </Link>
      ) : null}
    </header>
  );
}
