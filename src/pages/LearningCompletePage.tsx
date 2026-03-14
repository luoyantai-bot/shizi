import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as store from '../store/appStore';
import type { Stats } from '../store/appStore';

export default function LearningCompletePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [newMedals, setNewMedals] = useState<string[]>([]);

  useEffect(() => {
    setStats(store.getStats());
    const medals = store.checkMedals();
    setNewMedals(medals);
  }, []);

  if (!stats) return null;

  const medalDefs = store.getMedals();
  const newMedalDefs = medalDefs.filter(m => newMedals.includes(m.def.id));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
      <div className="animate-scaleIn text-center w-full max-w-sm">
        {/* Celebration */}
        <div className="relative mb-6">
          <div className="text-7xl animate-bounce-soft">🎉</div>
          {/* Confetti decorations */}
          <div className="absolute top-0 left-1/4 text-2xl animate-confetti" style={{ animationDelay: '0.1s' }}>⭐</div>
          <div className="absolute top-0 right-1/4 text-2xl animate-confetti" style={{ animationDelay: '0.3s' }}>🌟</div>
          <div className="absolute top-2 left-1/3 text-xl animate-confetti" style={{ animationDelay: '0.5s' }}>✨</div>
        </div>

        <h1 className="text-3xl font-bold text-amber-800 mb-2">
          今日学习完成！
        </h1>
        <p className="text-amber-600 mb-8">太棒了，继续保持！</p>

        {/* Stats Summary */}
        <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-lg mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-600">{stats.todayNewCount}</div>
              <div className="text-sm text-gray-500 mt-1">今日跟读</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-500">{stats.todayKnownDirectlyCount}</div>
              <div className="text-sm text-gray-500 mt-1">已认识</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-sky-500">{stats.literacyCount}</div>
              <div className="text-sm text-gray-500 mt-1">总识字量</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-amber-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">学习进度</span>
              <span className="text-amber-700 font-medium">
                {stats.literacyCount} / {stats.totalCharacters}
              </span>
            </div>
            <div className="mt-2 h-2.5 bg-amber-100 rounded-full overflow-hidden">
              <div
                className="progress-bar h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.round((stats.literacyCount / stats.totalCharacters) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* New Medals */}
        {newMedalDefs.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-3xl p-5 mb-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-amber-800 mb-3">🏅 获得新勋章！</h3>
            <div className="space-y-2">
              {newMedalDefs.map(m => (
                <div key={m.def.id} className="flex items-center gap-3 bg-white/60 rounded-xl p-3">
                  <span className="text-3xl">{m.def.icon}</span>
                  <div className="text-left">
                    <div className="font-bold text-gray-800">{m.def.name}</div>
                    <div className="text-xs text-gray-500">{m.def.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <button
          onClick={() => navigate('/home')}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg btn-primary active:scale-95 transition-transform"
        >
          返回首页
        </button>
      </div>
    </div>
  );
}
