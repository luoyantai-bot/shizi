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
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [transitioning, setTransitioning] = useState(false);

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
  }, [navigate]);

  useEffect(() => {
    loadNextChar();
  }, [loadNextChar]);

  if (!currentChar) return null;

  const handleFlip = () => {
    if (!showFeedback) {
      setIsFlipped(!isFlipped);
    }
  };

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    speak(currentChar.character);
  };

  const handleAction = (action: 'known_directly' | 'follow_read') => {
    if (transitioning) return;
    setTransitioning(true);

    store.submitNewCharacter(currentChar.id, action);

    if (action === 'known_directly') {
      setFeedbackText('已认识 ✓');
    } else {
      setFeedbackText('跟读学习 📖');
    }
    setShowFeedback(true);

    const newStats = store.getStats();
    setFollowReadCount(newStats.todayNewCount);
    setKnownCount(newStats.todayKnownDirectlyCount);

    setTimeout(() => {
      if (action === 'follow_read' && newStats.todayNewCount >= 5) {
        const reviewChars = store.getTodayReviewCharacters();
        navigate(reviewChars.length > 0 ? '/review' : '/learning-complete');
      } else {
        loadNextChar();
      }
    }, 800);
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

      {/* Progress bar */}
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
            onClick={handleFlip}
            style={{ minHeight: '400px' }}
          >
            {/* Front - Pure white, big black character + sound */}
            <div className="flip-card-front char-card rounded-3xl w-full text-center cursor-pointer flex flex-col items-center justify-center p-6">
              <div className="text-[180px] leading-none font-bold text-gray-900 select-none mb-8">
                {currentChar.character}
              </div>

              <button
                onClick={handleSpeak}
                className="relative w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center text-2xl shadow-lg active:scale-90 transition-transform"
              >
                <div className="absolute inset-0 rounded-full bg-amber-400 animate-pulse-ring" />
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
                <span className="bg-amber-50 px-6 py-2 rounded-xl inline-block border border-amber-100">
                  {currentChar.wordExample}
                </span>
              </div>

              <button
                onClick={handleSpeak}
                className="mt-6 w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl active:scale-90 transition-transform"
              >
                🔊
              </button>
            </div>
          </div>
        </div>

        {/* Feedback overlay */}
        {showFeedback && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className={`animate-scaleIn text-2xl font-bold px-8 py-4 rounded-2xl shadow-xl ${
              feedbackText.includes('认识') ? 'bg-emerald-500 text-white' : 'bg-sky-500 text-white'
            }`}>
              {feedbackText}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons - ALWAYS visible */}
      <div className="mt-6 pb-4" style={{ minHeight: '72px' }}>
        {!showFeedback && (
          <div className="flex gap-3 animate-slideUp">
            <button
              onClick={() => handleAction('known_directly')}
              className="flex-1 py-4 rounded-2xl text-white font-bold text-lg btn-success active:scale-95 transition-transform"
            >
              😊 已认识
            </button>
            <button
              onClick={() => handleAction('follow_read')}
              className="flex-1 py-4 rounded-2xl text-white font-bold text-lg btn-secondary active:scale-95 transition-transform"
            >
              📖 跟读
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
