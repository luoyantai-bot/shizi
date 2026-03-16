import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as store from '../store/appStore';
import type { Stats } from '../store/appStore';
import { LEVEL_LABELS, LEVEL_NAMES } from '../data/characters';

export default function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const child = store.getChild();

  useEffect(() => {
    setStats(store.getStats());
  }, []);

  if (!stats) return null;

  const progress = Math.round((stats.literacyCount / stats.totalCharacters) * 100);
  const reviewChars = store.getTodayReviewCharacters();
  const hasNewChars = store.hasNewCharactersAvailable();

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      {/* Header */}
      <div className="animate-fadeIn flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-800">
            你好，{child?.nickname || '宝宝'} 👋
          </h1>
          <p className="text-amber-600 text-sm mt-1">今天也要加油识字哦！</p>
        </div>
        <button
          onClick={() => { store.logout(); navigate('/login'); }}
          className="text-xs text-amber-500 bg-amber-100 px-3 py-1.5 rounded-full"
        >
          退出
        </button>
      </div>

      {/* Literacy Count Circle */}
      <div className="animate-scaleIn bg-white/80 backdrop-blur rounded-3xl p-6 shadow-lg mb-6">
        <div className="flex items-center justify-center">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#FFF3D6" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke="url(#grad)" strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${progress * 3.27} ${327 - progress * 3.27}`}
              />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FF9F1A" />
                  <stop offset="100%" stopColor="#FFB84D" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-amber-800">{stats.literacyCount}</span>
              <span className="text-xs text-amber-500">已识字</span>
            </div>
          </div>
        </div>
        {/* Two columns: 已认识 (combined) + 学习中 */}
        <div className="flex justify-around mt-4 text-center">
          <div>
            <div className="text-lg font-bold text-emerald-600">{stats.literacyCount}</div>
            <div className="text-xs text-gray-500">已认识</div>
          </div>
          <div className="w-px bg-amber-200" />
          <div>
            <div className="text-lg font-bold text-sky-500">{stats.learning}</div>
            <div className="text-xs text-gray-500">学习中</div>
          </div>
        </div>
      </div>

      {/* Current Level */}
      <div className="animate-fadeIn bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-lg">📍</span>
          <div>
            <span className="text-sm font-medium text-amber-800">
              当前阶段：{LEVEL_NAMES[stats.currentLevel]}
            </span>
            <span className="text-xs text-amber-600 block">
              {LEVEL_LABELS[stats.currentLevel]}字 · 目标 {stats.totalCharacters} 字
            </span>
          </div>
        </div>
        <div className="mt-2 h-2 bg-white/60 rounded-full overflow-hidden">
          <div className="progress-bar h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-right text-xs text-amber-600 mt-1">{progress}%</div>
      </div>

      {/* Today's Tasks */}
      <div className="space-y-3 animate-fadeIn">
        <h2 className="text-lg font-bold text-amber-800 mb-2">📋 今日任务</h2>

        {/* Review Task */}
        <button
          onClick={() => reviewChars.length > 0 ? navigate('/review') : null}
          className={`w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98] ${
            reviewChars.length > 0 ? 'bg-white/80 shadow-md' : 'bg-gray-100/60'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center text-2xl">
            📝
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-800">今日复习</div>
            <div className="text-sm text-gray-500">
              {reviewChars.length > 0 ? `${reviewChars.length} 个字待复习` : '暂无复习任务'}
            </div>
          </div>
          {reviewChars.length > 0 && (
            <div className="bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              开始
            </div>
          )}
        </button>

        {/* New Characters Task */}
        <button
          onClick={() => {
            if (reviewChars.length > 0) {
              navigate('/review');
            } else if (hasNewChars) {
              navigate('/new-characters');
            }
          }}
          className={`w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98] ${
            hasNewChars ? 'bg-white/80 shadow-md' : 'bg-gray-100/60'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl">
            ✨
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-800">学习新字</div>
            <div className="text-sm text-gray-500">
              {hasNewChars
                ? reviewChars.length > 0
                  ? '有新字等你来学 (请先完成复习)'
                  : '有新字等你来学'
                : stats.todayNewCount >= 5
                ? `今日已跟读 ${stats.todayNewCount} 个新字 ✅`
                : '已完成所有字的学习 🎉'}
            </div>
          </div>
          {hasNewChars && reviewChars.length === 0 && (
            <div className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              开始
            </div>
          )}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 animate-fadeIn grid grid-cols-3 gap-3">
        <div className="bg-white/60 rounded-2xl p-3 text-center">
          <div className="text-2xl mb-1">📖</div>
          <div className="text-xs text-gray-500">今日跟读</div>
          <div className="font-bold text-amber-800">{stats.todayNewCount}/5</div>
        </div>
        <div className="bg-white/60 rounded-2xl p-3 text-center">
          <div className="text-2xl mb-1">🔄</div>
          <div className="text-xs text-gray-500">待复习</div>
          <div className="font-bold text-amber-800">{reviewChars.length}</div>
        </div>
        <div className="bg-white/60 rounded-2xl p-3 text-center">
          <div className="text-2xl mb-1">🎯</div>
          <div className="text-xs text-gray-500">总目标</div>
          <div className="font-bold text-amber-800">{stats.totalCharacters}</div>
        </div>
      </div>
    </div>
  );
}
