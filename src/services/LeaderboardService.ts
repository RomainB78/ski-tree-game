export interface LeaderboardRecord {
  playerName: string;
  score: number;
  date: string;
  rank?: number;
}

export class LeaderboardService {
  private static getUserId(): string {
    if (typeof window === 'undefined') return '';
    let uid = localStorage.getItem('skitree_user_id');
    if (!uid) {
      uid = 'usr_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('skitree_user_id', uid);
    }
    return uid;
  }

  /**
   * Submits a score to the database.
   */
  public static async submitScore(playerName: string, score: number): Promise<{ rank: number; totalCount: number } | null> {
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName,
          score,
          userId: this.getUserId(),
        }),
      });

      if (!response.ok) throw new Error('API response failed');

      const data = await response.json();
      if (data.success) {
        return {
          rank: data.rank,
          totalCount: data.totalCount,
        };
      }
    } catch (e) {
      console.error('Failed to submit score to leaderboard API:', e);
    }
    return null;
  }

  /**
   * Fetches leaderboard entries filtered by type (global, daily, weekly, monthly, friends)
   */
  public static async getScores(filter: 'global' | 'daily' | 'weekly' | 'monthly' | 'friends', playerName: string): Promise<LeaderboardRecord[]> {
    try {
      const params = new URLSearchParams({ filter, playerName });
      const response = await fetch(`/api/leaderboard?${params.toString()}`);
      if (!response.ok) throw new Error('API response failed');

      const data = await response.json();
      if (data.success) {
        return data.entries.map((entry: any, index: number) => ({
          playerName: entry.playerName,
          score: entry.score,
          date: entry.date,
          rank: index + 1,
        }));
      }
    } catch (e) {
      console.error(`Failed to fetch ${filter} leaderboard:`, e);
    }
    return [];
  }
}
