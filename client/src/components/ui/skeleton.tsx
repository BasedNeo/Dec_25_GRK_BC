import { cn } from "@/lib/utils"

function Skeleton({
  className,
  shimmer = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { shimmer?: boolean }) {
  return (
    <div
      className={cn("skeleton", shimmer && "skeleton-shimmer", className)}
      {...props}
    />
  )
}

export { Skeleton }
