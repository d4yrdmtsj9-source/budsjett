import { cn } from '@/lib/utils'
import { forwardRef, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-muted-foreground">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full min-h-[88px] px-4 py-3 rounded-xl border border-border bg-white/80',
            'text-sm placeholder:text-muted/60 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50',
            className,
          )}
          {...props}
        />
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
