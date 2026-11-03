import * as React from 'react'
import { cn } from '@/lib/utils'

const Select = ({ value, onChange, children, className, ...props }) => (
  <select
    value={value}
    onChange={onChange}
    className={cn(
      'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition disabled:opacity-50 cursor-pointer',
      className
    )}
    {...props}
  >
    {children}
  </select>
)

export { Select }
