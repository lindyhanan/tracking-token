import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-violet-100 text-violet-700',
        glass: 'bg-violet-100 text-violet-700',
        tumbler: 'bg-emerald-100 text-emerald-700',
        destructive: 'bg-red-100 text-red-700',
        outline: 'border border-slate-200 text-slate-600',
        secondary: 'bg-slate-100 text-slate-600',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-amber-100 text-amber-700',
        info: 'bg-blue-100 text-blue-700',
        reduce: 'bg-red-100 text-red-600',
        add: 'bg-green-100 text-green-600',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

const Badge = React.forwardRef(({ className, variant, ...props }, ref) => (
  <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
))
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
