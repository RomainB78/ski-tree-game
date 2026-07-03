import { ObstacleData } from '../config/GameConfig';
import { SkierState } from './Physics';

export class CollisionSystem {
  /**
   * Evaluates AABB collisions between the skier's feet/skis and obstacle trunks/bases.
   * Returns the collided obstacle if a hit is detected, otherwise null.
   */
  public static checkCollision(
    skier: SkierState,
    obstacles: ObstacleData[]
  ): ObstacleData | null {
    // Skier feet/ski hitbox: small rectangle scaled proportionally to the 1.5x player sprite (W: 21, H: 12)
    const skierHitboxW = 21;
    const skierHitboxH = 12;
    const skierHitboxX = skier.x - skierHitboxW / 2;
    // Feet are located at the bottom of the scaled skier box (y + 15px)
    const skierHitboxY = skier.y + 15;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];

      // Subtract half dimensions to offset centered Phaser sprite coordinate origins
      const obsMinX = obs.x - obs.width / 2 + obs.hitboxOffsetX;
      const obsMaxX = obsMinX + obs.hitboxWidth;
      const obsMinY = obs.y - obs.height / 2 + obs.hitboxOffsetY;
      const obsMaxY = obsMinY + obs.hitboxHeight;

      // AABB collision detection
      const collisionX = skierHitboxX < obsMaxX && skierHitboxX + skierHitboxW > obsMinX;
      const collisionY = skierHitboxY < obsMaxY && skierHitboxY + skierHitboxH > obsMinY;

      if (collisionX && collisionY) {
        return obs; // Hit detected!
      }
    }

    return null;
  }
}
