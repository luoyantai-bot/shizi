import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import * as store from './store/appStore';
import LoginPage from './pages/LoginPage';
import ChildProfilePage from './pages/ChildProfilePage';
import HomePage from './pages/HomePage';
import NewCharactersPage from './pages/NewCharactersPage';
import ReviewPage from './pages/ReviewPage';
import LearningCompletePage from './pages/LearningCompletePage';
import GrowthPage from './pages/GrowthPage';
import MedalsPage from './pages/MedalsPage';
import ReportPage from './pages/ReportPage';
import BrowseCardsPage from './pages/BrowseCardsPage';

function SplashPage() {
  const navigate = useNavigate();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      const user = store.getCurrentUser();
      if (!user) {
        navigate('/login');
      } else {
        const child = store.getChild();
        navigate(child ? '/home' : '/child-profile');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  if (!show) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="animate-scaleIn text-center">
        <div className="text-8xl mb-4 animate-bounce-soft">📖</div>
        <h1 className="text-4xl font-bold text-amber-800 mb-2">少儿识字乐园</h1>
        <p className="text-amber-600 text-lg">每天5个字，轻松学识字</p>
        <div className="mt-8 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = store.getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ChildGuard({ children }: { children: React.ReactNode }) {
  const user = store.getCurrentUser();
  const child = store.getChild();
  if (!user) return <Navigate to="/login" replace />;
  if (!child) return <Navigate to="/child-profile" replace />;
  return <>{children}</>;
}

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const tabs = [
    { path: '/home', icon: '🏠', label: '首页' },
    { path: '/growth', icon: '📈', label: '成长' },
    { path: '/medals', icon: '🏅', label: '勋章' },
    { path: '/report', icon: '📊', label: '报告' },
  ];

  const showTabs = ['/home', '/growth', '/medals', '/report'].includes(location.pathname);
  if (!showTabs) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-amber-100 z-50">
      <div className="max-w-lg mx-auto flex justify-around py-2 px-4">
        {tabs.map(tab => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                active ? 'text-amber-700' : 'text-gray-400'
              }`}
            >
              <span className={`text-xl ${active ? 'scale-110' : ''} transition-transform`}>
                {tab.icon}
              </span>
              <span className={`text-xs mt-0.5 ${active ? 'font-bold' : ''}`}>{tab.label}</span>
              {active && <div className="w-4 h-0.5 rounded-full bg-amber-500 mt-0.5" />}
            </button>
          );
        })}
      </div>
      {/* Safe area for iPhone */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}

function AppContent() {
  return (
    <div className="max-w-lg mx-auto min-h-screen relative">
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/child-profile" element={
          <AuthGuard><ChildProfilePage /></AuthGuard>
        } />
        <Route path="/home" element={
          <ChildGuard><HomePage /></ChildGuard>
        } />
        <Route path="/new-characters" element={
          <ChildGuard><NewCharactersPage /></ChildGuard>
        } />
        <Route path="/review" element={
          <ChildGuard><ReviewPage /></ChildGuard>
        } />
        <Route path="/learning-complete" element={
          <ChildGuard><LearningCompletePage /></ChildGuard>
        } />
        <Route path="/growth" element={
          <ChildGuard><GrowthPage /></ChildGuard>
        } />
        <Route path="/medals" element={
          <ChildGuard><MedalsPage /></ChildGuard>
        } />
        <Route path="/report" element={
          <ChildGuard><ReportPage /></ChildGuard>
        } />
        <Route path="/browse" element={
          <ChildGuard><BrowseCardsPage /></ChildGuard>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
