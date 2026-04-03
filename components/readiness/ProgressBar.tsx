type ProgressBarProps = {
  currentQuestion: number;
  totalQuestions: number;
};

export function ProgressBar({ currentQuestion, totalQuestions }: ProgressBarProps) {
  return (
    <div data-testid="progress-bar-stub">
      Progress placeholder {currentQuestion} of {totalQuestions}
    </div>
  );
}
