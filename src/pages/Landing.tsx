import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  Check,
  HeartHandshake,
  LineChart,
  Lock,
  Mic,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import LiveDemo from '../components/LiveDemo';
import { SectionHeading, Stat } from '../components/ui';
import { CITATIONS } from '../data/citations';

const PHRASE_READINGS = [
  { phrase: '“I don tire for this life.”', reading: 'risk · exhaustion with living', tone: 'text-rose' },
  { phrase: '“Chale, I dey manage.”', reading: 'coping · low mood, not crisis', tone: 'text-[#456b4b]' },
  { phrase: '“My head dey pain me.”', reading: 'body · often where distress starts', tone: 'text-clay' },
  { phrase: '“What will people say?”', reading: 'stigma load', tone: 'text-clay' },
  { phrase: '“Medaase, God.”', reading: 'gratitude · protective', tone: 'text-[#456b4b]' },
];

const STEPS = [
  {
    icon: Mic,
    title: 'Speak it, or type it',
    body: 'Two sentences or twenty. English, Pidgin, half-and-half.',
  },
  {
    icon: BrainCircuit,
    title: 'Read on your device',
    body: 'Valence, eleven emotions, and a separate safety pass for risk language.',
  },
  {
    icon: LineChart,
    title: 'Watch the pattern',
    body: 'Sleep, withdrawal, anxiety, low mood — across weeks, not single days.',
  },
];

