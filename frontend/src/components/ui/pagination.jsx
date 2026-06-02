import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "../../lib/utils"

const Pagination = ({ className, ...props }) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

const PaginationLink = ({
  className,
  isActive,
  children,
  ...props
}) => (
  <button
    aria-current={isActive ? "page" : undefined}
    className={cn(
      "h-9 w-9 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors hover:bg-slate-100 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
      isActive ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700" : "text-slate-700 bg-white border border-slate-200",
      className
    )}
    {...props}
  >
    {children}
  </button>
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  ...props
}) => (
  <button
    aria-label="Go to previous page"
    className={cn(
      "h-9 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
      className
    )}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </button>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  ...props
}) => (
  <button
    aria-label="Go to next page"
    className={cn(
      "h-9 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
      className
    )}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </button>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center text-slate-400 select-none", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
