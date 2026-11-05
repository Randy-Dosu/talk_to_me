/**
 * The Nkommo seed lexicon.
 *
 * Two layers, on purpose:
 *  1. Core English valence adapted from the VADER approach (Hutto & Gilbert,
 *     2014): tokens rated roughly -4…+4, plus intensifier, negation and
 *     "but"-clause rules applied in analyse().
 *  2. A Ghanaian English / Pidgin / Twi seed layer, because the standard
 *     lexicons simply do not contain "chale", "wahala", "awerɛhow" or
 *     "I don tire for this life" — and those are exactly the phrases that
 *     carry distress in Accra. These entries are hand-written provisional
 *     seeds pending native-speaker annotation (see docs/ROADMAP.md, Stage 2).
 *
 * Nothing here is a diagnosis. The lexicon is a reading aid; the clinical
 * instruments (PHQ-9 / GAD-7) and human help carry the weight.
 */

import type { EmotionLabel, RiskLevel } from './types';

export const LEXICON_VERSION = 'nkommo-lex-1.4.0';

type Pair = [string, number];

/* ------------------------------------------------------------------ */
/* Valence                                                             */
/* ------------------------------------------------------------------ */

const CORE_VALENCE: Pair[] = [
  // Positive
  ['good', 1.9], ['great', 2.7], ['happy', 2.7], ['joy', 2.8], ['joyful', 2.9],
  ['love', 2.9], ['loved', 2.6], ['lovely', 2.4], ['amazing', 2.8], ['awesome', 2.7],
  ['wonderful', 2.9], ['excellent', 2.8], ['fantastic', 2.9], ['brilliant', 2.6],
  ['beautiful', 2.4], ['blessed', 2.6], ['blessing', 2.4], ['grateful', 2.7],
  ['thankful', 2.5], ['thank', 1.8], ['thanks', 1.9], ['proud', 2.4],
  ['excited', 1.9], ['exciting', 1.9], ['hopeful', 2.0], ['hope', 1.7],
  ['better', 1.7], ['best', 2.5], ['calm', 1.5], ['peace', 2.0],
  ['peaceful', 1.9], ['relaxed', 1.6], ['rested', 1.4], ['refreshed', 1.9],
  ['fine', 1.1], ['okay', 0.7], ['ok', 0.7], ['alright', 0.8],
  ['strong', 1.4], ['confident', 1.8], ['brave', 1.9], ['capable', 1.6],
  ['win', 2.2], ['won', 2.1], ['success', 2.4], ['successful', 2.4],
  ['proud', 2.4], ['fun', 1.9], ['funny', 1.6], ['laugh', 2.1], ['laughed', 2.0],
  ['laughter', 2.1], ['smile', 2.0], ['smiled', 1.9], ['smiling', 1.9],
  ['friend', 1.2], ['friends', 1.2], ['family', 1.1], ['support', 1.3],
  ['supported', 1.6], ['safe', 1.7], ['comfort', 1.5], ['comfortable', 1.4],
  ['progress', 1.8], ['improving', 1.8], ['improved', 1.7], ['growing', 1.4],
  ['grow', 1.2], ['learned', 1.2], ['learning', 1.1], ['opportunity', 1.5],
  ['promotion', 2.2], ['passed', 1.8], ['accepted', 1.9], ['approved', 1.6],
  ['paid', 1.2], ['helped', 1.5], ['helpful', 1.5], ['kind', 1.6],
  ['kindness', 1.9], ['generous', 1.8], ['sweet', 1.7], ['lovable', 2.1],
  ['worth', 0.9], ['worthwhile', 1.7], ['meaningful', 1.8], ['purpose', 1.4],
  ['light', 0.9], ['bright', 1.4], ['sunshine', 1.7], ['sunny', 1.2],
  ['slept', 0.9], ['rest', 1.1], ['healed', 2.0], ['healing', 1.9],
  ['recovered', 1.9], ['recovery', 1.8], ['survived', 1.5], ['surviving', 1.3],
  ['alive', 0.9], ['living', 0.5], ['breathing', 0.4], ['trying', 0.9],
  ['managed', 1.0], ['manageable', 1.3], ['enough', 0.8], ['deserve', 0.9],
  ['deserving', 1.2], ['forgive', 1.3], ['forgiven', 1.6], ['forgiveness', 1.7],
  ['grace', 1.6], ['faith', 1.4], ['pray', 0.9], ['prayed', 1.1],
  ['prayer', 1.2], ['church', 0.6], ['worship', 1.3], ['god', 0.8],
  ['jesus', 0.8], ['allah', 0.8], ['amen', 0.9], ['hallelujah', 1.8],
  ['celebrate', 2.3], ['celebration', 2.2], ['party', 1.7], ['dance', 1.8],
  ['danced', 1.7], ['music', 1.4], ['sing', 1.4], ['sang', 1.4],
  ['holiday', 1.7], ['vacation', 1.6], ['weekend', 1.0], ['morning', 0.3],
  ['fresh', 1.1], ['clean', 1.0], ['clear', 0.9], ['easy', 1.0],
  ['easier', 1.2], ['simple', 0.7], ['free', 1.2], ['freedom', 1.7],
  ['brave', 1.9], ['resilient', 2.0], ['resilience', 1.8], ['patient', 1.1],
  ['patience', 1.2], ['consistent', 1.3], ['discipline', 1.2], ['focused', 1.2],
  ['favourite', 1.5], ['favorite', 1.5], ['delicious', 2.0], ['tasty', 1.6],
  ['sweetheart', 2.0], ['darling', 1.9], ['hug', 1.8], ['hugged', 2.0],
  ['kiss', 1.9], ['compliment', 1.9], ['praise', 1.7], ['encouraged', 1.8],
  ['encouraging', 1.8], ['motivated', 1.8], ['inspired', 1.9], ['inspiring', 1.9],
  ['proud', 2.4], ['promising', 1.6], ['optimistic', 1.8], ['positive', 1.5],

  // Negative
  ['sad', -2.1], ['sadness', -2.2], ['unhappy', -2.2], ['miserable', -3.0],
  ['depressed', -2.9], ['depressing', -2.7], ['depression', -2.6], ['low', -1.1],
  ['down', -1.2], ['empty', -2.6], ['numb', -2.4], ['hollow', -2.2],
  ['hopeless', -3.1], ['hopelessness', -3.2], ['worthless', -3.4], ['useless', -2.6],
  ['helpless', -2.8], ['powerless', -2.6], ['trapped', -2.7], ['stuck', -1.7],
  ['lost', -1.6], ['broken', -2.4], ['hurt', -2.3], ['hurting', -2.5],
  ['pain', -2.5], ['painful', -2.4], ['ache', -1.9], ['aching', -2.0],
  ['cry', -2.0], ['crying', -2.3], ['cried', -2.2], ['tears', -1.9],
  ['sob', -2.6], ['sobbing', -2.7], ['grief', -3.0], ['grieving', -2.9],
  ['mourning', -2.8], ['loss', -2.2], ['lost', -1.6], ['died', -2.6],
  ['death', -2.4], ['dead', -2.2], ['funeral', -2.3], ['buried', -2.2],
  ['lonely', -2.7], ['loneliness', -2.8], ['alone', -2.1], ['isolated', -2.4],
  ['abandoned', -2.8], ['rejected', -2.9], ['ignored', -2.3], ['invisible', -2.4],
  ['unwanted', -2.8], ['unloved', -3.0], ['misunderstood', -2.1], ['nobody', -1.6],
  ['angry', -1.9], ['anger', -2.1], ['furious', -2.8], ['rage', -2.9],
  ['annoyed', -1.5], ['annoying', -1.5], ['irritated', -1.6], ['spoiled', -1.3], ['spoilt', -1.3], ['forgetful', -1.2], ['forgetting', -1.0], ['frustrated', -2.0], ['frustrating', -2.0],
  ['frustration', -2.1], ['mad', -1.8], ['upset', -1.8], ['hate', -2.7],
  ['hated', -2.8], ['hatred', -2.9], ['disgusted', -2.6], ['bitter', -1.9],
  ['resentful', -1.9], ['betrayed', -3.0], ['disrespected', -2.2], ['insulted', -2.3],
  ['unfair', -2.0], ['wicked', -3.0], ['evil', -3.0], ['cruel', -2.9],
  ['afraid', -2.0], ['fear', -2.2], ['fearful', -2.2], ['scared', -2.0],
  ['terrified', -2.9], ['panic', -2.7], ['panicking', -2.8], ['anxious', -1.7],
  ['anxiety', -1.7], ['worried', -1.6], ['worry', -1.5], ['worrying', -1.7],
  ['nervous', -1.6], ['tense', -1.7], ['stressed', -2.1], ['stress', -1.9],
  ['stressful', -2.0], ['overwhelmed', -2.5], ['overwhelming', -2.3],
  ['pressured', -2.0], ['pressure', -1.7], ['burden', -2.4], ['burdensome', -2.6],
  ['exhausted', -2.4], ['exhausting', -2.3], ['tired', -1.6], ['drained', -2.4],
  ['fatigue', -1.9], ['weak', -1.6], ['weakness', -1.6], ['heavy', -1.4],
  ['sick', -2.0], ['ill', -1.9], ['illness', -1.9], ['disease', -2.0],
  ['painful', -2.4], ['headache', -1.6], ['insomnia', -2.3], ['sleepless', -2.2],
  ['nightmare', -2.4], ['nightmares', -2.4], ['waking', -0.5], ['hungry', -1.9],
  ['poor', -1.7], ['broke', -1.8], ['struggle', -2.0], ['struggling', -2.2],
  ['suffering', -2.8], ['suffer', -2.6], ['suffered', -2.6], ['hardship', -2.2],
  ['fail', -2.2], ['failed', -2.4], ['failure', -2.6], ['failing', -2.3],
  ['mistake', -1.5], ['wrong', -1.4], ['bad', -1.7], ['worse', -2.0],
  ['worst', -2.6], ['terrible', -2.9], ['horrible', -3.0], ['awful', -2.8],
  ['disgusting', -2.9], ['nasty', -2.3], ['ugly', -2.0], ['stupid', -2.1],
  ['idiot', -2.3], ['fool', -2.0], ['shame', -1.8], ['ashamed', -2.4],
  ['embarrassed', -2.0], ['guilty', -2.2], ['guilt', -2.2], ['regret', -2.0],
  ['regretful', -2.1], ['remorse', -1.9], ['worthlessness', -3.2], ['defeated', -2.6],
  ['giving up', -2.6], ['quit', -1.4], ['quitting', -1.3], ['cope', -0.4],
  ['coping', -0.3], ['unbearable', -3.0], ['tolerate', -0.9], ['endless', -1.5],
  ['pointless', -2.6], ['meaningless', -2.7], ['nothing', -0.9], ['numbness', -2.3],
  ['disappointed', -2.3], ['disappointing', -2.2], ['disappointment', -2.3],
  ['heartbroken', -3.1], ['devastated', -3.1], ['crushed', -2.8], ['shattered', -3.0],
  ['hopeless', -3.1], ['gloomy', -1.8], ['dark', -1.4], ['darkness', -1.6],
  ['quiet', -0.3], ['silent', -0.6], ['silence', -0.5], ['distant', -1.1],
  ['mess', -1.7], ['chaos', -2.2], ['chaotic', -2.2], ['confused', -1.6],
  ['confusing', -1.5], ['unsure', -1.2], ['uncertain', -1.2], ['doubt', -1.1],
  ['jealous', -1.9], ['envy', -1.8], ['gossip', -1.9], ['rumour', -1.7],
  ['violence', -2.9], ['fight', -2.0], ['fought', -2.0], ['hit', -2.2],
  ['abuse', -3.2], ['abused', -3.3], ['assault', -3.3], ['rape', -3.6],
  ['bully', -2.7], ['bullied', -2.9], ['bullied', -2.9], ['threat', -2.4],
  ['threatened', -2.6], ['scam', -2.5], ['scammed', -2.6], ['cheated', -2.8],
  ['broke', -1.8], ['debt', -1.9], ['debts', -1.9], ['loan', -1.1],
  ['jobless', -2.4], ['unemployed', -2.3], ['fired', -2.5], ['sacked', -2.6],
  ['rejected', -2.9], ['denied', -1.9], ['blocked', -1.7], ['ignored', -2.3],
  ['stigma', -2.5], ['stigmatised', -2.6], ['stigmatized', -2.6], ['judged', -2.1],
  ['judging', -2.0], ['mock', -2.2], ['mocked', -2.5], ['laughed at', -2.4],
  ['witch', -2.4], ['curse', -2.3], ['cursed', -2.4], ['spiritual', -0.4],
  ['demon', -2.6], ['possessed', -2.4], ['madman', -3.0], ['crazy', -1.7],
  ['insane', -2.2], ['mad', -1.8], ['mental', -0.8], ['asylum', -1.9],

  // Ghanaian English / Pidgin / Twi seed layer
  ['wahala', -2.0], ['wahala', -2.0], ['suffer', -2.6], ['sufferhead', -2.9],
  ['dumsor', -1.3], ['hustle', -0.4], ['hustling', -0.2],
  ['awerɛhow', -3.0], ['awerɛho', -3.0], ['abufuo', -2.2], ['suro', -2.0],
  ['anigye', 2.4], ['medaase', 2.2], ['akoma', 0.4], ['aboa', -2.8],
  ['kwasia', -2.5], ['gyim', -2.0], ['chale', 0.2], ['abeg', 0.1],
  ['trotro', 0.0], ['kenkey', 0.4], ['waakye', 0.4], ['jollof', 0.6],
  ['banku', 0.3], ['fufu', 0.4], ['shito', 0.4], ['kelewele', 0.6],
  ['sachet', 0.0], ['harmattan', 0.0], ['oya', 0.4], ['herh', -0.4],
  ['ei', 0.0], ['paa', 0.0], ['sef', 0.0], ['kraa', 0.0], ['koraa', 0.0],
  ['small', 0.2], ['dey', 0.0], ['chop', 0.6], ['chopbar', 0.5],
  ['sista', 0.8], ['bro', 0.7], ['senior', 0.6], ['obroni', 0.2],
  ['wayo', -2.2], ['gbee', -1.4], ['nonsense', -2.2], ['trouble', -1.9],
  ['hard', -0.9], ['tough', -1.3], ['manage', 0.5], ['managing', 0.5],
];

