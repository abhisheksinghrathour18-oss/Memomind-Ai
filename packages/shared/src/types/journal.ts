export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type IndexingStatus = 'PENDING' | 'INDEXED' | 'FAILED';

export interface JournalEntryContract {
  id: string;
  title: string;
  content: string;
  userId: string;
  indexingStatus: IndexingStatus;
  indexingError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VectorChunkMetadata {
  id: string;
  journalEntryId: string;
  userId: string;
  chunkIndex: number;
  text: string;
  createdAt: string;
}

export interface PaginatedJournalsResponse {
  items: JournalEntryContract[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
