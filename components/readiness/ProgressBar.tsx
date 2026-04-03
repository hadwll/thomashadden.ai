type ProgressBarProps = {
  currentQuestion: number;
  totalQuestions: number;
};

function clampQuestionNumber(currentQuestion: number, totalQuestions: number): {
  current: number;
  total: number;
  percent: number;
} {
  const safeTotalQuestions = Math.max(totalQuestions, 1);
  const safeCurrentQuestion = Math.min(Math.max(currentQuestion, 1), safeTotalQuestions);
  const percent = Math.round((safeCurrentQuestion / safeTotalQuestions) * 100);

  return {
    current: safeCurrentQuestion,
    total: safeTotalQuestions,
    percent
  };
}

export function ProgressBar({ currentQuestion, totalQuestions }: ProgressBarProps) {
  const progress = clampQuestionNumber(currentQuestion, totalQuestions);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">Progress</p>
        <p className="text-sm font-medium text-text-secondary">
          Question {progress.current} of {progress.total}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Assessment progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-valuetext={`Question ${progress.current} of ${progress.total}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-border-default"
      >
        <div
          className="h-full rounded-full bg-accent-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}
