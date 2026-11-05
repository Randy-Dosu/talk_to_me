/**
 * Hand-labelled evaluation corpus (English + Ghanaian English/Pidgin).
 *
 * Each case has two targets:
 *   mood  — the band a careful human rater would assign to the entry;
 *   risk  — the safety tier a triage nurse would assign, with `urgent` meaning
 *           "needs a human now".
 *
 * The `split` field matters: rules were iterated against `dev` only. `test`
 * cases were written at the same time and deliberately not used for tuning, so
 * the reported test numbers are a fairer (still in-house) estimate. See
 * docs/RESEARCH.md §6 for why in-house numbers are not clinical validation.
 */

import type { MoodBand, RiskLevel } from '../types';

export interface EvalCase {
  id: string;
  text: string;
  mood: MoodBand;
  risk: RiskLevel;
  context: 'en' | 'gh';
  split: 'dev' | 'test';
  note?: string;
}

export const EVAL_CORPUS: EvalCase[] = [
  /* ---------------- DEV: low mood, no risk ---------------- */
  { id: 'd01', split: 'dev', context: 'gh', mood: 'heavy', risk: 'none', text: 'Chale I am so tired. I could not sleep again last night and my head was just going the whole time. I no dey chop well and everything at work is pressure.' },
  { id: 'd02', split: 'dev', context: 'en', mood: 'unsettled', risk: 'none', text: 'Today was hard. I stayed in my room most of the day and did not reply to anyone. I just did not have the energy to explain myself.' },
  { id: 'd03', split: 'dev', context: 'en', mood: 'heavy', risk: 'watch', note: 'passive hopelessness', text: 'I feel empty. I sit in lectures and hear nothing. I keep asking myself what the point of all this is, because nothing I do seems to matter.' },
  { id: 'd04', split: 'dev', context: 'gh', mood: 'unsettled', risk: 'none', text: 'The dumsor last night spoiled my sleep and this morning I could not concentrate at all. Small things are annoying me too much. I just want rest.' },
  { id: 'd05', split: 'dev', context: 'en', mood: 'unsettled', risk: 'none', text: 'I am worried about money again. Rent is due, my mother needs medicine, and I do not know where the next payment is coming from. My chest feels tight when I think about it.' },
  { id: 'd06', split: 'dev', context: 'en', mood: 'heavy', risk: 'watch', note: 'perceived burdensomeness', text: 'I miss her so much. Everything reminds me of her and I ended up crying in the trotro. I feel like I am a burden to my friends when I talk about it.' },
  { id: 'd07', split: 'dev', context: 'gh', mood: 'unsettled', risk: 'none', text: 'Wahala at home. My father shouted at me again and I just kept quiet. I don tire small but I will manage. Tomorrow is another day.' },
  { id: 'd08', split: 'dev', context: 'en', mood: 'heavy', risk: 'watch', note: 'self-directed despair', text: 'I cannot get out of bed before noon these days. I missed two lectures this week. I feel like a failure and I am ashamed to tell my parents.' },
  { id: 'd09', split: 'dev', context: 'en', mood: 'heavy', risk: 'none', text: 'I am exhausted all the time. I sleep but I wake up tired. My head dey pain me every evening and I have no appetite.' },
  { id: 'd10', split: 'dev', context: 'gh', mood: 'unsettled', risk: 'watch', note: 'passive hopelessness', text: 'Chale the hustle is not easy. I have been to three interviews and nothing. I am trying small small but sometimes I ask myself what is the use.' },

  /* ---------------- DEV: risk ---------------- */
  { id: 'd11', split: 'dev', context: 'gh', mood: 'heavy', risk: 'elevated', text: 'I don tire for this life. I no want wake up tomorrow. Nothing I do is working and I am tired of living like this.' },
  { id: 'd12', split: 'dev', context: 'en', mood: 'heavy', risk: 'urgent', text: 'I have been thinking about how I would do it. I know where I would go. I do not want to be here anymore.' },
  { id: 'd13', split: 'dev', context: 'en', mood: 'heavy', risk: 'elevated', text: 'I keep thinking everyone would be better off without me. I am just a burden to my family and they would manage without me.' },
  { id: 'd14', split: 'dev', context: 'en', mood: 'unsettled', risk: 'watch', text: 'I feel hopeless about the future. Nothing matters and I cannot see a way out of this. I am so tired of trying.' },
  { id: 'd15', split: 'dev', context: 'en', mood: 'heavy', risk: 'urgent', text: 'I cut my arm again last night. I did not want to but the feeling was too loud. I am scared of myself.' },
  { id: 'd16', split: 'dev', context: 'en', mood: 'heavy', risk: 'urgent', text: 'I took the pills. I am not sure how many. I am writing this because I do not know what else to do.' },
  { id: 'd17', split: 'dev', context: 'gh', mood: 'heavy', risk: 'urgent', text: 'Chale I want to die. I have been saving the money for my own funeral small small. I cannot do this anymore.' },
  { id: 'd18', split: 'dev', context: 'en', mood: 'heavy', risk: 'elevated', text: 'I wish I was dead. I think about dying every day on the way home. I do not have a plan but the thought is always there.' },
  { id: 'd19', split: 'dev', context: 'en', mood: 'heavy', risk: 'watch', note: 'third-party risk: writer is reporting a friend', text: 'My friend told me last week that he wants to die. I do not know what to do. I am scared for him and I cannot stop thinking about it.' },
  { id: 'd20', split: 'dev', context: 'en', mood: 'bright', risk: 'none', note: 'positive idiom: dying to see / die of laughter', text: 'I am dying to see my sister again, she is coming from Kumasi this weekend. I could die of laughter with her, we laugh until our stomachs hurt.' },
  { id: 'd21', split: 'dev', context: 'en', mood: 'steady', risk: 'none', text: 'When I die, I want to be buried in my hometown beside my grandmother. That is the only thing I am sure of. For now I am fine and working.' },
  { id: 'd22', split: 'dev', context: 'gh', mood: 'heavy', risk: 'none', note: 'stigma + distress, no self-harm language', text: 'I told my mother I think I need to see someone and she said it is a spiritual attack. She said I should not let people know. Now I am scared to even write this. What will people say?' },
  { id: 'd23', split: 'dev', context: 'en', mood: 'unsettled', risk: 'none', text: 'I am so stressed about my exams. I cannot sleep, I keep forgetting what I read, and my heart beats fast when I open the past questions.' },
  { id: 'd24', split: 'dev', context: 'en', mood: 'unsettled', risk: 'none', text: 'I feel alone even when I am with people. Nobody understands what I am carrying. I have stopped talking to my friends because it is easier.' },

  /* ---------------- DEV: fine / positive ---------------- */
  { id: 'd25', split: 'dev', context: 'gh', mood: 'bright', risk: 'none', text: 'Today was better. I woke up early, walked before the sun came strong and I actually ate. My sister called and we laughed for a long time. Medaase, God.' },
  { id: 'd26', split: 'dev', context: 'en', mood: 'bright', risk: 'none', text: 'I got the job! I am so happy, I called my mum immediately and she screamed. All those months of interviews were not wasted. I feel light today.' },
  { id: 'd27', split: 'dev', context: 'en', mood: 'steady', risk: 'none', text: 'An ordinary day. Class, lunch, a bit of football with the boys. Nothing exciting but nothing heavy either. I am okay.' },
  { id: 'd28', split: 'dev', context: 'en', mood: 'steady', risk: 'none', text: 'I am tired but in a normal way, not the heavy kind. I finished my assignment and I am going to sleep early. Small wins.' },
  { id: 'd29', split: 'dev', context: 'gh', mood: 'bright', risk: 'none', text: 'I dey try and today it showed. My shop made small profit, the customer came back, and I bought kenkey for the family. E go better, I believe.' },
  { id: 'd30', split: 'dev', context: 'en', mood: 'steady', risk: 'none', text: 'I am grateful for my small group at church. We prayed together and I felt seen. I am still worried about school but I am not alone.' },

  /* ---------------- DEV: hard edge cases ---------------- */
  { id: 'd31', split: 'dev', context: 'en', mood: 'heavy', risk: 'none', note: 'ambivalent protective statement', text: 'I do not want to die. I just want the pain to stop. I am so tired of hurting and I do not know how to explain it to anyone.' },
  { id: 'd32', split: 'dev', context: 'en', mood: 'heavy', risk: 'elevated', text: 'I am suicidal but I would not act on it. I just needed to write it somewhere. The thoughts come at night and they are loud.' },
  { id: 'd33', split: 'dev', context: 'en', mood: 'bright', risk: 'none', note: 'positive idiom: killing it', text: 'Killing it at work this week. My manager said the report was excellent. I am proud of myself, honestly.' },
  { id: 'd34', split: 'dev', context: 'en', mood: 'bright', risk: 'none', text: 'I laughed with my friends today but I still want to die.' },
  { id: 'd35', split: 'dev', context: 'en', mood: 'heavy', risk: 'urgent', text: 'I have not left my bed in three days. I have been writing goodbye messages in my head. I do not think I can keep going.' },
  { id: 'd36', split: 'dev', context: 'en', mood: 'steady', risk: 'none', text: 'Suicide awareness training at work today. Heavy topic, but I am glad we talked about it openly. I am okay.' },

  /* ---------------- TEST: everyday entries ---------------- */
  { id: 't01', split: 'test', context: 'en', mood: 'unsettled', risk: 'none', text: 'Work was too much today. My supervisor shouted at me in front of everyone and I felt small. I came home and just sat in the dark for an hour.' },
  { id: 't02', split: 'test', context: 'gh', mood: 'heavy', risk: 'none', text: 'Chale I am not okay. I have been crying in my room since morning. The pressure from home and school is too much and I feel trapped.' },
  { id: 't03', split: 'test', context: 'en', mood: 'heavy', risk: 'none', text: 'Sleep is finished for me. I wake up at 3am every night and my mind just runs. I am always tired and I have no appetite.' },
  { id: 't04', split: 'test', context: 'en', mood: 'bright', risk: 'none', text: 'My brother graduated today! The whole family came and we ate jollof until we could not move. I am so proud of him and so grateful.' },
  { id: 't05', split: 'test', context: 'gh', mood: 'steady', risk: 'none', text: 'Market was slow today but I dey manage. I sold small and I am grateful for the customers who came. Life hard but we dey try.' },
  { id: 't06', split: 'test', context: 'en', mood: 'unsettled', risk: 'none', text: 'I keep comparing myself to everyone on Instagram and I feel like I am behind in life. I am anxious about the future and I cannot relax.' },
  { id: 't07', split: 'test', context: 'en', mood: 'heavy', risk: 'none', text: 'I feel like I am invisible at home. Nobody asks how I am. I am lonely and I do not know how to say it without sounding ungrateful.' },
  { id: 't08', split: 'test', context: 'en', mood: 'heavy', risk: 'none', text: 'I failed the exam. I studied so hard. I feel worthless and I am ashamed to face my father. Maybe I am just not smart enough.' },
  { id: 't09', split: 'test', context: 'gh', mood: 'unsettled', risk: 'none', text: 'My heart dey beat fast when I think about the rent. I cannot sleep, I am overthinking everything. I just need money to come.' },
  { id: 't10', split: 'test', context: 'en', mood: 'bright', risk: 'none', text: 'Today I woke up and the first thing I noticed was the sun. I ate breakfast, called my mum, and told her I love her. It is a good day.' },

  /* ---------------- TEST: risk ---------------- */
  { id: 't11', split: 'test', context: 'en', mood: 'heavy', risk: 'elevated', text: 'I do not want to be here anymore. I am tired of this life and nothing is changing. I wish I could just disappear.' },
  { id: 't12', split: 'test', context: 'en', mood: 'heavy', risk: 'urgent', text: 'I have decided. I have a plan and I have what I need. I am writing this so someone knows it was not their fault.' },
  { id: 't13', split: 'test', context: 'en', mood: 'heavy', risk: 'urgent', text: 'I want to kill myself. I cannot stop thinking about it. I am afraid of what I will do tonight.' },
  { id: 't14', split: 'test', context: 'gh', mood: 'heavy', risk: 'elevated', text: 'My head no correct. Everything dey worry me and I keep thinking better off dead. I no dey see future for myself.' },
  { id: 't15', split: 'test', context: 'en', mood: 'heavy', risk: 'elevated', text: 'Every night I hope I do not wake up. I do not have a plan but I wish I could stop existing for a while.' },
  { id: 't16', split: 'test', context: 'en', mood: 'heavy', risk: 'watch', text: 'I cannot go on like this. I am so tired and everything feels pointless. I do not know what to do anymore.' },
  { id: 't17', split: 'test', context: 'en', mood: 'heavy', risk: 'elevated', text: 'I am thinking about death a lot. Not in a dramatic way. It just feels like a quiet door I could walk through.' },
  { id: 't18', split: 'test', context: 'en', mood: 'heavy', risk: 'urgent', text: 'I am writing this in the bathroom. I have the blade in my hand. I do not know who to call.' },
  { id: 't19', split: 'test', context: 'gh', mood: 'heavy', risk: 'urgent', text: 'I don tire. I dey think say I go kill myself tonight. I no want anybody to suffer because of me.' },
  { id: 't20', split: 'test', context: 'en', mood: 'unsettled', risk: 'watch', note: 'third-party risk', text: 'My cousin said he is worthless and that there is no reason to live. I told him to talk to me but I am worried about him.' },

  /* ---------------- TEST: idioms, negation, misc ---------------- */
  { id: 't21', split: 'test', context: 'en', mood: 'bright', risk: 'none', text: 'This new song is to die for. I have played it about forty times and I am not tired of it.' },
  { id: 't22', split: 'test', context: 'en', mood: 'steady', risk: 'none', text: 'I have never been suicidal and I am not trying to be dramatic. I am just stressed about money like everyone else.' },
  { id: 't23', split: 'test', context: 'en', mood: 'unsettled', risk: 'none', text: 'I am scared of disappointing my parents. They sacrificed so much. I do not want to tell them I am struggling because they would not understand.' },
  { id: 't24', split: 'test', context: 'en', mood: 'bright', risk: 'none', text: 'We won the match! The whole street was outside, someone brought speakers, the children were dancing. I have not felt this happy in weeks.' },
  { id: 't25', split: 'test', context: 'gh', mood: 'unsettled', risk: 'none', text: 'I went to church and I felt small peace but the worry came back when I reached home. I am trusting God but the pressure dey worry me.' },
  { id: 't26', split: 'test', context: 'en', mood: 'heavy', risk: 'none', text: 'I am so exhausted and empty. I do not enjoy food, I do not enjoy music. I just want this numbness to end.' },
  { id: 't27', split: 'test', context: 'en', mood: 'steady', risk: 'none', text: 'I am not okay today but I have been through worse. I talked to my auntie and she listened for an hour. Tomorrow I will try again.' },
  { id: 't28', split: 'test', context: 'en', mood: 'heavy', risk: 'elevated', text: 'I am tired of living and I have nothing to live for. I would not call it a plan but the thought is there every single day.' },
  { id: 't29', split: 'test', context: 'gh', mood: 'bright', risk: 'none', text: 'My small sister passed her exams, we are all so proud of her. God is good. I feel hopeful for the first time in a while.' },
  { id: 't30', split: 'test', context: 'en', mood: 'unsettled', risk: 'none', text: 'I have been withdrawing from my friends. I leave messages on read for days. I know it is not good but talking feels like too much work.' },
];

