import { useId, useState, type ReactNode } from 'react';

interface Props {
  label: string;
  tooltip?: string;
  error?: string;
  children: (ids: { inputId: string; errorId: string }) => ReactNode;
  srHint?: string;
}

export function FormField({ label, tooltip, error, children, srHint }: Props) {
  const inputId = useId();
  const errorId = useId();
  const tooltipId = useId();
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1 mb-1">
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">{label}</label>
        {tooltip && (
          <>
            <button
              type="button"
              aria-expanded={tooltipOpen}
              aria-controls={tooltipId}
              onClick={() => setTooltipOpen((v) => !v)}
              onBlur={() => setTooltipOpen(false)}
              className="text-xs text-blue-600 underline-offset-2 hover:underline"
            >
              (?)
            </button>
            {srHint && <span className="sr-only">{srHint}</span>}
          </>
        )}
      </div>
      {tooltip && tooltipOpen && (
        <div id={tooltipId} role="tooltip" className="text-xs text-gray-600 mb-1 p-2 bg-blue-50 rounded">
          {tooltip}
        </div>
      )}
      {children({ inputId, errorId })}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
