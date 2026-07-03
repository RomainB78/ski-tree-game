'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const GameCanvas = dynamic(() => import('../components/GameCanvas'), {
  ssr: false,
});
import MenuOverlay from '../components/MenuOverlay';
import Leaderboard from '../components/Leaderboard';
import { AudioSystem } from '../engine/Audio';
import { SaveSystem } from '../engine/SaveSystem';
import { LeaderboardService } from '../services/LeaderboardService';
import { Volume2, VolumeX, Pause, Play, Compass } from 'lucide-react';

export default function Home() {
  const [gameState, setGameState] = useState<'MENU' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('MENU');
  const [distance, setDistance] = useState(0);
  const [lastDistance, setLastDistance] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [highScore, setHighScore] = useState(0);

  // Load high score from local save state on state transitions
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stats = SaveSystem.loadStats();
      setHighScore(stats.highScore);
    }
  }, [gameState]);

  // Synchronize local high score to server leaderboard on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stats = SaveSystem.loadStats();
      if (stats.highScore > 0) {
        LeaderboardService.submitScore(stats.playerName, stats.highScore);
      }
    }
  }, []);

  const handleStartGame = () => {
    setGameState('COUNTDOWN');
    setDistance(0);
  };

  const handlePauseToggle = () => {
    AudioSystem.playClick();
    if (gameState === 'PLAYING') {
      setGameState('PAUSED');
    } else if (gameState === 'PAUSED') {
      setGameState('PLAYING');
    }
  };

  const handleRestartGame = () => {
    // Resets run and returns player back to menu scene
    setGameState('MENU');
    setDistance(0);
  };

  const handleDistanceUpdate = (dist: number) => {
    setDistance(dist);
  };

  const handleFinalDistance = (dist: number) => {
    setLastDistance(dist);
    if (dist > highScore) {
      setHighScore(Math.floor(dist));
    }
  };

  const handleMuteToggle = () => {
    const nextMuted = AudioSystem.toggleMute();
    setIsMuted(nextMuted);
    AudioSystem.playClick();
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden py-2">
      
      {/* Main Canvas Frame Container */}
      <div className="relative w-full max-w-[540px] h-[94vh] aspect-[3/5] flex items-center justify-center shadow-2xl rounded-3xl overflow-hidden border border-slate-800">
        
        {/* Playing Overlay HUD (Rendered directly on top of the snow) */}
        {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
          <>
            {/* Top Left Controls */}
            <div className="absolute top-4 left-4 z-40 flex gap-2">
              <button
                onClick={handlePauseToggle}
                className="p-2.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-700/40 rounded-full shadow-lg backdrop-blur-sm transition-all cursor-pointer"
              >
                {gameState === 'PAUSED' ? (
                  <Play className="w-4.5 h-4.5 text-green-400 fill-green-400" />
                ) : (
                  <Pause className="w-4.5 h-4.5 text-blue-400 fill-blue-400" />
                )}
              </button>
              <button
                onClick={handleMuteToggle}
                className="p-2.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-700/40 rounded-full shadow-lg backdrop-blur-sm transition-all cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4.5 h-4.5 text-red-400" /> : <Volume2 className="w-4.5 h-4.5 text-slate-300" />}
              </button>
            </div>

            {/* Top Right Scores */}
            <div className="absolute top-4 right-6 z-40 flex flex-col items-end pointer-events-none select-none">
              {/* Current Score in blue */}
              <div 
                className="text-5xl font-black tracking-tight leading-none select-none"
                style={{ 
                  color: '#3fa9f5', 
                  textShadow: '-3px -3px 0 #fff, 3px -3px 0 #fff, -3px 3px 0 #fff, 3px 3px 0 #fff, -3px 0 0 #fff, 3px 0 0 #fff, 0 -3px 0 #fff, 0 3px 0 #fff, 0 5px 0 #1b75bc, 0 6px 6px rgba(0,0,0,0.3)' 
                }}
              >
                {Math.floor(distance)}
              </div>
              {/* Record/High Score in pink/yellow */}
              <div 
                className="text-3xl font-black tracking-tight leading-none select-none mt-1.5"
                style={{ 
                  color: '#ff7b90', 
                  textShadow: '-3px -3px 0 #fff, 3px -3px 0 #fff, -3px 3px 0 #fff, 3px 3px 0 #fff, -3px 0 0 #fff, 3px 0 0 #fff, 0 -3px 0 #fff, 0 3px 0 #fff, 0 4px 0 #ffd400, 0 5px 5px rgba(0,0,0,0.3)' 
                }}
              >
                {Math.floor(highScore)}
              </div>
            </div>
          </>
        )}

        {/* Render Phaser Game Canvas */}
        <GameCanvas
          gameState={gameState}
          onStateChange={setGameState}
          onDistanceUpdate={handleDistanceUpdate}
          onFinalDistance={handleFinalDistance}
        />

        {/* Dynamic Overlays (Leaderboard Overlay vs Start/Pause/Game Over menus) */}
        {showLeaderboard ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <Leaderboard onBack={() => {
              AudioSystem.playClick();
              setShowLeaderboard(false);
            }} />
          </div>
        ) : (
          <MenuOverlay
            gameState={gameState}
            lastDistance={lastDistance}
            onStartGame={handleStartGame}
            onPauseToggle={handlePauseToggle}
            onRestartGame={handleRestartGame}
            onShowLeaderboard={() => {
              AudioSystem.playClick();
              setShowLeaderboard(true);
            }}
          />
        )}
      </div>

      {/* Footer copyright and version */}
      <div className="mt-4 text-center text-[10px] text-slate-600 font-medium">
        © 2026 Ski Tree Downhill Game. Built with React & Phaser 3 (Vive les Caniches !)
      </div>
    </main>
  );
}
