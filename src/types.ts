export type PrayerId =
  | 'sign_of_cross'
  | 'apostles_creed'
  | 'our_father'
  | 'hail_mary'
  | 'glory_be'
  | 'o_my_jesus'
  | 'jesus_prayer'
  | 'hail_holy_queen'
  | 'concluding_prayer'
  | 'st_michael'
  | 'memorare';

export interface Prayer {
  id: PrayerId;
  title: string;
  text: string;
  latinText?: string;
  category: 'Essential' | 'Rosary' | 'Devotional' | 'Marian';
  description?: string;
}

export type MysteryType = 'joyful' | 'luminous' | 'sorrowful' | 'glorious';

export interface MysteryDecade {
  number: number;
  title: string;
  fruit: string;
  scriptureRef?: string;
  meditation: string;
}

export interface MysterySet {
  type: MysteryType;
  title: string;
  days: string; // e.g. "Mondays & Saturdays"
  decades: MysteryDecade[];
}

export interface RosaryStep {
  id: string;
  prayerId: PrayerId;
  title: string;
  subTitle?: string;
  text: string;
  stepType: 'opening' | 'decade' | 'closing';
  decadeNumber?: number; // 1 to N
  totalDecades?: number;
  beadIndex?: number; // 1 to 10 for Hail Marys
  mysteryTitle?: string;
  mysteryFruit?: string;
  mysteryMeditation?: string;
  instruction?: string;
}

export interface RosaryConfig {
  decadeCount: 1 | 2 | 3 | 4 | 5;
  mysteryType: MysteryType;
  autoAdvance: boolean;
  speechRate: number; // 0.7 to 1.1
  voiceURI: string | null;
  isAudioMuted: boolean;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
}

export type AppMode = 'guided' | 'individual';
