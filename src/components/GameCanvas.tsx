'use client';

import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { PHYSICS_CONFIG, GAME_WIDTH, GAME_HEIGHT, CHUNK_HEIGHT, ObstacleData, OBSTACLE_TYPES } from '../config/GameConfig';
import { PhysicsSolver, SkierState } from '../engine/Physics';
import { CollisionSystem } from '../engine/Collision';
import { ObstacleGenerator } from '../engine/Generation';
import { AudioSystem } from '../engine/Audio';
import { SaveSystem } from '../engine/SaveSystem';
import { LeaderboardService } from '../services/LeaderboardService';

interface GameCanvasProps {
  gameState: 'MENU' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';
  onStateChange: (state: 'MENU' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'GAMEOVER') => void;
  onDistanceUpdate: (distance: number) => void;
  onFinalDistance: (distance: number) => void;
}

export default function GameCanvas({
  gameState,
  onStateChange,
  onDistanceUpdate,
  onFinalDistance,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  // References to communicate React settings updates directly to the Phaser instance
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  useEffect(() => {
    if (!containerRef.current) return;

    // Create the Phaser configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      parent: containerRef.current,
      backgroundColor: '#f8fafc', // Snowy slate-50 background
      pixelArt: true,            // Disable antialiasing for crisp vector shapes
      antialias: false,          // Stop texture smoothing on render
      roundPixels: true,         // Stop subpixel drawing interpolation
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
      scene: [BootScene, SkiScene],
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Pass React parameters down to scenes via game registry
    game.registry.set('reactState', gameState);
    game.registry.set('onStateChange', onStateChange);
    game.registry.set('onDistanceUpdate', onDistanceUpdate);
    game.registry.set('onFinalDistance', onFinalDistance);

    return () => {
      // Clean up game on unmount
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      AudioSystem.stopDescentSound();
    };
  }, []);

  // Update Phaser registry when state changes from parent React components
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.registry.set('reactState', gameState);
      
      // Handle programmatic scene control based on React state transitions
      const skiScene = gameRef.current.scene.getScene('SkiScene') as SkiScene;
      if (skiScene && skiScene.sys.isActive()) {
        if (gameState === 'PLAYING') {
          skiScene.resumeRun();
        } else if (gameState === 'PAUSED') {
          skiScene.pauseRun();
        } else if (gameState === 'COUNTDOWN') {
          skiScene.startCountdown();
        }
      }
    }
  }, [gameState]);

  return (
    <div className="relative w-full max-w-[540px] aspect-[3/5] bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

/* =========================================================================
   BOOT SCENE
   Dynamically draws all minimalist pixel/vector textures at startup
   ========================================================================= */
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    this.createSkierTextures();
    this.createObstacleTextures();
    
    // Proceed immediately to SkiScene
    this.scene.start('SkiScene');
  }

  private createSkierTextures() {
    // 1. Skier Downward (Straight)
    let g = this.make.graphics({ x: 0, y: 0 });
    
    // Draw orange skis
    g.fillStyle(0xf97316); 
    g.fillRect(6, 12, 3, 18);
    g.fillRect(11, 12, 3, 18);
    
    // Draw boots
    g.fillStyle(0x475569);
    g.fillRect(6, 18, 3, 4);
    g.fillRect(11, 18, 3, 4);
    
    // Draw jacket/body (Bright Blue)
    g.fillStyle(0x2563eb);
    g.fillRect(4, 10, 12, 10);
    
    // Red hat
    g.fillStyle(0xd97706);
    g.fillCircle(10, 6, 4);
    
    // Cyan Goggles
    g.fillStyle(0x06b6d4);
    g.fillRect(7, 6, 6, 2);

    g.generateTexture('skier_down', 20, 30);
    g.destroy();

    // 2. Skier Turning Left (Leaning / angled body)
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xf97316); // Skis angled slightly
    g.fillRect(5, 14, 3, 16);
    g.fillRect(10, 11, 3, 16);
    
    g.fillStyle(0x2563eb); // Body leaning left
    g.fillRect(3, 9, 11, 10);
    
    g.fillStyle(0xd97706);
    g.fillCircle(7, 5, 4);
    
    g.fillStyle(0x06b6d4);
    g.fillRect(4, 5, 5, 2);

    g.generateTexture('skier_left', 20, 30);
    g.destroy();

    // 3. Skier Turning Right
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xf97316);
    g.fillRect(7, 11, 3, 16);
    g.fillRect(12, 14, 3, 16);
    
    g.fillStyle(0x2563eb);
    g.fillRect(6, 9, 11, 10);
    
    g.fillStyle(0xd97706);
    g.fillCircle(13, 5, 4);
    
    g.fillStyle(0x06b6d4);
    g.fillRect(11, 5, 5, 2);

    g.generateTexture('skier_right', 20, 30);
    g.destroy();
  }

  private createObstacleTextures() {
    // 1. Green Pine Tree
    let g = this.make.graphics({ x: 0, y: 0 });
    // Trunk
    g.fillStyle(0x78350f);
    g.fillRect(21, 52, 8, 18);
    // Tree Base shadows
    g.fillStyle(0xe2e8f0);
    g.fillEllipse(25, 68, 20, 4);

    // Green Foliage Layers
    g.fillStyle(0x166534);
    g.fillTriangle(25, 4, 10, 24, 40, 24);
    g.fillTriangle(25, 18, 5, 42, 45, 42);
    g.fillTriangle(25, 32, 0, 56, 50, 56);

    // Snow caps
    g.fillStyle(0xffffff);
    g.fillTriangle(25, 4, 16, 14, 34, 14);
    g.fillTriangle(25, 18, 12, 30, 38, 30);

    g.generateTexture('tree_green', 50, 70);
    g.destroy();

    // 2. Snowy Pine Tree
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x78350f);
    g.fillRect(21, 52, 8, 18);
    g.fillStyle(0xe2e8f0);
    g.fillEllipse(25, 68, 20, 4);

    // Darker Green core with Heavy Snow covering branches
    g.fillStyle(0x14532d);
    g.fillTriangle(25, 4, 10, 24, 40, 24);
    g.fillTriangle(25, 18, 5, 42, 45, 42);
    g.fillTriangle(25, 32, 0, 56, 50, 56);

    g.fillStyle(0xf1f5f9); // heavy snow
    g.fillTriangle(25, 4, 12, 20, 38, 20);
    g.fillRect(12, 20, 26, 4);
    g.fillTriangle(25, 18, 8, 38, 42, 38);
    g.fillRect(8, 38, 34, 4);
    g.fillTriangle(25, 32, 3, 52, 47, 52);
    g.fillRect(3, 52, 44, 4);

    g.generateTexture('tree_snowy', 50, 70);
    g.destroy();

    // 3. Log
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x451a03); // base shadow
    g.fillRect(4, 3, 52, 14);
    g.fillStyle(0xd97706); // log core
    g.fillRect(4, 4, 52, 12);
    // Rings
    g.fillStyle(0xf59e0b);
    g.fillEllipse(4, 10, 3, 10);
    g.fillEllipse(56, 10, 3, 10);

    g.generateTexture('log', 60, 20);
    g.destroy();

    // 4. Rock
    g = this.make.graphics({ x: 0, y: 0 });
    // base shadow
    g.fillStyle(0xcbd5e1);
    g.fillEllipse(20, 25, 18, 5);
    // rock body
    g.fillStyle(0x64748b);
    g.fillCircle(16, 18, 10);
    g.fillCircle(24, 18, 8);
    g.fillRect(8, 16, 24, 10);
    // snowy cap
    g.fillStyle(0xffffff);
    g.fillEllipse(18, 10, 12, 3);
    
    g.generateTexture('rock', 40, 30);
    g.destroy();

    // 5. Star Particle (for new record splash animation)
    g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xfacc15);
    g.fillTriangle(6, 0, 3, 10, 9, 10);
    g.fillTriangle(6, 12, 3, 2, 9, 2);
    g.generateTexture('star_particle', 12, 12);
    g.destroy();
  }
}

