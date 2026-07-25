import { MysterySet, MysteryType, Prayer, PrayerId } from '../types';

export const PRAYERS: Record<PrayerId, Prayer> = {
  sign_of_cross: {
    id: 'sign_of_cross',
    title: 'Sign of the Cross',
    text: 'In the name of the Father, and of the Son, and of the Holy Spirit. Amen.',
    latinText: 'In nómine Patris, et Fílii, et Spíritus Sancti. Amen.',
    category: 'Essential',
    description: 'The fundamental opening and closing blessing of Catholic prayer.',
  },
  apostles_creed: {
    id: 'apostles_creed',
    title: "Apostles' Creed",
    text: "I believe in God, the Father Almighty, Creator of heaven and earth, and in Jesus Christ, His only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died and was buried; He descended into hell; on the third day He rose again from the dead; He ascended into heaven, and is seated at the right hand of God the Father Almighty; from there He will come to judge the living and the dead. I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.",
    latinText: 'Credo in Deum Patrem omnipoténtem, Creatórem cæli et terræ...',
    category: 'Essential',
    description: 'A summary of the core Christian faith handed down from the Apostles.',
  },
  our_father: {
    id: 'our_father',
    title: 'Our Father (Lord\'s Prayer)',
    text: 'Our Father, who art in heaven, hallowed be Thy name; Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.',
    latinText: 'Pater noster, qui es in cælis, sanctificétur nomen tuum...',
    category: 'Essential',
    description: 'The prayer taught by Jesus Christ Himself in the Gospels.',
  },
  hail_mary: {
    id: 'hail_mary',
    title: 'Hail Mary',
    text: 'Hail Mary, full of grace, the Lord is with thee. Blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.',
    latinText: 'Ave María, grátia plena, Dóminus tecum...',
    category: 'Rosary',
    description: 'Scriptural salutation to the Blessed Virgin Mary.',
  },
  glory_be: {
    id: 'glory_be',
    title: 'Glory Be (Doxology)',
    text: 'Glory be to the Father, and to the Son, and to the Holy Spirit, as it was in the beginning, is now, and ever shall be, world without end. Amen.',
    latinText: 'Glória Patri, et Fílio, et Spíritui Sancto...',
    category: 'Rosary',
    description: 'An ancient prayer praising the Most Holy Trinity.',
  },
  o_my_jesus: {
    id: 'o_my_jesus',
    title: 'O My Jesus (Fatima Prayer)',
    text: 'O my Jesus, forgive us our sins, save us from the fires of hell, lead all souls to Heaven, especially those most in need of Thy mercy. Amen.',
    latinText: 'O mi Jesu, dimítte nobis débita nostra...',
    category: 'Rosary',
    description: 'The prayer taught by Our Lady at Fátima in 1917.',
  },
  jesus_prayer: {
    id: 'jesus_prayer',
    title: 'The Jesus Prayer',
    text: 'Lord Jesus Christ, Son of God, have mercy on me, a sinner.',
    category: 'Devotional',
    description: 'An ancient contemplative prayer of Eastern and Western tradition.',
  },
  hail_holy_queen: {
    id: 'hail_holy_queen',
    title: 'Hail, Holy Queen (Salve Regina)',
    text: 'Hail, Holy Queen, Mother of Mercy, our life, our sweetness and our hope. To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us, and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary. Pray for us, O Holy Mother of God, that we may be made worthy of the promises of Christ. Amen.',
    latinText: 'Salve, Regína, Mater misericórdiæ...',
    category: 'Marian',
    description: 'Traditional Marian antiphon recited at the close of the Rosary.',
  },
  concluding_prayer: {
    id: 'concluding_prayer',
    title: 'Concluding Rosary Prayer',
    text: 'O God, whose only begotten Son, by His life, death, and resurrection, has purchased for us the rewards of eternal life, grant, we beseech Thee, that meditating upon these mysteries of the Most Holy Rosary of the Blessed Virgin Mary, we may imitate what they contain and obtain what they promise, through the same Christ our Lord. Amen.',
    category: 'Rosary',
    description: 'Final petition asking for the fruits of Rosary meditation.',
  },
  st_michael: {
    id: 'st_michael',
    title: 'St. Michael the Archangel',
    text: 'Saint Michael the Archangel, defend us in battle. Be our protection against the wickedness and snares of the devil. May God rebuke him, we humbly pray; and do thou, O Prince of the Heavenly Host, by the power of God, cast into hell Satan and all evil spirits who prowl about the world seeking the ruin of souls. Amen.',
    category: 'Devotional',
    description: 'Prayer for spiritual protection composed by Pope Leo XIII.',
  },
  memorare: {
    id: 'memorare',
    title: 'The Memorare',
    text: 'Remember, O most gracious Virgin Mary, that never was it known that anyone who fled to thy protection, implored thy help, or sought thine intercession was left unaided. Inspired by this confidence, I fly unto thee, O Virgin of virgins, my Mother; to thee do I come, before thee I stand, sinful and sorrowful. O Mother of the Word Incarnate, despise not my petitions, but in thy mercy hear and answer me. Amen.',
    category: 'Marian',
    description: 'Traditional prayer of confidence in the Virgin Mary attributed to St. Bernard.',
  },
};

