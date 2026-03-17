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
  users: 'literacy_users',
  currentUser: 'literacy_current_user',
  children: 'literacy_children',
  charStatuses: 'literacy_char_statuses',
  learningRecords: 'literacy_learning_records',
  earnedMedals: 'literacy_earned_medals',
  todaySession: 'literacy_today_session',
};

const TOKEN_KEY = 'literacy_token';

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

// ===== LocalStorage Helpers =====
function getLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function setLS(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ===== Date Helpers (Local Timezone) =====
function today(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function genId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// ===== Cloud Sync =====
function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function collectCloudData() {
  const child = getChild();
  const childKey = getChildKey();
  return {
    child,
    charStatuses: getLS<CharacterStatus[]>(`${KEYS.charStatuses}_${childKey}`, []),
    learningRecords: getLS<LearningRecord[]>(`${KEYS.learningRecords}_${childKey}`, []),
    earnedMedals: getLS<EarnedMedal[]>(`${KEYS.earnedMedals}_${childKey}`, []),
  };
}

function syncToCloud() {
  const token = getToken();
  if (!token) return;
  const data = collectCloudData();
  fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ data }),
  }).catch(e => console.warn('Cloud sync failed:', e));
}

async function pullFromCloud(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/data', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.ok && json.data && json.data.child) {
      const { child, charStatuses, learningRecords, earnedMedals } = json.data;

      if (child) {
        // Set child in children array
        const user = getCurrentUser();
        if (user) {
          const children = getLS<ChildData[]>(KEYS.children, []);
          const idx = children.findIndex((c: ChildData) => c.userId === user.userId);
          if (idx >= 0) children[idx] = child;
          else children.push(child);
          setLS(KEYS.children, children);
        }

        // Set data keyed by childId
        const childId = child.childId;
        if (charStatuses) setLS(`${KEYS.charStatuses}_${childId}`, charStatuses);
        if (learningRecords) setLS(`${KEYS.learningRecords}_${childId}`, learningRecords);
        if (earnedMedals) setLS(`${KEYS.earnedMedals}_${childId}`, earnedMedals);
      }
      return true;
    }
  } catch (e) {
    console.warn('Cloud pull failed:', e);
  }
  return false;
}

// Called on app startup to sync cloud → local
export async function syncOnStartup(): Promise<void> {
  const token = getToken();
  if (!token) return;
  await pullFromCloud();
}

// ===== Auth (Async with server) =====
export function getUsers(): UserData[] {
  return getLS<UserData[]>(KEYS.users, []);
}

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
      setToken(json.token);
      const user: UserData = { userId: json.userId, phone, password, createdAt: new Date().toISOString() };
      // Cache user locally
      const users = getLS<UserData[]>(KEYS.users, []);
      if (!users.find((u: UserData) => u.userId === json.userId)) users.push(user);
      setLS(KEYS.users, users);
      setLS(KEYS.currentUser, user);
    }
    return { ok: json.ok, msg: json.msg };
  } catch {
    // Fallback to local-only mode
    return registerLocal(phone, password);
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
      setToken(json.token);
      const user: UserData = { userId: json.userId, phone, password, createdAt: new Date().toISOString() };
      const users = getLS<UserData[]>(KEYS.users, []);
      const existingIdx = users.findIndex((u: UserData) => u.userId === json.userId);
      if (existingIdx >= 0) users[existingIdx] = user;
      else users.push(user);
      setLS(KEYS.users, users);
      setLS(KEYS.currentUser, user);

      // Pull cloud data to populate localStorage
      await pullFromCloud();
    }
    return { ok: json.ok, msg: json.msg };
  } catch {
    // Fallback to local-only mode
    return loginLocal(phone, password);
  }
}

// Local-only fallbacks (used when server is unreachable)
function registerLocal(phone: string, password: string): { ok: boolean; msg: string } {
  const users = getUsers();
  if (users.find(u => u.phone === phone)) return { ok: false, msg: '该手机号已注册' };
  const user: UserData = { userId: genId(), phone, password, createdAt: new Date().toISOString() };
  users.push(user);
  setLS(KEYS.users, users);
  setLS(KEYS.currentUser, user);
  return { ok: true, msg: '注册成功（离线模式）' };
}

function loginLocal(phone: string, password: string): { ok: boolean; msg: string } {
  const users = getUsers();
  const user = users.find(u => u.phone === phone && u.password === password);
  if (!user) return { ok: false, msg: '手机号或密码错误' };
  setLS(KEYS.currentUser, user);
  return { ok: true, msg: '登录成功（离线模式）' };
}

export function logout() {
  localStorage.removeItem(KEYS.currentUser);
  setToken(null);
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
  syncToCloud();
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
  syncToCloud();
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
  syncToCloud();
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
