import { METRIC_KEYS } from '../config/GameConfig';
import { getDailySeedString } from '../utils/SeededRandom';

export interface PlayerStats {
  highScore: number;
  gamesPlayed: number;
  totalDistance: number;
  averageDistance: number;
  dailyBest: number;
  dailyBestDate: string;
  playerName: string;
}

export class SaveSystem {
  /**
   * Loads statistics from LocalStorage, returning default values if none exist.
   */
  public static loadStats(): PlayerStats {
    if (typeof window === 'undefined') {
      return this.getDefaultStats();
    }

    try {
      const highScoreStr = localStorage.getItem(METRIC_KEYS.HIGH_SCORE);
      const gamesPlayedStr = localStorage.getItem(METRIC_KEYS.GAMES_PLAYED);
      const totalDistanceStr = localStorage.getItem(METRIC_KEYS.TOTAL_DISTANCE);
      const dailyBestStr = localStorage.getItem(METRIC_KEYS.DAILY_BEST);
      const dailyBestDate = localStorage.getItem(METRIC_KEYS.DAILY_BEST + '_date') || '';
      const playerName = localStorage.getItem(METRIC_KEYS.PLAYER_NAME) || this.generateGuestName();

      const highScore = highScoreStr ? parseFloat(highScoreStr) : 0;
      const gamesPlayed = gamesPlayedStr ? parseInt(gamesPlayedStr, 10) : 0;
      const totalDistance = totalDistanceStr ? parseFloat(totalDistanceStr) : 0;
      
      const currentDailyDate = getDailySeedString();
      let dailyBest = dailyBestStr ? parseFloat(dailyBestStr) : 0;
      
      // Reset daily best if the date has changed
      if (dailyBestDate !== currentDailyDate) {
        dailyBest = 0;
      }

      const averageDistance = gamesPlayed > 0 ? parseFloat((totalDistance / gamesPlayed).toFixed(1)) : 0;

      return {
        highScore,
        gamesPlayed,
        totalDistance,
        averageDistance,
        dailyBest,
        dailyBestDate: dailyBestDate || currentDailyDate,
        playerName,
      };
    } catch (e) {
      console.error('Failed to load stats from localStorage:', e);
      return this.getDefaultStats();
    }
  }

  /**
   * Saves a finished run's distance, updating high scores, games played, and daily score.
   */
  public static saveRun(distance: number): PlayerStats {
    if (typeof window === 'undefined') {
      return this.getDefaultStats();
    }

    const currentStats = this.loadStats();
    const updatedStats = { ...currentStats };

    updatedStats.gamesPlayed += 1;
    updatedStats.totalDistance = parseFloat((updatedStats.totalDistance + distance).toFixed(1));
    updatedStats.averageDistance = parseFloat((updatedStats.totalDistance / updatedStats.gamesPlayed).toFixed(1));

    if (distance > updatedStats.highScore) {
      updatedStats.highScore = parseFloat(distance.toFixed(1));
    }

    const currentDailyDate = getDailySeedString();
    if (updatedStats.dailyBestDate !== currentDailyDate) {
      updatedStats.dailyBest = parseFloat(distance.toFixed(1));
      updatedStats.dailyBestDate = currentDailyDate;
    } else if (distance > updatedStats.dailyBest) {
      updatedStats.dailyBest = parseFloat(distance.toFixed(1));
    }

    try {
      localStorage.setItem(METRIC_KEYS.HIGH_SCORE, updatedStats.highScore.toString());
      localStorage.setItem(METRIC_KEYS.GAMES_PLAYED, updatedStats.gamesPlayed.toString());
      localStorage.setItem(METRIC_KEYS.TOTAL_DISTANCE, updatedStats.totalDistance.toString());
      localStorage.setItem(METRIC_KEYS.DAILY_BEST, updatedStats.dailyBest.toString());
      localStorage.setItem(METRIC_KEYS.DAILY_BEST + '_date', updatedStats.dailyBestDate);
      localStorage.setItem(METRIC_KEYS.PLAYER_NAME, updatedStats.playerName);
    } catch (e) {
      console.error('Failed to save stats to localStorage:', e);
    }

    return updatedStats;
  }

  /**
   * Sets and saves the player's custom display name.
   */
  public static savePlayerName(name: string): string {
    const sanitized = name.trim().slice(0, 15) || 'Anonymous';
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(METRIC_KEYS.PLAYER_NAME, sanitized);
      } catch (e) {
        console.error('Failed to save player name:', e);
      }
    }
    return sanitized;
  }

  private static getDefaultStats(): PlayerStats {
    return {
      highScore: 0,
      gamesPlayed: 0,
      totalDistance: 0,
      averageDistance: 0,
      dailyBest: 0,
      dailyBestDate: getDailySeedString(),
      playerName: 'GUEST_USER',
    };
  }

  private static generateGuestName(): string {
    const id = Math.floor(1000 + Math.random() * 9000);
    return `Skier_${id}`;
  }
}
