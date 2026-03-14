import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as store from '../store/appStore';
import type { CharacterEntry } from '../data/characters';
import type { CharStatus } from '../store/appStore';

type ReviewChar = CharacterEntry & { status: CharStatus };

function speak(text: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.6;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }
}

export default function ReviewPage() {
  const navigate = useNavigate();
  const [chars, setChars] = useState<ReviewChar[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState('');
  const [knownCount, setKnownCount] = useState(0);

  useEffect(() => {
    const reviewChars = store.getTodayReviewCharacters();
    if (reviewChars.length === 0) {
      navigate('/home');
      return;
    }
    setChars(reviewChars);
  }, [navigate]);

  if (chars.length === 0) return null;

  const currentChar = chars[currentIdx];
  const isLast = currentIdx >= chars.length - 1;

  const handleFlip = () => {
    if (!showResult) {
      setIsFlipped(!isFlipped);
    }
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    speak(currentChar.character);
  };

  const handleResult = (result: 'known' | 'unknown') => {
    store.submitReview(currentChar.id, result);
    if (result === 'known') setKnownCount(k => k + 1);
    setLastResult(result === 'known' ? '认识 ✓' : '继续加油 💪');
    setShowResult(true);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setShowResult(false);
    if (isLast) {
      const hasNew = store.hasNewCharactersAvailable();
      navigate(hasNew ? '/new-characters' : '/learning-complete');
    } else {
      setCurrentIdx(currentIdx + 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/home')} className="text-amber-600 text-sm flex items-center gap-1">
          ← 返回
        </button>
        <div className="bg-sky-100 px-3 py-1 rounded-full text-sm text-sky-700 font-medium">
          复习 {currentIdx + 1} / {chars.length}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 justify-center mb-2 flex-wrap">
        {chars.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < currentIdx ? 'w-4 bg-sky-500' : i === currentIdx ? 'w-6 bg-sky-500' : 'w-1.5 bg-sky-200'
            }`}
          />
        ))}
      </div>

      <div className="text-center text-xs text-gray-400 mb-4">
        已认识 {knownCount}/{chars.length}
      </div>

      {/* Flip Card */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="flip-card-container w-full max-w-xs">
          <div
            className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}
            onClick={handleFlip}
            style={{ minHeight: '400px' }}
          >
            {/* Front - Pure white, big character + sound */}
            <div className="flip-card-front char-card rounded-3xl w-full text-center cursor-pointer flex flex-col items-center justify-center p-6">
              <div className="text-[180px] leading-none font-bold text-gray-900 select-none mb-8">
                {currentChar.character}
              </div>

              <button
                onClick={handleSpeak}
                className="relative w-16 h-16 rounded-full bg-sky-500 text-white flex items-center justify-center text-2xl shadow-lg active:scale-90 transition-transform"
              >
                <div className="absolute inset-0 rounded-full bg-sky-400 animate-pulse-ring" />
                <span className="relative z-10">🔊</span>
              </button>

              <div className="text-xs text-gray-300 mt-6">
                点击卡片翻面查看拼音
              </div>
            </div>

            {/* Back - Pinyin + Character + Word Example */}
            <div className="flip-card-back char-card rounded-3xl w-full text-center cursor-pointer flex flex-col items-center justify-center p-6">
              <div className="text-3xl text-amber-600 font-medium mb-2">
                {currentChar.pinyin}
              </div>

              <div className="text-[140px] leading-none font-bold text-gray-900 select-none mb-6">
                {currentChar.character}
              </div>

              <div className="text-2xl text-gray-600">
                <span className="bg-sky-50 px-6 py-2 rounded-xl inline-block border border-sky-100">
                  {currentChar.wordExample}
                </span>
              </div>

              <button
                onClick={handleSpeak}
                className="mt-6 w-12 h-12 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xl active:scale-90 transition-transform"
              >
                🔊
              </button>

              {showResult && (
                <div className={`mt-4 font-bold text-lg animate-fadeIn ${lastResult.includes('✓') ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {lastResult}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - ALWAYS visible */}
      <div className="mt-6 pb-4" style={{ minHeight: '72px' }}>
        {!showResult && (
          <div className="flex gap-3">
            <button
              onClick={() => handleResult('unknown')}
              className="flex-1 py-4 rounded-2xl text-white font-bold text-lg btn-danger active:scale-95 transition-transform"
            >
              😅 不认识
            </button>
            <button
              onClick={() => handleResult('known')}
              className="flex-1 py-4 rounded-2xl text-white font-bold text-lg btn-success active:scale-95 transition-transform"
            >
              😊 认识
            </button>
          </div>
        )}
        {showResult && (
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg btn-primary active:scale-95 transition-transform animate-slideUp"
          >
            {isLast ? '完成复习 🎉' : '下一个 →'}
          </button>
        )}
      </div>
    </div>
  );
}
