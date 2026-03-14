import { useEffect, useState } from 'react';
import * as store from '../store/appStore';
import type { MedalDef, EarnedMedal } from '../store/appStore';

export default function MedalsPage() {
  const [medals, setMedals] = useState<{ def: MedalDef; earned: EarnedMedal | null }[]>([]);

  useEffect(() => {
    setMedals(store.getMedals());
  }, []);

  const earned = medals.filter(m => m.earned);
  const locked = medals.filter(m => !m.earned);

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <h1 className="text-2xl font-bold text-amber-800 mb-2 animate-fadeIn">🏅 勋章墙</h1>
      <p className="text-sm text-amber-600 mb-6 animate-fadeIn">
        已获得 {earned.length} / {medals.length} 枚勋章
      </p>

      {/* Earned Medals */}
      {earned.length > 0 && (
        <div className="mb-6 animate-fadeIn">
          <h2 className="text-lg font-bold text-gray-700 mb-3">✨ 已获得</h2>
          <div className="grid grid-cols-2 gap-3">
            {earned.map(m => (
              <div
                key={m.def.id}
                className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-4 text-center shadow-md border border-amber-200 animate-scaleIn"
              >
                <div className="text-4xl mb-2">{m.def.icon}</div>
                <div className="font-bold text-gray-800 text-sm">{m.def.name}</div>
                <div className="text-xs text-gray-500 mt-1">{m.def.description}</div>
                {m.earned && (
                  <div className="text-xs text-amber-500 mt-2">
                    {new Date(m.earned.earnedAt).toLocaleDateString('zh-CN')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Medals */}
      {locked.length > 0 && (
        <div className="animate-fadeIn">
          <h2 className="text-lg font-bold text-gray-700 mb-3">🔒 未解锁</h2>
          <div className="grid grid-cols-2 gap-3">
            {locked.map(m => (
              <div
                key={m.def.id}
                className="bg-gray-100/80 rounded-2xl p-4 text-center border border-gray-200"
              >
                <div className="text-4xl mb-2 grayscale opacity-40">{m.def.icon}</div>
                <div className="font-bold text-gray-400 text-sm">{m.def.name}</div>
                <div className="text-xs text-gray-400 mt-1">{m.def.description}</div>
                <div className="text-xs text-gray-300 mt-2">待解锁</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {medals.length === 0 && (
        <div className="text-center text-gray-400 mt-20">
          <div className="text-5xl mb-4">🌟</div>
          <p>开始学习，赢取你的第一枚勋章！</p>
        </div>
      )}
    </div>
  );
}
