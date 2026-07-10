import { STUDY_RESOURCES } from "./data";

export type StudyResource = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  url: string | null;
  content: string | null;
  sort_order: number;
};

export async function listStudyResources(): Promise<StudyResource[]> {
  return [...STUDY_RESOURCES].sort((a, b) => {
    const catCmp = a.category.localeCompare(b.category);
    if (catCmp !== 0) return catCmp;
    return a.sort_order - b.sort_order;
  });
}
