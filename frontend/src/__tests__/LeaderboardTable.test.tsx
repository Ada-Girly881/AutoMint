import React from 'react';
import { render, screen } from '@testing-library/react';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import type { UserProfile } from '@/types';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.ComponentPropsWithoutRef<'div'>) => (
      <div {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/lib/stellar', () => ({
  truncateAddress: (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`,
}));

const makeUser = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  address: 'GAAABBBCCCDDDEEEFFFGGGHHHIIIJJJKKKLL',
  username: 'Alice',
  totalPoints: 500n,
  claimedAmt: 5n,
  registeredAt: 0n,
  botCount: 2,
  ...overrides,
});

describe('LeaderboardTable', () => {
  test('renders skeleton rows while loading', () => {
    const { container } = render(
      <LeaderboardTable rankings={[]} currentUserAddress={null} isLoading={true} />
    );
    // Skeleton rows rendered as divs inside the container
    expect(container.firstChild).toBeTruthy();
  });

  test('renders empty state when no players', () => {
    render(
      <LeaderboardTable rankings={[]} currentUserAddress={null} isLoading={false} />
    );
    expect(screen.getByText(/Be the first!/i)).toBeInTheDocument();
  });

  test('renders a list of players', () => {
    const rankings = [
      makeUser({ address: 'GAAA', username: 'Alice', totalPoints: 1000n }),
      makeUser({ address: 'GBBB', username: 'Bob', totalPoints: 500n }),
    ];
    render(
      <LeaderboardTable rankings={rankings} currentUserAddress={null} isLoading={false} />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  test('highlights the current user row with a "You" badge', () => {
    const me = makeUser({ address: 'GMEEEEE', username: 'Me' });
    render(
      <LeaderboardTable rankings={[me]} currentUserAddress="GMEEEEE" isLoading={false} />
    );
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  test('formats large point totals', () => {
    const rankings = [makeUser({ totalPoints: 1_500_000n })];
    render(
      <LeaderboardTable rankings={rankings} currentUserAddress={null} isLoading={false} />
    );
    expect(screen.getByText('1.50M')).toBeInTheDocument();
  });

  test('does not show "You" badge for other players', () => {
    const rankings = [
      makeUser({ address: 'GAAA', username: 'Other' }),
    ];
    render(
      <LeaderboardTable rankings={rankings} currentUserAddress="GOTHER" isLoading={false} />
    );
    expect(screen.queryByText('You')).not.toBeInTheDocument();
  });
});
