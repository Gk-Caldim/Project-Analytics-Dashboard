import React from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Breadcrumb = ({ className, ...props }) => (
  <nav aria-label="breadcrumb" className={cn("flex flex-wrap items-center gap-1.5 break-words text-sm text-slate-500", className)} {...props} />
);

export const BreadcrumbList = ({ className, ...props }) => (
  <ol className={cn("flex flex-wrap items-center gap-1.5 break-words text-sm text-slate-500 sm:gap-2.5", className)} {...props} />
);

export const BreadcrumbItem = ({ className, ...props }) => (
  <li className={cn("inline-flex items-center gap-1.5", className)} {...props} />
);

export const BreadcrumbLink = React.forwardRef(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? React.Fragment : "a";
  return (
    <div
      ref={ref}
      className={cn("transition-colors hover:text-slate-900", className)}
    >
       {asChild ? props.children : <a {...props} />}
    </div>
  );
});
BreadcrumbLink.displayName = "BreadcrumbLink";

export const BreadcrumbPage = React.forwardRef(({ className, ...props }, ref) => (
  <span
    ref={ref}
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("font-normal text-slate-950", className)}
    {...props}
  />
));
BreadcrumbPage.displayName = "BreadcrumbPage";

export const BreadcrumbSeparator = ({ children, className, ...props }) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn("[&>svg]:size-3.5", className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

export const BreadcrumbEllipsis = ({ className, ...props }) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
);
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";
