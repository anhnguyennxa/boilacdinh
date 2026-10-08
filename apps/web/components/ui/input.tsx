import * as React from 'react';
import { cn } from '@/lib/utils';

// Linear: nền #080808, viền #2a2e33, radius 9px, padding 8px 12px, chữ 14px, focus viền accent
const fieldBase =
  'w-full rounded-xl border border-border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground transition-colors duration-150 hover:border-border-strong focus:border-primary focus:outline-none focus:shadow-ring disabled:bg-subtle disabled:text-muted-foreground aria-[invalid=true]:border-danger';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldBase, 'h-9 py-2', className)} {...props} />,
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(fieldBase, 'min-h-20 py-2', className)} {...props} />,
);
Textarea.displayName = 'Textarea';

export function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-2', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="block text-xs text-danger">{error}</span>}
    </label>
  );
}
