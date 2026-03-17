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
  const type = searchParams.get('type') || 'new';
  const [chars, setChars] = useState<CharacterEntry[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    const list = type === 'review'
      ? store.getTodayReviewedCharacters()
      : store.getTodayFollowReadCharacters();
    setChars(list);
  }, [type]);
  if (chars.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-5xl mb-4">📭</div>
        <p className="text-gray-500 mb-6">暂无字卡可以查看</p>
        <button
          onClick={() => navigate('/home')}
          className="px-6 py-3 rounded-xl btn-primary text-white font-bold"
        >
          返回首页
        </button>
      </div>
    );
  }
  const currentChar = chars[currentIdx];
  const title = type === 'review' ? '今日已复习' : '今日已学习';
  const handleFlip = () => setIsFlipped(!isFlipped);
  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    speak(currentChar.character);
  };
  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setIsFlipped(false);
      setImgError(false);
    }
  };
  const handleNext = () => {
    if (currentIdx < chars.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setIsFlipped(false);
      setImgError(false);
    }
  };
  return (
    <div className="min-h-screen flex flex-col px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/home')}
          className="text-amber-600 text-sm flex items-center gap-1"
        >
          ← 返回
        </button>
        <div className="bg-amber-100 px-3 py-1 rounded-full text-sm text-amber-700 font-medium">
          {title} · {currentIdx + 1}/{chars.length}
        </div>
      </div>
      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="flip-card-container w-full max-w-xs">
          <div
            className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}
            onClick={handleFlip}
            style={{ minHeight: '420px' }}
          >
            {/* Front */}
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
                <span>👆</span> 点击卡片翻面
              </div>
            </div>
            {/* Back */}
            <div className="flip-card-back rounded-3xl p-6 w-full text-center cursor-pointer bg-white shadow-lg border border-gray-100 flex flex-col items-center justify-center">
              <div className="text-2xl text-amber-600 font-medium mb-2">
                {currentChar.pinyin}
              </div>
              {!imgError && (
                <div className="flex-1 flex items-center justify-center w-full px-2">
                  <img
                    src={currentChar.imageUrl}
                    alt={currentChar.character}
                    className="max-h-72 w-auto rounded-xl object-contain"
                    onError={() => setImgError(true)}
                  />
                </div>
              )}
              {imgError && (
                <div
                  className="text-[100px] leading-none font-bold text-gray-900 my-4 select-none"
                  style={{ fontFamily: "'Noto Serif SC', 'Songti SC', 'SimSun', serif" }}
                >
                  {currentChar.character}
                </div>
              )}
              <button
                onClick={handleSpeak}
                className="mt-3 mx-auto w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl active:scale-90 transition-transform"
              >
                🔊
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Navigation */}
      <div className="mt-6 pb-4 flex gap-3">
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-transform ${
            currentIdx === 0
              ? 'bg-gray-200 text-gray-400'
              : 'btn-secondary text-white active:scale-95'
          }`}
        >
          ← 上一个
        </button>
        <button
          onClick={handleNext}
          disabled={currentIdx === chars.length - 1}
          className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-transform ${
            currentIdx === chars.length - 1
              ? 'bg-gray-200 text-gray-400'
              : 'btn-primary text-white active:scale-95'
          }`}
        >
          下一个 →
        </button>
      </div>
    </div>
  );
}
