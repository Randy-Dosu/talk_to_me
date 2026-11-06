import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Download, Lock, Mic, Trash2 } from 'lucide-react';
import { useStore } from '../data/store';
import { SectionHeading } from '../components/ui';

export default function Privacy() {
  const { state, exportJson, wipe } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nkommo-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="container-page max-w-3xl py-8 lg:py-10">
      <p className="eyebrow">Privacy &amp; data</p>
      <h1 className="mt-2 text-balance font-display text-[2.1rem] leading-tight text-ink md:text-[2.5rem]">
        Nobody is reading this over your shoulder.
      </h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
        Nkommo has no backend. There is no account, no database, no analytics script, and no third-party tracker in this
        build. Your entries are stored in this browser&rsquo;s local storage and processed by JavaScript running on this
        device.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          { icon: Lock, title: 'Stored', body: 'Journal text, readings, check-in scores, safety plan and settings — in localStorage on this device.' },
          { icon: Mic, title: 'Voice', body: 'Audio is captured by your browser and transcribed by its speech service; Nkommo does not store the audio.' },
          { icon: Download, title: 'Exportable', body: 'One JSON file with everything, including the readings, so you can leave whenever you want.' },
          { icon: Trash2, title: 'Deletable', body: 'Delete a single entry, clear the sample data, or wipe everything in one tap. No backup exists.' },
        ].map((item) => (
          <div key={item.title} className="card-flat p-4">
            <p className="flex items-center gap-2 text-[0.82rem] font-medium text-ink">
              <item.icon size={14} className="text-forest" /> {item.title}
            </p>
            <p className="mt-1.5 text-[0.79rem] leading-relaxed text-ink-soft">{item.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 rounded-2xl border border-clay/30 bg-clay/5 p-4">
        <p className="flex items-center gap-2 text-[0.84rem] font-medium text-clay">
          <AlertTriangle size={14} /> The honest threat model: the shared phone
        </p>
        <p className="mt-2 text-[0.82rem] leading-relaxed text-ink-soft">
          Local storage protects you from servers, companies and data breaches. It does not protect you from someone
          holding your phone. In many Ghanaian households a phone is shared, borrowed, or unlocked by a partner or
          parent. If that is your situation:
        </p>
        <ul className="mt-2 space-y-1.5 text-[0.79rem] leading-relaxed text-ink-soft">
          <li>· Use an alias instead of your name, and avoid names of family members in the safety plan.</li>
          <li>· Write in a way you would be comfortable having read, or use the private browser window and export nothing.</li>
          <li>· Export to JSON, then delete the entries from this device, if writing here is not safe.</li>
          <li>· If someone monitoring you is part of your distress, the helpline is the safer route than this app.</li>
        </ul>
      </div>

      <div className="mt-7 space-y-6">
        <div>
          <SectionHeading eyebrow="What leaves this device" title="A short and boring list." />
          <ul className="mt-3 space-y-2 text-[0.86rem] leading-relaxed text-ink-soft">
            <li>· Nothing, unless you press the microphone button — then your browser vendor&rsquo;s speech service receives the audio.</li>
            <li>· If you copy an alert draft, it goes wherever you paste it. That is your decision, not ours.</li>
            <li>· Your location, if you use the nearest-clinic feature, stays in this browser. The region label is derived from the coordinate locally, and distance is computed against a bundled list — no map tiles, no geocoding request.</li>
            <li>· If you turn on Hugging Face replies in Settings, entry text leaves the device to that service. High-risk entries never do. The token lives in session storage.</li>
            <li>· The app loads its own fonts and code from the same origin as the page. No third-party requests otherwise.</li>
            <li>· No crash reporting, no session recording, no A/B testing, no advertising identifiers.</li>
          </ul>
        </div>

        <div>
          <SectionHeading eyebrow="Your controls" title="Take it, or erase it." />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={download} className="btn btn-primary text-[0.82rem]">
              <Download size={14} /> Export everything as JSON
            </button>
            {downloaded && <span className="text-[0.76rem] text-sage">Downloaded. Keep it somewhere safe.</span>}
          </div>

          <div className="mt-4 rounded-2xl border border-rose/25 bg-rose/5 p-4">
            <p className="text-[0.84rem] font-medium text-rose">Erase everything</p>
            <p className="mt-1 text-[0.79rem] leading-relaxed text-ink-soft">
              This deletes all entries, readings, check-ins, your safety plan, trusted contact and drafts from this browser.
              It cannot be undone, and there is no copy anywhere else.
            </p>
            {!confirm ? (
              <button onClick={() => setConfirm(true)} className="btn mt-2 border-rose/30 bg-white px-3 py-1.5 text-[0.78rem] text-rose">
                <Trash2 size={13} /> Erase all data
              </button>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={wipe} className="btn bg-rose px-3 py-1.5 text-[0.78rem] text-white hover:bg-[#933934]">
                  Yes, erase permanently
                </button>
                <button onClick={() => setConfirm(false)} className="btn btn-ghost px-3 py-1.5 text-[0.78rem]">
                  Cancel
                </button>
                <span className="text-[0.72rem] text-ink-muted">
                  {state.entries.length} entries · {state.checkins.length} check-ins
                </span>
              </div>
            )}
          </div>
        </div>

        <div>
          <SectionHeading eyebrow="If this became a product" title="What would have to be true." />
          <p className="mt-3 text-[0.86rem] leading-relaxed text-ink-soft">
            The problem statement for this project names Firebase Auth and a FastAPI backend. Those are reasonable for a
            multi-device product, but they move the risk. A production version would need: end-to-end encrypted entries
            with keys held only by the user; no server-side plaintext for ML inference (or explicit, granular consent);
            a documented retention and deletion policy; a lawful basis and DPIA under Ghana&rsquo;s Data Protection Act,
            2012 (Act 843); a human escalation policy for any alert feature; and an independent security review. None of
            that is in this build, which is exactly why it stays on your device.
          </p>
          <p className="mt-2 text-[0.8rem] text-ink-muted">
            Read the full staging plan in <code className="rounded bg-paper-deep px-1 py-0.5 text-[0.76rem]">docs/ROADMAP.md</code>.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3 text-[0.78rem]">
        <Link to="/model" className="text-forest underline decoration-forest/30 underline-offset-2">Model card</Link>
        <Link to="/research" className="text-forest underline decoration-forest/30 underline-offset-2">Research notes</Link>
        <Link to="/safety" className="text-forest underline decoration-forest/30 underline-offset-2">Support options</Link>
      </div>
    </div>
  );
}
