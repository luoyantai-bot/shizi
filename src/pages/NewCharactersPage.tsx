import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function NewCharactersPage() {
  const navigate = useNavigate();
  const [currentChar, setCurrentChar] = useState<CharacterEntry | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [followReadCount, setFollowReadCount] = useState(0);
  const [knownCount, setKnownCount] = useState(0);
  const [_totalSeen, setTotalSeen] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [followReadMode, setFollowReadMode] = useState(false);
  const [imgError, setImgError] = useState(false);

  const loadNextChar = useCallback(() => {
    const stats = store.getStats();
    setFollowReadCount(stats.todayNewCount);
    setKnownCount(stats.todayKnownDirectlyCount);

    if (stats.todayNewCount >= 5) {
      const reviewChars = store.getTodayReviewCharacters();
      navigate(reviewChars.length > 0 ? '/review' : '/learning-complete');
      return;
    }

    const next = store.getNextNewCharacter();
    if (!next) {
      const reviewChars = store.getTodayReviewCharacters();
      navigate(reviewChars.length > 0 ? '/review' : '/learning-complete');
      return;
    }

    setCurrentChar(next);
    setIsFlipped(false);
    setShowFeedback(false);
    setTransitioning(false);
    setFollowReadMode(false);
    setImgError(false);
  }, [navigate]);

  useEffect(() => {
    loadNextChar();
  }, [loadNextChar]);

  if (!currentChar) return null;

  const handleFlip = () => {
    if (!followReadMode) {
      setIsFlipped(!isFlipped);
    }
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    speak(currentChar.character);
  };

  const handleKnown = () => {
    if (transitioning) return;
    setTransitioning(true);

    store.submitNewCharacter(currentChar.id, 'known_directly');

    setFeedbackText('已认识 ✓');
    setShowFeedback(true);

    const newStats = store.getStats();
    setFollowReadCount(newStats.todayNewCount);
    setKnownCount(newStats.todayKnownDirectlyCount);
    setTotalSeen(prev => prev + 1);

    setTimeout(() => {
      loadNextChar();
    }, 800);
  };

  const handleFollowRead = () => {
    if (transitioning) return;

    // If not yet in follow-read mode, submit and enter follow-read mode
    if (!followReadMode) {
      store.submitNewCharacter(currentChar.id, 'follow_read');

      const newStats = store.getStats();
      setFollowReadCount(newStats.todayNewCount);
      setKnownCount(newStats.todayKnownDirectlyCount);
      setTotalSeen(prev => prev + 1);

      // Enter follow-read mode: flip to back and play sound
      setFollowReadMode(true);
      setIsFlipped(true);
      speak(currentChar.character);
    } else {
      // Already in follow-read mode, just replay sound
      speak(currentChar.character);
    }
  };

  const handleNextAfterFollowRead = () => {
    if (transitioning) return;
    setTransitioning(true);

    const stats = store.getStats();
    if (stats.todayNewCount >= 5) {
      const reviewChars = store.getTodayReviewCharacters();
      navigate(reviewChars.length > 0 ? '/review' : '/learning-complete');
    } else {
      loadNextChar();
    }
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
          跟读 {followReadCount} / 5
        </div>
      </div>

      {/* Progress bar for follow_read count */}
      <div className="mb-4">
        <div className="flex gap-1.5 justify-center">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                i < followReadCount ? 'bg-amber-500' : 'bg-amber-200'
              }`}
            />
          ))}
        </div>
        {knownCount > 0 && (
          <div className="text-center text-xs text-gray-400 mt-1">
            今日已直接认识 {knownCount} 个字
          </div>
        )}
      </div>

      {/* Flip Card */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="flip-card-container w-full max-w-xs">
          <div
            className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}
            onClick={followReadMode ? undefined : handleFlip}
            style={{ minHeight: '420px' }}
          >
            {/* Front - White background, big black character + sound */}
            <div className="flip-card-front rounded-3xl p-8 w-full text-center cursor-pointer bg-white shadow-lg border border-gray-100">
              {/* Big Character */}
              <div className="text-[160px] leading-none font-bold text-gray-900 my-8 select-none" style={{ fontFamily: "'Noto Serif SC', 'Songti SC', 'SimSun', serif" }}>
                {currentChar.character}
              </div>

              {/* Sound Button */}
              <button
                onClick={handleSpeak}
                className="relative mx-auto w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center text-2xl shadow-lg active:scale-90 transition-transform mb-4"
              >
                <div className="absolute inset-0 rounded-full bg-amber-400 animate-pulse-ring" />
                <span className="relative z-10">🔊</span>
              </button>

              {/* Flip hint */}
              <div className="text-sm text-gray-400 flex items-center justify-center gap-1 mt-3">
                <span>👆</span> 点击卡片翻面查看拼音
              </div>
            </div>

            {/* Back - Pinyin + Image only */}
            <div className="flip-card-back rounded-3xl p-4 w-full text-center bg-white shadow-lg border border-gray-100 flex flex-col items-center justify-center">
              {/* Pinyin - smaller */}
              <div className="text-xl text-amber-500 font-medium mb-2">
                {currentChar.pinyin}
              </div>

              {/* Character Image - takes up most space */}
              {!imgError ? (
                <div className="flex-1 flex items-center justify-center w-full px-2">
                  <img
                    src={currentChar.imageUrl}
                    alt={currentChar.character}
                    className="w-full max-h-[320px] rounded-2xl object-contain"
                    onError={() => setImgError(true)}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-[120px] leading-none font-bold text-gray-300 select-none" style={{ fontFamily: "'Noto Serif SC', 'Songti SC', 'SimSun', serif" }}>
                    {currentChar.character}
                  </div>
                </div>
              )}

              {/* Sound button on back */}
              <button
                onClick={handleSpeak}
                className="mt-2 mx-auto w-11 h-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-lg active:scale-90 transition-transform"
              >
                🔊
              </button>
            </div>
          </div>
        </div>

        {/* Feedback overlay */}
        {showFeedback && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="animate-scaleIn text-2xl font-bold px-8 py-4 rounded-2xl shadow-xl bg-emerald-500 text-white">
              {feedbackText}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons - always visible (both front and back) */}
      <div className="mt-6 pb-4" style={{ minHeight: '72px' }}>
        {!followReadMode && !showFeedback && (
          <div className="flex gap-3 animate-slideUp">
            <button
              onClick={handleKnown}
              className="flex-1 py-4 rounded-2xl text-white font-bold text-lg btn-success active:scale-95 transition-transform"
            >
              😊 已认识
            </button>
            <button
              onClick={handleFollowRead}
              className="flex-1 py-4 rounded-2xl text-white font-bold text-lg btn-secondary active:scale-95 transition-transform"
            >
              📖 跟读
            </button>
          </div>
        )}
        {followReadMode && !showFeedback && (
          <div className="flex gap-3 animate-slideUp">
            <button
              onClick={handleFollowRead}
              className="flex-1 py-4 rounded-2xl text-white font-bold text-lg btn-secondary active:scale-95 transition-transform"
            >
              🔁 再次跟读
            </button>
            <button
              onClick={handleNextAfterFollowRead}
              className="flex-1 py-4 rounded-2xl text-white font-bold text-lg btn-primary active:scale-95 transition-transform"
            >
              下一个 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
