import * as React from 'react'
import { cn } from '@/lib/utils'

// Simple Dialog built with CSS (no Radix needed for this)
const Dialog = ({ open, onOpenChange, children }) => {
  React.useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onOpenChange?.(false) }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  )
}

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl bg-white shadow-2xl border border-slate-100 p-6 animate-in fade-in-0 zoom-in-95',
      className
    )}
    {...props}
  >
    {children}
  </div>
))
DialogContent.displayName = 'DialogContent'

const DialogHeader = ({ className, ...props }) => (
  <div className={cn('mb-4', className)} {...props} />
)

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn('text-lg font-semibold text-slate-900', className)} {...props} />
))
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-slate-500 mt-1', className)} {...props} />
))
DialogDescription.displayName = 'DialogDescription'

const DialogFooter = ({ className, ...props }) => (
  <div className={cn('flex items-center justify-end gap-2 mt-5', className)} {...props} />
)

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
