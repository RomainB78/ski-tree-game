import { PHYSICS_CONFIG, GAME_WIDTH } from '../config/GameConfig';

export interface SkierState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;       // Current body angle in radians (0 = straight down)
  targetAngle: number; // Target steering angle in radians
  speedY: number;      // Current forward speed scalar
  sideSlip: number;    // Lateral slide velocity magnitude (used for snow spray)
}

export class PhysicsSolver {
  /**
   * Updates the skier's position, velocity, turning angle, and lateral slip.
   * Runs frame-rate independent calculation using dt (delta-time in seconds).
   */
  public static updateSkier(state: SkierState, dt: number, distance: number, isDragging: boolean = false): void {
    // Prevent huge dt jumps from breaking physics (e.g. background tab switching)
    const clampedDt = Math.min(0.1, dt);

    // 1. Gradually increase descent speed based on distance traveled
    const distanceMeters = distance; // Already scaled
    const speedFactor = 1.0 + (distanceMeters / 100.0) * (PHYSICS_CONFIG.SPEED_INCREASE_RATE / 100.0);
    const targetDescentSpeed = Math.min(
      PHYSICS_CONFIG.MAX_SPEED_Y,
      PHYSICS_CONFIG.BASE_SPEED_Y * speedFactor
    );

    // Smoothly accelerate speedY towards targetDescentSpeed
    state.speedY += (targetDescentSpeed - state.speedY) * 1.5 * clampedDt;
    state.speedY = Math.min(PHYSICS_CONFIG.MAX_SPEED_Y, state.speedY);

    // 2. Interpolate body angle towards target steering angle (simulates steering inertia)
    const angleDiff = state.targetAngle - state.angle;
    // Normalize time factor to 60 FPS standard
    const fpsScale = clampedDt * 60.0;
    
    // Scale responsiveness dramatically when pointer dragging is active, keyboard is untouched
    const currentInertia = isDragging 
      ? Math.min(0.8, PHYSICS_CONFIG.TURN_INERTIA * 3.2) 
      : PHYSICS_CONFIG.TURN_INERTIA;
      
    state.angle += angleDiff * Math.min(1.0, currentInertia * fpsScale);

    // 3. Compute skier facing direction vectors
    // Facing vector: X-axis points right (sin), Y-axis points down (cos)
    const fx = Math.sin(state.angle);
    const fy = Math.cos(state.angle);

    // 4. Calculate target velocity in the direction of the skier's body
    const targetVx = fx * state.speedY;
    const targetVy = fy * state.speedY;

    // 5. Apply lateral slide physics (skier momentum / carving friction)
    // If touch dragging, make the carving friction much tighter (less slide/drift) so the skier responds instantly by moving left/right
    const currentFriction = isDragging 
      ? Math.min(0.9, PHYSICS_CONFIG.CARVING_FRICTION * 3.5) 
      : PHYSICS_CONFIG.CARVING_FRICTION;
      
    const slideScale = Math.min(1.0, currentFriction * fpsScale);
    state.vx += (targetVx - state.vx) * slideScale;
    state.vy += (targetVy - state.vy) * Math.min(1.0, slideScale * 1.5); // Y velocity aligns slightly faster

    // 6. Calculate sideSlip magnitude for visual feedback (e.g. snow trail volume)
    // Side slip is the magnitude of the velocity projected onto the perpendicular facing vector
    const perpX = -fy;
    const perpY = fx;
    state.sideSlip = Math.abs(state.vx * perpX + state.vy * perpY);

    // 7. Update positions
    state.x += state.vx * clampedDt;
    state.y += state.vy * clampedDt;

    // 8. Constrain player x inside game screen width (with a margin at edges)
    const playerPadding = 24;
    const minX = playerPadding;
    const maxX = GAME_WIDTH - playerPadding;
    if (state.x < minX) {
      state.x = minX;
      state.vx = 0;
    } else if (state.x > maxX) {
      state.x = maxX;
      state.vx = 0;
    }
  }
}
