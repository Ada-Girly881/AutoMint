import React from 'react';

export interface LeaderboardUser {
  rank: number;
  address: string;
  points: number;
  botCount: number;
}

export interface LeaderboardTableProps {
  users: LeaderboardUser[];
}

export function LeaderboardTable({ users }: LeaderboardTableProps) {
  if (!users || users.length === 0) {
    return <div data-testid="empty-leaderboard">No leaderboard data available</div>;
  }

  return (
    <div className="overflow-x-auto" data-testid="leaderboard-table">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th className="px-4 py-2">Rank</th>
            <th className="px-4 py-2">User</th>
            <th className="px-4 py-2">Points</th>
            <th className="px-4 py-2">Bots</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.address} data-testid={`user-row-${user.rank}`}>
              <td className="px-4 py-2 font-bold">#{user.rank}</td>
              <td className="px-4 py-2 font-mono">{user.address}</td>
              <td className="px-4 py-2">{user.points.toLocaleString()}</td>
              <td className="px-4 py-2">{user.botCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