export default function Landing() {
  return (
    <div>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden">
        <div className="adinkra-field absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative container-page grid gap-10 pb-14 pt-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-14 lg:pb-20 lg:pt-14">
          <div className="anim-rise">
            <p className="inline-flex items-center gap-2 rounded-full border border-forest/15 bg-white/60 px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.13em] text-forest">
              <span className="h-1.5 w-1.5 rounded-full bg-clay" />
              Accra · private · offline-first
            </p>
            <h1 className="mt-5 text-balance font-display text-[2.8rem] leading-[1.02] tracking-tight text-ink sm:text-[3.4rem]">
              Say it here first.
            </h1>
            <p className="mt-4 max-w-md text-pretty text-[1.02rem] leading-relaxed text-ink-soft">
              A private journal that reads the weather in your writing — and shows you when the pattern turns. Speak it
              or type it. It never leaves this device.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/signup" className="btn btn-primary px-5 py-3 text-[0.9rem]">
                Start privately <ArrowRight size={15} />
              </Link>
              <Link to="/welcome#how" className="btn btn-ghost px-4 py-3 text-[0.9rem]">
                See the pattern view
              </Link>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-4 gap-y-2 text-[0.78rem] text-ink-soft">
              {[
                { icon: Lock, text: 'No account, no server' },
                { icon: ShieldCheck, text: 'Helplines built in' },
                { icon: HeartHandshake, text: '0800 678 678 · 112' },
              ].map((item) => (
                <li key={item.text} className="inline-flex items-center gap-1.5">
                  <item.icon size={13} className="text-forest/70" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="anim-rise delay-2">
            <LiveDemo />
            <p className="mt-2 px-1 text-center text-[0.66rem] text-ink-muted">
              Demo · nothing stored · sample entries written to sound like Accra
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- STATS ---------------- */}
      <section className="border-y border-line/80 bg-white/40">
        <div className="container-page grid gap-6 py-8 sm:grid-cols-3">
          <Stat value="32.2%" label="screened positive for probable depression nationwide" source="PLOS Mental Health, 2026" />
          <Stat value="0.13" label="psychiatrists per 100,000 people" source="WHO, 2021" />
          <Stat value="85%+" label="treatment gap for mood disorders in parts of Ghana" source="Ghana integration review, 2026" />
        </div>
        <div className="container-page pb-4">
          <p className="text-[0.64rem] text-ink-muted">
            {CITATIONS.filter((c) => ['gh-phq9', 'who-ghana', 'gh-gap'].includes(c.id)).map((c) => c.short).join(' · ')} —{' '}
            <Link to="/research" className="underline decoration-ink-muted/40 underline-offset-2">
              full references
            </Link>
          </p>
        </div>
      </section>

      {/* ---------------- HOW IT READS ---------------- */}
      <section className="container-page py-14 lg:py-16">
        <SectionHeading
          eyebrow="What happens to a sentence"
          title="Three layers. Each one you can inspect."
          blurb="No black box making claims about your mind. Every layer leaves something you can read, argue with, or delete."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/8 text-forest">
                  <step.icon size={17} />
                </span>
                <span className="text-[0.64rem] uppercase tracking-[0.14em] text-ink-muted">step {index + 1}</span>
              </div>
              <h3 className="mt-3 font-display text-[1.2rem] leading-snug text-ink">{step.title}</h3>
              <p className="mt-1.5 text-[0.86rem] leading-relaxed text-ink-soft">{step.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line/80 bg-white/50 px-4 py-3 text-[0.8rem] text-ink-soft">
          <BookOpenText size={15} className="text-forest" />
          PHQ-9 and GAD-7 screeners when you want a clinical anchor.
          <Link to="/check-in" className="ml-auto inline-flex items-center gap-1 font-medium text-forest">
            Take one <ArrowRight size={12} />
          </Link>
        </div>
      </section>

      {/* ---------------- LOCAL LANGUAGE ---------------- */}
      <section className="border-y border-line/80 bg-paper-deep/40">
        <div className="container-page grid gap-8 py-14 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:py-16">
          <div>
            <p className="eyebrow">Sounds like home</p>
            <h2 className="mt-2 text-balance font-display text-[1.9rem] leading-tight text-ink md:text-[2.2rem]">
              “I am fine” is not always fine.
            </h2>
            <p className="mt-3 max-w-md text-[0.92rem] leading-relaxed text-ink-soft">
              Off-the-shelf models were trained on different English. This one carries a hand-built Ghanaian English and
              Pidgin layer, so the phrases that carry weight here are read — and explained in your words.
            </p>
            <Link to="/model" className="mt-4 inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-forest">
              Read the model card <ArrowRight size={13} />
            </Link>
          </div>

          <div className="card divide-y divide-line/70 overflow-hidden">
            {PHRASE_READINGS.map((row) => (
              <div key={row.phrase} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
                <p className="font-display text-[1rem] text-ink">{row.phrase}</p>
                <p className={`text-[0.72rem] ${row.tone}`}>{row.reading}</p>
              </div>
            ))}
            <div className="bg-white/50 px-4 py-2 text-[0.66rem] text-ink-muted">
              Seed lexicon · English + Pidgin validated · Twi/Ga/Ewe flagged, never guessed
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- SAFETY ---------------- */}
      <section className="container-page py-14 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow text-rose">Safety is the architecture</p>
            <h2 className="mt-2 text-balance font-display text-[1.9rem] leading-tight text-ink md:text-[2.2rem]">
              When the writing turns dangerous, the reading gets out of the way.
            </h2>
            <ul className="mt-5 space-y-2.5">
              {[
                'Helplines before scores — 0800 678 678, free, 24/7.',
                'Your own safety plan, surfaced when it matters.',
                'A message drafted for one person. Never sent for you.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-[0.88rem] leading-relaxed text-ink-soft">
                  <Check size={14} className="mt-1 shrink-0 text-forest" />
                  {line}
                </li>
              ))}
            </ul>
            <Link to="/safety" className="btn btn-primary mt-5 px-4 py-2.5 text-[0.84rem]">
              Open the safety page <ArrowRight size={14} />
            </Link>
          </div>

          <div className="card overflow-hidden">
            <div className="h-1 w-full bg-rose/70" />
            <div className="p-5">
              <p className="eyebrow text-rose">what you would see</p>
              <h3 className="mt-2 font-display text-[1.2rem] leading-snug text-ink">
                “What you wrote matters. Please talk to a person now.”
              </h3>
              <div className="mt-3 grid gap-2">
                {[
                  { name: 'Authority helpline', number: '0800 678 678', note: 'Free · 24/7' },
                  { name: 'Emergency', number: '112', note: 'Immediate danger' },
                ].map((line) => (
                  <a
                    key={line.name}
                    href={`tel:${line.number.replace(/\s/g, '')}`}
                    className="flex items-center justify-between rounded-xl border border-line bg-white/70 px-3 py-2.5"
                  >
                    <span>
                      <span className="block text-[0.62rem] uppercase tracking-[0.12em] text-ink-muted">{line.name}</span>
                      <span className="font-display text-[1rem] text-forest">{line.number}</span>
                    </span>
                    <span className="text-[0.7rem] text-ink-muted">{line.note}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- LIMITS ---------------- */}
      <section className="border-y border-line/80 bg-white/40">
        <div className="container-page grid gap-8 py-12 md:grid-cols-2">
          <div>
            <p className="eyebrow">Good at</p>
            <ul className="mt-3 space-y-2">
              {['Noticing patterns across weeks', 'Showing its evidence', 'PHQ-9 / GAD-7 with item-9 gating', 'Getting you to a real human'].map(
                (line) => (
                  <li key={line} className="flex items-start gap-2 text-[0.86rem] text-ink-soft">
                    <Check size={13} className="mt-1 shrink-0 text-forest" />
                    {line}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div>
            <p className="eyebrow">Not</p>
            <ul className="mt-3 space-y-2">
              {['A diagnosis', 'An emergency service', 'Validated in Twi, Ga, Ewe or Hausa', 'A replacement for a person who knows you'].map(
                (line) => (
                  <li key={line} className="flex items-start gap-2 text-[0.86rem] text-ink-soft">
                    <X size={13} className="mt-1 shrink-0 text-rose/80" />
                    {line}
                  </li>
                ),
              )}
            </ul>
            <Link to="/model#limits" className="mt-3 inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-forest">
              Full limitations <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="container-page py-10">
        <div className="relative overflow-hidden rounded-3xl border border-forest/20 bg-forest px-6 py-9 text-paper md:px-12 md:py-12">
          <div className="adinkra-field absolute inset-0 opacity-[0.12]" aria-hidden="true" />
          <div className="relative max-w-xl">
            <p className="text-[0.68rem] uppercase tracking-[0.16em] text-gold">Start where you are</p>
            <h2 className="mt-2 text-balance font-display text-[2rem] leading-tight md:text-[2.4rem]">
              Two sentences is a beginning.
            </h2>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link to="/signup" className="btn bg-paper px-5 py-3 text-[0.88rem] text-forest hover:bg-white">
                <Sparkles size={14} /> Open my journal
              </Link>
              <Link to="/about" className="text-[0.84rem] text-paper/80 underline decoration-paper/30 underline-offset-4 hover:text-paper">
                Why we built this
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
