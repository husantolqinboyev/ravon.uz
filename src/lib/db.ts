import Dexie, { type EntityTable } from 'dexie';

// Analysis result interface
export interface AnalysisRecord {
  id?: number;
  telegramUserId?: string;
  audioBlob?: Blob;
  transcript?: string;
  analysis: string;
  createdAt: Date;
  duration: number; // audio duration in seconds
}

// User session interface
export interface UserSession {
  id?: number;
  telegramUserId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  authDate: Date;
}

// Create database
const db = new Dexie('RavonAIDatabase') as Dexie & {
  analyses: EntityTable<AnalysisRecord, 'id'>;
  sessions: EntityTable<UserSession, 'id'>;
};

// Schema
db.version(1).stores({
  analyses: '++id, telegramUserId, createdAt',
  sessions: '++id, telegramUserId'
});

export { db };

// Helper functions
export async function saveAnalysis(record: Omit<AnalysisRecord, 'id'>): Promise<number> {
  return await db.analyses.add(record as AnalysisRecord);
}

export async function getAnalyses(telegramUserId?: string, limit = 50): Promise<AnalysisRecord[]> {
  let query = db.analyses.orderBy('createdAt').reverse();
  
  if (telegramUserId) {
    return await db.analyses
      .where('telegramUserId')
      .equals(telegramUserId)
      .reverse()
      .limit(limit)
      .toArray();
  }
  
  return await query.limit(limit).toArray();
}

export async function deleteAnalysis(id: number): Promise<void> {
  await db.analyses.delete(id);
}

export async function clearAllAnalyses(): Promise<void> {
  await db.analyses.clear();
}

export async function saveSession(session: Omit<UserSession, 'id'>): Promise<number> {
  // Clear existing sessions first
  await db.sessions.clear();
  return await db.sessions.add(session as UserSession);
}

export async function getSession(): Promise<UserSession | undefined> {
  return await db.sessions.toCollection().first();
}

export async function clearSession(): Promise<void> {
  await db.sessions.clear();
}
