import { characters, getCharactersByLevel, getCharacterById, type CharacterEntry } from '../data/characters';

// ===== Types =====
export interface UserData {
  userId: string;
  phone: string;
  password: string;
  createdAt: string;
}

export interface ChildData {
  childId: string;
  userId: string;
  nickname: string;
  birthYear: number;
  birthMonth: number;
  createdAt: string;
}

export type CharStatus =
  | 'new'
  | 'known_directly'
  | 'learning_stage_1'
  | 'learning_stage_2'
  | 'learning_stage_3'
  | 'learning_stage_4'
  | 'learning_stage_5'
  | 'learning_stage_6'
  | 'learning_stage_7'
  | 'mastered';

export interface CharacterStatus {
  characterId: string;
  status: CharStatus;
  difficultyLevel: 'low' | 'medium' | 'high';
  lastReviewAt: string | null;
  nextReviewAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LearningRecord {
  characterId: string;
  action: 'known_directly' | 'follow_read' | 'review_known' | 'review_unknown';
  date: string;
  createdAt: string;
}

export interface MedalDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: Stats) => boolean;
}

export interface EarnedMedal {
  medalId: string;
  earnedAt: string;
}

export interface Stats {
  totalCharacters: number;
  knownDirectly: number;
  learning: number;
  mastered: number;
  literacyCount: number; // knownDirectly + mastered, shown as "已认识"
  lowTotal: number;
  lowDone: number;
  mediumTotal: number;
  mediumDone: number;
  highTotal: number;
  highDone: number;
  currentLevel: 'low' | 'medium' | 'high';
  todayNewCount: number; // only counts follow_read
  todayKnownDirectlyCount: number; // known_directly today (not counted toward 5 limit)
  todayReviewCount: number;
}

export interface DailyRecord {
  date: string;
  newCount: number;
  reviewCount: number;
}

// ===== Constants =====
const STAGE_INTERVALS: Record<number, number> = {
  1: 1, 2: 3, 3: 7, 4: 14, 5: 21, 6: 30, 7: 0,
};

const KEYS = {
  users: 'literacy_users',
  currentUser: 'literacy_current_user',
  children: 'literacy_children',
  charStatuses: 'literacy_char_statuses',
  learningRecords: 'literacy_learning_records',
  earnedMedals: 'literacy_earned_medals',
  todaySession: 'literacy_today_session',
};

// ===== Medal definitions =====
export const MEDAL_DEFS: MedalDef[] = [
  { id: 'first_learn', name: '初次学习', description: '完成第一个字的学习', icon: '🌟', condition: (s) => s.knownDirectly + s.learning + s.mastered > 0 },
  { id: 'know_10', name: '认识10字', description: '已认识10个汉字', icon: '🎯', condition: (s) => s.literacyCount >= 10 },
  { id: 'know_50', name: '认识50字', description: '已认识50个汉字', icon: '🏅', condition: (s) => s.literacyCount >= 50 },
  { id: 'know_100', name: '认识100字', description: '已认识100个汉字', icon: '🏆', condition: (s) => s.literacyCount >= 100 },
  { id: 'low_done', name: '低难度完成', description: '完成所有低难度字', icon: '⭐', condition: (s) => s.lowDone >= s.lowTotal && s.lowTotal > 0 },
  { id: 'medium_done', name: '中难度完成', description: '完成所有中难度字', icon: '💫', condition: (s) => s.mediumDone >= s.mediumTotal && s.mediumTotal > 0 },
  { id: 'high_done', name: '高难度完成', description: '完成所有高难度字', icon: '👑', condition: (s) => s.highDone >= s.highTotal && s.highTotal > 0 },
  { id: 'all_1000', name: '千字目标', description: '达成识字总目标', icon: '🎓', condition: (s) => s.literacyCount >= s.totalCharacters },
];

