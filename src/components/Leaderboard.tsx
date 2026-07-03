'use client';

import React, { useState, useEffect } from 'react';
import { LeaderboardService, LeaderboardRecord } from '../services/LeaderboardService';
import { SaveSystem } from '../engine/SaveSystem';
import { AudioSystem } from '../engine/Audio';
import { Trophy, Calendar, Users, Globe, Edit3, Check } from 'lucide-react';

interface LeaderboardProps {
  onBack: () => void;
}

export default function Leaderboard({ onBack }: LeaderboardProps) {
  const [filter, setFilter] = useState<'global' | 'daily' | 'weekly' | 'friends'>('global');
  const [entries, setEntries] = useState<LeaderboardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    const stats = SaveSystem.loadStats();
    setPlayerName(stats.playerName);
    setTempName(stats.playerName);
    
    const records = await LeaderboardService.getScores(filter, stats.playerName);
    setEntries(records);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const handleFilterChange = (newFilter: 'global' | 'daily' | 'weekly' | 'friends') => {
    AudioSystem.playClick();
    setFilter(newFilter);
  };

  const handleSaveName = () => {
    AudioSystem.playClick();
    const saved = SaveSystem.savePlayerName(tempName);
    setPlayerName(saved);
    setIsEditingName(false);
    loadData();
  };

  return (
    <div className="flex flex-col w-full h-full max-w-md mx-auto bg-slate-900/90 text-white rounded-3xl p-6 border border-slate-700 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trophy className="text-yellow-400 w-7 h-7" />
          Leaderboards
        </h2>
        
        {/* Profile Name Edit */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <div className="flex items-center bg-slate-800 rounded-lg overflow-hidden border border-blue-500">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                maxLength={15}
                className="px-2 py-1 bg-transparent text-sm text-white focus:outline-none w-28"
              />
              <button
                onClick={handleSaveName}
                className="p-1.5 bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                <Check className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
              <span className="text-xs text-slate-300 font-medium">Profile:</span>
              <span className="text-xs text-blue-400 font-semibold">{playerName}</span>
              <button
                onClick={() => {
                  AudioSystem.playClick();
                  setIsEditingName(true);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard Filters */}
      <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800/80 mb-6">
        <button
          onClick={() => handleFilterChange('global')}
          className={`flex flex-col items-center justify-center py-2.5 rounded-lg transition-all ${
            filter === 'global'
              ? 'bg-blue-600 text-white font-semibold shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4 mb-1" />
          <span className="text-[10px]">Global</span>
        </button>
        <button
          onClick={() => handleFilterChange('daily')}
          className={`flex flex-col items-center justify-center py-2.5 rounded-lg transition-all ${
            filter === 'daily'
              ? 'bg-blue-600 text-white font-semibold shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 mb-1" />
          <span className="text-[10px]">Daily</span>
        </button>
        <button
          onClick={() => handleFilterChange('weekly')}
          className={`flex flex-col items-center justify-center py-2.5 rounded-lg transition-all ${
            filter === 'weekly'
              ? 'bg-blue-600 text-white font-semibold shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4 mb-1" />
          <span className="text-[10px]">Weekly</span>
        </button>
        <button
          onClick={() => handleFilterChange('friends')}
          className={`flex flex-col items-center justify-center py-2.5 rounded-lg transition-all ${
            filter === 'friends'
              ? 'bg-blue-600 text-white font-semibold shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4 mb-1" />
          <span className="text-[10px]">Compare</span>
        </button>
      </div>

      {/* Leaderboard Entries List */}
      <div className="flex-1 overflow-y-auto min-h-[220px] bg-slate-950/50 rounded-2xl border border-slate-800/80 p-3 mb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Loading scores...
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            No scores found for this period.
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => {
              const isPlayer = entry.playerName === playerName;
              const isTop3 = entry.rank && entry.rank <= 3;
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all border ${
                    isPlayer
                      ? 'bg-blue-950/60 border-blue-500/80'
                      : 'bg-slate-900/60 border-slate-800/50 hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        isTop3
                          ? 'bg-yellow-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {entry.rank}
                    </span>
                    <span className={`text-sm font-medium ${isPlayer ? 'text-blue-400 font-bold' : 'text-slate-200'}`}>
                      {entry.playerName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{entry.date}</span>
                    <span className="text-sm font-extrabold text-white">{Math.floor(entry.score)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => {
          AudioSystem.playClick();
          onBack();
        }}
        className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-semibold transition-all hover:scale-[1.02]"
      >
        Back to Menu
      </button>
    </div>
  );
}
