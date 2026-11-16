/**
 * Crisis and support resources — Ghana.
 *
 * Every number here was taken from a public source listed in `source` and
 * should be re-verified with the institution before this product is put in
 * front of real users. Numbers change; the app should fetch them from a
 * maintained endpoint in production rather than hard-coding them forever.
 */

export interface Resource {
  id: string;
  name: string;
  contact: string;
  tel?: string;
  hours: string;
  note: string;
  kind: 'helpline' | 'emergency' | 'hospital' | 'ngo';
  source?: string;
}

export const RESOURCES: Resource[] = [
  {
    id: 'mha',
    name: 'Mental Health Authority helpline',
    contact: '0800 678 678',
    tel: '0800678678',
    hours: '24 hours, every day',
    note: 'Free, confidential and staffed. Toll-free from any Ghanaian network.',
    kind: 'helpline',
    source: 'mha-ghana.com',
  },
  {
    id: 'emergency',
    name: 'National emergency line',
    contact: '112',
    tel: '112',
    hours: '24 hours',
    note: 'Police, fire and ambulance. Use this if you or someone else is in immediate danger.',
    kind: 'emergency',
    source: 'Ghana National Communications Authority',
  },
  {
    id: 'aph',
    name: 'Accra Psychiatric Hospital',
    contact: '0302 228 688',
    tel: '+233302228688',
    hours: '24-hour emergency service',
    note: 'Castle Road, Accra. Walk-in emergency care and admissions.',
    kind: 'hospital',
    source: 'accrapsychiatrichospital.org',
  },
  {
    id: 'mindfreedom',
    name: 'MindFreedom Ghana',
    contact: '+233 302 915 484',
    tel: '+233302915484',
    hours: 'Office hours',
    note: 'Advocacy and peer support run by people with lived experience of mental distress.',
    kind: 'ngo',
  },
  {
    id: 'mha-office',
    name: 'Mental Health Authority (office)',
    contact: '+233 27 443 5261',
    tel: '+233274435261',
    hours: 'Office hours',
    note: 'Old Race Course, Accra. For referrals and complaints about care.',
    kind: 'ngo',
    source: 'mha-ghana.com',
  },
];

export const HELPLINE_NOTE =
  'If you are outside Ghana, search for your country’s crisis line, or use findahelpline.com. This app is not an emergency service.';

export interface SafetyTip {
  id: string;
  title: string;
  minutes: number;
  body: string[];
}

export const GROUNDING_STEPS = [
  { count: 5, sense: 'things you can see', prompt: 'Name five things in the room. Say them slowly, out loud if you can.' },
  { count: 4, sense: 'things you can feel', prompt: 'Four things touching your skin: the chair, your cloth, the floor, the air.' },
  { count: 3, sense: 'things you can hear', prompt: 'Three sounds. Near ones first, then far ones.' },
  { count: 2, sense: 'things you can smell', prompt: 'Two smells — or two smells you remember from home.' },
  { count: 1, sense: 'thing you can taste', prompt: 'One taste. Water counts.' },
];

export const COPING_TIPS: SafetyTip[] = [
  {
    id: 'breathe',
    title: 'Slow your breathing',
    minutes: 2,
    body: [
      'Breathe in through your nose for four counts.',
      'Hold for four. Out through your mouth for six.',
      'Repeat ten times. If you feel light-headed, breathe normally — the point is a longer out-breath, not a perfect count.',
    ],
  },
  {
    id: 'body',
    title: 'Change your body, then your mind',
    minutes: 5,
    body: [
      'Stand up, drink water, step outside, or walk to the end of the street and back.',
      'Depression lies loudest when you are still. Movement does not have to be exercise.',
      'If leaving the room is too much, open a window and put both feet flat on the floor.',
    ],
  },
  {
    id: 'person',
    title: 'Message one person',
    minutes: 3,
    body: [
      'Pick the person who asks fewer questions and listens more.',
      'You do not have to explain everything. “I am not okay today. Can you sit with me on the phone for five minutes?” is enough.',
      'If nobody comes to mind, the helpline above is answered by a trained person, not a stranger on social media.',
    ],
  },
  {
    id: 'delay',
    title: 'Put distance between the thought and the act',
    minutes: 10,
    body: [
      'Thoughts of ending your life are a signal of pain, not an instruction.',
      'Make it harder: move away from anything you could use, and stay where another person can see or reach you.',
      'Set a ten-minute timer and do one small thing — water, shower, sitting with someone. Then decide again. Repeat as needed.',
    ],
  },
  {
    id: 'stigma',
    title: 'When someone says it is spiritual',
    minutes: 4,
    body: [
      'You do not have to win the argument to get help. Faith and treatment are not in competition.',
      'Useful sentence: “I am praying about it and I am also seeing a health worker. Both.”',
      'You are allowed to tell one safe person even if your family disagrees. One is enough.',
    ],
  },
];

export const CONVERSATION_STARTERS = [
  'I have been having a hard time and I wanted to tell someone.',
  'Can I talk to you about something without you trying to fix it?',
  'I am not okay. I do not need advice yet, I just need you to listen.',
  'I have been thinking about not being here. I am telling you because I need help.',
  'Can you check on me this week? A message is enough.',
];
