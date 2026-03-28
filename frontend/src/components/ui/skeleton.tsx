import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted animate-skeleton",
        className
      )}
      {...props}
    />
  )
}

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-4 w-20" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t p-3">
        <Skeleton className="h-8 rounded-md" />
        <Skeleton className="h-8 rounded-md" />
      </div>
    </div>
  )
}

function OutfitCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm p-5 space-y-4">
      <div className="flex justify-between">
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 rounded-lg border p-3 min-w-[100px]">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="space-y-2 flex-1 max-w-[70%]">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-12 w-5/6 rounded-md" />
      </div>
    </div>
  )
}

export { Skeleton, ProductCardSkeleton, OutfitCardSkeleton, ChatMessageSkeleton }
