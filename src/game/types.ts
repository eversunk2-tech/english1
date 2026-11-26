// 게임 공통 타입.
import type { StageConfig } from '../config.ts';

/** 문항의 학년군. 'vh'는 Very Hard 전용 문항(spec 16.4, v4) */
export type Band = '3-4' | '5-6' | 'vh';
export type BandChoice = '3-4' | '5-6' | 'all';

export const TOPICS = [
  'animal',
  'food',
  'body',
  'people',
  'school',
  'home',
  'clothes',
  'nature',
  'place',
  'transport',
  'music',
  'sports',
  'time',
  'feeling',
  'action',
] as const;
export type Topic = (typeof TOPICS)[number];

/** spec 7.3 문항 한 개 */
export interface Question {
  id: string;
  word: string;
  band: Band;
  topic: Topic;
  ko: string;
  clue: string;
  avoid: string[];
  base: string | null;
}

export interface QuestionsFile {
  version: number;
  source: string;
  questions: Question[];
}

/** 한 문제의 계획: 정답 + 카드로 나올 단어들(정답 포함) + 단계 + 카드별 출발 지연 */
export interface QuestionPlan {
  answer: Question;
  options: Question[];
  stage: StageConfig;
  delaysMs: number[];
  /** 이 문제의 실제 떨어지는 시간(ms) = max(단계 값, 공정성 바닥) (spec 5.3.3) */
  fallMs: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Viewport {
  W: number;
  H: number;
}