/** Phrases (2+ tokens) scored before their constituent words. */
export const PHRASE_VALENCE: Pair[] = [
  ['i am fine', 1.6], ['i dey fine', 1.9], ['i dey try', 1.7],
  ['i dey manage', 1.0], ['i am managing', 1.1], ['i am okay', 0.9],
  ['not okay', -2.2], ['not fine', -2.1], ['i am not okay', -2.5],
  ['i am not fine', -2.5], ['i am tired', -1.8], ['i am so tired', -2.4],
  ['i am exhausted', -2.7], ['i cannot sleep', -2.3], ['i no dey sleep', -2.4],
  ['no appetite', -2.1], ['i no dey chop', -2.2], ['i cannot eat', -2.3],
  ['i feel empty', -3.0], ['i feel nothing', -2.7], ['i feel numb', -2.6],
  ['i feel worthless', -3.5], ['i am worthless', -3.5], ['i feel useless', -2.9],
  ['no one cares', -2.9], ['nobody cares', -2.9], ['nobody understands', -2.4],
  ['no one understands', -2.5], ['i am alone', -2.4], ['i feel alone', -2.6],
  ['i am lonely', -2.7], ['i have no one', -2.9], ['i am scared', -2.1],
  ['i am anxious', -1.9], ['panic attack', -2.9], ['i cannot breathe', -2.7],
  ['i cannot focus', -2.0], ['i cannot think', -2.1], ['i am failing', -2.2],
  ['i failed', -1.9], ['i got the job', 2.6], ['i passed', 2.0],
  ['i am grateful', 2.5], ['i am thankful', 2.4], ['proud of myself', 2.7],
  ['i am trying', 1.3], ['i am happy', 2.7], ['i feel better', 2.1],
  ['i feel light', 1.9], ['good day', 1.5], ['bad day', -1.9],
  ['i miss her', -1.7], ['i miss him', -1.7], ['i miss my', -1.6],
  ['broke my heart', -3.1], ['i am crying', -2.4], ['i have been crying', -2.7],
  ['i cannot do this', -2.5], ['i cannot go on', -3.3], ['i can do this', 1.8],
  ['god is good', 2.2], ['thank god', 1.8], ['god dey', 1.7],
  ['e go better', 2.1], ['it will be well', 1.9], ['it is well', 1.7],
  ['small small', 1.2], ['one day', 0.9], ['i am blessed', 2.5],
  ['life is hard', -2.5], ['life hard', -2.4], ['money is not', -1.6],
  ['no money', -2.1], ['no job', -2.2], ['no food', -2.4],
  ['i am a burden', -3.2], ['i am a failure', -3.2], ['i hate myself', -3.5],
  ['i hate my life', -3.3], ['i love my life', 2.8], ['i love you', 3.0],
  ['i am proud', 2.4], ['i am safe', 1.9], ['i feel safe', 1.9],
  ['i feel seen', 2.1], ['i feel heard', 2.1], ['i feel understood', 2.2],
  ['i feel hopeless', -3.2], ['i feel trapped', -2.8], ['i feel stuck', -2.4],
  ['i feel like a failure', -3.3], ['i am not enough', -2.9],
  ['i am tired of', -2.6], ['i don tire', -2.7], ['i am fed up', -2.5],
  ['i don tire for this life', -3.4], ['life no make sense', -3.2],
  ['what is the point', -2.6], ['what is the use', -2.3],
  ['i want to die', -3.9], ['i want to disappear', -3.1],
  ['i want to sleep and not wake up', -3.8], ['i do not want to be here', -3.3],
  ['i wish i was dead', -3.8], ['i wish i were dead', -3.8],
  ['better off dead', -3.6], ['better off without me', -3.3],
  ['no reason to live', -3.5], ['nothing to live for', -3.4],
  ['end my life', -3.9], ['kill myself', -3.9], ['hurt myself', -3.4],
  ['self harm', -3.0], ['tired of living', -3.3], ['tired of this life', -3.3],
  ['scared to sleep', -2.6], ['afraid to sleep', -2.5],
  ['heart dey beat fast', -1.9], ['my head dey pain me', -1.9],
  ['i dey shake', -2.0], ['i cannot stop thinking', -2.3],
  ['overthinking', -1.6], ['over think', -1.4], ['over thinking', -1.4],
  ['i cannot stop crying', -2.8], ['i am not sleeping', -2.2],
  ['nobody would notice', -3.0], ['no one would notice', -3.0],
];

