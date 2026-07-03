export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 800;

export const PHYSICS_CONFIG = {
  GRAVITY: 350,              // Speed acceleration rate downwards
  BASE_SPEED_Y: 340,         // Minimum forward descent speed (pixels/sec) - fast startup
  MAX_SPEED_Y: 820,          // Absolute speed cap down the mountain - very high top speed
  STEER_SPEED: 480,          // Steering speed factor (left/right)
  TURN_INERTIA: 0.12,        // Steering response rate
  CARVING_FRICTION: 0.14,    // Sideway slide dampening - more drift carving inertia
  SPEED_INCREASE_RATE: 5.5,  // Speed added per 100 points - aggressive progression
};

export const CHUNK_HEIGHT = 600; // Height of each procedural scrolling segment

export const OBSTACLE_TYPES = {
  TREE_GREEN: 'tree_green',
  TREE_SNOWY: 'tree_snowy',
  ROCK: 'rock',
  LOG: 'log',
} as const;

export type ObstacleType = typeof OBSTACLE_TYPES[keyof typeof OBSTACLE_TYPES];

export interface ObstacleData {
  id: string;
  x: number;
  y: number;
  type: ObstacleType;
  width: number;
  height: number;
  hitboxWidth: number;
  hitboxHeight: number;
  hitboxOffsetX: number;
  hitboxOffsetY: number;
}

export const METRIC_KEYS = {
  HIGH_SCORE: 'skitree_high_score',
  GAMES_PLAYED: 'skitree_games_played',
  TOTAL_DISTANCE: 'skitree_total_distance',
  AVERAGE_DISTANCE: 'skitree_avg_distance',
  DAILY_BEST: 'skitree_daily_best',
  PLAYER_NAME: 'skitree_player_name',
};
