import { Link } from 'react-router-dom';
import { ArrowRight, Compass, HeartHandshake, PenLine, ShieldCheck } from 'lucide-react';
import { SectionHeading } from '../components/ui';

const PRINCIPLES = [
  {
    icon: ShieldCheck,
    title: 'Privacy is the intervention',
    body: 'In a place where being seen as “mad” can cost a person their reputation, a public tool is a barrier. So the listening happens on the device, with no account to leak and no server to subpoena.',
  },
  {
    icon: PenLine,
    title: 'Never hide the reasoning',
    body: 'Every reading can be expanded into the phrases that produced it. If the engine is wrong, the person can see exactly where, and override the band. A model’s opinion is not the final word on a life.',
  },
  {
    icon: HeartHandshake,
    title: 'The next step is a human',
    body: 'Detection without a route to help is surveillance. The app leads with free Ghanaian helplines, a safety plan written while calm, and a person the writer names.',
  },
  {
    icon: Compass,
    title: 'Say what you cannot do',
    body: 'No diagnosis, no emergency response, no Twi support yet, no guarantee that “no signal” means safe. Stating limits is not marketing weakness; it is the condition of being trusted with a journal.',
  },
];

export default function About() {
  return (
    <div className="container-page max-w-4xl py-8 lg:py-10">
      <p className="eyebrow">About</p>
      <h1 className="mt-2 text-balance font-display text-[2.1rem] leading-tight text-ink md:text-[2.7rem]">
        Built for the conversation we are not having.
      </h1>
      <div className="mt-4 space-y-3 text-[0.95rem] leading-relaxed text-ink-soft">
        <p>
          The brief was blunt: mental health is stigmatised in Ghana, many people suffer silently, and there is a need for
          a private, accessible tool that can detect emotional distress early. Nkommo is an attempt to answer that brief
          without pretending that a web app can solve a crisis of access, workforce and stigma.
        </p>
        <p>
          It is called <em>nkommo</em> — conversation — because the point of writing here is to make the conversation with
          a real person easier to start. The journal is the on-ramp, not the destination. If this app is doing its job, the
          person closes it and calls someone, or walks into a clinic, or messages the friend they had been avoiding.
        </p>
        <p>
          This build is deliberately unfinished in one specific way: it refuses to make clinical claims it cannot support.
          The rule-based engine exists because it can be inspected and because it runs offline; the transformer path, the
          Ghanaian annotation study and the independent validation are written down as stages, not skipped.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {PRINCIPLES.map((principle) => (
          <div key={principle.title} className="card p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest/8 text-forest">
              <principle.icon size={16} />
            </span>
            <h2 className="mt-3 font-display text-[1.15rem] text-ink">{principle.title}</h2>
            <p className="mt-1.5 text-[0.83rem] leading-relaxed text-ink-soft">{principle.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-9">
        <SectionHeading
          eyebrow="Who it is for"
          title="Someone in Accra, Kumasi or Tamale with a phone and no appointment."
          blurb="Students carrying exam pressure, young workers carrying rent, new mothers carrying silence, and anyone who has been told to pray about it instead of talking about it. The app is usable with one hand, on a shared phone, in a moment of quiet."
        />
      </div>

      <div className="mt-8 rounded-3xl border border-line bg-white/55 p-5">
        <p className="eyebrow">Build notes</p>
        <dl className="mt-3 grid gap-3 text-[0.83rem] sm:grid-cols-2">
          {[
            ['Stack', 'React 19 · TypeScript · Vite · Tailwind v4 · Recharts'],
            ['Engine', 'Deterministic TypeScript rules, no runtime model download'],
            ['Reference backend', 'FastAPI + Hugging Face training scripts in /ml (not serving this demo)'],
            ['Storage', 'Browser localStorage; no backend, no auth, no analytics'],
            ['Instruments', 'PHQ-9 and GAD-7 (public domain), item-9 gated'],
            ['Evaluation', '66 hand-labelled cases, 30 held out; npm run eval'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[0.68rem] uppercase tracking-[0.12em] text-ink-muted">{label}</dt>
              <dd className="mt-0.5 text-ink-soft">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/journal" className="btn btn-primary text-[0.84rem]">
          Open the journal <ArrowRight size={14} />
        </Link>
        <Link to="/research" className="btn btn-ghost text-[0.84rem]">Research notes</Link>
        <Link to="/model" className="btn btn-ghost text-[0.84rem]">Model card</Link>
      </div>

      <p className="mt-8 border-t border-line/70 pt-4 text-[0.72rem] leading-relaxed text-ink-muted">
        Nkommo is not affiliated with the Mental Health Authority of Ghana, Accra Psychiatric Hospital, or any of the
        organisations whose helplines it lists. Those numbers are published for public use; verify them before relying on
        them in an emergency.
      </p>
    </div>
  );
}