export const VALENCE: Map<string, number> = new Map(CORE_VALENCE);
export const PHRASES: Map<string, number> = new Map(PHRASE_VALENCE);

/* ------------------------------------------------------------------ */
/* Modifiers                                                           */
/* ------------------------------------------------------------------ */

/** VADER-style degree modifiers. Multipliers >1 intensify, <1 soften. */
export const INTENSIFIERS: Record<string, number> = {
  very: 1.3, extremely: 1.5, incredibly: 1.5, really: 1.25, so: 1.25,
  too: 1.2, totally: 1.4, completely: 1.4, absolutely: 1.45, utterly: 1.5,
  quite: 1.15, rather: 1.1, especially: 1.2, seriously: 1.3, deeply: 1.35,
  truly: 1.25, highly: 1.3, super: 1.35, mad: 1.2, paa: 1.3, 'k3k3': 0.8,
  small: 0.75, 'more': 1.15, 'most': 1.35, 'such': 1.2, 'this': 1.05,
  'everything': 1.2, 'always': 1.2, 'forever': 1.25, 'never': 1.0,
  'anymore': 1.3, 'again': 1.1, 'die': 1.0, 'fucking': 1.4, 'damn': 1.2,
  'bloody': 1.2, 'too much': 1.35, 'plenty': 1.2,
};

