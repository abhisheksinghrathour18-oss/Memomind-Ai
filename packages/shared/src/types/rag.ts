export interface RagSourceCitation {
  entryId: string;
  title: string;
  createdAt: string;
  excerpt: string;
}

export interface RagAskRequest {
  question: string;
}

export interface RagAskResponse {
  answer: string;
  sources: RagSourceCitation[];
}

