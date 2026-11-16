import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Database, FlaskConical, Quote } from 'lucide-react';
import { CITATIONS } from '../data/citations';

export default function Research() {
  return (
    <div className="container-page max-w-4xl py-8 lg:py-10">
      <p className="eyebrow">Research notes · November 2026</p>
      <h1 className="mt-2 text-balance font-display text-[2.1rem] leading-tight text-ink md:text-[2.7rem]">
        What we read before we built this.
      </h1>
      <p className="mt-3 text-pretty text-[0.98rem] leading-relaxed text-ink-soft">
        Nkommo exists at the meeting point of three bodies of evidence: the epidemiology of mental distress in Ghana, the
        measurement properties of brief screeners, and the known failure modes of sentiment and emotion models. This page
        records what we found, how it changed the design, and what we deliberately did not claim.
      </p>

      <div className="prose-nkommo mt-8 text-[0.94rem]">
        <h3>1. The problem, in numbers</h3>
        <p>
          Ghana is not short of distress; it is short of disclosure. A nationwide survey of 5,202 adults using the PHQ-9
          found <strong>32.2% screening positive for probable depression</strong>, with women at 34.0% and a clear
          educational gradient (18.5% among those with higher education versus higher rates in lower-education groups){' '}
          <a href={CITATIONS[0].url} target="_blank" rel="noreferrer">[1]</a>. Estimates vary by population and instrument:
          roughly 10–12% of adults at a given time in national data, but 39% among Greater Accra university students and
          58–69% among senior high students in the north <a href={CITATIONS[1].url} target="_blank" rel="noreferrer">[2]</a>.
        </p>
        <p>
          The workforce cannot absorb that. Ghana has <strong>39 psychiatrists (0.13 per 100,000)</strong> and{' '}
          <strong>244 psychologists (0.78 per 100,000)</strong> against an estimated 2.3 million people needing care —
          roughly one psychiatrist for every 850,000 people <a href={CITATIONS[2].url} target="_blank" rel="noreferrer">[3]</a>.
          Treatment gaps exceed 85% in some areas, services concentrate in the south, and only 42% of primary healthcare
          workers report feeling prepared to handle mental health cases{' '}
          <a href={CITATIONS[3].url} target="_blank" rel="noreferrer">[4]</a>.
        </p>
        <p>
          Stigma sits on top of that scarcity. Distress is frequently interpreted as spiritual attack or as madness, and
          disclosure risks family reputation and marriage prospects. In that context a public, identifiable mental health
          tool is not neutral: it can expose the very person it is trying to help. That single finding drove the largest
          design decision in this product — <strong>the analysis runs on the device, and there is no account</strong>.
        </p>

        <h3>2. Why a journal, and why measurement</h3>
        <p>
          Screening instruments work. The PHQ-9 maps onto the nine DSM symptoms of a major depressive episode and, at a
          cutoff of 10, reports roughly 88% sensitivity and specificity for major depression; the GAD-7 uses identical
          scoring logic with thresholds at 5, 10 and 15 <a href="#refs">[7][8]</a>. Item 9 deserves separate treatment:
          any endorsement warrants follow-up regardless of total score, and studies against structured risk assessment
          report sensitivity around 92% and specificity around 81% for item 9 as a suicide-risk screen{' '}
          <a href="#refs">[9]</a>. Nkommo therefore gates item 9 independently in code, not as a footnote.
        </p>
        <p>
          Free text adds something the questionnaires cannot: timing. A PHQ-9 taken monthly is a snapshot; a journal is a
          time series. Sleep disruption, withdrawal and the phrase &ldquo;I am fine&rdquo; appearing more often than usual
          are leading indicators, and they are visible in writing before a score moves.
        </p>

        <h3>3. What the model literature actually says</h3>
        <p>
          VADER remains a strong, cheap baseline for short informal English. Its lexicon-plus-rules approach reported F1
          0.96 on tweets, with rule layers for negation, intensity, punctuation and contrast{' '}
          <a href={CITATIONS[5].url} target="_blank" rel="noreferrer">[6]</a>. It is also transparent — every score can be
          traced to words and rules. Its weaknesses are equally well documented: sarcasm is taken at face value, the
          negation window is only three tokens, non-English text is out of scope, and specialised vocabulary is missing.
        </p>
        <p>
          Transformer models improve domain accuracy when labelled data exists. GoEmotions provides 58k Reddit comments
          annotated for 27 emotions plus neutral; the original BERT baseline achieved mean F1 0.46 on the fine-grained
          taxonomy, 0.64 on Ekman groups and 0.69 on sentiment{' '}
          <a href={CITATIONS[4].url} target="_blank" rel="noreferrer">[5]</a>. It is also the clearest illustration of the
          problem with using such data uncritically in Ghana: the corpus is English Reddit, annotated largely by Indian
          English speakers, with severe class imbalance, and it contains no Twi, Ga, Ewe, Hausa or Ghanaian Pidgin.
        </p>
        <p>
          Our reading of that literature is not &ldquo;use a transformer&rdquo; or &ldquo;use a lexicon&rdquo;. It is that
          the transformer is the right production target <em>for the languages and populations you have labels for</em>{' '}
          — and that a deterministic, auditable baseline is the right thing to ship while you collect them. It also means
          the product should say which language it can read rather than silently misreading Twi as neutral.
        </p>

        <h3>4. Datasets we planned around</h3>
        <div className="not-prose my-4 grid gap-2">
          {[
            {
              name: 'GoEmotions (58k, 27 emotions)',
              role: 'Emotion taxonomy and negative-class design',
              caveat: 'Reddit English; annotator demographics not Ghanaian; heavy imbalance',
            },
            {
              name: 'Mental Health Reddit corpora',
              role: 'Risk-language patterns and triage phrasing',
              caveat: 'Self-selected online population; US-centric help-seeking; cannot be used to infer prevalence',
            },
            {
              name: 'PHQ-9 / GAD-7 response data',
              role: 'Score bands, thresholds, item-9 gating',
              caveat: 'Screening, not diagnosis; performance varies by prevalence and setting',
            },
            {
              name: 'Ghanaian English / Pidgin seed lexicon',
              role: 'Local phrasing that standard lexicons miss',
              caveat: 'Hand-written, provisional, pending native-speaker annotation',
            },
          ].map((dataset) => (
            <div key={dataset.name} className="rounded-xl border border-line bg-white/60 p-3 text-[0.82rem]">
              <p className="flex items-center gap-1.5 font-medium text-ink">
                <Database size={12} className="text-forest" /> {dataset.name}
              </p>
              <p className="mt-1 text-ink-soft">Use: {dataset.role}</p>
              <p className="text-[0.75rem] text-ink-muted">Caveat: {dataset.caveat}</p>
            </div>
          ))}
        </div>

        <h3>5. How the research changed the build</h3>
        <div className="not-prose my-4 overflow-hidden rounded-xl border border-line">
          <table className="w-full border-collapse text-[0.8rem]">
            <thead className="bg-paper-deep/70 text-left text-[0.7rem] uppercase tracking-[0.08em] text-ink-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Finding</th>
                <th className="px-3 py-2 font-medium">Decision</th>
              </tr>
            </thead>
            <tbody className="text-ink-soft">
              {[
                ['Stigma makes disclosure dangerous', 'No account, no server, on-device analysis, alias by default'],
                ['Somatic and Pidgin phrasing carries distress', 'Hand-built local lexicon with explainable evidence'],
                ['Item 9 is safety-critical', 'Separate gating; any score ≥ 1 opens the crisis card'],
                ['VADER is blind to sarcasm and negation scope', 'Sentence-level suppression, disclosure of suppression, transformer flagged as future work'],
                ['GoEmotions is not Ghanaian', 'Local seed lexicon, language-coverage warnings, native annotation on the roadmap'],
                ['Models miss things', 'No false all-clear: “none” is described as “no safety signal”, never “you are safe”'],
                ['Risk language can be about someone else', 'Subject attribution, separate help-a-friend guidance'],
              ].map(([finding, decision]) => (
                <tr key={finding} className="border-t border-line/70">
                  <td className="px-3 py-2 align-top">{finding}</td>
                  <td className="px-3 py-2 align-top text-ink">{decision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>6. Evaluation, honestly</h3>
        <p>
          We wrote 66 labelled entries in English and Ghanaian English/Pidgin, split 36 for development and 30 held back,
          and ran the shipping engine against them. On the held-out split, high-risk recall was 100% and urgent recall
          100%, with 2 false alarms; mood-band agreement was 73% with a mean absolute error of 9.2 points. Those numbers
          are in the <Link to="/model">model card</Link>, including the confusion matrices and the cases we got wrong.
        </p>
        <p>
          They are also <em>in-house</em> numbers, produced by the same people who wrote the rules, on a corpus they also
          wrote. That is a pipeline sanity check, not validation. A defensible evaluation needs independent annotators,
          Ghanaian clinicians, prospective outcome data, and a pre-registered analysis. Until then, no number from this
          project should be cited as evidence that the tool works clinically.
        </p>

        <h3>7. Ethics, law and safeguarding</h3>
        <ul>
          <li>
            <strong>Consent and capacity.</strong> A journaling tool should not create a duty-of-care it cannot discharge.
            Nkommo offers help, never coerces, and never blocks writing.
          </li>
          <li>
            <strong>Data protection.</strong> Even local-only processing is processing. Ghana&rsquo;s Data Protection Act,
            2012 (Act 843) and the Mental Health Act, 2012 (Act 846) both matter for a real deployment, particularly the
            confidentiality provisions for people receiving mental health care.
          </li>
          <li>
            <strong>Third-party alerts.</strong> Contacting someone else about a person&rsquo;s mental state is a serious
            step. Any production implementation needs documented consent, an escalation policy, and a way to revoke — which
            is why this build only drafts and previews.
          </li>
          <li>
            <strong>Do no harm in the negative case.</strong> A missed urgent case is the worst possible failure. The risk
            layer is deliberately conservative, and the app states that a &ldquo;none&rdquo; reading is not an all-clear.
          </li>
          <li>
            <strong>No surveillance.</strong> No analytics, no trackers, no background monitoring, no employer or insurer
            access. If a future version adds accounts, that decision must be user-visible and reversible.
          </li>
        </ul>

        <h3>8. Limitations of this research</h3>
        <p>
          The literature search behind this build was time-boxed and narrative rather than systematic; it should be
          replaced by a formal review before any clinical claim is made. Prevalence figures vary substantially by
          instrument, region and population, and should not be treated as interchangeable. The Ghanaian lexicon is
          provisional and was written by the build team, not by a panel of native speakers. The evaluation corpus is small
          and single-annotator.
        </p>

        <h3>9. Development stages</h3>
        <p>
          The build is organised into nine stages with explicit exit criteria, kept in <code>docs/ROADMAP.md</code>.
          Stages 0–7 are implemented in this repository; Stage 8 (independent clinical validation) is the gate before any
          real-world pilot, and it is deliberately not something a coding agent can complete.
        </p>
        <div className="not-prose mt-3 grid gap-2 sm:grid-cols-2">
          {[
            ['Stage 0', 'Research and problem framing'],
            ['Stage 1', 'Safety architecture and clinical instruments'],
            ['Stage 2', 'Data, lexicon and annotation design'],
            ['Stage 3', 'Analysis engine and explainability'],
            ['Stage 4', 'App shell, store and design system'],
            ['Stage 5', 'Journal, voice, check-ins, trends'],
            ['Stage 6', 'Safety net: plan, helplines, trusted circle'],
            ['Stage 7', 'Transparency, evaluation harness, research'],
            ['Stage 8', 'Independent validation (not done)'],
            ['Stage 9', 'Production ML + encrypted relay (not done)'],
          ].map(([stage, title]) => (
            <div key={stage} className="flex items-center gap-2 rounded-lg border border-line bg-white/50 px-3 py-1.5 text-[0.78rem]">
              <span className="font-medium text-forest">{stage}</span>
              <span className="text-ink-soft">{title}</span>
            </div>
          ))}
        </div>

        <h3 id="refs" className="scroll-mt-24">References</h3>
        <ol className="not-prose space-y-2">
          {CITATIONS.map((citation, index) => (
            <li key={citation.id} className="flex gap-2 text-[0.8rem] leading-relaxed text-ink-soft">
              <span className="shrink-0 text-ink-muted">[{index + 1}]</span>
              <span>
                {citation.url ? (
                  <a href={citation.url} target="_blank" rel="noreferrer" className="font-medium text-forest underline decoration-forest/30 underline-offset-2">
                    {citation.short} <ArrowUpRight size={10} className="inline" />
                  </a>
                ) : (
                  <span className="font-medium text-ink">{citation.short}</span>
                )}
                {citation.year ? ` (${citation.year})` : ''}. {citation.detail}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white/50 p-4">
        <Quote size={16} className="text-clay" />
        <p className="flex-1 text-[0.8rem] leading-relaxed text-ink-soft">
          &ldquo;Screening is not the same as helping. The tool is only worth building if the step after detection is
          easier than it was before.&rdquo;
        </p>
        <Link to="/safety" className="btn btn-primary text-[0.78rem]">
          The step after detection
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-[0.76rem]">
        <Link to="/model" className="inline-flex items-center gap-1 text-forest">
          <FlaskConical size={12} /> Model card &amp; metrics
        </Link>
        <Link to="/about" className="inline-flex items-center gap-1 text-forest">
          <BookOpen size={12} /> About this project
        </Link>
      </div>
    </div>
  );
}
