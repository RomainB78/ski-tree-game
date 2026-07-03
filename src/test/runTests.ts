import { SeededRandom } from '../utils/SeededRandom';
import { PhysicsSolver, SkierState } from '../engine/Physics';
import { CollisionSystem } from '../engine/Collision';
import { ObstacleData, PHYSICS_CONFIG } from '../config/GameConfig';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// =========================================================================
// 1. SEEDED RANDOM UNIT TESTS
// =========================================================================
function testSeededRandom() {
  console.log('Testing SeededRandom...');

  const rand1 = new SeededRandom(42);
  const rand2 = new SeededRandom(42);
  const rand3 = new SeededRandom(999);

  // Assert repeatability
  const val1_1 = rand1.next();
  const val1_2 = rand1.next();
  const val2_1 = rand2.next();
  const val2_2 = rand2.next();
  assert(val1_1 === val2_1, 'Identical seed should yield identical first value');
  assert(val1_2 === val2_2, 'Identical seed should yield identical second value');

  // Assert difference
  const val3_1 = rand3.next();
  assert(val1_1 !== val3_1, 'Different seeds should yield different values');

  // Range checks
  for (let i = 0; i < 100; i++) {
    const floatVal = rand1.floatBetween(5.0, 10.0);
    assert(floatVal >= 5.0 && floatVal < 10.0, `Float range bound broken: ${floatVal}`);

    const intVal = rand1.intBetween(1, 5);
    assert(intVal >= 1 && intVal <= 5 && Number.isInteger(intVal), `Int range bound broken: ${intVal}`);
  }

  console.log('✅ SeededRandom tests passed!');
}

// =========================================================================
// 2. PHYSICS SOLVER UNIT TESTS
// =========================================================================
function testPhysicsSolver() {
  console.log('Testing PhysicsSolver...');

  const state: SkierState = {
    x: 300,
    y: 0,
    vx: 0,
    vy: PHYSICS_CONFIG.BASE_SPEED_Y,
    angle: 0,
    targetAngle: 0,
    speedY: PHYSICS_CONFIG.BASE_SPEED_Y,
    sideSlip: 0,
  };

  // Run update for 1 second (60 steps of 1/60s)
  const dt = 1 / 60;
  for (let i = 0; i < 60; i++) {
    PhysicsSolver.updateSkier(state, dt, i * 1);
  }

  // Vertical movement assertions
  assert(state.y > 0, 'Skier should descend downhill');
  assert(state.vx === 0, 'No steering input should result in zero X velocity');
  assert(state.angle === 0, 'No steering input should maintain 0 angle');

  // Steering action tests
  state.targetAngle = 0.5; // steer right
  for (let i = 0; i < 30; i++) {
    PhysicsSolver.updateSkier(state, dt, 10);
  }
  assert(state.angle > 0, 'Actual angle should interpolate towards positive target angle');
  assert(state.vx > 0, 'Positive angle should result in positive X velocity (right drift)');

  // Speed cap verification
  state.speedY = PHYSICS_CONFIG.MAX_SPEED_Y + 100;
  PhysicsSolver.updateSkier(state, dt, 10000); // long distance should trigger acceleration, capped
  assert(state.speedY <= PHYSICS_CONFIG.MAX_SPEED_Y + 10, 'Descent speed must not exceed MAX_SPEED_Y bounds');

  console.log('✅ PhysicsSolver tests passed!');
}

// =========================================================================
// 3. COLLISION SYSTEM UNIT TESTS
// =========================================================================
function testCollisionSystem() {
  console.log('Testing CollisionSystem...');

  const skier: SkierState = {
    x: 300,
    y: 500,
    vx: 0,
    vy: 200,
    angle: 0,
    targetAngle: 0,
    speedY: 200,
    sideSlip: 0,
  };

  // Mock tree green obstacle (origin x: 280, y: 440)
  // New corrected hitbox: width 26, height 38, offset X: 12, offset Y: 26
  const testTree: ObstacleData = {
    id: 'test_tree',
    x: 280,
    y: 440,
    type: 'tree_green',
    width: 50,
    height: 70,
    hitboxWidth: 26,
    hitboxHeight: 38,
    hitboxOffsetX: 12,
    hitboxOffsetY: 26,
  };

  // 1. Skier far away (No collision)
  let hit = CollisionSystem.checkCollision(skier, [testTree]);
  assert(hit === null, 'Skier far away should not trigger collision');

  // 2. Skier branches overlap (No collision)
  // Skier at x=280, y=390 overlaps the high foliage
  // Tree Y range is 405 (top) to 475 (bottom). Foliage hitbox starts at Y = 440 - 35 + 26 = 431.
  // Skier feet at y=390 + 10 = 400 is above the hitbox. No collision.
  skier.x = 280;
  skier.y = 390;
  hit = CollisionSystem.checkCollision(skier, [testTree]);
  assert(hit === null, 'Overlapping tree branches should not trigger collision (branch clipping buffer)');

  // 3. Skier trunk/lower half overlap (Collision)
  // Obstacle trunk absolute boundary:
  // X: 280 - 25 + 12 = 267 to 293
  // Y: 440 - 35 + 26 = 431 to 469
  // Skier feet at x=280, y=430 -> skierHitboxY = 440. Matches bounds!
  skier.x = 280;
  skier.y = 430;
  hit = CollisionSystem.checkCollision(skier, [testTree]);
  assert(hit !== null && hit.id === 'test_tree', 'Overlapping trunk should trigger collision');

  console.log('✅ CollisionSystem tests passed!');
}

// =========================================================================
// RUN ALL TESTS
// =========================================================================
function runAll() {
  console.log('--- STARTING UNIT TESTS RUN ---');
  try {
    testSeededRandom();
    testPhysicsSolver();
    testCollisionSystem();
    console.log('--- ALL TESTS COMPLETED SUCCESSFULLY! ---');
  } catch (error: any) {
    console.error('❌ TESTS FAILED:', error.message);
    process.exit(1);
  }
}

runAll();
