const TAG_LENGTH = 30;
const TAG_COUNT = 10;

export const FIELD_LIMITS = {
  familyName: 100,
  fullName: 100,
  nickname: 50,
  place: 150,
  notes: 2000,
  tag: TAG_LENGTH,
  tagCount: TAG_COUNT,
  // Ten full-length labels with a comma and a space between each pair.
  tagInput: TAG_COUNT * TAG_LENGTH + (TAG_COUNT - 1) * 2,
  search: 100,
} as const;
