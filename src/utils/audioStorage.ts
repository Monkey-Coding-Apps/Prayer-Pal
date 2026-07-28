// Mapping of prayer IDs and text snippets to stored static MP3 audio files in /public/audio/

export interface StoredAudioMap {
  id: string;
  url: string;
}

export const STORED_PRAYER_AUDIO: Record<string, string> = {
  sign_of_cross: '/audio/sign_of_cross.mp3',
  apostles_creed: '/audio/apostles_creed.mp3',
  our_father: '/audio/our_father.mp3',
  hail_mary: '/audio/hail_mary.mp3',
  glory_be: '/audio/glory_be.mp3',
  o_my_jesus: '/audio/o_my_jesus.mp3',
  hail_holy_queen: '/audio/hail_holy_queen.mp3',
  concluding_prayer: '/audio/concluding_prayer.mp3',
  st_michael: '/audio/st_michael.mp3',
  memorare: '/audio/memorare.mp3',
  jesus_prayer: '/audio/jesus_prayer.mp3',

  // Joyful
  joyful_1: '/audio/joyful_1.mp3',
  joyful_2: '/audio/joyful_2.mp3',
  joyful_3: '/audio/joyful_3.mp3',
  joyful_4: '/audio/joyful_4.mp3',
  joyful_5: '/audio/joyful_5.mp3',

  // Luminous
  luminous_1: '/audio/luminous_1.mp3',
  luminous_2: '/audio/luminous_2.mp3',
  luminous_3: '/audio/luminous_3.mp3',
  luminous_4: '/audio/luminous_4.mp3',
  luminous_5: '/audio/luminous_5.mp3',

  // Sorrowful
  sorrowful_1: '/audio/sorrowful_1.mp3',
  sorrowful_2: '/audio/sorrowful_2.mp3',
  sorrowful_3: '/audio/sorrowful_3.mp3',
  sorrowful_4: '/audio/sorrowful_4.mp3',
  sorrowful_5: '/audio/sorrowful_5.mp3',

  // Glorious
  glorious_1: '/audio/glorious_1.mp3',
  glorious_2: '/audio/glorious_2.mp3',
  glorious_3: '/audio/glorious_3.mp3',
  glorious_4: '/audio/glorious_4.mp3',
  glorious_5: '/audio/glorious_5.mp3',
};

/**
 * Finds matching stored MP3 URL by prayer ID or text fuzzy matching
 */
export function getStoredAudioUrl(textOrId: string): string | null {
  if (!textOrId) return null;

  const clean = textOrId.toLowerCase().trim();

  // Direct ID check
  if (STORED_PRAYER_AUDIO[clean]) {
    return STORED_PRAYER_AUDIO[clean];
  }

  // Text content fuzzy matching
  if (clean.includes('in the name of the father')) return STORED_PRAYER_AUDIO.sign_of_cross;
  if (clean.includes('i believe in god') || clean.includes('apostles')) return STORED_PRAYER_AUDIO.apostles_creed;
  if (clean.includes('our father, who art in heaven')) return STORED_PRAYER_AUDIO.our_father;
  if (clean.includes('hail mary, full of grace')) return STORED_PRAYER_AUDIO.hail_mary;
  if (clean.includes('glory be to the father')) return STORED_PRAYER_AUDIO.glory_be;
  if (clean.includes('o my jesus, forgive us')) return STORED_PRAYER_AUDIO.o_my_jesus;
  if (clean.includes('hail, holy queen, mother of mercy') || clean.includes('salve regina')) return STORED_PRAYER_AUDIO.hail_holy_queen;
  if (clean.includes('o god, whose only begotten son')) return STORED_PRAYER_AUDIO.concluding_prayer;
  if (clean.includes('saint michael the archangel')) return STORED_PRAYER_AUDIO.st_michael;
  if (clean.includes('remember, o most gracious virgin mary') || clean.includes('memorare')) return STORED_PRAYER_AUDIO.memorare;
  if (clean.includes('lord jesus christ, son of god')) return STORED_PRAYER_AUDIO.jesus_prayer;

  // Mystery announcements
  if (clean.includes('annunciation')) return STORED_PRAYER_AUDIO.joyful_1;
  if (clean.includes('visitation')) return STORED_PRAYER_AUDIO.joyful_2;
  if (clean.includes('nativity of our lord')) return STORED_PRAYER_AUDIO.joyful_3;
  if (clean.includes('presentation in the temple')) return STORED_PRAYER_AUDIO.joyful_4;
  if (clean.includes('finding of jesus')) return STORED_PRAYER_AUDIO.joyful_5;

  if (clean.includes('baptism of jesus')) return STORED_PRAYER_AUDIO.luminous_1;
  if (clean.includes('wedding at cana')) return STORED_PRAYER_AUDIO.luminous_2;
  if (clean.includes('proclamation of the kingdom')) return STORED_PRAYER_AUDIO.luminous_3;
  if (clean.includes('transfiguration')) return STORED_PRAYER_AUDIO.luminous_4;
  if (clean.includes('institution of the eucharist')) return STORED_PRAYER_AUDIO.luminous_5;

  if (clean.includes('agony in the garden')) return STORED_PRAYER_AUDIO.sorrowful_1;
  if (clean.includes('scourging at the pillar')) return STORED_PRAYER_AUDIO.sorrowful_2;
  if (clean.includes('crowning with thorns')) return STORED_PRAYER_AUDIO.sorrowful_3;
  if (clean.includes('carrying of the cross')) return STORED_PRAYER_AUDIO.sorrowful_4;
  if (clean.includes('crucifixion and death')) return STORED_PRAYER_AUDIO.sorrowful_5;

  if (clean.includes('resurrection')) return STORED_PRAYER_AUDIO.glorious_1;
  if (clean.includes('ascension')) return STORED_PRAYER_AUDIO.glorious_2;
  if (clean.includes('descent of the holy spirit')) return STORED_PRAYER_AUDIO.glorious_3;
  if (clean.includes('assumption of mary')) return STORED_PRAYER_AUDIO.glorious_4;
  if (clean.includes('coronation of mary')) return STORED_PRAYER_AUDIO.glorious_5;

  return null;
}
