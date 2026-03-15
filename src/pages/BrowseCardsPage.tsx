import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as store from '../store/appStore';
import type { CharacterEntry } from '../data/characters';

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

export default function BrowseCardsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'today-new';

  const [chars, setChars] = useState<CharacterEntry[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let list: CharacterEntry[] = [];
    if (type === 'today-new') {
      list = store.getTodayFollowReadChars();
    } else if (type === 'today-review') {
      list = store.getTodayCompletedReviewChars();
    }
    if (list.length === 0) {
      navigate('/home');
      return;
    }
    setChars(list);
  }, [type, navigate]);

  if (chars.length === 0) return null;

  const currentChar = chars[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx >= chars.length - 1;

  const title = type === 'today-new' ? '今日跟读回顾' : '今日复习回顾';

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    speak(currentChar.character);
  };

  const handlePrev = () => {
    if (isFirst) return;
    setCurrentIdx(currentIdx - 1);
    setIsFlipped(false);
    setImgError(false);
  };

  const handleNext = () => {
    if (isLast) return;
    setCurrentIdx(currentIdx + 1);
    setIsFlipped(false);
    setImgError(false);
  };

  const handleReplay = () => {
    speak(currentChar.character);
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate('/home')}
          className="text-amber-600 text-sm flex items-center gap-1"
        >
          ← 返回
        </button>
        <div className="bg-amber-100 px-3 py-1 rounded-full text-sm text-amber-700 font-medium">
          {title}
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 justify-center mb-2">
        {chars.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i <= currentIdx ? 'w-6 bg-amber-500' : 'w-1.5 bg-amber-200'
            }`}
          />
        ))}
      </div>

      <div className="text-center text-xs text-gray-400 mb-4">
        {currentIdx + 1} / {chars.length}
      </div>

      {/* Flip Card */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="flip-card-container w-full max-w-xs">
          <div
            className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}
            onClick={handleFlip}
            style={{ minHeight: '420px' }}
          >
            {/* Front - Big character + sound */}
            <div className="flip-card-front rounded-3xl p-8 w-full text-center cursor-pointer bg-white shadow-lg border border-gray-100">
              <div
                className="text-[160px] leading-none font-bold text-gray-900 my-8 select-none"
                style={{ fontFamily: "'Noto Serif SC', 'Songti SC', 'SimSun', serif" }}
              >
                {currentChar.character}
              </div>

              <button
                onClick={handleSpeak}
                className="relative mx-auto w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center text-2xl shadow-lg active:scale-90 transition-transform mb-4"
              >
                <div className="absolute inset-0 rounded-full bg-amber-400 animate-pulse-ring" />
                <span className="relative z-10">🔊</span>
              </button>

              <div className="text-sm text-gray-400 flex items-center justify-center gap-1 mt-3">
                <span>👆</span> 点击卡片翻面查看拼音
              </div>
            </div>

            {/* Back - Pinyin + Image */}
            <div className="flip-card-back rounded-3xl p-6 w-full text-center bg-white shadow-lg border border-gray-100 flex flex-col items-center justify-center">
              {/* Pinyin */}
              <div className="text-2xl text-amber-600 font-medium mb-4">
                {currentChar.pinyin}
              </div>

              {/* Character Image */}
              {!imgError ? (
                <div className="flex-1 flex items-center justify-center w-full px-2">
                  <img
                    src={currentChar.imageUrl}
                    alt={currentChar.character}
                    className="max-h-72 w-auto rounded-2xl object-contain"
                    onError={() => setImgError(true)}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div
                    className="text-[120px] leading-none font-bold text-gray-900 select-none"
                    style={{ fontFamily: "'Noto Serif SC', 'Songti SC', 'SimSun', serif" }}
                  >
                    {currentChar.character}
                  </div>
                </div>
              )}

              {/* Sound button */}
              <button
                onClick={handleSpeak}
                className="mt-4 mx-auto w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl active:scale-90 transition-transform"
              >
                🔊
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Buttons: Read aloud + Prev/Next navigation */}
      <div className="mt-6 pb-4 space-y-3">
        <button
          onClick={handleReplay}
          className="w-full py-3 rounded-2xl bg-amber-100 text-amber-700 font-bold text-base active:scale-95 transition-transform"
        >
          🔊 跟读发音
        </button>
        <div className="flex gap-3">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className={`flex-1 py-3 rounded-2xl font-bold text-base active:scale-95 transition-transform ${
              isFirst
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            ← 上一个
          </button>
          <button
            onClick={isLast ? () => navigate('/home') : handleNext}
            className="flex-1 py-3 rounded-2xl text-white font-bold text-base btn-primary active:scale-95 transition-transform"
          >
            {isLast ? '返回首页' : '下一个 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
