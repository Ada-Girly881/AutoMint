'use client';
import clsx from 'clsx';

interface SkeletonProps { className?: string; }

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx('animate-pulse rounded-xl', className)}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--card)' }}>
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function BotCardSkeleton() {
  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--card-2)' }}>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3 px-5" style={{ borderBottom: '1px solid var(--liner)' }}>
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="ml-auto h-4 w-20" />
    </div>
  );
}
