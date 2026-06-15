import React from 'react';
import { render, screen } from '@testing-library/react';
import { PointsCounter } from '@/components/dashboard/PointsCounter';
import type { BotNFT } from '@/types';

// framer-motion doesn't work in jsdom — mock it
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.ComponentPropsWithoutRef<'div'>) => (
      <div {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const baseProps = {
  displayedPoints: 1250,
  ratePerHour: 100,
  bots: [] as BotNFT[],
  amtBalance: 12n,
};

describe('PointsCounter', () => {
  test('renders the displayed point total', () => {
    render(<PointsCounter {...baseProps} />);
    expect(screen.getByText('1,250')).toBeInTheDocument();
  });

  test('renders AMT balance', () => {
    render(<PointsCounter {...baseProps} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  test('shows correct pts/sec rate', () => {
    render(<PointsCounter {...baseProps} />);
    // 100 pts/hr ÷ 3600 = 0.0278 pts/sec
    expect(screen.getByText(/0\.0278 pts\/sec/)).toBeInTheDocument();
  });

  test('shows bot breakdown when bots are present', () => {
    const bots: BotNFT[] = [
      {
        id: 1n,
        tier: 'Gold',
        owner: 'GXXX',
        accrualRate: 100n,
        mintedAt: 0n,
        name: 'Gold Bot',
      },
    ];
    render(<PointsCounter {...baseProps} bots={bots} />);
    expect(screen.getByText('Bot breakdown')).toBeInTheDocument();
    expect(screen.getByText(/Gold Bot/)).toBeInTheDocument();
  });

  test('does not render bot breakdown section when no bots', () => {
    render(<PointsCounter {...baseProps} bots={[]} />);
    expect(screen.queryByText('Bot breakdown')).not.toBeInTheDocument();
  });

  test('bot count stat reflects the bots array length', () => {
    const bots: BotNFT[] = [
      { id: 1n, tier: 'Basic', owner: 'G', accrualRate: 1n, mintedAt: 0n, name: 'Basic Bot' },
      { id: 2n, tier: 'Bronze', owner: 'G', accrualRate: 5n, mintedAt: 0n, name: 'Bronze Bot' },
    ];
    render(<PointsCounter {...baseProps} bots={bots} ratePerHour={6} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
