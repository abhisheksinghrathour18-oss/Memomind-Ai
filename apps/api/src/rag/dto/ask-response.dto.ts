import { RagAskResponse, RagSourceCitation } from '@memomind/shared';

export class RagSourceCitationDto implements RagSourceCitation {
  entryId!: string;
  title!: string;
  createdAt!: string;
  excerpt!: string;
}

export class RagAskResponseDto implements RagAskResponse {
  answer!: string;
  sources!: RagSourceCitationDto[];
}

