import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-violet-700 text-white hover:bg-violet-800 focus:ring-violet-500',
        destructive: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400',
        outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-violet-500',
        ghost: 'text-slate-700 hover:bg-slate-100 focus:ring-violet-500',
        secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-400',
        glass: 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 focus:ring-violet-400',
        tumbler: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 focus:ring-emerald-400',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
))
Button.displayName = 'Button'

export { Button, buttonVariants }
