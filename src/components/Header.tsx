import React from "react";
import { GraduationCap, Timer, BookOpen, Clock } from "lucide-react";

interface HeaderProps {
  category: string;
  timeSpent: number;
  isSubmitted: boolean;
  score: number;
  total: number;
}

export function Header({ category, timeSpent, isSubmitted, score, total }: HeaderProps) {
  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 w-full" id="app-header">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left Side: Logo & Category tag */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-xl shadow-sm flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 font-sans tracking-tight flex items-center gap-2">
              TOEFL iBT Reading Practice
              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                Task 1
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium font-sans flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-slate-400" /> Topic Category: <span className="text-gray-700 italic">{category}</span>
            </p>
          </div>
        </div>

        {/* Right Side: Diagnostics & Timers */}
        <div className="flex items-center gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-gray-100 justify-between md:justify-end">
          {/* Active Timer */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-sm text-gray-600 font-mono">
            <Timer className="w-4 h-4 text-slate-500 animate-pulse" />
            <span>Time Spent: {formatTime(timeSpent)}</span>
          </div>

          {/* Submitted Score status */}
          {isSubmitted ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-emerald-800 font-medium">
                Score: <strong className="font-bold">{score}</strong> / {total}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg text-sm text-amber-800 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>In Progress...</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
