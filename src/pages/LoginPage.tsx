import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as store from '../store/appStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone || phone.length < 6) {
      setError('请输入有效的手机号');
      return;
    }
    if (!password || password.length < 4) {
      setError('密码至少4位');
      return;
    }
    const result = isRegister ? store.register(phone, password) : store.login(phone, password);
    if (result.ok) {
      const child = store.getChild();
      navigate(child ? '/home' : '/child-profile');
    } else {
      setError(result.msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
      <div className="animate-fadeIn w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">📖</div>
          <h1 className="text-3xl font-bold text-amber-800">少儿识字乐园</h1>
          <p className="text-amber-600 mt-2 text-sm">每天5个字，轻松学识字</p>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-center text-gray-800 mb-6">
            {isRegister ? '注册账号' : '登录'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">手机号</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none text-gray-800 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none text-gray-800 bg-white"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-white font-bold text-lg btn-primary active:scale-95 transition-transform"
            >
              {isRegister ? '注册' : '登录'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-amber-600 text-sm hover:underline"
            >
              {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
            </button>
          </div>
        </div>

        <p className="text-center text-amber-500/60 text-xs mt-6">
          数据保存在本地浏览器中
        </p>
      </div>
    </div>
  );
}
