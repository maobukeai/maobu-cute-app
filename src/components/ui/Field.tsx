import React from 'react';

interface FieldProps {
  label?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Label + control wrapper used by all form sheets. */
export const Field: React.FC<FieldProps> = ({ label, hint, required, children, className = '' }) => (
  <div className={className}>
    {label && (
      <label className="block text-caption font-semibold text-ink-2 mb-1.5 select-none">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
    )}
    {children}
    {hint && <p className="text-caption text-ink-3 mt-1">{hint}</p>}
  </div>
);

const inputBase =
  'w-full bg-surface-2 rounded-xl px-3.5 py-2.5 text-sub text-ink placeholder:text-ink-3 outline-none border-none transition-shadow duration-200 focus:ring-2 ring-accent/40';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...rest }, ref) => (
    <input ref={ref} className={`${inputBase} ${className}`} {...rest} />
  )
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = '', ...rest }, ref) => (
  <textarea ref={ref} className={`${inputBase} resize-none leading-relaxed ${className}`} {...rest} />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', ...rest }, ref) => (
    <select
      ref={ref}
      className={`${inputBase} appearance-none bg-surface-2 ${className}`}
      {...rest}
    />
  )
);
Select.displayName = 'Select';
