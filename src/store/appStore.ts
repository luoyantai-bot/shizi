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

// ===== Percentile Simulation =====
export interface PercentileResult {
  ageMonths: number;       // child's current age in months
  ageLabel: string;        // e.g. "4岁3个月"
  percentile: number;      // e.g. 70
  percentileLabel: string; // e.g. "P70"
  description: string;     // e.g. "超过同龄参考水平的 70% 小朋友"
  referenceMedian: number; // the median literacy count for this age
  level: 'below' | 'average' | 'above' | 'excellent'; // for styling
}

// Age-based reference standards (monthly granularity via interpolation)
// These are the anchor points; we linearly interpolate between them
const AGE_REFERENCE_ANCHORS = [
  { months: 24, median: 10,   p25: 0,    p75: 25,   p90: 50   }, // 2岁
  { months: 30, median: 25,   p25: 5,    p75: 50,   p90: 80   }, // 2.5岁
  { months: 36, median: 50,   p25: 15,   p75: 100,  p90: 150  }, // 3岁
  { months: 42, median: 100,  p25: 40,   p75: 180,  p90: 280  }, // 3.5岁
  { months: 48, median: 200,  p25: 80,   p75: 350,  p90: 500  }, // 4岁
  { months: 54, median: 350,  p25: 150,  p75: 500,  p90: 700  }, // 4.5岁
  { months: 60, median: 600,  p25: 300,  p75: 800,  p90: 1000 }, // 5岁
  { months: 66, median: 750,  p25: 450,  p75: 950,  p90: 1200 }, // 5.5岁
  { months: 72, median: 1000, p25: 600,  p75: 1200, p90: 1500 }, // 6岁
  { months: 78, median: 1200, p25: 800,  p75: 1500, p90: 1800 }, // 6.5岁
  { months: 84, median: 1500, p25: 1000, p75: 1800, p90: 2200 }, // 7岁
];

function interpolateRef(ageMonths: number): { median: number; p25: number; p75: number; p90: number } {
  // Clamp to range
  if (ageMonths <= AGE_REFERENCE_ANCHORS[0].months) {
    const a = AGE_REFERENCE_ANCHORS[0];
    return { median: a.median, p25: a.p25, p75: a.p75, p90: a.p90 };
  }
  const last = AGE_REFERENCE_ANCHORS[AGE_REFERENCE_ANCHORS.length - 1];
  if (ageMonths >= last.months) {
    return { median: last.median, p25: last.p25, p75: last.p75, p90: last.p90 };
  }
  // Find bracketing anchors
  for (let i = 0; i < AGE_REFERENCE_ANCHORS.length - 1; i++) {
    const a = AGE_REFERENCE_ANCHORS[i];
    const b = AGE_REFERENCE_ANCHORS[i + 1];
    if (ageMonths >= a.months && ageMonths <= b.months) {
      const t = (ageMonths - a.months) / (b.months - a.months);
      return {
        median: Math.round(a.median + t * (b.median - a.median)),
        p25: Math.round(a.p25 + t * (b.p25 - a.p25)),
        p75: Math.round(a.p75 + t * (b.p75 - a.p75)),
        p90: Math.round(a.p90 + t * (b.p90 - a.p90)),
      };
    }
  }
  return { median: last.median, p25: last.p25, p75: last.p75, p90: last.p90 };
}

export function getPercentile(): PercentileResult | null {
  const child = getChild();
  if (!child) return null;

  const now = new Date();
  const ageMonths = (now.getFullYear() - child.birthYear) * 12 + (now.getMonth() + 1 - child.birthMonth);

  if (ageMonths < 18 || ageMonths > 96) return null; // out of reasonable range

  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  const ageLabel = months > 0 ? `${years}岁${months}个月` : `${years}岁`;

  const stats = getStats();
  const count = stats.literacyCount;
  const ref = interpolateRef(ageMonths);

  // Calculate simulated percentile
  let percentile: number;
  let level: 'below' | 'average' | 'above' | 'excellent';

  if (count <= 0) {
    percentile = 10;
    level = 'below';
  } else if (count < ref.p25) {
    // Below P25: map [0, p25) -> [10, 25)
    const ratio = ref.p25 > 0 ? count / ref.p25 : 0;
    percentile = Math.round(10 + ratio * 15);
    level = 'below';
  } else if (count < ref.median) {
    // Between P25 and P50: map [p25, median) -> [25, 50)
    const range = ref.median - ref.p25;
    const ratio = range > 0 ? (count - ref.p25) / range : 0;
    percentile = Math.round(25 + ratio * 25);
    level = 'average';
  } else if (count < ref.p75) {
    // Between P50 and P75: map [median, p75) -> [50, 75)
    const range = ref.p75 - ref.median;
    const ratio = range > 0 ? (count - ref.median) / range : 0;
    percentile = Math.round(50 + ratio * 25);
    level = 'above';
  } else if (count < ref.p90) {
    // Between P75 and P90: map [p75, p90) -> [75, 90)
    const range = ref.p90 - ref.p75;
    const ratio = range > 0 ? (count - ref.p75) / range : 0;
    percentile = Math.round(75 + ratio * 15);
    level = 'above';
  } else {
    // Above P90: map [p90, p90*1.5) -> [90, 99)
    const ceiling = ref.p90 * 1.5;
    const ratio = ceiling > ref.p90 ? Math.min((count - ref.p90) / (ceiling - ref.p90), 1) : 1;
    percentile = Math.round(90 + ratio * 9);
    level = 'excellent';
  }

  percentile = Math.max(5, Math.min(99, percentile));

  let description: string;
  if (percentile >= 90) {
    description = `超过同龄参考水平的 ${percentile}% 小朋友，非常优秀！`;
  } else if (percentile >= 70) {
    description = `超过同龄参考水平的 ${percentile}% 小朋友，表现很棒！`;
  } else if (percentile >= 50) {
    description = `超过同龄参考水平的 ${percentile}% 小朋友，继续加油！`;
  } else if (percentile >= 30) {
    description = `接近同龄参考水平，坚持每天学习很快就能赶上！`;
  } else {
    description = `刚刚开始识字之旅，每天进步一点点就很棒！`;
  }

  return {
    ageMonths,
    ageLabel,
    percentile,
    percentileLabel: `P${percentile}`,
    description,
    referenceMedian: ref.median,
    level,
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

// ===== Reset (for testing) =====
export function resetAllData() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('literacy_'));
  keys.forEach(k => localStorage.removeItem(k));
}