/** One-line error analysis lines surfaced in the model card. */
export const KNOWN_DIFFICULTIES = [
  {
    id: 'ambivalent-protective',
    label: 'Ambivalent protective statements',
    detail:
      '"I do not want to die, I just want the pain to stop" is simultaneously protective and high-risk. The rule layer treats it as protective; in the test set it is labelled as distress, not risk. A clinician would explore it further — the app never treats "no risk" as an all-clear.',
  },
  {
    id: 'third-party',
    label: 'Third-party risk',
    detail:
      'Entries about someone else ("my cousin said there is no reason to live") are held at "watch" so the writer is not flagged, while support guidance is still offered. The subject classifier is rule-based and will miss reported speech in long paragraphs.',
  },
  {
    id: 'figurative',
    label: 'Figurative and cultural language',
    detail:
      'Idioms ("to die for", "killing it", "when I die…") are suppressed by an explicit list. Any idiom not on that list can be misread; the suppress list is the most frequently edited file in the engine.',
  },
  {
    id: 'sarcasm',
    label: 'Sarcasm and irony',
    detail:
      'Inherited from both VADER and lexicon approaches: "great, another power cut" reads as positive. Production plans use a fine-tuned transformer with sarcasm-annotated data; the rule engine cannot fix this.',
  },
  {
    id: 'labels',
    label: 'Label subjectivity',
    detail:
      'The in-house eval labels were written by one annotator. Mood bands are judgement calls at the boundary. A real validation needs at least two annotators per item, a disagreement adjudication step, and Ghanaian clinicians on the panel.',
  },
];
