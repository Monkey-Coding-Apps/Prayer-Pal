import { MYSTERY_SETS, PRAYERS } from '../data/prayers';
import { MysteryType, RosaryStep } from '../types';

export function generateRosarySequence(
  decadeCount: 1 | 2 | 3 | 4 | 5,
  mysteryType: MysteryType
): RosaryStep[] {
  const steps: RosaryStep[] = [];
  const mysterySet = MYSTERY_SETS[mysteryType];
  let stepIdx = 1;

  const addStep = (stepData: Omit<RosaryStep, 'id'>) => {
    steps.push({
      ...stepData,
      id: `step-${stepIdx++}`,
    });
  };

  const isFullRosary = decadeCount === 5;

  // 1. OPENING SEQUENCE
  addStep({
    prayerId: 'sign_of_cross',
    title: PRAYERS.sign_of_cross.title,
    subTitle: 'Opening Blessing',
    text: PRAYERS.sign_of_cross.text,
    stepType: 'opening',
    instruction: 'In the name of the Father, and of the Son, and of the Holy Spirit.',
  });

  if (isFullRosary) {
    addStep({
      prayerId: 'apostles_creed',
      title: PRAYERS.apostles_creed.title,
      subTitle: 'Profession of Faith',
      text: PRAYERS.apostles_creed.text,
      stepType: 'opening',
      instruction: 'Holding the Crucifix, recite the Apostles\' Creed.',
    });

    addStep({
      prayerId: 'our_father',
      title: `${PRAYERS.our_father.title} (Introductory)`,
      subTitle: 'For the Intentions of the Holy Father',
      text: PRAYERS.our_father.text,
      stepType: 'opening',
      instruction: 'On the first large bead, pray the Our Father.',
    });

    addStep({
      prayerId: 'hail_mary',
      title: 'Hail Mary (1 of 3)',
      subTitle: 'Petition for an Increase in Faith',
      text: PRAYERS.hail_mary.text,
      stepType: 'opening',
      instruction: 'On the first small bead, pray for Faith.',
    });

    addStep({
      prayerId: 'hail_mary',
      title: 'Hail Mary (2 of 3)',
      subTitle: 'Petition for an Increase in Hope',
      text: PRAYERS.hail_mary.text,
      stepType: 'opening',
      instruction: 'On the second small bead, pray for Hope.',
    });

    addStep({
      prayerId: 'hail_mary',
      title: 'Hail Mary (3 of 3)',
      subTitle: 'Petition for an Increase in Charity',
      text: PRAYERS.hail_mary.text,
      stepType: 'opening',
      instruction: 'On the third small bead, pray for Charity.',
    });

    addStep({
      prayerId: 'glory_be',
      title: PRAYERS.glory_be.title,
      subTitle: 'Introductory Doxology',
      text: PRAYERS.glory_be.text,
      stepType: 'opening',
      instruction: 'Praise the Holy Trinity before beginning the decades.',
    });
  }

  // 2. DECADE LOOP (repeats decadeCount times)
  for (let d = 1; d <= decadeCount; d++) {
    const decadeInfo = mysterySet.decades[d - 1];

    // Decade Announcement & Our Father
    addStep({
      prayerId: 'our_father',
      title: `Decade ${d} of ${decadeCount}: ${decadeInfo.title}`,
      subTitle: `Fruit of the Mystery: ${decadeInfo.fruit}`,
      text: PRAYERS.our_father.text,
      stepType: 'decade',
      decadeNumber: d,
      totalDecades: decadeCount,
      mysteryTitle: decadeInfo.title,
      mysteryFruit: decadeInfo.fruit,
      mysteryMeditation: decadeInfo.meditation,
      instruction: `Announce the mystery and pray Our Father on the large bead. (${decadeInfo.meditation})`,
    });

    // 10 Hail Marys
    for (let b = 1; b <= 10; b++) {
      addStep({
        prayerId: 'hail_mary',
        title: `Hail Mary (${b} of 10)`,
        subTitle: `Decade ${d} of ${decadeCount} • ${decadeInfo.title}`,
        text: PRAYERS.hail_mary.text,
        stepType: 'decade',
        decadeNumber: d,
        totalDecades: decadeCount,
        beadIndex: b,
        mysteryTitle: decadeInfo.title,
        mysteryFruit: decadeInfo.fruit,
        mysteryMeditation: decadeInfo.meditation,
        instruction: `Bead ${b} of 10: Meditate on ${decadeInfo.title}.`,
      });
    }

    // Glory Be at end of decade
    addStep({
      prayerId: 'glory_be',
      title: `${PRAYERS.glory_be.title} (Decade ${d})`,
      subTitle: `Closing Decade ${d} of ${decadeCount}`,
      text: PRAYERS.glory_be.text,
      stepType: 'decade',
      decadeNumber: d,
      totalDecades: decadeCount,
      mysteryTitle: decadeInfo.title,
      instruction: 'Give glory to God for this decade.',
    });

    // Fatima Prayer (O My Jesus)
    addStep({
      prayerId: 'o_my_jesus',
      title: `${PRAYERS.o_my_jesus.title} (Decade ${d})`,
      subTitle: `Fatima Prayer • Decade ${d} of ${decadeCount}`,
      text: PRAYERS.o_my_jesus.text,
      stepType: 'decade',
      decadeNumber: d,
      totalDecades: decadeCount,
      mysteryTitle: decadeInfo.title,
      instruction: 'Pray the Fatima prayer for souls in purgatory.',
    });
  }

  // 3. CLOSING SEQUENCE
  addStep({
    prayerId: 'hail_holy_queen',
    title: PRAYERS.hail_holy_queen.title,
    subTitle: 'Marian Salutation',
    text: PRAYERS.hail_holy_queen.text,
    stepType: 'closing',
    instruction: 'Pray the Hail Holy Queen to conclude the Rosary.',
  });

  addStep({
    prayerId: 'concluding_prayer',
    title: PRAYERS.concluding_prayer.title,
    subTitle: 'Final Rosary Petition',
    text: PRAYERS.concluding_prayer.text,
    stepType: 'closing',
    instruction: 'Ask God that meditating on these mysteries may yield spiritual fruit.',
  });

  addStep({
    prayerId: 'sign_of_cross',
    title: `${PRAYERS.sign_of_cross.title} (Closing)`,
    subTitle: 'Final Blessing',
    text: PRAYERS.sign_of_cross.text,
    stepType: 'closing',
    instruction: 'Conclude with the Sign of the Cross. Amen.',
  });

  return steps;
}
