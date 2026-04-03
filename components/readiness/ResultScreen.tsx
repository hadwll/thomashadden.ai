import type { ReactNode } from 'react';

export type ResultScreenProps = {
  categoryLabel?: string;
  score?: number | string;
  summary?: string;
  nextStep?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  errorState?: string | null;
  children?: ReactNode;
};

export function ResultScreen(_props: ResultScreenProps) {
  return (
    <section data-testid="result-screen-stub">
      <p>ResultScreen placeholder</p>
    </section>
  );
}