// ===== Helpers =====
function getLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function setLS(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function genId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// ===== Auth =====
export function getUsers(): UserData[] {
  return getLS<UserData[]>(KEYS.users, []);
}

export function getCurrentUser(): UserData | null {
  return getLS<UserData | null>(KEYS.currentUser, null);
}

export function register(phone: string, password: string): { ok: boolean; msg: string } {
  const users = getUsers();
  if (users.find(u => u.phone === phone)) return { ok: false, msg: '该手机号已注册' };
  const user: UserData = { userId: genId(), phone, password, createdAt: new Date().toISOString() };
  users.push(user);
  setLS(KEYS.users, users);
  setLS(KEYS.currentUser, user);
  return { ok: true, msg: '注册成功' };
}

export function login(phone: string, password: string): { ok: boolean; msg: string } {
  const users = getUsers();
  const user = users.find(u => u.phone === phone && u.password === password);
  if (!user) return { ok: false, msg: '手机号或密码错误' };
  setLS(KEYS.currentUser, user);
  return { ok: true, msg: '登录成功' };
}

export function logout() {
  localStorage.removeItem(KEYS.currentUser);
}

// ===== Child =====
export function getChild(): ChildData | null {
  const user = getCurrentUser();
  if (!user) return null;
  const children = getLS<ChildData[]>(KEYS.children, []);
  return children.find(c => c.userId === user.userId) || null;
}

export function createChild(nickname: string, birthYear: number, birthMonth: number): ChildData {
  const user = getCurrentUser()!;
  const children = getLS<ChildData[]>(KEYS.children, []);
  const existing = children.findIndex(c => c.userId === user.userId);
  const child: ChildData = {
    childId: genId(),
    userId: user.userId,
    nickname,
    birthYear,
    birthMonth,
    createdAt: new Date().toISOString(),
  };
  if (existing >= 0) children[existing] = child;
  else children.push(child);
  setLS(KEYS.children, children);
  return child;
}

// ===== Character Status =====
function getChildKey(): string {
  const child = getChild();
  return child ? child.childId : 'default';
}

function getAllStatuses(): CharacterStatus[] {
  return getLS<CharacterStatus[]>(`${KEYS.charStatuses}_${getChildKey()}`, []);
}

function setAllStatuses(statuses: CharacterStatus[]) {
  setLS(`${KEYS.charStatuses}_${getChildKey()}`, statuses);
}

function getStatus(charId: string): CharacterStatus | undefined {
  return getAllStatuses().find(s => s.characterId === charId);
}

function upsertStatus(charId: string, updates: Partial<CharacterStatus>) {
  const all = getAllStatuses();
  const idx = all.findIndex(s => s.characterId === charId);
  const charEntry = getCharacterById(charId);
  const now = new Date().toISOString();
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates, updatedAt: now };
  } else {
    all.push({
      characterId: charId,
      status: 'new',
      difficultyLevel: charEntry?.difficultyLevel || 'low',
      lastReviewAt: null,
      nextReviewAt: null,
      createdAt: now,
      updatedAt: now,
      ...updates,
    });
  }
  setAllStatuses(all);
}

// ===== Learning Records =====
function getRecords(): LearningRecord[] {
  return getLS<LearningRecord[]>(`${KEYS.learningRecords}_${getChildKey()}`, []);
}

function addRecord(charId: string, action: LearningRecord['action']) {
  const records = getRecords();
  records.push({
    characterId: charId,
    action,
    date: today(),
    createdAt: new Date().toISOString(),
  });
  setLS(`${KEYS.learningRecords}_${getChildKey()}`, records);
}

// ===== Stats =====
export function getStats(): Stats {
  const all = getAllStatuses();
  const todayStr = today();

  const knownDirectly = all.filter(s => s.status === 'known_directly').length;
  const mastered = all.filter(s => s.status === 'mastered').length;
  const learning = all.filter(s => s.status.startsWith('learning_stage_')).length;
  const literacyCount = knownDirectly + mastered;

  const lowChars = getCharactersByLevel('low');
  const medChars = getCharactersByLevel('medium');
  const highChars = getCharactersByLevel('high');

  const lowDone = all.filter(s => {
    const c = getCharacterById(s.characterId);
    return c?.difficultyLevel === 'low' && s.status !== 'new';
  }).length;
  const mediumDone = all.filter(s => {
    const c = getCharacterById(s.characterId);
    return c?.difficultyLevel === 'medium' && s.status !== 'new';
  }).length;
  const highDone = all.filter(s => {
    const c = getCharacterById(s.characterId);
    return c?.difficultyLevel === 'high' && s.status !== 'new';
  }).length;

  let currentLevel: 'low' | 'medium' | 'high' = 'low';
  if (lowDone >= lowChars.length && lowChars.length > 0) {
    currentLevel = 'medium';
    if (mediumDone >= medChars.length && medChars.length > 0) {
      currentLevel = 'high';
    }
  }

  const records = getRecords();
  const todayRecords = records.filter(r => r.date === todayStr);
  // Only follow_read counts toward the daily 5 new char limit
  const todayNewCount = todayRecords.filter(r => r.action === 'follow_read').length;
  const todayKnownDirectlyCount = todayRecords.filter(r => r.action === 'known_directly').length;

  const reviewDue = all.filter(s =>
    s.status.startsWith('learning_stage_') && s.nextReviewAt && s.nextReviewAt <= todayStr
  ).length;

  return {
    totalCharacters: characters.length,
    knownDirectly,
    learning,
    mastered,
    literacyCount,
    lowTotal: lowChars.length,
    lowDone,
    mediumTotal: medChars.length,
    mediumDone,
    highTotal: highChars.length,
    highDone,
    currentLevel,
    todayNewCount,
    todayKnownDirectlyCount,
    todayReviewCount: reviewDue,
  };
}