export const DIMINISHERS: Record<string, number> = {
  slightly: 0.6, somewhat: 0.7, barely: 0.6, hardly: 0.55, kind: 0.8,
  kinda: 0.75, little: 0.7, bit: 0.7, mildly: 0.65, partly: 0.7,
  almost: 0.8, 'sort': 0.8, 'sorta': 0.75, 'enough': 0.85, 'fairly': 0.85,
};

export const NEGATORS = new Set([
  'not', 'no', 'never', 'none', 'nobody', 'nothing', 'neither', 'nor',
  'cannot', 'hardly', 'barely', 'scarcely', 'without', 'nope', 'nah',
  'dont', 'cannot', 'aint', 'lack', 'lacks', 'lacking',
]);

/** Words that, right before a negator, make it emphatic ("never ever"). */
export const NEGATION_EMPHASIS = new Set(['so', 'this', 'at', 'all', 'ever', 'really']);

/* ------------------------------------------------------------------ */
/* Emotions                                                            */
/* ------------------------------------------------------------------ */

const EMOTION_WORDS: Record<EmotionLabel, Pair[]> = {
  joy: [
    ['happy', 1], ['joy', 1], ['joyful', 1], ['glad', 0.9], ['excited', 0.8],
    ['smile', 0.8], ['smiled', 0.8], ['laugh', 0.8], ['laughed', 0.8],
    ['laughter', 0.9], ['fun', 0.8], ['celebrate', 0.9], ['celebrated', 0.9],
    ['dance', 0.8], ['danced', 0.8], ['party', 0.7], ['great', 0.8],
    ['amazing', 0.9], ['wonderful', 0.9], ['beautiful', 0.7], ['lovely', 0.8],
    ['anigye', 1], ['delicious', 0.7], ['holiday', 0.7], ['promotion', 0.8],
    ['passed', 0.7], ['won', 0.8], ['win', 0.8], ['good', 0.5], ['fine', 0.5],
  ],
  sadness: [
    ['sad', 1], ['sadness', 1], ['unhappy', 1], ['cry', 0.9], ['crying', 1],
    ['cried', 0.9], ['tears', 0.9], ['sob', 1], ['grief', 1], ['grieving', 1],
    ['mourning', 1], ['loss', 0.9], ['lost', 0.7], ['hurt', 0.8],
    ['heartbroken', 1], ['broken', 0.9], ['disappointed', 0.8],
    ['miserable', 1], ['depressed', 1], ['depression', 1], ['empty', 0.8],
    ['down', 0.7], ['low', 0.6], ['miss', 0.6], ['awerɛhow', 1],
    ['funeral', 0.9], ['death', 0.7], ['alone', 0.7], ['rejected', 0.8],
  ],
  anger: [
    ['angry', 1], ['anger', 1], ['furious', 1], ['rage', 1], ['mad', 0.9],
    ['annoyed', 0.8], ['irritated', 0.8], ['frustrated', 0.9],
    ['frustration', 0.9], ['hate', 0.9], ['hatred', 0.9], ['disgusted', 0.9],
    ['bitter', 0.8], ['resentful', 0.8], ['betrayed', 0.9], ['unfair', 0.7],
    ['wicked', 0.8], ['abufuo', 1], ['kwasia', 0.9], ['nonsense', 0.7],
    ['fight', 0.8], ['fought', 0.8], ['insulted', 0.8], ['disrespected', 0.8],
    ['shout', 0.7], ['shouted', 0.7], ['yell', 0.7], ['yelled', 0.7],
  ],
  fear: [
    ['afraid', 1], ['fear', 1], ['scared', 1], ['terrified', 1], ['frightened', 1],
    ['panic', 0.9], ['panicking', 0.9], ['threat', 0.8], ['threatened', 0.9],
    ['danger', 0.9], ['unsafe', 0.9], ['suro', 1], ['nightmare', 0.8],
    ['nightmares', 0.8], ['scream', 0.7], ['screamed', 0.7], ['trembling', 0.8],
  ],
  anxiety: [
    ['anxious', 1], ['anxiety', 1], ['worried', 0.9], ['worry', 0.9],
    ['worrying', 0.9], ['nervous', 0.9], ['tense', 0.8], ['stressed', 0.9],
    ['stress', 0.8], ['overwhelmed', 0.9], ['overthinking', 0.9],
    ['pressure', 0.8], ['pressured', 0.8], ['restless', 0.8],
    ['insomnia', 0.8], ['sleepless', 0.8], ['palpitations', 0.9],
    ['exam', 0.5], ['deadline', 0.6], ['interview', 0.5], ['results', 0.4],
    ['cannot sleep', 0.9], ['cannot breathe', 1], ['heart dey beat fast', 1],
    ['shaking', 0.8], ['overthink', 0.9], ['future', 0.4],
  ],
  loneliness: [
    ['lonely', 1], ['loneliness', 1], ['alone', 1], ['isolated', 0.9],
    ['abandoned', 0.9], ['nobody', 0.6], ['unwanted', 0.8], ['unloved', 0.9],
    ['invisible', 0.8], ['ignored', 0.8], ['distant', 0.7], ['no one', 0.7],
    ['no one cares', 1], ['nobody cares', 1], ['missing', 0.5],
    ['disconnected', 0.9], ['isolating', 1], ['withdrawn', 0.9],
  ],
  shame: [
    ['ashamed', 1], ['shame', 1], ['guilty', 0.9], ['guilt', 0.9],
    ['embarrassed', 0.9], ['humiliated', 1], ['worthless', 0.9],
    ['failure', 0.8], ['burden', 0.8], ['stupid', 0.7], ['disgrace', 1],
    ['judged', 0.8], ['stigma', 0.9], ['mocked', 0.8], ['laughed at', 0.8],
    ['useless', 0.8], ['not enough', 0.8], ['kwasia', 0.8], ['aboa', 1],
  ],
  numbness: [
    ['numb', 1], ['numbness', 1], ['empty', 1], ['hollow', 0.9],
    ['nothing', 0.7], ['flat', 0.7], ['detached', 0.9], ['blank', 0.7],
    ['drained', 0.8], ['exhausted', 0.6], ['tired', 0.5], ['dull', 0.7],
  ],
  gratitude: [
    ['grateful', 1], ['thankful', 1], ['thank', 0.9], ['thanks', 0.9],
    ['blessed', 1], ['blessing', 0.9], ['medaase', 1], ['appreciate', 0.9],
    ['appreciated', 0.9], ['praise', 0.8], ['amen', 0.6], ['hallelujah', 0.8],
    ['love', 0.6], ['kind', 0.7], ['helped', 0.7], ['support', 0.7],
  ],
  hope: [
    ['hope', 1], ['hopeful', 1], ['optimistic', 0.9], ['better', 0.8],
    ['improving', 0.8], ['progress', 0.8], ['trying', 0.7], ['try', 0.6],
    ['tomorrow', 0.5], ['future', 0.5], ['goal', 0.6], ['dream', 0.6],
    ['pray', 0.6], ['faith', 0.7], ['believe', 0.7], ['e go better', 1],
    ['small small', 0.8], ['one day', 0.7], ['survived', 0.7],
    ['strong', 0.7], ['resilient', 0.8], ['healing', 0.8], ['recovery', 0.8],
  ],
  calm: [
    ['calm', 1], ['peaceful', 1], ['peace', 1], ['relaxed', 1],
    ['rested', 0.9], ['quiet', 0.6], ['safe', 0.8], ['settled', 0.8],
    ['grounded', 0.8], ['breathing', 0.6], ['present', 0.6],
    ['content', 0.8], ['steady', 0.8], ['okay', 0.6],
  ],
};

