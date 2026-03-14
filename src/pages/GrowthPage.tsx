import { useEffect, useState } from 'react';
import * as store from '../store/appStore';
import type { Stats, PercentileResult } from '../store/appStore';
import { LEVEL_NAMES } from '../data/characters';

export default function GrowthPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [percentile, setPercentile] = useState<PercentileResult | null>(null);

  useEffect(() => {
    setStats(store.getStats());
    setPercentile(store.getPercentile());
  }, []);

  if (!stats) return null;

  const stages = [
    { key: 'low', name: '识字起步', icon: '🌱', total: stats.lowTotal, done: stats.lowDone, color: 'emerald' },
    { key: 'medium', name: '阅读进阶', icon: '📚', total: stats.mediumTotal, done: stats.mediumDone, color: 'sky' },
    { key: 'high', name: '千字冲刺', icon: '🚀', total: stats.highTotal, done: stats.highDone, color: 'amber' },
  ];

  const overallProgress = Math.round((stats.literacyCount / stats.totalCharacters) * 100);

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-amber-800 mb-6 animate-fadeIn">📈 成长之路</h1>

      {/* Overall Progress */}
      <div className="animate-scaleIn bg-white/80 backdrop-blur rounded-3xl p-6 shadow-lg mb-6">
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-amber-800">{stats.literacyCount}</div>
          <div className="text-sm text-gray-500">已识字 / 总目标 {stats.totalCharacters} 字</div>
        </div>
        <div className="h-4 bg-amber-100 rounded-full overflow-hidden">
          <div className="progress-bar h-full rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%` }} />
        </div>
        <div className="text-right text-sm text-amber-600 font-medium mt-1">{overallProgress}%</div>
      </div>

      {/* Percentile Card */}
      {percentile && (
        <div className="animate-scaleIn mb-6">
          <div className={`relative overflow-hidden rounded-3xl p-5 shadow-lg ${
            percentile.level === 'excellent' ? 'bg-gradient-to-br from-amber-400 via-orange-400 to-red-400' :
            percentile.level === 'above' ? 'bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400' :
            percentile.level === 'average' ? 'bg-gradient-to-br from-sky-400 via-blue-400 to-indigo-400' :
            'bg-gradient-to-br from-violet-400 via-purple-400 to-fuchsia-400'
          }`}>
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-6 -translate-x-6" />
            <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/5 rounded-full" />
            
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">👶</span>
                <span className="text-white/90 text-sm font-medium">{percentile.ageLabel}的宝宝</span>
              </div>

              {/* Percentile display */}
              <div className="flex items-end gap-3 mb-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-white leading-none">{percentile.percentile}</span>
                  <span className="text-xl font-bold text-white/80">%</span>
                </div>
                <div className="pb-1">
                  <div className="text-white/90 text-sm font-medium">同龄百分位</div>
                </div>
              </div>

              {/* Percentile bar */}
              <div className="mb-3">
                <div className="h-3 bg-white/20 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${percentile.percentile}%` }} 
                  />
                  {/* Marker dots at 25%, 50%, 75% */}
                  <div className="absolute top-1/2 left-1/4 w-1.5 h-1.5 bg-white/40 rounded-full -translate-y-1/2" />
                  <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white/40 rounded-full -translate-y-1/2" />
                  <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-white/40 rounded-full -translate-y-1/2" />
                </div>
                <div className="flex justify-between mt-1 text-white/50 text-[10px]">
                  <span>P0</span>
                  <span>P25</span>
                  <span>P50</span>
                  <span>P75</span>
                  <span>P99</span>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3">
                <div className="text-white text-sm leading-relaxed">
                  {percentile.level === 'excellent' && <span className="mr-1">🌟</span>}
                  {percentile.level === 'above' && <span className="mr-1">👍</span>}
                  {percentile.level === 'average' && <span className="mr-1">💪</span>}
                  {percentile.level === 'below' && <span className="mr-1">🌱</span>}
                  {percentile.description}
                </div>
                <div className="text-white/60 text-xs mt-1.5">
                  同龄参考中位数：{percentile.referenceMedian} 字 | 当前已识字：{stats.literacyCount} 字
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Stage Indicator */}
      <div className="animate-fadeIn bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📍</span>
          <div>
            <div className="font-bold text-amber-800">
              当前正在学习：{LEVEL_NAMES[stats.currentLevel]}
            </div>
            <div className="text-xs text-amber-600 mt-0.5">
              {stats.currentLevel === 'low' && '完成低难度后进入中难度'}
              {stats.currentLevel === 'medium' && '完成中难度后进入高难度'}
              {stats.currentLevel === 'high' && '最后冲刺，加油！'}
            </div>
          </div>
        </div>
      </div>

      {/* Three-stage Growth Map */}
      <div className="space-y-4 animate-fadeIn">
        <h2 className="text-lg font-bold text-amber-800">🗺 三段成长地图</h2>

        {stages.map((stage, idx) => {
          const pct = stage.total > 0 ? Math.round((stage.done / stage.total) * 100) : 0;
          const isActive = stats.currentLevel === stage.key;
          const isDone = pct >= 100;

          return (
            <div key={stage.key} className="relative">
              {/* Connector */}
              {idx > 0 && (
                <div className="absolute -top-4 left-6 w-0.5 h-4 bg-amber-200" />
              )}
              
              <div className={`rounded-2xl p-4 border-2 transition-all ${
                isActive ? 'border-amber-400 bg-white shadow-lg' :
                isDone ? 'border-emerald-300 bg-emerald-50/50' :
                'border-gray-200 bg-gray-50/50'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                    isDone ? 'bg-emerald-100' : isActive ? 'bg-amber-100' : 'bg-gray-100'
                  }`}>
                    {isDone ? '✅' : stage.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{stage.name}</span>
                      {isActive && (
                        <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">进行中</span>
                      )}
                      {isDone && (
                        <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">已完成</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{stage.done} / {stage.total} 字</div>
                  </div>
                  <div className="text-lg font-bold text-gray-700">{pct}%</div>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      isDone ? 'bg-emerald-400' : isActive ? 'progress-bar' : 'bg-gray-300'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Grid - merged "已认识" (knownDirectly + mastered) */}
      <div className="mt-6 grid grid-cols-3 gap-3 animate-fadeIn">
        <div className="bg-emerald-50 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-1">😊</div>
          <div className="text-2xl font-bold text-emerald-600">{stats.literacyCount}</div>
          <div className="text-xs text-gray-500 mt-1">已认识</div>
        </div>
        <div className="bg-sky-50 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-1">📖</div>
          <div className="text-2xl font-bold text-sky-500">{stats.learning}</div>
          <div className="text-xs text-gray-500 mt-1">学习中</div>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-1">🎯</div>
          <div className="text-2xl font-bold text-amber-600">{stats.totalCharacters}</div>
          <div className="text-xs text-gray-500 mt-1">总目标</div>
        </div>
      </div>
    </div>
  );
}
