/**
 * Sample data for the "explore with sample data" path.
 *
 * These entries are analysed by the real engine at load time, so the charts,
 * patterns and safety cards are consistent with what a real user would see.
 * They are clearly labelled, isolated from user data, and removeable in one tap.
 */

import { analyse } from '../engine/analyze';
import { createCheckIn } from '../engine/checkins';
import { addDays } from '../engine/id';
import type { JournalEntry, StoreShape } from '../engine/types';

interface SeedLine {
  dayOffset: number;
  text: string;
  source?: 'typed' | 'voice';
}

const LINES: SeedLine[] = [
  { dayOffset: -26, text: 'First day trying this. I am not sure what to write. Work was fine, I ate banku with the boys after. Normal day.' },
  { dayOffset: -24, text: 'I could not sleep last night. My mind was just going round and round about rent. I am tired today but I managed.' },
  { dayOffset: -23, text: 'Chale I am so tired. I no dey chop well, everything at work is pressure. I feel like I am carrying something I cannot put down.' },
  { dayOffset: -22, text: 'My sister called me today and we laughed for a long time. Medaase, God. Small wins.' },
  { dayOffset: -21, text: 'I stayed in my room all day. I did not reply to anyone. I just wanted to disappear for a while.' },
  { dayOffset: -20, text: 'I tried to tell my mother I think I need to see someone. She said it is a spiritual attack and I should not let people know. I feel alone even in my own house.' },
  { dayOffset: -19, text: 'Back at work. The pressure is too much but I am trying. I keep thinking I am not doing enough.' },
  { dayOffset: -18, text: 'Slept badly again. Waking up at 3am. I am always tired and my head dey pain me.' },
  { dayOffset: -17, text: 'I feel empty today. Nothing excites me. I sat with my friends at the chopbar and I still felt far away.' },
  { dayOffset: -16, text: 'I am so tired of this. Everything feels pointless. I do not know what to do anymore.' },
  { dayOffset: -15, text: 'One good thing: I went for a walk before the sun came strong. It was quiet and I breathed properly for the first time this week.' },
  { dayOffset: -13, text: 'The pressure from home is too much. My father asked why I am not married yet. I just kept quiet.' },
  { dayOffset: -12, text: 'Wahala at work. My supervisor shouted at me in front of everyone. I felt small.' },
  { dayOffset: -11, text: 'I do not want to be here anymore. I am tired of this life and nothing is changing.' },
  { dayOffset: -10, text: 'I woke up still feeling low. I called my auntie and she listened for an hour. I am trying.' },
  { dayOffset: -9, text: 'Better today. I finished my report early and I slept before midnight. Small small.' },
  { dayOffset: -8, text: 'I am worried about money again. Rent is due and my mother needs medicine. My chest feels tight when I think about it.' },
  { dayOffset: -7, text: 'I have been withdrawing. Leaving messages on read for days. Talking feels like too much work.' },
  { dayOffset: -6, text: 'I went to church and felt some peace, but the worry came back when I reached home.' },
  { dayOffset: -5, text: 'I talked to my friend Kwesi today. He did not try to fix me, he just listened. I felt seen.' },
  { dayOffset: -4, text: 'Today was better. Walked, ate properly, called my mum. I feel light today. e go better.' },
  { dayOffset: -3, text: 'Rough night. I keep thinking everyone would be better off without me. I am writing this instead of calling anybody.' },
  { dayOffset: -2, text: 'I am taking it small small today. Washed my clothes, ate, replied to three messages. That is enough.' },
  { dayOffset: -1, text: 'I passed my exams! My mother cried and I am so proud. All those late nights were not wasted.' },
  { dayOffset: 0, text: 'Tired but okay. I am trying to be gentle with myself. Tomorrow I will walk again.' },
];

export function buildDemoStore(now = new Date()): Pick<
  StoreShape,
  'entries' | 'checkins' | 'alerts'
> {
  const entries: JournalEntry[] = LINES.map((line, index) => {
    const when = addDays(now, line.dayOffset);
    when.setHours(19 + (index % 3), 12 + (index % 5) * 7, 0, 0);
    return {
      id: `demo-entry-${index}`,
      createdAt: when.toISOString(),
      text: line.text,
      source: line.source ?? 'typed',
      analysis: analyse(line.text, when),
    };
  });

  const phqAnswers = [2, 2, 3, 2, 1, 2, 2, 1, 0];
  const gadAnswers = [2, 2, 1, 3, 1, 2, 2];
  const checkins = [
    createCheckIn('PHQ9', phqAnswers, addDays(now, -15)),
    createCheckIn('GAD7', gadAnswers, addDays(now, -14)),
    createCheckIn('PHQ9', [1, 2, 2, 2, 1, 1, 1, 0, 0], addDays(now, -2)),
  ];

  return { entries, checkins, alerts: [] };
}
