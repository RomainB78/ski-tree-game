import { SeededRandom } from '../utils/SeededRandom';
import { CHUNK_HEIGHT, GAME_WIDTH, ObstacleData, ObstacleType, OBSTACLE_TYPES } from '../config/GameConfig';

export class ObstacleGenerator {
  private seed: number;
  private activeChunks: Map<number, ObstacleData[]>;
  private lastCorridorCenter: number; // Column index (0 to 9)
  private recentPlaced: { x: number; y: number }[] = [];

  constructor(seed: number) {
    this.seed = seed;
    this.activeChunks = new Map();
    // Start with the corridor in the middle of the screen
    this.lastCorridorCenter = 5;
  }

  /**
   * Resets the generator state with a new seed.
   */
  public reset(seed: number) {
    this.seed = seed;
    this.activeChunks.clear();
    this.lastCorridorCenter = 5;
    this.recentPlaced = [];
  }

  /**
   * Generates or retrieves obstacles for a specific chunk index.
   * chunkIndex = Math.floor(y / CHUNK_HEIGHT)
   */
  public getOrCreateChunk(chunkIndex: number): ObstacleData[] {
    if (this.activeChunks.has(chunkIndex)) {
      return this.activeChunks.get(chunkIndex)!;
    }

    const obstacles = this.generateChunk(chunkIndex);
    this.activeChunks.set(chunkIndex, obstacles);

    // Keep active chunks size bounded (e.g. prune old chunks)
    if (this.activeChunks.size > 10) {
      const keys = Array.from(this.activeChunks.keys());
      const minKey = Math.min(...keys);
      this.activeChunks.delete(minKey);
    }

    return obstacles;
  }

