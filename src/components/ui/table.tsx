'use client'

import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react'
import { clsx } from 'clsx'

function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={clsx('w-full text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

function TableHeader({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={clsx('border-b border-border', className)} {...props}>
      {children}
    </thead>
  )
}

function TableBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={clsx('[&>tr:nth-child(even)]:bg-muted/30', className)} {...props}>
      {children}
    </tbody>
  )
}

function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={clsx('border-b border-border/50 transition-colors hover:bg-muted/50', className)}
      {...props}
    >
      {children}
    </tr>
  )
}

function TableHead({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={clsx(
        'px-3 py-2.5 text-left font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

function TableCell({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={clsx('px-3 py-2.5', className)} {...props}>
      {children}
    </td>
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