export const EMOTION_LEXICON: Record<EmotionLabel, Map<string, number>> = Object.fromEntries(
  (Object.keys(EMOTION_WORDS) as EmotionLabel[]).map((label) => [
    label,
    new Map(EMOTION_WORDS[label]),
  ]),
) as Record<EmotionLabel, Map<string, number>>;

/** Emotions that the chart and the copy treat as "pain signals". */
export const PAIN_EMOTIONS: EmotionLabel[] = ['sadness', 'anxiety', 'anger', 'fear', 'loneliness', 'shame', 'numbness'];

/* ------------------------------------------------------------------ */
/* Marker phrase groups used by the distress index                     */
/* ------------------------------------------------------------------ */

export const MARKER_GROUPS: Record<
  'hopelessness' | 'anxiety' | 'isolation' | 'shame' | 'sleep' | 'somatic' | 'impairment' | 'support',
  { phrases: string[]; weight: number; note: string }
> = {
  hopelessness: {
    weight: 1,
    note: 'Language of hopelessness',
    phrases: [
      'hopeless', 'no hope', 'what is the point', 'what is the use', 'pointless',
      'nothing matters', 'nothing will change', 'never get better', 'cannot go on',
      'cannot keep going', 'give up', 'given up', 'giving up', 'no reason',
      'nothing to live for', 'trapped', 'stuck forever', 'endless', 'tired of everything',
      'tired of this life', 'tired of living', 'fed up', 'i don tire', 'life no make sense',
      'no way out', 'cannot take it anymore', 'cannot do this anymore', 'worthless',
      'burden to everyone', 'i am a burden', 'everyone would be better off',
      'wish i could disappear', 'want to disappear', 'do not see a future',
      'no future', 'die alone',
    ],
  },
  anxiety: {
    weight: 1,
    note: 'Anxiety and physiological arousal',
    phrases: [
      'anxious', 'anxiety', 'panic', 'panicking', 'panic attack', 'overthinking',
      'overthink', 'cannot stop thinking', 'racing thoughts', 'worried', 'worrying',
      'nervous', 'tense', 'on edge', 'restless', 'scared', 'afraid', 'fear',
      'heart dey beat fast', 'heart racing', 'palpitations', 'chest pain',
      'cannot breathe', 'short of breath', 'shaking', 'trembling', 'sweating',
      'dizzy', 'stressed', 'stress', 'overwhelmed', 'pressure', 'exam', 'deadline',
    ],
  },
  isolation: {
    weight: 1,
    note: 'Withdrawal and isolation',
    phrases: [
      'alone', 'lonely', 'loneliness', 'isolated', 'isolating', 'withdrawn',
      'withdrawing', 'nobody', 'no one', 'no friends', 'avoid people',
      'stopped talking', 'stopped going', 'stopped replying', 'deleted my socials',
      'deleted social media', 'stay in my room', 'staying in my room',
      'do not want to see anyone', 'cannot face people', 'unwanted', 'ignored',
      'left out', 'no one cares', 'nobody cares', 'no one understands',
    ],
  },
  shame: {
    weight: 1,
    note: 'Shame and fear of judgement',
    phrases: [
      'ashamed', 'shame', 'shameful', 'embarrassed', 'disgrace', 'humiliated',
      'guilty', 'guilt', 'failure', 'useless', 'worthless', 'stupid',
      'they will laugh', 'people will laugh', 'what will people say',
      'cannot tell anyone', 'cannot tell my family', 'my family will',
      'they will think i am mad', 'they will say i am mad', 'spiritual attack',
      'witch', 'curse', 'cursed', 'weak', 'not a man', 'not strong enough',
      'judged', 'stigma', 'aboa', 'kwasia', 'mock me', 'mocked',
    ],
  },
  sleep: {
    weight: 1,
    note: 'Sleep disruption',
    phrases: [
      'cannot sleep', 'could not sleep', 'no sleep', 'not sleeping', 'insomnia',
      'sleepless', 'wake up at 3', 'waking up at 3', 'wake up at 4',
      'waking up at 4', 'wake up at 2', 'waking up at 2', 'no dey sleep',
      'tossing', 'turning', 'sleeping all day', 'oversleeping', 'sleep too much',
      'nightmares', 'nightmare', 'bad dreams', 'afraid to sleep', 'scared to sleep',
      'sleep and not wake up', 'do not want to wake up',
    ],
  },
  somatic: {
    weight: 1,
    note: 'Body-level symptoms',
    phrases: [
      'headache', 'my head dey pain me', 'head dey pain', 'body pain', 'body dey pain',
      'chest pain', 'stomach pain', 'no appetite', 'not eating', 'cannot eat',
      'i no dey chop', 'losing weight', 'lost weight', 'always tired',
      'no energy', 'fatigue', 'weak', 'dizzy', 'fainting', 'heart dey beat fast',
      'palpitations', 'shaking', 'sweating', 'sick', 'malaria', 'ulcer',
    ],
  },
  impairment: {
    weight: 1,
    note: 'Everyday functioning slipping',
    phrases: [
      'cannot get out of bed', 'cannot leave my bed', 'stayed in bed',
      'missed class', 'missed lectures', 'missed work', 'did not go to work',
      'could not go to work', 'skipped school', 'cannot concentrate',
      'cannot focus', 'cannot read', 'cannot study', 'failed my exam',
      'not bathing', 'have not bathed', 'not eating', 'stopped eating',
      'messy room', 'cannot do basic things', 'everything is hard',
    ],
  },
  support: {
    weight: 1,
    note: 'Sources of support named',
    phrases: [
      'talked to', 'spoke to', 'my friend', 'my friends', 'my mum', 'my mom',
      'my mother', 'my father', 'my dad', 'my sister', 'my brother', 'my aunt',
      'my uncle', 'my pastor', 'my imam', 'my therapist', 'my counsellor',
      'my counselor', 'my small group', 'prayed with', 'helped me', 'listened to me',
      'i am not alone', 'support', 'supported me', 'opened up', 'went to church',
      'went to mosque', 'called my',
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Risk patterns                                                       */
/* ------------------------------------------------------------------ */

export interface RiskPattern {
  re: RegExp;
  tier: Exclude<RiskLevel, 'none'>;
  label: string;
  /** Base severity 0–100 used to build the risk index. */
  severity: number;
}

export const RISK_PATTERNS: RiskPattern[] = [
  // --- Urgent: intent, plan, means, recent act ---------------------
  { re: /\b(i (am|feel) (going to|gonna|about to) (kill|end|hurt) (myself|me))\b/, tier: 'urgent', label: 'stated intent to end life', severity: 98 },
  { re: /\b(kill(ing)? myself|end(ing)? my (own )?life|take (my|my own) life|take my own life)\b/, tier: 'urgent', label: 'stated intent to end life', severity: 97 },
  { re: /\b(i (want|wanna|plan|need|have decided) to die|i want to be dead|i wanna die)\b/, tier: 'urgent', label: 'active wish to die', severity: 95 },
  { re: /\b(i (have|got|made) (a )?plan (to|for) (die|kill|end))\b/, tier: 'urgent', label: 'suicide plan mentioned', severity: 98 },
  { re: /\b(i (bought|have|keep|saved) (the )?(rope|blade|razor|gun|pills|tablets|poison|sniper|charcoal|insecticide))\b.{0,60}\b(die|kill|end|myself|life)\b/, tier: 'urgent', label: 'means + intent', severity: 99 },
  { re: /\b(drink|take|swallow|mix) (the )?(sniper|poison|insecticide|kerosene|pills|tablets|paracetamol)\b/, tier: 'urgent', label: 'possible poisoning method', severity: 99 },
  { re: /\b(i (already )?(took|swallowed|drank) (all )?(the |my )?(pills|tablets|poison|sniper|bleach))\b/, tier: 'urgent', label: 'possible overdose described', severity: 100 },
  { re: /\b(i (cut|hurt|burn|slit) (myself|my (wrist|wrists|arm|arms|thigh|thighs|leg|legs)))\b/, tier: 'urgent', label: 'self-harm described', severity: 95 },
  { re: /\b(want to (cut|hurt|harm) myself|going to (cut|hurt|harm) myself)\b/, tier: 'urgent', label: 'urge to self-harm', severity: 92 },
  { re: /\b(this is (my|the) (last|final) (message|note|post|goodbye)|say goodbye (to everyone|forever)|goodbye forever)\b/, tier: 'urgent', label: 'farewell language', severity: 96 },
  { re: /\b(i (do not|don't) want to (wake up|be alive)|i hope i (do not|don't) wake up|i wish i (do not|don't) wake up)\b/, tier: 'urgent', label: 'wish to not wake up', severity: 94 },
  { re: /\b(i (am|feel) (suicidal|like killing myself|like ending it))\b/, tier: 'urgent', label: 'self-described suicidal state', severity: 94 },
  { re: /\b(i (am|feel) (ready|prepared) to die|i (am|feel) (done|finished) with life)\b/, tier: 'urgent', label: 'readiness to die', severity: 93 },

  // --- Elevated: ideation without plan / strong risk markers --------
  { re: /\b(i (do not|don't) want to be here( anymore| no more)?|i (do not|don't) want to exist)\b/, tier: 'elevated', label: 'wish to not be here', severity: 82 },
  { re: /\b(i wish (i was|i were) dead|i wish i (was|were) not (born|here)|wish i (was|were) never born)\b/, tier: 'elevated', label: 'death wish', severity: 85 },
  { re: /\b(tired of (living|this life|being alive)|i don tire for this life|i dey tire for life|i am tired of life)\b/, tier: 'elevated', label: 'exhaustion with living', severity: 82 },
  { re: /\b(better off dead|better off without me|everyone would be better off|world would be better without me)\b/, tier: 'elevated', label: 'perceived burdensomeness', severity: 84 },
  { re: /\b(no reason to live|nothing to live for|nothing left to live for|nothing worth living for)\b/, tier: 'elevated', label: 'no reason to live', severity: 85 },
  { re: /\b(thinking about (suicide|dying|death)|thoughts? of (suicide|dying|death)|think about dying|suicidal thoughts|suicidal)\b/, tier: 'elevated', label: 'suicidal thoughts', severity: 84 },
  { re: /\b(want to (disappear|vanish|sleep forever|not wake up)|wish i could disappear)\b/, tier: 'elevated', label: 'escape wish', severity: 74 },
  { re: /\b(no one would (notice|care) if i (was|were) gone|nobody would miss me)\b/, tier: 'elevated', label: 'perceived invisibility', severity: 78 },
  { re: /\b(i (do not|don't) see (a|any) (future|way out)|no way out|feel trapped forever)\b/, tier: 'elevated', label: 'hopelessness with entrapment', severity: 74 },
  { re: /\b(self[- ]?harm|cutting myself|burning myself|hurt myself on purpose)\b/, tier: 'elevated', label: 'self-harm language', severity: 80 },

  // --- Watch: passive hopelessness ---------------------------------
  { re: /\b(hopeless|no hope|what is the point|what is the use|pointless|nothing matters)\b/, tier: 'watch', label: 'hopelessness', severity: 52 },
  { re: /\b(i (cannot|can't) (go on|keep going|take it anymore|do this anymore))\b/, tier: 'watch', label: 'can no longer cope', severity: 60 },
  { re: /\b(give up|giving up|given up|quit everything)\b/, tier: 'watch', label: 'giving up', severity: 50 },
  { re: /\b(i (am|feel) (a burden|worthless|empty|numb)|i hate myself|i am a failure|i feel like a failure)\b/, tier: 'watch', label: 'self-directed despair', severity: 56 },
  { re: /\b(die alone|die without|no future|never get better|trapped)\b/, tier: 'watch', label: 'entrapment', severity: 48 },

  // --- Third-party risk (reported speech) ---------------------------
  { re: /\b(he|she|they|my (friend|sister|brother|cousin|mate|classmate|roommate|neighbour|neighbor|son|daughter))\b.{0,40}\b(wants? to die|wants? to kill (him|her|them)self|said (he|she|they) (wants? to die|is suicidal)|is suicidal|keeps saying (he|she|they) wants? to die)\b/, tier: 'watch', label: 'risk reported in someone else', severity: 45 },

  // --- Pidgin / Ghanaian English risk phrases -----------------------
  { re: /\b(i no want (wake up|live|be alive|exist)|i no want wake up)\b/, tier: 'urgent', label: 'wish to not wake up (Pidgin)', severity: 94 },
  { re: /\b(i go (kill myself|end my life|drink sniper)|i dey (think|plan) say i go kill myself)\b/, tier: 'urgent', label: 'stated intent (Pidgin)', severity: 97 },
  { re: /\b(i dey tire for life|i don tire for this life|life no make sense|i no dey see future)\b/, tier: 'elevated', label: 'exhaustion with life (Pidgin)', severity: 80 },
  { re: /\b(i no fit (continue|go on)|my head no correct|i dey craze)\b/, tier: 'watch', label: 'distress (Pidgin)', severity: 55 },

  // --- Means present, or acute intent -------------------------------
  { re: /\b(i (am|have|got) (the )?(blade|razor|knife|rope|gun|pills|tablets|poison|sniper|charcoal|insecticide) (in|with) my (hand|hands|bag|pocket)|i (am|have) (holding|holding onto|holding the) (blade|razor|knife|rope|gun|pills|tablets|poison|sniper))\b/, tier: 'urgent', label: 'means at hand', severity: 98 },
  { re: /\b(i (do not|don't) know what i (will|might|would) do|i (am|feel) (afraid|scared) of what i (will|might) do)\b/, tier: 'urgent', label: 'fear of own actions', severity: 93 },
  { re: /\b(writing (goodbye|farewell) (messages?|notes?)|said my goodbyes?|this is goodbye)\b/, tier: 'urgent', label: 'farewell preparation', severity: 94 },
  { re: /\b(i (do not|don't) think i can (keep going|go on|make it|hold on))\b/, tier: 'elevated', label: 'can no longer cope', severity: 66 },

];

/** Contexts that cancel a risk match (protective or figurative use). */
export const RISK_SUPPRESSIONS: { re: RegExp; note: string }[] = [
  { re: /\b(i (do not|don't|did not|didn't|would never|will never) (want|plan|intend|try) to (die|kill myself|hurt myself|end my life))\b/, note: 'you said you do not want to act on it' },
  { re: /\b(never (going to|gonna) (kill myself|hurt myself|end my life)|not suicidal)\b/, note: 'you explicitly ruled it out' },
  { re: /\b((die|dying|died) (of|from) (laughter|laughing|shame|hunger))\b/, note: 'figurative use of "die"' },
  { re: /\b((dying|died) (to|for) (see|know|eat|meet|try)|to die for|dead tired|killing it|killed it)\b/, note: 'idiom, not risk language' },
  { re: /\b(when i die|if i die|before i die|one day i will die)\b/, note: 'future or hypothetical mention' },
  { re: /\b(i (could|would) (die|kill) (for|of)|scared to death|bored to death|worried to death)\b/, note: 'figurative use' },
  { re: /\b(suicide (is|prevention|awareness)|about suicide|suicide rate|people who (die by suicide|attempt))\b/, note: 'talking about suicide in general' },
  { re: /\b(my (friend|sister|brother|cousin|mate|colleague|roommate|classmate|neighbour|neighbor)|he|she|they) (said|says|told me|thinks|wants to|is)\b/, note: 'this appears to be about someone else' },
  { re: /\b(never|not) (been )?suicidal\b|\bi am not (suicidal|thinking about suicide)\b/, note: 'you said you are not suicidal' },
  { re: /\bsuicide (awareness|prevention|training|is|rates?)\b|\babout suicide (in general|at work)\b/, note: 'talking about suicide in general' },
];

/** First-person and third-person cues for subject attribution. */
export const FIRST_PERSON = new Set(['i', 'me', 'my', 'myself', 'mine', 'am']);
export const THIRD_PERSON_CUES = new Set([
  'friend', 'friends', 'sister', 'brother', 'cousin', 'mate', 'matey', 'roommate',
  'classmate', 'neighbour', 'neighbor', 'colleague', 'he', 'she', 'they', 'someone',
  'somebody', 'mum', 'mom', 'mother', 'dad', 'father', 'aunt', 'uncle', 'pastor',
]);

/** Short, human verification prompts used to sanity-check a reading. */
export const CHECK_PROMPTS = [
  'Does this reading feel true to how the day felt?',
  'You are the expert on you — adjust it if we read it wrong.',
  'A hard entry is still worth writing. You showed up.',
];

export const GHANAIAN_SAMPLE_ENTRIES: { label: string; text: string }[] = [
  {
    label: 'A heavy Tuesday',
    text: 'Chale, I am so tired. I could not sleep again last night, my head was just going. I no dey chop well and everything at work is pressure. I feel like I am carrying something I cannot put down.',
  },
  {
    label: 'Pidgin — fed up',
    text: 'I don tire for this life. Nobody dey hear me for house, and when I talk they say I dey do drama. I just want make everything stop small. I dey try but the wahala too much.',
  },
  {
    label: 'A good day',
    text: 'Today was better. I woke up early, went for a walk before the sun came strong, and I actually ate. My sister called me and we laughed for a long time. Medaase, God.',
  },
  {
    label: 'Stigma at home',
    text: 'I tried to tell my mother that I think I need to see someone and she said it is a spiritual attack, that I should not let people know. Now I am scared to even write this. What will people say?',
  },
];

/** Risk-language examples for the in-app "what happens if…" explainer. */
export const RISK_EXAMPLE = 'I keep thinking everyone would be better off without me. I do not want to wake up tomorrow.';


/**
 * Composite escalation: an *intent cue* plus a *death cue* in the same entry is
 * more dangerous than either alone ("I have decided" + "this is the end").
 * This catches plan-like writing that has no single explicit sentence.
 */
export const INTENT_CUES: RegExp[] = [
  /\bi have decided\b/, /\bi have made up my mind\b/, /\bi have a plan\b/,
  /\bi have what i need\b/, /\bi have everything i need\b/, /\bi am ready\b/,
  /\bi have set (a|the) date\b/, /\bthis is my last\b/, /\bmy last (message|note|entry)\b/,
  /\bi am going to do it\b/, /\btonight i (will|go)\b/, /\btomorrow i (will|go)\b/,
  /\bnot (their|your|his|her) fault\b/, /\bsomeone (should|will) know\b/,
  /\bwriting (goodbye|farewell)\b/, /\bsaid my goodbyes?\b/, /\bgoodbye forever\b/,
  /\bi do not know what i will do\b/, /\bi cannot stop thinking about doing it\b/,
  /\bi do not want to be a burden anymore\b/,
];

export const DEATH_CUES: RegExp[] = [
  /\bdie\b/, /\bdeath\b/, /\bdead\b/, /\bkill\b/, /\bsuicide\b/, /\bsuicidal\b/,
  /\bend it\b/, /\bend my\b/, /\bgoodbye\b/, /\bfuneral\b/, /\bgrave\b/,
  /\bnot wake up\b/, /\bdisappear\b/, /\bpills\b/, /\bblade\b/, /\brope\b/,
  /\bsniper\b/, /\bpoison\b/, /\boverdose\b/, /\bhanging\b/, /\bcut myself\b/,
];


/**
 * Finality cues: language that reads like settling accounts. Dangerous when
 * paired with either death language or explicit planning, which is how
 * "I have decided. I have a plan and I have what I need. I am writing this so
 * someone knows it was not their fault" gets caught without relying on a
 * single explicit sentence.
 */
export const FINALITY_CUES: RegExp[] = [
  /\bso (someone|somebody|you) knows\b/,
  /\bnot (their|your|his|her|my) fault\b/,
  /\bthis is my last\b/, /\bmy last (message|note|entry|words)\b/,
  /\bgoodbye forever\b/, /\bsaid my goodbyes?\b/,
  /\bi have decided\b/, /\bi have made up my mind\b/,
  /\bi have a plan\b/, /\bi have what i need\b/, /\bi have everything i needed?\b/,
];

export const PLANNING_CUES: RegExp[] = [
  /\bi have a plan\b/, /\bi have what i need\b/, /\bi have everything i need\b/,
  /\bi have (the|my) (rope|blade|pills|tablets|gun|poison|sniper)\b/,
  /\btonight i (will|go)\b/, /\bthis weekend i (will|go)\b/,
];
