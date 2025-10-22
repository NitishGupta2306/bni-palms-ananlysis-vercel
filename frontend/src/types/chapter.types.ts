/**
 * Type definitions for BNI Chapter data
 */

export interface ChapterData {
  chapterId: string;
  chapterName: string;
  location?: string;
  memberCount?: number;
  meeting_day?: string;
  meeting_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChapterFormData {
  name: string;
  location: string;
  meeting_day: string;
  meeting_time: string;
}
