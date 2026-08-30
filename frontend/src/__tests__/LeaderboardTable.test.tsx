import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable';

expect.extend(toHaveNoViolations);

jest.mock('framer-motion', () => ({
  motion: {
    tr: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLTableRowElement>>) => (
      <tr {...props}>{children}</tr>
    ),
  },
}));

const mockUsers = [
  { rank: 1, address: 'GABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456', points: 1500, username: 'alice', botCount: 3 },
  { rank: 2, address: 'GXYZ78901234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ6789', points: 900, username: 'bob', botCount: 1 },
  { rank: 5, address: 'GTEST00000000000000000000000000000000000000000000', points: 100, username: 'charlie' },
];

describe('LeaderboardTable Component', () => {
  it('renders empty message when no users are provided', () => {
    render(<LeaderboardTable users={[]} />);
    expect(screen.getByTestId('empty-leaderboard')).toBeInTheDocument();
    expect(screen.getByText('No leaderboard data available')).toBeInTheDocument();
  });

  it('renders empty message when users is nullish', () => {
    render(<LeaderboardTable users={[] as any} />);
    expect(screen.getByTestId('empty-leaderboard')).toBeInTheDocument();
  });

  it('renders users list correctly with table structure', () => {
    render(<LeaderboardTable users={mockUsers.slice(0, 2)} />);
    expect(screen.getByTestId('leaderboard-table')).toBeInTheDocument();
    expect(screen.getByTestId('user-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('user-row-2')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('900')).toBeInTheDocument();
  });

  it('displays rank medals for top 3 and numeric rank for others', () => {
    render(<LeaderboardTable users={mockUsers} />);
    // Rank 1 and 2 have medal icons (sr-only labels)
    expect(screen.getByText('1st place')).toBeInTheDocument();
    expect(screen.getByText('2nd place')).toBeInTheDocument();
    // Rank 5 shows numeric rank
    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  describe('rank is not conveyed by emoji/colour alone (#527)', () => {
    it('shows a visible numeric rank next to the medal for the top 3', () => {
      render(<LeaderboardTable users={mockUsers} />);
      const row1 = within(screen.getByTestId('user-row-1'));
      // greyscale-safe: the position is readable as a number, not just a medal
      expect(row1.getByText('1')).toBeInTheDocument();
      const row2 = within(screen.getByTestId('user-row-2'));
      expect(row2.getByText('2')).toBeInTheDocument();
    });

    it('hides the decorative medal glyph from the accessibility tree and labels it', () => {
      render(<LeaderboardTable users={mockUsers.slice(0, 1)} />);
      const row1 = within(screen.getByTestId('user-row-1'));
      expect(row1.getByText('🥇')).toHaveAttribute('aria-hidden', 'true');
      // adjacent accessible name for screen readers
      expect(row1.getByText('1st place')).toHaveClass('sr-only');
    });

    it('has no axe-detectable accessibility violations', async () => {
      const { container } = render(
        <LeaderboardTable users={mockUsers} currentAddress={mockUsers[0].address} />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('truncates long addresses and displays correctly', () => {
    render(<LeaderboardTable users={mockUsers.slice(0, 1)} />);
    // truncateAddress: first 6 + ... + last 4
    const addr = mockUsers[0].address;
    const truncated = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    expect(screen.getByText(truncated)).toBeInTheDocument();
  });

  it('falls back to Trader # rank when username is missing', () => {
    const users = [{ rank: 3, address: 'GABC12345678', points: 500 }];
    render(<LeaderboardTable users={users} />);
    expect(screen.getByText('Trader #3')).toBeInTheDocument();
  });

  it('highlights current user row with You badge', () => {
    render(<LeaderboardTable users={mockUsers} currentAddress={mockUsers[0].address} />);
    expect(screen.getByText('You')).toBeInTheDocument();
    const row = screen.getByTestId('user-row-1');
    expect(row).toHaveAttribute('aria-current', 'true');
  });

  it('highlights current user case-insensitively', () => {
    render(<LeaderboardTable users={mockUsers} currentAddress={mockUsers[0].address.toLowerCase()} />);
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('does not highlight any row when currentAddress is null', () => {
    render(<LeaderboardTable users={mockUsers} currentAddress={null} />);
    expect(screen.queryByText('You')).not.toBeInTheDocument();
  });

  it('renders table with accessible region and caption', () => {
    render(<LeaderboardTable users={mockUsers.slice(0, 1)} />);
    const region = screen.getByRole('region', { name: /Leaderboard rankings/ });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('tabIndex', '0');
  });

  it('renders column headers correctly', () => {
    render(<LeaderboardTable users={mockUsers.slice(0, 1)} />);
    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Points')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
  });

  it('handles short addresses without truncation', () => {
    const users = [{ rank: 1, address: 'GABC123', points: 100, username: 'short' }];
    render(<LeaderboardTable users={users} />);
    expect(screen.getByText('GABC123')).toBeInTheDocument();
  });
});
