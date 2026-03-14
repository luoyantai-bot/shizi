import { useEffect, useState } from 'react';
import * as store from '../store/appStore';
import type { Stats, DailyRecord } from '../store/appStore';
import { LEVEL_NAMES } from '../data/characters';

export default function ReportPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [weekly, setWeekly] = useState<DailyRecord[]>([]);
  const [advice, setAdvice] = useState<string[]>([]);
  const child = store.getChild();

  useEffect(() => {
    setStats(store.getStats());
    setWeekly(store.getWeeklyRecords());
    setAdvice(store.getAdvice());
  }, []);

  if (!stats) return null;

  const maxDayCount = Math.max(...weekly.map(d => d.newCount + d.reviewCount), 1);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const weekDayLabels = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <h1 className="text-2xl font-bold text-amber-800 mb-6 animate-fadeIn">📊 学习报告</h1>

      {/* Summary Cards - merged 已认识 + 学习中 */}
      <div className="animate-fadeIn grid grid-cols-2 gap-3 mb-6">
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{stats.literacyCount}</div>
          <div className="text-xs text-gray-500 mt-1">已认识</div>
        </div>
        <div className="bg-sky-50 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-sky-500">{stats.learning}</div>
          <div className="text-xs text-gray-500 mt-1">学习中</div>
        </div>
      </div>

      {/* Current Status */}
      <div className="animate-fadeIn bg-white/80 backdrop-blur rounded-3xl p-5 shadow-lg mb-6">
        <h2 className="font-bold text-gray-800 mb-3">📋 学习概况</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">宝宝</span>
            <span className="text-gray-800 font-medium">{child?.nickname || '宝宝'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">当前识字量</span>
            <span className="text-amber-700 font-bold">{stats.literacyCount} 字</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">学习中</span>
            <span className="text-sky-600 font-medium">{stats.learning} 字</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">当前难度</span>
            <span className="text-gray-800 font-medium">{LEVEL_NAMES[stats.currentLevel]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">总目标</span>
            <span className="text-gray-800 font-medium">{stats.totalCharacters} 字</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">完成度</span>
            <span className="text-amber-700 font-bold">
              {Math.round((stats.literacyCount / stats.totalCharacters) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="animate-fadeIn bg-white/80 backdrop-blur rounded-3xl p-5 shadow-lg mb-6">
        <h2 className="font-bold text-gray-800 mb-4">📅 最近 7 天</h2>
        <div className="flex items-end justify-between gap-1 h-32">
          {weekly.map((day, idx) => {
            const total = day.newCount + day.reviewCount;
            const height = total > 0 ? Math.max((total / maxDayCount) * 100, 8) : 4;
            const dayOfWeek = new Date(day.date).getDay();
            const isToday = idx === weekly.length - 1;

            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                {total > 0 && (
                  <span className="text-xs text-gray-500">{total}</span>
                )}
                <div className="w-full flex flex-col items-center" style={{ height: '100px' }}>
                  <div className="flex-1" />
                  <div className="flex flex-col w-full gap-0.5" style={{ height: `${height}%` }}>
                    {day.newCount > 0 && (
                      <div
                        className="w-full rounded-t bg-amber-400"
                        style={{ flex: day.newCount }}
                      />
                    )}
                    {day.reviewCount > 0 && (
                      <div
                        className="w-full rounded-b bg-sky-400"
                        style={{ flex: day.reviewCount }}
                      />
                    )}
                    {total === 0 && (
                      <div className="w-full rounded bg-gray-200" style={{ height: '4px' }} />
                    )}
                  </div>
                </div>
                <div className={`text-xs ${isToday ? 'text-amber-700 font-bold' : 'text-gray-400'}`}>
                  {isToday ? '今天' : `周${weekDayLabels[dayOfWeek]}`}
                </div>
                <div className="text-[10px] text-gray-300">{formatDate(day.date)}</div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 justify-center mt-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-3 h-3 rounded bg-amber-400" /> 新学
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-3 h-3 rounded bg-sky-400" /> 复习
          </div>
        </div>
      </div>

      {/* Advice */}
      <div className="animate-fadeIn bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-5 shadow-sm">
        <h2 className="font-bold text-gray-800 mb-3">💡 学习建议</h2>
        <div className="space-y-2">
          {advice.map((a, i) => (
            <div key={i} className="text-sm text-gray-700 leading-relaxed bg-white/60 rounded-xl p-3">
              {a}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