// ===== Today's new characters =====
// Returns whether there are still new characters available to learn today
export function hasNewCharactersAvailable(): boolean {
  const stats = getStats();
  if (stats.todayNewCount >= 5) return false; // 5 follow_reads done
  return getNextNewCharacter() !== null;
}

// Get the next single unlearned character
export function getNextNewCharacter(): CharacterEntry | null {
  const stats = getStats();
  const all = getAllStatuses();
  const learnedIds = new Set(all.map(s => s.characterId));

  const levels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
  const startIdx = levels.indexOf(stats.currentLevel);

  for (let i = startIdx; i < levels.length; i++) {
    const levelChars = getCharactersByLevel(levels[i]).filter(c => !learnedIds.has(c.id));
    if (levelChars.length > 0) {
      return levelChars[0];
    }
  }
  return null;
}

// Legacy: returns a batch for display (used by HomePage for count)
export function getTodayNewCharacters(): CharacterEntry[] {
  const stats = getStats();
  if (stats.todayNewCount >= 5) return [];
  const all = getAllStatuses();
  const learnedIds = new Set(all.map(s => s.characterId));

  const levels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
  const startIdx = levels.indexOf(stats.currentLevel);

  const result: CharacterEntry[] = [];
  // Return up to 10 to show there are chars available (we don't know how many will be known_directly)
  const maxFetch = 10;
  for (let i = startIdx; i < levels.length && result.length < maxFetch; i++) {
    const levelChars = getCharactersByLevel(levels[i]).filter(c => !learnedIds.has(c.id));
    for (const c of levelChars) {
      if (result.length >= maxFetch) break;
      result.push(c);
    }
  }
  return result;
}

// ===== Submit new character =====
export function submitNewCharacter(charId: string, action: 'known_directly' | 'follow_read') {
  const charEntry = getCharacterById(charId);
  if (!charEntry) return;

  if (action === 'known_directly') {
    upsertStatus(charId, {
      status: 'known_directly',
      difficultyLevel: charEntry.difficultyLevel,
      lastReviewAt: today(),
    });
    addRecord(charId, 'known_directly');
  } else {
    upsertStatus(charId, {
      status: 'learning_stage_1',
      difficultyLevel: charEntry.difficultyLevel,
      lastReviewAt: today(),
      nextReviewAt: addDays(today(), STAGE_INTERVALS[1]),
    });
    addRecord(charId, 'follow_read');
  }
  checkMedals();
}

// ===== Today's review characters =====
export function getTodayReviewCharacters(): (CharacterEntry & { status: CharStatus })[] {
  const all = getAllStatuses();
  const todayStr = today();
  const dueStatuses = all.filter(
    s => s.status.startsWith('learning_stage_') && s.nextReviewAt && s.nextReviewAt <= todayStr
  );
  return dueStatuses
    .map(s => {
      const c = getCharacterById(s.characterId);
      if (!c) return null;
      return { ...c, status: s.status };
    })
    .filter(Boolean) as (CharacterEntry & { status: CharStatus })[];
}

// ===== Submit review =====
export function submitReview(charId: string, result: 'known' | 'unknown') {
  const charEntry = getCharacterById(charId);
  if (!charEntry) return;
  const status = getStatus(charId);
  if (!status) return;

  if (result === 'unknown') {
    upsertStatus(charId, {
      status: 'learning_stage_1',
      lastReviewAt: today(),
      nextReviewAt: addDays(today(), STAGE_INTERVALS[1]),
    });
    addRecord(charId, 'review_unknown');
  } else {
    const currentStage = parseInt(status.status.replace('learning_stage_', ''));
    if (currentStage >= 7) {
      upsertStatus(charId, {
        status: 'mastered',
        lastReviewAt: today(),
        nextReviewAt: null,
      });
    } else {
      const nextStage = currentStage + 1;
      upsertStatus(charId, {
        status: `learning_stage_${nextStage}` as CharStatus,
        lastReviewAt: today(),
        nextReviewAt: addDays(today(), STAGE_INTERVALS[nextStage]),
      });
    }
    addRecord(charId, 'review_known');
  }
  checkMedals();
}

