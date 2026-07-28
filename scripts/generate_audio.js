import fs from 'fs';
import path from 'path';
import http from 'http';

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

const ITEMS = [
  // Core Prayers
  {
    id: 'sign_of_cross',
    text: 'In the name of the Father, and of the Son, and of the Holy Spirit. Amen.',
  },
  {
    id: 'apostles_creed',
    text: 'I believe in God, the Father Almighty, Creator of heaven and earth, and in Jesus Christ, His only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died and was buried; He descended into hell; on the third day He rose again from the dead; He ascended into heaven, and is seated at the right hand of God the Father Almighty; from there He will come to judge the living and the dead. I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.',
  },
  {
    id: 'our_father',
    text: 'Our Father, who art in heaven, hallowed be Thy name; Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.',
  },
  {
    id: 'hail_mary',
    text: 'Hail Mary, full of grace, the Lord is with thee. Blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.',
  },
  {
    id: 'glory_be',
    text: 'Glory be to the Father, and to the Son, and to the Holy Spirit, as it was in the beginning, is now, and ever shall be, world without end. Amen.',
  },
  {
    id: 'o_my_jesus',
    text: 'O my Jesus, forgive us our sins, save us from the fires of hell, lead all souls to Heaven, especially those most in need of Thy mercy. Amen.',
  },
  {
    id: 'hail_holy_queen',
    text: 'Hail, Holy Queen, Mother of Mercy, our life, our sweetness and our hope. To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us, and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary. Pray for us, O Holy Mother of God, that we may be made worthy of the promises of Christ. Amen.',
  },
  {
    id: 'concluding_prayer',
    text: 'O God, whose only begotten Son, by His life, death, and resurrection, has purchased for us the rewards of eternal life, grant, we beseech Thee, that meditating upon these mysteries of the Most Holy Rosary of the Blessed Virgin Mary, we may imitate what they contain and obtain what they promise, through the same Christ our Lord. Amen.',
  },
  {
    id: 'st_michael',
    text: 'Saint Michael the Archangel, defend us in battle. Be our protection against the wickedness and snares of the devil. May God rebuke him, we humbly pray; and do thou, O Prince of the Heavenly Host, by the power of God, cast into hell Satan and all evil spirits who prowl about the world seeking the ruin of souls. Amen.',
  },
  {
    id: 'memorare',
    text: 'Remember, O most gracious Virgin Mary, that never was it known that anyone who fled to thy protection, implored thy help, or sought thine intercession was left unaided. Inspired by this confidence, I fly unto thee, O Virgin of virgins, my Mother; to thee do I come, before thee I stand, sinful and sorrowful. O Mother of the Word Incarnate, despise not my petitions, but in thy mercy hear and answer me. Amen.',
  },
  {
    id: 'jesus_prayer',
    text: 'Lord Jesus Christ, Son of God, have mercy on me, a sinner.',
  },

  // Joyful Mysteries
  {
    id: 'joyful_1',
    text: 'The First Joyful Mystery: The Annunciation. Fruit of the Mystery: Humility.',
  },
  {
    id: 'joyful_2',
    text: 'The Second Joyful Mystery: The Visitation. Fruit of the Mystery: Love of Neighbor.',
  },
  {
    id: 'joyful_3',
    text: 'The Third Joyful Mystery: The Nativity of Our Lord. Fruit of the Mystery: Poverty of Spirit.',
  },
  {
    id: 'joyful_4',
    text: 'The Fourth Joyful Mystery: The Presentation in the Temple. Fruit of the Mystery: Obedience and Purity.',
  },
  {
    id: 'joyful_5',
    text: 'The Fifth Joyful Mystery: The Finding of Jesus in the Temple. Fruit of the Mystery: Joy in Finding Jesus.',
  },

  // Luminous Mysteries
  {
    id: 'luminous_1',
    text: 'The First Luminous Mystery: The Baptism of Jesus in the Jordan. Fruit of the Mystery: Openness to the Holy Spirit.',
  },
  {
    id: 'luminous_2',
    text: 'The Second Luminous Mystery: The Wedding at Cana. Fruit of the Mystery: To Jesus Through Mary.',
  },
  {
    id: 'luminous_3',
    text: 'The Third Luminous Mystery: The Proclamation of the Kingdom. Fruit of the Mystery: Repentance and Trust in God.',
  },
  {
    id: 'luminous_4',
    text: 'The Fourth Luminous Mystery: The Transfiguration. Fruit of the Mystery: Desire for Holiness.',
  },
  {
    id: 'luminous_5',
    text: 'The Fifth Luminous Mystery: The Institution of the Eucharist. Fruit of the Mystery: Adoration and Gratitude.',
  },

  // Sorrowful Mysteries
  {
    id: 'sorrowful_1',
    text: 'The First Sorrowful Mystery: The Agony in the Garden. Fruit of the Mystery: Contrition for Sin.',
  },
  {
    id: 'sorrowful_2',
    text: 'The Second Sorrowful Mystery: The Scourging at the Pillar. Fruit of the Mystery: Purity and Mortification.',
  },
  {
    id: 'sorrowful_3',
    text: 'The Third Sorrowful Mystery: The Crowning with Thorns. Fruit of the Mystery: Moral Courage.',
  },
  {
    id: 'sorrowful_4',
    text: 'The Fourth Sorrowful Mystery: The Carrying of the Cross. Fruit of the Mystery: Patience in Suffering.',
  },
  {
    id: 'sorrowful_5',
    text: 'The Fifth Sorrowful Mystery: The Crucifixion and Death of Our Lord. Fruit of the Mystery: Final Perseverance.',
  },

  // Glorious Mysteries
  {
    id: 'glorious_1',
    text: 'The First Glorious Mystery: The Resurrection. Fruit of the Mystery: Faith.',
  },
  {
    id: 'glorious_2',
    text: 'The Second Glorious Mystery: The Ascension. Fruit of the Mystery: Hope.',
  },
  {
    id: 'glorious_3',
    text: 'The Third Glorious Mystery: The Descent of the Holy Spirit. Fruit of the Mystery: Wisdom and Love of God.',
  },
  {
    id: 'glorious_4',
    text: 'The Fourth Glorious Mystery: The Assumption of Mary. Fruit of the Mystery: Grace of a Happy Death.',
  },
  {
    id: 'glorious_5',
    text: 'The Fifth Glorious Mystery: The Coronation of Mary. Fruit of the Mystery: Trust in Mary\'s Intercession.',
  },
];

function fetchAudio(item) {
  return new Promise((resolve) => {
    const filePath = path.join(AUDIO_DIR, `${item.id}.mp3`);
    const fileStream = fs.createWriteStream(filePath);
    const url = `http://localhost:3000/api/tts?text=${encodeURIComponent(item.text)}&lang=en`;

    http.get(url, (res) => {
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Saved: ${item.id}.mp3`);
        resolve(true);
      });
    }).on('error', (err) => {
      console.error(`Error saving ${item.id}:`, err.message);
      resolve(false);
    });
  });
}

async function run() {
  console.log('Generating stored audio MP3s for prayers and mysteries...');
  for (const item of ITEMS) {
    await fetchAudio(item);
  }
  console.log('All audio files generated successfully.');
}

run();