export const MYSTERY_SETS: Record<MysteryType, MysterySet> = {
  joyful: {
    type: 'joyful',
    title: 'The Joyful Mysteries',
    days: 'Mondays & Saturdays',
    decades: [
      {
        number: 1,
        title: 'The Annunciation',
        fruit: 'Humility',
        scriptureRef: 'Luke 1:26-38',
        meditation: 'The Angel Gabriel announces to Mary that she will conceive the Son of God by the Holy Spirit.',
      },
      {
        number: 2,
        title: 'The Visitation',
        fruit: 'Love of Neighbor',
        scriptureRef: 'Luke 1:39-56',
        meditation: 'Mary visits her cousin Elizabeth, who is carrying John the Baptist in her womb.',
      },
      {
        number: 3,
        title: 'The Nativity of Our Lord',
        fruit: 'Poverty of Spirit',
        scriptureRef: 'Luke 2:1-20',
        meditation: 'Jesus Christ is born in Bethlehem and laid in a manger.',
      },
      {
        number: 4,
        title: 'The Presentation in the Temple',
        fruit: 'Obedience & Purity',
        scriptureRef: 'Luke 2:22-38',
        meditation: 'Mary and Joseph present the Infant Jesus in the Temple according to the Law.',
      },
      {
        number: 5,
        title: 'The Finding of Jesus in the Temple',
        fruit: 'Joy in Finding Jesus',
        scriptureRef: 'Luke 2:41-52',
        meditation: 'After three days of searching, Mary and Joseph find young Jesus teaching the elders in the Temple.',
      },
    ],
  },
  luminous: {
    type: 'luminous',
    title: 'The Luminous Mysteries (Mysteries of Light)',
    days: 'Thursdays',
    decades: [
      {
        number: 1,
        title: 'The Baptism of Jesus in the Jordan',
        fruit: 'Openness to the Holy Spirit',
        scriptureRef: 'Matthew 3:13-17',
        meditation: 'The Heavens open and the voice of the Father proclaims Jesus as His Beloved Son.',
      },
      {
        number: 2,
        title: 'The Wedding at Cana',
        fruit: 'To Jesus Through Mary',
        scriptureRef: 'John 2:1-11',
        meditation: 'At Mary\'s request, Jesus performs His first miracle, changing water into wine.',
      },
      {
        number: 3,
        title: 'The Proclamation of the Kingdom',
        fruit: 'Repentance & Trust in God',
        scriptureRef: 'Mark 1:14-15',
        meditation: 'Jesus calls all people to conversion and announces the Gospel of the Kingdom.',
      },
      {
        number: 4,
        title: 'The Transfiguration',
        fruit: 'Desire for Holiness',
        scriptureRef: 'Matthew 17:1-8',
        meditation: 'Jesus reveals His Divine Glory on Mount Tabor before Peter, James, and John.',
      },
      {
        number: 5,
        title: 'The Institution of the Eucharist',
        fruit: 'Adoration & Gratitude',
        scriptureRef: 'Matthew 26:26-30',
        meditation: 'At the Last Supper, Jesus offers His Body and Blood under the species of bread and wine.',
      },
    ],
  },
  sorrowful: {
    type: 'sorrowful',
    title: 'The Sorrowful Mysteries',
    days: 'Tuesdays & Fridays',
    decades: [
      {
        number: 1,
        title: 'The Agony in the Garden',
        fruit: 'Contrition for Sin',
        scriptureRef: 'Matthew 26:36-46',
        meditation: 'Jesus prays in Gethsemane, sweating blood in submission to the Father\'s Will.',
      },
      {
        number: 2,
        title: 'The Scourging at the Pillar',
        fruit: 'Purity & Mortification',
        scriptureRef: 'Matthew 27:26',
        meditation: 'Jesus is brutally whipped and mocked at the command of Pontius Pilate.',
      },
      {
        number: 3,
        title: 'The Crowning with Thorns',
        fruit: 'Moral Courage',
        scriptureRef: 'Matthew 27:27-31',
        meditation: 'Soldiers weave a crown of sharp thorns and place it upon Our Lord\'s sacred head.',
      },
      {
        number: 4,
        title: 'The Carrying of the Cross',
        fruit: 'Patience in Suffering',
        scriptureRef: 'John 19:16-17',
        meditation: 'Jesus carries the heavy wooden cross through Jerusalem to Mount Calvary.',
      },
      {
        number: 5,
        title: 'The Crucifixion and Death of Our Lord',
        fruit: 'Salvation & Self-Giving',
        scriptureRef: 'Luke 23:33-46',
        meditation: 'Jesus is nailed to the cross and gives His life for the redemption of the world.',
      },
    ],
  },
  glorious: {
    type: 'glorious',
    title: 'The Glorious Mysteries',
    days: 'Wednesdays & Sundays',
    decades: [
      {
        number: 1,
        title: 'The Resurrection',
        fruit: 'Faith',
        scriptureRef: 'Mark 16:1-8',
        meditation: 'Jesus triumphs over sin and death, rising gloriously from the tomb on the third day.',
      },
      {
        number: 2,
        title: 'The Ascension into Heaven',
        fruit: 'Hope & Longing for Heaven',
        scriptureRef: 'Acts 1:6-11',
        meditation: 'Forty days after His Resurrection, Jesus ascends body and soul into Heaven.',
      },
      {
        number: 3,
        title: 'The Descent of the Holy Spirit',
        fruit: 'Love of God & Zeal',
        scriptureRef: 'Acts 2:1-4',
        meditation: 'The Holy Spirit descends in tongues of fire upon Mary and the Apostles at Pentecost.',
      },
      {
        number: 4,
        title: 'The Assumption of Mary',
        fruit: 'Grace of a Happy Death',
        scriptureRef: 'Revelation 12:1',
        meditation: 'At the end of her earthly life, the Blessed Mother is taken body and soul into Heavenly Glory.',
      },
      {
        number: 5,
        title: 'The Coronation of Mary',
        fruit: 'Final Perseverance',
        scriptureRef: 'Revelation 12:1',
        meditation: 'Mary is crowned by the Holy Trinity as Queen of Heaven and Earth.',
      },
    ],
  },
};

export function getRecommendedMysteryForToday(): MysteryType {
  const day = new Date().getDay(); // 0 = Sunday, 1 = Monday, ...
  switch (day) {
    case 1: // Monday
    case 6: // Saturday
      return 'joyful';
    case 2: // Tuesday
    case 5: // Friday
      return 'sorrowful';
    case 3: // Wednesday
    case 0: // Sunday
      return 'glorious';
    case 4: // Thursday
      return 'luminous';
    default:
      return 'joyful';
  }
}