  /**
   * Procedurally generates obstacles for a given chunk index.
   * Guarantees a traversable corridor.
   */
  private generateChunk(chunkIndex: number): ObstacleData[] {
    const obstacles: ObstacleData[] = [];
    
    // Seed combining the run seed and the chunk index
    const chunkSeed = this.seed + chunkIndex * 82463;
    const rng = new SeededRandom(chunkSeed);

    // Increase speed/difficulty stats based on chunk index
    // Higher chunk index -> narrower corridors, denser trees, higher speed
    // Fast difficulty progression: max difficulty is capped at chunk 16 (approx 210 points)
    // Ultra-aggressive difficulty scaling: max difficulty caps at chunk 12 (approx 160 points)
    const difficultyFactor = Math.min(1.0, chunkIndex / 12.0);
    
    // Dynamic layout style selection based on difficulty
    // As difficulty increases, Open snow (0) disappears quickly, and Dense forest (2) / Narrow corridor (3) layout styles dominate
    const roll = rng.next();
    let style = 1; // Default scattered
    
    const openSnowBound = Math.max(0.0, 0.15 - difficultyFactor * 0.15);
    const scatteredBound = Math.max(openSnowBound, 0.45 - difficultyFactor * 0.35);
    const denseForestBound = Math.max(scatteredBound, 0.75 - difficultyFactor * 0.10);

    if (roll < openSnowBound) style = 0;
    else if (roll < scatteredBound) style = 1;
    else if (roll < denseForestBound) style = 2;
    else style = 3;

    // Define column lanes: 10 columns across the 480px width
    const numColumns = 10;
    const colWidth = GAME_WIDTH / numColumns;
    
    // Determine the corridor center for this chunk (shift by up to -1, 0, +1 from last chunk)
    const drift = rng.pick([-1, 0, 1]);
    let corridorCenter = this.lastCorridorCenter + drift;
    corridorCenter = Math.max(2, Math.min(numColumns - 3, corridorCenter));
    this.lastCorridorCenter = corridorCenter;

    // Corridor width narrows down to a razor-thin 1 lane winding slalom very early
    let corridorWidth = 3;
    if (style === 2 || style === 3) {
      corridorWidth = 2;
    }
    if (difficultyFactor > 0.20 && style !== 0) {
      corridorWidth = Math.max(2, corridorWidth - 1);
    }
    if (difficultyFactor > 0.50 && style !== 0) {
      corridorWidth = Math.max(1, corridorWidth - 1);
    }

    const corridorStartCol = corridorCenter - Math.floor(corridorWidth / 2);
    const corridorEndCol = corridorStartCol + corridorWidth;

    // Define rows along the height of the chunk (each chunk is 600px high)
    // We place obstacle attempts in rows (e.g. every 100px)
    const numRows = 6;
    const rowHeight = CHUNK_HEIGHT / numRows; // 100px per row

    for (let r = 0; r < numRows; r++) {
      const rowY = chunkIndex * CHUNK_HEIGHT + r * rowHeight;

      // Skip spawning trees in the immediate starting area at the very top of chunk 0
      if (chunkIndex === 0 && rowY < 350) {
        continue;
      }

      for (let c = 0; c < numColumns; c++) {
        // Skip columns inside the corridor to ensure a safe skiing path
        if (c >= corridorStartCol && c <= corridorEndCol) {
          continue;
        }

        // Determine probability of obstacle placement in this cell (cranked up by another +10% / 94% dense forest)
        let placementProbability = 0.75; // base probability increased from 0.65
        if (style === 0) placementProbability = 0.45; // open snow increased from 0.35
        if (style === 2) placementProbability = 0.94; // dense forest set to exactly 94%
        if (style === 3) placementProbability = 0.85; // narrow passage increased from 0.75

        // Scale probability heavily with difficulty
        placementProbability += difficultyFactor * 0.40;

        // Override probability for start chunks to be extremely dense (raised by +10% at start)
        if (chunkIndex === 0) {
          placementProbability = 0.55; // up from 0.45
        } else if (chunkIndex === 1) {
          placementProbability = 0.70; // up from 0.60
        }

        // Ensure we don't block the screen entirely
        if (rng.next() < placementProbability) {
          // Determine obstacle type
          let type: ObstacleType = OBSTACLE_TYPES.TREE_GREEN;
          
          // Only spawn other obstacle types in subsequent chunks
          if (chunkIndex > 1) {
            const typeRoll = rng.next();
            if (typeRoll < 0.45) {
              type = OBSTACLE_TYPES.TREE_GREEN; // 45% green trees
            } else if (typeRoll < 0.75) {
              type = OBSTACLE_TYPES.ROCK;       // 30% rocks
            } else {
              type = OBSTACLE_TYPES.LOG;        // 25% logs (wide blocks)
            }
          }

          // Generate coordinates inside the grid cell with random offsets for a natural look
          const offsetX = rng.floatBetween(0.1, 0.9) * colWidth;
          const offsetY = rng.floatBetween(0.1, 0.9) * rowHeight;
          const obstacleX = c * colWidth + offsetX;
          const obstacleY = rowY + offsetY;

          // Spacing check: prevent obstacles from overlapping (e.g. logs on top of trees)
          let tooClose = false;

          // Check against current chunk obstacles
          for (const existing of obstacles) {
            const dx = Math.abs(existing.x - obstacleX);
            const dy = Math.abs(existing.y - obstacleY);
            // Spacing guard: keep at least 65px horizontal and 85px vertical distance between obstacle centers
            if (dx < 65 && dy < 85) {
              tooClose = true;
              break;
            }
          }

          // Check against recent obstacles from the previous chunk
          if (!tooClose) {
            for (const existing of this.recentPlaced) {
              const dx = Math.abs(existing.x - obstacleX);
              const dy = Math.abs(existing.y - obstacleY);
              if (dx < 65 && dy < 85) {
                tooClose = true;
                break;
              }
            }
          }

          if (tooClose) {
            continue; // Skip placement to prevent overlap
          }

          const newObs = this.createObstacleData(`${chunkIndex}_${r}_${c}`, obstacleX, obstacleY, type);
          obstacles.push(newObs);

          this.recentPlaced.push({ x: obstacleX, y: obstacleY });
          // Limit tracking list size to keep performance lightweight
          if (this.recentPlaced.length > 20) {
            this.recentPlaced.shift();
          }
        }
      }
    }

    return obstacles;
  }

  /**
   * Helper to construct ObstacleData with precise physics hitboxes
   */
  private createObstacleData(id: string, x: number, y: number, type: ObstacleType): ObstacleData {
    let width = 50;
    let height = 70;
    let hitboxWidth = 26;
    let hitboxHeight = 38;
    let hitboxOffsetX = 12;
    let hitboxOffsetY = 26; // Cores trunk and lower half foliage

    if (type === OBSTACLE_TYPES.ROCK) {
      width = 40;
      height = 30;
      hitboxWidth = 32;
      hitboxHeight = 22;
      hitboxOffsetX = 4;
      hitboxOffsetY = 4;
    } else if (type === OBSTACLE_TYPES.LOG) {
      width = 60;
      height = 20;
      hitboxWidth = 52;
      hitboxHeight = 16;
      hitboxOffsetX = 4;
      hitboxOffsetY = 2;
    }

    return {
      id,
      x,
      y,
      type,
      width,
      height,
      hitboxWidth,
      hitboxHeight,
      hitboxOffsetX,
      hitboxOffsetY,
    };
  }
}
