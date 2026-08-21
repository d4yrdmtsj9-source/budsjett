import { cn } from '@/lib/utils'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',
          'active:scale-[0.98]',
          {
            'bg-primary text-primary-foreground shadow-sm hover:bg-primary-dark': variant === 'primary',
            'bg-white border border-border text-foreground hover:bg-surface': variant === 'secondary',
            'hover:bg-black/5 text-foreground': variant === 'ghost',
            'bg-destructive text-white hover:opacity-90': variant === 'destructive',
          },
          {
            'h-9 px-3 text-sm': size === 'sm',
            'h-11 px-5 text-sm': size === 'md',
            'h-13 px-6 text-base min-h-[52px]': size === 'lg',
            'h-11 w-11': size === 'icon',
          },
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
