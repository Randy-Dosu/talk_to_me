import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Journal from './pages/Journal';
import Trends from './pages/Trends';
import CheckIn from './pages/CheckIn';
import Safety from './pages/Safety';
import Trusted from './pages/Trusted';
import ModelCard from './pages/ModelCard';
import Research from './pages/Research';
import Privacy from './pages/Privacy';
import About from './pages/About';

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);
  return null;
}

function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] max-w-xl flex-col justify-center py-16">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-display text-[2rem] text-ink">This page is not here.</h1>
      <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-muted">
        The link may be old, or the page may never have existed. Nothing is broken in your journal — that lives on the
        journal page.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/journal" className="btn btn-primary text-[0.82rem]">Go to my journal</Link>
        <Link to="/" className="btn btn-ghost text-[0.82rem]">Back to the start</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="journal" element={<Journal />} />
          <Route path="patterns" element={<Trends />} />
          <Route path="check-in" element={<CheckIn />} />
          <Route path="safety" element={<Safety />} />
          <Route path="trusted" element={<Trusted />} />
          <Route path="model" element={<ModelCard />} />
          <Route path="research" element={<Research />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