// ===== Medals =====
function getEarnedMedals(): EarnedMedal[] {
  return getLS<EarnedMedal[]>(`${KEYS.earnedMedals}_${getChildKey()}`, []);
}

function setEarnedMedals(medals: EarnedMedal[]) {
  setLS(`${KEYS.earnedMedals}_${getChildKey()}`, medals);
}

export function checkMedals(): string[] {
  const stats = getStats();
  const earned = getEarnedMedals();
  const earnedIds = new Set(earned.map(m => m.medalId));
  const newMedals: string[] = [];

  for (const def of MEDAL_DEFS) {
    if (!earnedIds.has(def.id) && def.condition(stats)) {
      earned.push({ medalId: def.id, earnedAt: new Date().toISOString() });
      newMedals.push(def.id);
    }
  }
  if (newMedals.length > 0) setEarnedMedals(earned);
  return newMedals;
}

export function getMedals(): { def: MedalDef; earned: EarnedMedal | null }[] {
  const earned = getEarnedMedals();
  return MEDAL_DEFS.map(def => ({
    def,
    earned: earned.find(e => e.medalId === def.id) || null,
  }));
}

// ===== Report =====
export function getWeeklyRecords(): DailyRecord[] {
  const records = getRecords();
  const result: DailyRecord[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today(), -i);
    const dayRecords = records.filter(r => r.date === d);
    result.push({
      date: d,
      newCount: dayRecords.filter(r => r.action === 'known_directly' || r.action === 'follow_read').length,
      reviewCount: dayRecords.filter(r => r.action === 'review_known' || r.action === 'review_unknown').length,
    });
  }
  return result;
}

export function getAdvice(): string[] {
  const stats = getStats();
  const advice: string[] = [];
  if (stats.learning > 20) {
    advice.push('💡 当前有较多字在学习中，建议优先完成复习再学新字');
  }
  if (stats.currentLevel === 'low' && stats.lowDone < stats.lowTotal) {
    advice.push('📚 继续稳定推进低难度字的学习，打好基础');
  }
  if (stats.currentLevel === 'medium') {
    advice.push('🚀 已进入中难度阶段，孩子识字能力正在快速提升！');
  }
  if (stats.currentLevel === 'high') {
    advice.push('🌟 已进入高难度阶段，孩子识字进步非常明显！');
  }
  if (stats.literacyCount > 0 && stats.literacyCount < 50) {
    advice.push('🌱 坚持每天学习，量变引起质变');
  }
  if (stats.literacyCount >= 100) {
    advice.push('🎉 已认识超过100字，继续保持！');
  }
  if (advice.length === 0) {
    advice.push('✨ 开始今天的学习之旅吧！');
  }
  return advice;
}

// ===== Today's browsable characters =====
// Get characters that were follow_read today (for "今日跟读" browse)
export function getTodayFollowReadCharacters(): CharacterEntry[] {
  const records = getRecords();
  const todayStr = today();
  const todayFollowReadIds = records
    .filter(r => r.date === todayStr && r.action === 'follow_read')
    .map(r => r.characterId);
  // Deduplicate
  const uniqueIds = [...new Set(todayFollowReadIds)];
  return uniqueIds
    .map(id => getCharacterById(id))
    .filter(Boolean) as CharacterEntry[];
}

// Get characters that were reviewed today (for "已复习" browse)
export function getTodayReviewedCharacters(): CharacterEntry[] {
  const records = getRecords();
  const todayStr = today();
  const todayReviewedIds = records
    .filter(r => r.date === todayStr && (r.action === 'review_known' || r.action === 'review_unknown'))
    .map(r => r.characterId);
  // Deduplicate
  const uniqueIds = [...new Set(todayReviewedIds)];
  return uniqueIds
    .map(id => getCharacterById(id))
    .filter(Boolean) as CharacterEntry[];
}

// ===== Reset (for testing) =====
export function resetAllData() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('literacy_'));
  keys.forEach(k => localStorage.removeItem(k));
}
