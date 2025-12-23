import { Skeleton } from "@/components/ui/skeleton";

export function NFTCardSkeleton() {
  return (
    <div className="bg-card border border-white/10 rounded-lg overflow-hidden card-containment">
      <div className="aspect-square bg-secondary/20 relative overflow-hidden">
        <Skeleton className="w-full h-full" />
        <div className="absolute inset-0 skeleton-shimmer" />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-10" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

export function NFTCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <NFTCardSkeleton key={i} />
      ))}
    </div>
  );
}
