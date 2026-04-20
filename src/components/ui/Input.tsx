import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className = '', id, ...rest },
  ref,
) {
  const inputId = id || rest.name || undefined;
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={['glass-input', error ? 'border-red-300 focus:ring-red-200' : '', className].filter(Boolean).join(' ')}
        {...rest}
      />
      {hint && !error ? <p className="mt-2 text-xs text-zinc-400">{hint}</p> : null}
      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
    </div>
  );
});
