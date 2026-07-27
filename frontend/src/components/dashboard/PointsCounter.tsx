import React from 'react';

export interface PointsCounterProps {
  points: number;
  rate: number;
}

export function PointsCounter({ points, rate }: PointsCounterProps) {
  return (
    <div className="p-4 rounded-xl" data-testid="points-counter">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        Total Points
      </div>
      <div className="text-2xl font-bold" data-testid="total-points">
        {points.toLocaleString()}
      </div>
      <div className="text-xs text-muted-foreground mt-1" data-testid="accrual-rate">
        +{rate} pts/hr
      </div>
    </div>
  );
}
