import { I18nProvider } from './i18n';
import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Models } from './components/Models';
import { Limits } from './components/Limits';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <I18nProvider>
      <div className="min-h-screen">
        <Nav />
        <main>
          <Hero />
          <Features />
          <Models />
          <Limits />
        </main>
        <Footer />
      </div>
    </I18nProvider>
  );
}
