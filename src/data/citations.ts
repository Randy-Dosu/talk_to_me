/** Sources used across the landing page, research notes and model card. */

export interface Citation {
  id: string;
  short: string;
  detail: string;
  url?: string;
  year?: string;
}

export const CITATIONS: Citation[] = [
  {
    id: 'gh-phq9',
    short: 'Nationwide PHQ-9 survey, Ghana (2026)',
    detail:
      'Of 5,202 respondents, 32.2% screened positive for probable depression; women 34% vs men; higher among lower-education groups.',
    url: 'https://journals.plos.org/mentalhealth/article?id=10.1371%2Fjournal.pmen.0000498',
    year: '2026',
  },
  {
    id: 'gh-sci',
    short: 'Amenah et al., Scientific Reports (2025)',
    detail:
      'Depression prevalence in Ghanaian adults estimated at 10–12% at a given time, but 39% among Greater Accra university students and 58–69% among senior high students in the north.',
    url: 'https://www.nature.com/articles/s41598-025-06134-2',
    year: '2025',
  },
  {
    id: 'who-ghana',
    short: 'WHO Special Initiative for Mental Health — Ghana (2021)',
    detail:
      '39 psychiatrists (0.13 per 100,000) and 244 psychologists (0.78 per 100,000); 9.5 mental health workers per 100,000 in total; services concentrated in the south.',
    url: 'https://cdn.who.int/media/docs/default-source/mental-health/special-initiative/who-special-initiative-country-report---ghana---2021.pdf',
    year: '2021',
  },
  {
    id: 'gh-gap',
    short: 'Community mental health services in Ghana (2026)',
    detail:
      'Treatment gaps exceed 85% in some areas; only 42% of primary healthcare workers feel prepared to handle mental health cases.',
    url: 'https://link.springer.com/article/10.1186/s12982-026-01480-6',
    year: '2026',
  },
  {
    id: 'goemotions',
    short: 'Demszky et al., GoEmotions (2020)',
    detail:
      '58k Reddit comments labelled for 27 emotions + neutral. BERT baseline F1 0.46 on the fine-grained taxonomy, 0.64 on Ekman groups, 0.69 on sentiment.',
    url: 'https://arxiv.org/abs/2005.00547',
    year: '2020',
  },
  {
    id: 'vader',
    short: 'Hutto & Gilbert, VADER (2014)',
    detail:
      'Lexicon and rule-based sentiment tool (~7,500 tokens) tuned for social text; F1 0.96 on tweets, but blind to sarcasm and non-English.',
    url: 'https://ojs.aaai.org/index.php/ICWSM/article/view/14550',
    year: '2014',
  },
  {
    id: 'phq9',
    short: 'Kroenke, Spitzer & Williams, PHQ-9 (2001)',
    detail:
      'A score of ≥10 gives 88% sensitivity and 88% specificity for major depression; the instrument is public domain and used here as a screening aid only.',
    year: '2001',
  },
  {
    id: 'gad7',
    short: 'Spitzer et al., GAD-7 (2006)',
    detail: 'Thresholds of 5, 10 and 15 represent mild, moderate and severe anxiety respectively.',
    year: '2006',
  },
  {
    id: 'item9',
    short: 'PHQ-9 item 9 and suicide risk',
    detail:
      'A positive response on item 9 warrants clinical follow-up regardless of the total score; sensitivity of 92% and specificity of 81% have been reported against structured suicide-risk assessment, which is why it is gated separately in this app.',
    year: '2013',
  },
  {
    id: 'mha',
    short: 'Mental Health Authority, Ghana',
    detail: 'Free, confidential, 24/7 national mental health helpline: 0800 678 678.',
    url: 'https://www.mha-ghana.com/',
  },
  {
    id: 'aph',
    short: 'Accra Psychiatric Hospital',
    detail: '24-hour emergency service, Castle Road, Accra: 0302 228 688.',
    url: 'https://accrapsychiatrichospital.org/contacts/',
  },
];

export function cite(id: string): Citation | undefined {
  return CITATIONS.find((c) => c.id === id);
}
