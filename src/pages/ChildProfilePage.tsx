import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as store from '../store/appStore';

export default function ChildProfilePage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [birthYear, setBirthYear] = useState(2020);
  const [birthMonth, setBirthMonth] = useState(1);
  const [error, setError] = useState('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('请输入宝宝的昵称');
      return;
    }
    store.createChild(nickname.trim(), birthYear, birthMonth);
    navigate('/home');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
      <div className="animate-fadeIn w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">👶</div>
          <h1 className="text-2xl font-bold text-amber-800">创建宝宝档案</h1>
          <p className="text-amber-600 mt-2 text-sm">让我们认识一下小朋友吧</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">宝宝昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="给宝宝起个名字吧"
                className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none text-gray-800 bg-white"
                maxLength={10}
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 mb-1">出生年份</label>
                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:border-amber-400 outline-none text-gray-800 bg-white"
                >
                  {years.map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 mb-1">出生月份</label>
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:border-amber-400 outline-none text-gray-800 bg-white"
                >
                  {months.map(m => <option key={m} value={m}>{m}月</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-white font-bold text-lg btn-primary active:scale-95 transition-transform"
            >
              开始识字之旅 🚀
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
