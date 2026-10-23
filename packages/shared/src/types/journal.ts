export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface JournalEntryContract {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

