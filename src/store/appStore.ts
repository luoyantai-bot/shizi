import { characters, getCharactersByLevel, getCharacterById, type CharacterEntry } from '../data/characters';
// ===== Types =====
export interface UserData {
  userId: string;
  phone: string;
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
  literacyCount: number;
  lowTotal: number;
  lowDone: number;
  mediumTotal: number;
  mediumDone: number;
  highTotal: number;
  highDone: number;
  currentLevel: 'low' | 'medium' | 'high';
  todayNewCount: number;
  todayKnownDirectlyCount: number;
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
  currentUser: 'literacy_current_user',
  token: 'literacy_token',
  children: 'literacy_children',
  charStatuses: 'literacy_char_statuses',
  learningRecords: 'literacy_learning_records',
  earnedMedals: 'literacy_earned_medals',
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
// ===== localStorage helpers =====
function getLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function setLS(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}
// ===== Time helpers (local timezone) =====
function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function genId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
// ===== Server Sync =====
function getToken(): string | null {
  return localStorage.getItem(KEYS.token);
}
function exportData(): object {
  const children = getLS<ChildData[]>(KEYS.children, []);
  const childData: Record<string, object> = {};
  for (const child of children) {
    childData[child.childId] = {
      charStatuses: getLS(`${KEYS.charStatuses}_${child.childId}`, []),
      learningRecords: getLS(`${KEYS.learningRecords}_${child.childId}`, []),
      earnedMedals: getLS(`${KEYS.earnedMedals}_${child.childId}`, []),
    };
  }
  return { children, childData };
}
function importData(data: Record<string, unknown>) {
  if (!data || typeof data !== 'object') return;
  const d = data as { children?: ChildData[]; childData?: Record<string, { charStatuses?: CharacterStatus[]; learningRecords?: LearningRecord[]; earnedMedals?: EarnedMedal[] }> };
  if (Array.isArray(d.children)) {
    setLS(KEYS.children, d.children);
    if (d.childData && typeof d.childData === 'object') {
      for (const child of d.children) {
        const cd = d.childData[child.childId];
        if (cd) {
          if (cd.charStatuses) setLS(`${KEYS.charStatuses}_${child.childId}`, cd.charStatuses);
          if (cd.learningRecords) setLS(`${KEYS.learningRecords}_${child.childId}`, cd.learningRecords);
          if (cd.earnedMedals) setLS(`${KEYS.earnedMedals}_${child.childId}`, cd.earnedMedals);
        }
      }
    }
  }
}
let syncTimer: ReturnType<typeof setTimeout> | null = null;
function syncToServer() {
  const token = getToken();
  if (!token) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      await fetch('/api/sync/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, data: exportData() }),
      });
    } catch (e) {
      console.warn('Sync to server failed:', e);
    }
  }, 500);
}
export async function loadFromServer(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`/api/sync/download?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      // Token invalid, clear local auth
      clearLocalData();
      return false;
    }
    const json = await res.json();
    if (json.ok && json.data) {
      importData(json.data as Record<string, unknown>);
      return true;
    }
    return false;
  } catch {
    // Server not available, keep using local data
    return !!getCurrentUser();
  }
}
// ===== Auth =====
export function getCurrentUser(): UserData | null {
  return getLS<UserData | null>(KEYS.currentUser, null);
}
export async function register(phone: string, password: string): Promise<{ ok: boolean; msg: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    const json = await res.json();
    if (json.ok) {
      const user: UserData = { userId: json.userId, phone, createdAt: new Date().toISOString() };
      setLS(KEYS.currentUser, user);
      localStorage.setItem(KEYS.token, json.token);
      return { ok: true, msg: '注册成功' };
    }
    return { ok: false, msg: json.msg || '注册失败' };
  } catch {
    return { ok: false, msg: '网络错误，请检查连接' };
  }
}
export async function login(phone: string, password: string): Promise<{ ok: boolean; msg: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    const json = await res.json();
    if (json.ok) {
      // Clear old local data, then import from server
      clearLocalData();
      const user: UserData = { userId: json.userId, phone, createdAt: new Date().toISOString() };
      setLS(KEYS.currentUser, user);
      localStorage.setItem(KEYS.token, json.token);
      if (json.data) importData(json.data as Record<string, unknown>);
      return { ok: true, msg: '登录成功' };
    }
    return { ok: false, msg: json.msg || '登录失败' };
  } catch {
    return { ok: false, msg: '网络错误，请检查连接' };
  }
}
function clearLocalData() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('literacy_'));
  keys.forEach(k => localStorage.removeItem(k));
}
export function logout() {
  clearLocalData();
}
// ===== Child =====
function getChildKey(): string {
  const child = getChild();
  return child ? child.childId : 'default';
}
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
  syncToServer();
  return child;
}
// ===== Character Status =====
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
export function hasNewCharactersAvailable(): boolean {
  const stats = getStats();
  if (stats.todayNewCount >= 5) return false;
  return getNextNewCharacter() !== null;
}
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
export function getTodayNewCharacters(): CharacterEntry[] {
  const stats = getStats();
  if (stats.todayNewCount >= 5) return [];
  const all = getAllStatuses();
  const learnedIds = new Set(all.map(s => s.characterId));
  const levels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
  const startIdx = levels.indexOf(stats.currentLevel);
  const result: CharacterEntry[] = [];
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
  syncToServer();
}
// ===== Today's review characters (pending) =====
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
  syncToServer();
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
  if (newMedals.length > 0) {
    setEarnedMedals(earned);
    syncToServer();
  }
  return newMedals;
}
export function getMedals(): { def: MedalDef; earned: EarnedMedal | null }[] {
  const earned = getEarnedMedals();
  return MEDAL_DEFS.map(def => ({
    def,
    earned: earned.find(e => e.medalId === def.id) || null,
  }));
}
// ===== Browse: today's learned & reviewed characters =====
export function getTodayLearnedCharacters(): CharacterEntry[] {
  const records = getRecords();
  const todayStr = today();
  const todayNew = records.filter(
    r => r.date === todayStr && (r.action === 'follow_read' || r.action === 'known_directly')
  );
  const charIds = [...new Set(todayNew.map(r => r.characterId))];
  return charIds.map(id => getCharacterById(id)).filter(Boolean) as CharacterEntry[];
}
// Get characters that were follow_read today (for browsing after learning)
export function getTodayFollowReadCharacters(): CharacterEntry[] {
  const records = getRecords();
  const todayStr = today();
  const todayFollowReads = records.filter(r => r.date === todayStr && r.action === 'follow_read');
  const charIds = [...new Set(todayFollowReads.map(r => r.characterId))];
  return charIds
    .map(id => getCharacterById(id))
    .filter(Boolean) as CharacterEntry[];
}
export function getTodayReviewedCharacters(): CharacterEntry[] {
  const records = getRecords();
  const todayStr = today();
  const todayReview = records.filter(
    r => r.date === todayStr && (r.action === 'review_known' || r.action === 'review_unknown')
  );
  const charIds = [...new Set(todayReview.map(r => r.characterId))];
  return charIds.map(id => getCharacterById(id)).filter(Boolean) as CharacterEntry[];
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
// ===== Reset =====
export function resetAllData() {
  clearLocalData();
}
