'use client';

import React, { useState, useEffect } from 'react';
import { SaveSystem, PlayerStats } from '../engine/SaveSystem';
import { AudioSystem } from '../engine/Audio';
import { Trophy, RotateCcw, Play } from 'lucide-react';

interface MenuOverlayProps {
  gameState: 'MENU' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';
  lastDistance: number;
  onStartGame: () => void;
  onPauseToggle: () => void;
  onRestartGame: () => void;
  onShowLeaderboard: () => void;
}

export default function MenuOverlay({
  gameState,
  lastDistance,
  onStartGame,
  onPauseToggle,
  onRestartGame,
  onShowLeaderboard,
}: MenuOverlayProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);

  // Reload stats whenever game state returns to menu/gameover
  useEffect(() => {
    if (gameState === 'MENU' || gameState === 'GAMEOVER') {
      const currentStats = SaveSystem.loadStats();
      setStats(currentStats);
    }
  }, [gameState]);

  const handleStart = () => {
    AudioSystem.playClick();
    onStartGame();
  };

  const handleRestart = () => {
    AudioSystem.playClick();
    onRestartGame();
  };

  if (gameState === 'PLAYING') return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-[2px]">
      
      {/* 1. Main Menu State */}
      {gameState === 'MENU' && (
        <div className="flex flex-col w-full max-w-xs bg-slate-900/90 text-white rounded-3xl p-6 border border-slate-700 shadow-2xl backdrop-blur-md transition-all">
          <div className="text-center mb-8 relative">
            {/* Title */}
            <h1 className="text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-blue-200 via-blue-400 to-blue-600 drop-shadow-[0_2px_10px_rgba(37,99,235,0.4)]">
              SKI TREE
            </h1>

            {stats && stats.highScore > 0 && (
              <div className="mt-4 inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-full text-yellow-400 text-xs font-bold shadow-sm">
                <Trophy className="w-3 h-3" />
                Best: {Math.floor(stats.highScore)}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleStart}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              START RUN
            </button>

            <button
              onClick={onShowLeaderboard}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-yellow-400" />
              LEADERBOARD
            </button>
          </div>

          <div className="text-center mt-6">
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              Steer with <span className="text-blue-400">Arrow keys / A D</span> on Desktop<br />
              or <span className="text-blue-400">Drag / Swipe</span> on Mobile
            </p>
          </div>
        </div>
      )}

      {/* 2. Pause Menu State */}
      {gameState === 'PAUSED' && (
        <div className="flex flex-col w-full max-w-xs bg-slate-900/90 text-white rounded-3xl p-6 border border-slate-700 shadow-2xl backdrop-blur-md text-center">
          <h2 className="text-2xl font-black text-blue-400 tracking-wide mb-6 uppercase">
            PAUSED
          </h2>

          <div className="space-y-3">
            <button
              onClick={onPauseToggle}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all hover:scale-[1.02] cursor-pointer"
            >
              RESUME RUN
            </button>
            <button
              onClick={handleRestart}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold transition-all hover:scale-[1.02] cursor-pointer"
            >
              RESTART
            </button>
            <button
              onClick={() => {
                AudioSystem.playClick();
                onPauseToggle();
                onRestartGame();
              }}
              className="w-full py-3.5 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 rounded-xl font-bold transition-all text-slate-400 hover:text-white cursor-pointer"
            >
              QUIT TO MENU
            </button>
          </div>
        </div>
      )}

      {/* 3. Game Over State */}
      {gameState === 'GAMEOVER' && (
        <div className="flex flex-col w-full max-w-xs bg-slate-900/90 text-white rounded-3xl p-6 border border-slate-700 shadow-2xl backdrop-blur-md text-center relative overflow-hidden">
          
          <div className="mb-6">
            <span className="text-xs font-black uppercase text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full tracking-wider animate-pulse">
              CRASHED
            </span>
            <div className="text-5xl font-black text-white mt-4 tracking-tight">
              {Math.floor(lastDistance)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Score</p>

            {stats && lastDistance >= stats.highScore && lastDistance > 0 && (
              <div className="mt-3 text-xs text-yellow-400 font-extrabold tracking-widest uppercase animate-bounce">
                🎉 NEW HIGH SCORE! 🎉
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRestart}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5 text-white" />
              PLAY AGAIN
            </button>

            <button
              onClick={onShowLeaderboard}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl font-bold transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-yellow-400" />
              LEADERBOARD
            </button>

            <button
              onClick={() => {
                AudioSystem.playClick();
                onRestartGame(); 
              }}
              className="w-full py-3.5 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 rounded-2xl font-bold transition-all text-slate-400 hover:text-white cursor-pointer"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      )}

      {/* 4. Countdown Overlay State */}
      {gameState === 'COUNTDOWN' && (
        <div className="text-center animate-ping text-8xl font-black text-blue-400 select-none">
          GO!
        </div>
      )}
    </div>
  );
}