/* =========================================================================
   MAIN SKI SCENE
   ========================================================================= */
class SkiScene extends Phaser.Scene {
  private skier!: Phaser.GameObjects.Sprite;
  private state!: SkierState;
  
  // Custom systems
  private generator!: ObstacleGenerator;
  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };
  
  // Scoring
  private currentDistance = 0;
  private startY = 0;
  
  // Trails and particle effects
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private lastTrailX1 = 0;
  private lastTrailY1 = 0;
  private lastTrailX2 = 0;
  private lastTrailY2 = 0;
  private pointsHistory: { x1: number; y1: number; x2: number; y2: number; age: number }[] = [];
  
  private snowEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Obstacle pool for recycling
  private obstacleSprites: Phaser.GameObjects.Sprite[] = [];
  private activeObstaclesMap: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private loadedChunkIndices: Set<number> = new Set();
  
  // Player stats config
  private sensitivity = 1.0;

  constructor() {
    super({ key: 'SkiScene' });
  }

  create() {
    this.generator = new ObstacleGenerator(0);

    // Initialise keys
    if (this.input.keyboard) {
      this.keys = {
        left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    // Load sensitivity
    const savedSens = localStorage.getItem('skitree_sensitivity');
    if (savedSens) {
      this.sensitivity = parseFloat(savedSens);
    }

    // Render ski trails graphics
    this.trailGraphics = this.add.graphics();
    this.trailGraphics.setDepth(1);

    // Create skier sprite
    this.skier = this.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, 'skier_down');
    this.skier.setScale(1.5);
    this.skier.setDepth(5);

    // Particle Emitter for Snow spray
    const particleGraphics = this.make.graphics({ x: 0, y: 0 });
    particleGraphics.fillStyle(0xffffff, 0.7);
    particleGraphics.fillCircle(2, 2, 2);
    particleGraphics.generateTexture('snow_particle', 4, 4);
    particleGraphics.destroy();

    this.snowEmitter = this.add.particles(0, 0, 'snow_particle', {
      speed: { min: 20, max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.0, end: 0.1 },
      alpha: { start: 0.8, end: 0.0 },
      lifespan: 600,
      frequency: -1, // Emitted manually
      reserve: 100
    });
    this.snowEmitter.setDepth(2);

    // Zoom the camera for a closer, narrower action perspective
    this.cameras.main.setZoom(1.35);

    // Start in menu mode
    this.resetRun();
  }

  /**
   * Triggers the GO! countdown.
   */
  startCountdown() {
    this.resetRun();
    AudioSystem.playSwipe();
    
    this.time.delayedCall(1000, () => {
      const onStateChange = this.game.registry.get('onStateChange');
      onStateChange('PLAYING');
      AudioSystem.startDescentSound();
    });
  }

  /**
   * Resets parameters back to start.
   */
  private resetRun() {
    this.currentDistance = 0;
    
    // Establish random seed for every run to make it unique
    const seed = Math.floor(Math.random() * 9999999);
    this.generator.reset(seed);

    // Reset SkierState
    this.state = {
      x: GAME_WIDTH / 2,
      y: 0,
      vx: 0,
      vy: PHYSICS_CONFIG.BASE_SPEED_Y,
      angle: 0,
      targetAngle: 0,
      speedY: PHYSICS_CONFIG.BASE_SPEED_Y,
      sideSlip: 0,
    };

    this.startY = 0;

    // Reset positions
    this.skier.setPosition(this.state.x, GAME_HEIGHT * 0.3);
    this.skier.setTexture('skier_down');
    this.cameras.main.scrollY = 0;
    this.cameras.main.scrollX = 0;

    // Clear active obstacles
    this.activeObstaclesMap.forEach((sprite) => {
      this.recycleObstacleSprite(sprite);
    });
    this.activeObstaclesMap.clear();
    this.loadedChunkIndices.clear();

    // Clear trails
    this.pointsHistory = [];
    this.trailGraphics.clear();
    this.lastTrailX1 = 0;
    this.lastTrailY1 = 0;
    this.lastTrailX2 = 0;
    this.lastTrailY2 = 0;

    // Refresh sensitivity
    const savedSens = localStorage.getItem('skitree_sensitivity');
    if (savedSens) {
      this.sensitivity = parseFloat(savedSens);
    }
  }

  pauseRun() {
    AudioSystem.stopDescentSound();
  }

  resumeRun() {
    AudioSystem.startDescentSound();
  }

  update(time: number, delta: number) {
    const reactState = this.game.registry.get('reactState');
    if (reactState !== 'PLAYING') return;

    const dt = delta / 1000;

    // 1. Gather Inputs
    this.handleKeyboardInputs();
    this.handlePointerInputs();

    // 2. Physics Update
    PhysicsSolver.updateSkier(this.state, dt, this.currentDistance / 2.05);

    // Update Points Score (45.4 pixels per point matches 74 points at 12 seconds at base speed)
    this.currentDistance = Math.floor(this.state.y / 45.4);
    const onDistanceUpdate = this.game.registry.get('onDistanceUpdate');
    onDistanceUpdate(this.currentDistance);

    // 3. Render Skier Visual State (leaning textures based on angle)
    if (this.state.angle < -0.15) {
      this.skier.setTexture('skier_left');
    } else if (this.state.angle > 0.15) {
      this.skier.setTexture('skier_right');
    } else {
      this.skier.setTexture('skier_down');
    }
    
    // Position skier visually
    this.skier.x = this.state.x;
    this.skier.y = this.state.y;

    // Scroll Camera to keep player centered vertically & track slightly horizontally
    const playerVisualOffset = GAME_HEIGHT * 0.3;
    this.cameras.main.scrollY = this.state.y - playerVisualOffset;

    const targetScrollX = (this.state.x - GAME_WIDTH / 2) * 0.5;
    this.cameras.main.scrollX += (targetScrollX - this.cameras.main.scrollX) * 0.08;

    // 4. Update Procedural Generation (Manage active chunks)
    this.manageChunks();

    // 5. Render Ski Trails
    this.drawSkiTrails(dt);

    // 6. Emit Particles
    this.emitSnowParticles();

    // 7. Collision Check
    const activeObstacles = this.getVisibleObstaclesData();
    const collision = CollisionSystem.checkCollision(this.state, activeObstacles);
    if (collision) {
      this.handleCrash();
    }

    // 8. Modulate audio context loops
    const normalizedSpeed = (this.state.speedY - PHYSICS_CONFIG.BASE_SPEED_Y) / (PHYSICS_CONFIG.MAX_SPEED_Y - PHYSICS_CONFIG.BASE_SPEED_Y);
    const normalizedCarve = Math.min(1.0, this.state.sideSlip / 200.0);
    AudioSystem.updateDescentSound(normalizedSpeed, normalizedCarve);
  }

  private handleKeyboardInputs() {
    let steerDir = 0; // -1 = left, 0 = straight, 1 = right

    if (this.keys.left.isDown || this.keys.a.isDown) {
      steerDir = -1;
    } else if (this.keys.right.isDown || this.keys.d.isDown) {
      steerDir = 1;
    }

    // Maximum steering angle is 65 degrees (approx 1.13 radians)
    this.state.targetAngle = steerDir * 1.13;
  }

  private handlePointerInputs() {
    const pointer = this.input.activePointer;
    if (pointer.isDown) {
      // Swipe/drag distance from screen center
      const deltaX = pointer.x - (GAME_WIDTH / 2);
      // Map displacement to turning angle, modulated by user sensitivity
      const maxSteerDistance = 180.0; // px
      const mappedAngle = (deltaX / maxSteerDistance) * 1.13 * this.sensitivity;
      this.state.targetAngle = Math.max(-1.13, Math.min(1.13, mappedAngle));
    }
  }

  private manageChunks() {
    const currentChunk = Math.floor(this.state.y / CHUNK_HEIGHT);
    
    // Load chunks: current, previous, and next two
    const chunksToLoad = [currentChunk - 1, currentChunk, currentChunk + 1, currentChunk + 2];
    
    chunksToLoad.forEach((chunkIdx) => {
      if (chunkIdx < 0 || this.loadedChunkIndices.has(chunkIdx)) return;

      const obstaclesData = this.generator.getOrCreateChunk(chunkIdx);
      obstaclesData.forEach((obs) => {
        const sprite = this.getObstacleSprite(obs.type);
        sprite.setPosition(obs.x, obs.y);
        sprite.setVisible(true);
        sprite.setActive(true);
        this.activeObstaclesMap.set(obs.id, sprite);
      });

      this.loadedChunkIndices.add(chunkIdx);
    });

    // Recycle out-of-bounds chunks (older than currentChunk - 1)
    this.loadedChunkIndices.forEach((chunkIdx) => {
      if (chunkIdx < currentChunk - 1) {
        // Find obstacles belonging to this chunk and recycle
        const obstaclesData = this.generator.getOrCreateChunk(chunkIdx);
        obstaclesData.forEach((obs) => {
          const sprite = this.activeObstaclesMap.get(obs.id);
          if (sprite) {
            this.recycleObstacleSprite(sprite);
            this.activeObstaclesMap.delete(obs.id);
          }
        });
        this.loadedChunkIndices.delete(chunkIdx);
      }
    });
  }

  private getVisibleObstaclesData(): ObstacleData[] {
    const currentChunk = Math.floor(this.state.y / CHUNK_HEIGHT);
    const visibleChunks = [currentChunk - 1, currentChunk, currentChunk + 1, currentChunk + 2];
    
    let allData: ObstacleData[] = [];
    visibleChunks.forEach((chunkIdx) => {
      if (chunkIdx >= 0) {
        allData = allData.concat(this.generator.getOrCreateChunk(chunkIdx));
      }
    });
    return allData;
  }

  private drawSkiTrails(dt: number) {
    // Skier is sliding downhill. Ski tracks are drawn from skier's two skis
    // Left ski relative offset from center: -6px, right ski: +6px
    const s = this.state;
    const fx = Math.sin(s.angle);
    const fy = Math.cos(s.angle);
    const rx = -fy; // right vector
    const ry = fx;

    const leftSkierX = s.x + rx * -6;
    const leftSkierY = s.y + ry * -6;
    const rightSkierX = s.x + rx * 6;
    const rightSkierY = s.y + ry * 6;

    if (this.lastTrailY1 > 0) {
      // Save trail segments to history
      this.pointsHistory.push({
        x1: this.lastTrailX1,
        y1: this.lastTrailY1,
        x2: leftSkierX,
        y2: leftSkierY,
        age: 0,
      });

      this.pointsHistory.push({
        x1: this.lastTrailX2,
        y1: this.lastTrailY2,
        x2: rightSkierX,
        y2: rightSkierY,
        age: 0,
      });
    }

    this.lastTrailX1 = leftSkierX;
    this.lastTrailY1 = leftSkierY;
    this.lastTrailX2 = rightSkierX;
    this.lastTrailY2 = rightSkierY;

    // Render & fade tracks in real-time
    this.trailGraphics.clear();
    
    // Retain only relatively young tracks
    const maxTrailAge = 4.0; // 4 seconds before trail completely disappears
    this.pointsHistory = this.pointsHistory.filter((pt) => {
      pt.age += dt;
      if (pt.age >= maxTrailAge) return false;

      const alpha = 1.0 - (pt.age / maxTrailAge);
      // Select blue-gray shading for carving trails
      this.trailGraphics.lineStyle(2, 0xc1d4e9, alpha * 0.45);
      this.trailGraphics.lineBetween(pt.x1, pt.y1, pt.x2, pt.y2);
      return true;
    });
  }

  private emitSnowParticles() {
    // If the skier is moving fast or side slipping, spray snow particles
    const emissionRate = Math.floor(Math.min(6, 1 + this.state.sideSlip / 35.0));
    if (emissionRate <= 0) return;

    const sx = this.state.x;
    const sy = this.state.y + 15; // feet level (scaled skier)

    // Spray particles opposite of motion direction
    const oppositeAngle = Math.atan2(-this.state.vy, -this.state.vx);
    const speed = Math.sqrt(this.state.vx * this.state.vx + this.state.vy * this.state.vy) * 0.25;
    const angleDeg = oppositeAngle * (180 / Math.PI);

    // Cast to any to bypass version-specific TypeScript definitions for Phaser ParticleEmitter
    const emitterAny = this.snowEmitter as any;
    
    try {
      if (typeof emitterAny.setAngle === 'function') {
        emitterAny.setAngle({ min: angleDeg - 15, max: angleDeg + 15 });
      }
      if (typeof emitterAny.setSpeed === 'function') {
        emitterAny.setSpeed({ min: speed * 0.5, max: speed * 1.5 });
      }
    } catch (e) {
      // Fail-safe fallback
    }

    this.snowEmitter.emitParticleAt(sx, sy, emissionRate);
  }

  private handleCrash() {
    // 1. Play Crash SFX
    AudioSystem.playCrash();
    AudioSystem.stopDescentSound();

    // 2. Shake camera
    this.cameras.main.shake(300, 0.015);

    // Check if new record was set BEFORE saving stats
    const statsBeforeSave = SaveSystem.loadStats();
    const isNewRecord = this.currentDistance > statsBeforeSave.highScore;

    // 3. Emit crash debris particles (wooden splinters & snow explosion)
    this.emitCrashDebris();

    if (isNewRecord) {
      this.emitHighScoreCelebration();
    }

    // 4. Update Game State to GameOver
    const onStateChange = this.game.registry.get('onStateChange');
    onStateChange('GAMEOVER');

    // 5. Submit & Save Run scores
    const onFinalDistance = this.game.registry.get('onFinalDistance');
    onFinalDistance(this.currentDistance);

    const stats = SaveSystem.saveRun(this.currentDistance);
    
    // Asynchronously submit score to global leaderboard
    LeaderboardService.submitScore(stats.playerName, this.currentDistance);
  }

  private emitHighScoreCelebration() {
    // Create gold star emitter at skier crash location shooting upwards like a fountain
    const starEmitter = this.add.particles(this.state.x, this.state.y, 'star_particle', {
      speed: { min: 120, max: 280 },
      angle: { min: 220, max: 320 }, // upward direction
      gravityY: 450, // pull stars down like water drops
      alpha: { start: 1.0, end: 0.0 },
      scale: { start: 1.6, end: 0.2 },
      lifespan: 1400,
      maxParticles: 45
    });
    starEmitter.setDepth(6);

    // Pop high score celebration text directly above the player crash site
    const recordText = this.add.text(this.state.x, this.state.y - 35, 'NEW RECORD!', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#facc15',
      stroke: '#000000',
      strokeThickness: 6
    });
    recordText.setOrigin(0.5);
    recordText.setDepth(7);

    // Bounce and fade high score banner text
    this.tweens.add({
      targets: recordText,
      y: this.state.y - 95,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 1200,
      ease: 'Back.easeOut',
      onComplete: () => {
        recordText.destroy();
        starEmitter.destroy();
      }
    });
  }

  private emitCrashDebris() {
    // Create temporary particles for splinters
    const splinterGraphics = this.make.graphics({ x: 0, y: 0 });
    splinterGraphics.fillStyle(0xd97706); // Orange-brown wood color
    splinterGraphics.fillRect(0, 0, 4, 2);
    splinterGraphics.generateTexture('splinter_particle', 4, 2);
    splinterGraphics.destroy();

    const splinterEmitter = this.add.particles(this.state.x, this.state.y + 15, 'splinter_particle', {
      speed: { min: 60, max: 150 },
      angle: { min: 0, max: 360 },
      alpha: { start: 1.0, end: 0.0 },
      scale: { start: 1.0, end: 0.2 },
      lifespan: 1000,
      maxParticles: 20
    });
    splinterEmitter.setDepth(6);

    const snowExplosionEmitter = this.add.particles(this.state.x, this.state.y + 15, 'snow_particle', {
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      alpha: { start: 0.9, end: 0.0 },
      scale: { start: 2.0, end: 0.2 },
      lifespan: 800,
      maxParticles: 35
    });
    snowExplosionEmitter.setDepth(6);

    // Auto-destroy emitters after complete
    this.time.delayedCall(1200, () => {
      splinterEmitter.destroy();
      snowExplosionEmitter.destroy();
    });
  }

  /* =========================================================================
     OBJECT POOLING MANAGEMENT FOR STABLE 60 FPS
     ========================================================================= */
  private getObstacleSprite(type: string): Phaser.GameObjects.Sprite {
    // Attempt to retrieve a matching inactive sprite from the pool
    const inactiveSprite = this.obstacleSprites.find((s) => !s.active && s.texture.key === type);

    if (inactiveSprite) {
      inactiveSprite.setActive(true);
      inactiveSprite.setVisible(true);
      return inactiveSprite;
    }

    // Create a new sprite and add it to the pool if none are available
    const newSprite = this.add.sprite(0, 0, type);
    newSprite.setDepth(4);
    this.obstacleSprites.push(newSprite);
    return newSprite;
  }

  private recycleObstacleSprite(sprite: Phaser.GameObjects.Sprite) {
    sprite.setActive(false);
    sprite.setVisible(false);
  }
}
