import { NextResponse } from 'next/server';

interface LeaderboardEntry {
  playerName: string;
  score: number;
  date: string; // YYYY-MM-DD
  timestamp: number;
  userId: string;
}

// Simple in-memory storage for demonstration and development purposes.
// In a full production app, this would query Supabase / Postgres via Prisma.
const mockLeaderboard: LeaderboardEntry[] = [
  { playerName: 'PowderShredder', score: 1450, date: '2026-07-03', timestamp: Date.now() - 100000, userId: 'user1' },
  { playerName: 'AlpineQueen', score: 1220, date: '2026-07-03', timestamp: Date.now() - 200000, userId: 'user2' },
  { playerName: 'SnowCone', score: 980, date: '2026-07-03', timestamp: Date.now() - 300000, userId: 'user3' },
  { playerName: 'SlopeSeeker', score: 850, date: '2026-07-02', timestamp: Date.now() - 86400000, userId: 'user4' },
  { playerName: 'IceCarver', score: 720, date: '2026-07-01', timestamp: Date.now() - 172800000, userId: 'user5' },
  { playerName: 'YetiHunter', score: 640, date: '2026-06-28', timestamp: Date.now() - 432000000, userId: 'user6' },
  { playerName: 'WinterMage', score: 510, date: '2026-06-15', timestamp: Date.now() - 1555200000, userId: 'user7' },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'global'; // daily, weekly, monthly, global, friends
  const playerName = searchParams.get('playerName') || '';

  const now = Date.now();
  let filtered = [...mockLeaderboard];

  if (filter === 'daily') {
    const oneDay = 24 * 60 * 60 * 1000;
    filtered = filtered.filter((entry) => now - entry.timestamp < oneDay);
  } else if (filter === 'weekly') {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((entry) => now - entry.timestamp < oneWeek);
  } else if (filter === 'monthly') {
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((entry) => now - entry.timestamp < oneMonth);
  } else if (filter === 'friends') {
    // Return player itself + a couple of mock "friends" for comparison
    filtered = filtered.filter((entry) => entry.playerName === playerName || entry.userId === 'user1' || entry.userId === 'user2');
  }

  // Sort descending
  filtered.sort((a, b) => b.score - a.score);

  // Return limited to top 10
  return NextResponse.json({ success: true, entries: filtered.slice(0, 10) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerName, score, userId } = body;

    if (!playerName || typeof score !== 'number') {
      return NextResponse.json({ success: false, error: 'Invalid name or score' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const newEntry: LeaderboardEntry = {
      playerName,
      score: Math.floor(score),
      date: todayStr,
      timestamp: Date.now(),
      userId: userId || 'guest_' + Math.random().toString(36).substring(2, 11),
    };

    // Find if the user already has a record on the board
    const existingIndex = mockLeaderboard.findIndex(
      (entry) => 
        (userId && entry.userId === userId) || 
        entry.playerName.toLowerCase() === playerName.toLowerCase()
    );

    let finalEntry = newEntry;

    if (existingIndex !== -1) {
      const existing = mockLeaderboard[existingIndex];
      // Only keep the higher score (upsert)
      if (Math.floor(score) > existing.score) {
        existing.score = Math.floor(score);
        existing.date = todayStr;
        existing.timestamp = Date.now();
        existing.playerName = playerName; // Update display name casing if changed
      }
      finalEntry = existing;
    } else {
      mockLeaderboard.push(newEntry);
    }

    // Sort descending
    mockLeaderboard.sort((a, b) => b.score - a.score);

    const rank = mockLeaderboard.findIndex(
      (entry) => 
        (userId && entry.userId === userId) || 
        entry.playerName.toLowerCase() === playerName.toLowerCase()
    ) + 1;

    return NextResponse.json({
      success: true,
      entry: finalEntry,
      rank,
      totalCount: mockLeaderboard.length,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
