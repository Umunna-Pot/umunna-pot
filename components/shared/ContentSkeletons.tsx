import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function PotCardSkeleton() {
  return (
    <Card className="flex flex-col justify-between rounded-3xl border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur-sm">
      <div className="space-y-4">
        <div>
          <Skeleton className="mb-2 h-4 w-16 rounded-full" />
          <Skeleton className="h-6 w-3/4 rounded-lg" />
          <div className="mt-2 space-y-1.5">
            <Skeleton className="h-3.5 w-full rounded-md" />
            <Skeleton className="h-3.5 w-4/5 rounded-md" />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-4 w-10 rounded-md" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        <div className="flex items-center justify-between border-t border-border/40 pt-3">
          <Skeleton className="h-3.5 w-32 rounded-md" />
          <Skeleton className="h-3.5 w-24 rounded-md" />
        </div>
      </div>

      <div className="mt-5 pt-2">
        <Skeleton className="h-9 w-full rounded-full" />
      </div>
    </Card>
  )
}

export function ActivityRowSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-9 rounded-2xl shrink-0" />
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4">
        <div className="space-y-1 text-right">
          <Skeleton className="h-4 w-20 rounded-md ml-auto" />
          <Skeleton className="h-3 w-16 rounded-md ml-auto" />
        </div>
        <Skeleton className="size-8 rounded-xl shrink-0" />
      </div>
    </div>
  )
}

export function ProposalCardSkeleton() {
  return (
    <Card className="rounded-3xl border-border/60 bg-card/60 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <Skeleton className="size-10 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-3.5 w-16 rounded-md" />
            </div>
            <Skeleton className="h-5 w-64 rounded-lg" />
            <Skeleton className="h-3.5 w-48 rounded-md" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>
    </Card>
  )
}

