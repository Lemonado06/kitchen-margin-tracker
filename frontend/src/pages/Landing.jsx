import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Reveal from '../components/Reveal';
import { Logo, ThemeToggle } from '../components/ui';

const features = [
  { icon: 'trend', title: 'True profit per order', text: 'Every order is charged its platform commission, GST on that commission, discount, packaging and the dish\'s food cost.' },
  { icon: 'dashboard', title: 'Analytics dashboard', text: 'Revenue, profit, margin and order KPIs, a profit trend, and dishes ranked by margin. Filter by outlet, platform, dish and date.' },
  { icon: 'sparkles', title: 'AI margin assistant', text: 'Ask in plain English. The AI calls 10 data tools on your own orders and answers with real numbers, never guesses.' },
  { icon: 'chef', title: 'Menu costing', text: 'Break each dish into ingredients and see its food cost and food-cost percentage against the menu price.' },
  { icon: 'percent', title: 'Platform fee rules', text: 'Set Zomato, Swiggy, Direct or any other platform\'s commission and GST per outlet, and see each one\'s effective cut.' },
  { icon: 'users', title: 'Owner and manager roles', text: 'Owners add managers who share their outlets. Managers record and edit data; only owners delete or manage the team.' },
];

const steps = [
  { title: 'Add your outlet', text: 'Name it and set the commission each delivery platform charges you.' },
  { title: 'Cost your menu', text: 'Add dishes with prices and the ingredient cost behind each one.' },
  { title: 'Record orders', text: 'Log each order with its platform, discount and packaging cost.' },
  { title: 'Read the margins', text: 'The dashboard and the AI assistant show where you earn and where you lose.' },
];

// Worked example with the seeded demo outlet's Zomato rule (25% commission, 18% GST) and Biryani recipe cost
const example = [
  { label: 'Order value', value: 450, tone: 'bg-[var(--chart-revenue)]' },
  { label: 'Zomato commission (25%)', value: -112.5, tone: 'bg-[var(--chart-commission)]' },
  { label: 'GST on commission (18%)', value: -20.25, tone: 'bg-[var(--chart-gst)]' },
  { label: 'Packaging', value: -15, tone: 'bg-[var(--chart-packaging)]' },
  { label: 'Food cost (recipe)', value: -90, tone: 'bg-[var(--chart-food)]' },
];
const exampleProfit = example.reduce((s, r) => s + r.value, 0);

const chat = [
  { role: 'user', text: 'Which dishes lose money?' },
  { role: 'ai', text: 'Paneer Tikka is your only loss-maker: −₹78 across 3 orders (−14.4% margin). Its ₹95 food cost plus ₹40–60 discounts on every order wipe out the margin. Try capping its discount at ₹20.', tools: ['Margin by dish', 'Discount impact'] },
  { role: 'user', text: 'What if I raise its price by 15%?' },
  { role: 'ai', text: 'At ₹207, the same 3 orders would lose about ₹19 instead of ₹78 (margin −3% instead of −14.4%). The price rise helps, but the discounts still need to come down.', tools: ['Price what-if'] },
];

const rupees = (n) => `${n < 0 ? '−' : ''}₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function Nav({ loggedIn }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="hidden font-bold tracking-tight text-ink sm:inline">Kitchen Margin Tracker</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-ink-2 md:flex">
          <a href="#features" className="transition hover:text-ink">Features</a>
          <a href="#how" className="transition hover:text-ink">How it works</a>
          <a href="#ai" className="transition hover:text-ink">AI assistant</a>
          <a href="#roles" className="transition hover:text-ink">Roles</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {loggedIn ? (
            <Link to="/dashboard" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition hover:opacity-90 active:scale-[0.98]">
              <span className="sm:hidden">Dashboard</span><span className="hidden sm:inline">Open dashboard</span>
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-subtle">Log in</Link>
              <Link to="/register" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-sm transition hover:opacity-90 active:scale-[0.98]">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// Illustrative dashboard card for the hero, drawn with plain divs and SVG
function HeroPreview() {
  const bars = [{ name: 'Chicken Biryani', w: 92, good: true }, { name: 'Veg Fried Rice', w: 34, good: true }, { name: 'Paneer Tikka', w: 14, good: false }];
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="relative rounded-2xl border border-line bg-surface p-5 shadow-xl shadow-slate-900/5 animate-scale-in [animation-delay:200ms]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">My Kitchen · Bengaluru</p>
          <span className="rounded-md border border-line bg-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Sample data</span>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[['Revenue', '₹2,800', 'text-ink'], ['Profit', '₹1,108', 'text-good'], ['Margin', '39.6%', 'text-ink']].map(([l, v, c]) => (
            <div key={l} className="rounded-lg border border-line p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{l}</p>
              <p className={`mt-1 text-lg font-extrabold ${c}`}>{v}</p>
            </div>
          ))}
        </div>
        <div className="mb-4 rounded-lg border border-line p-3">
          <p className="mb-2 text-xs font-semibold text-ink-2">Profit by dish</p>
          <div className="space-y-2">
            {bars.map((b, i) => (
              <div key={b.name} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-[11px] text-muted">{b.name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded bg-subtle">
                  <div style={{ width: `${b.w}%`, animationDelay: `${500 + i * 150}ms` }}
                    className={`h-full origin-left rounded animate-[grow_0.9s_cubic-bezier(0.22,1,0.36,1)_both] ${b.good ? 'bg-[var(--chart-profit)]' : 'bg-[var(--chart-loss)]'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-info-line bg-info-bg p-3">
          <Icon name="sparkles" className="mt-0.5 w-4 h-4 shrink-0 text-info" />
          <p className="text-xs text-ink-2"><span className="font-semibold text-ink">Paneer Tikka</span> is losing ₹26 per order. Heavy Swiggy discounts are the main cause.</p>
        </div>
      </div>
      <div className="absolute -bottom-14 right-6 hidden rounded-xl border border-line bg-surface px-4 py-3 shadow-lg sm:block animate-[float_6s_ease-in-out_infinite]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Direct orders margin</p>
        <p className="text-lg font-bold text-good">74.1%</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const loggedIn = !!localStorage.getItem('token');
  const startTo = loggedIn ? '/dashboard' : '/register';

  return (
    <div className="min-h-screen overflow-x-hidden bg-canvas">
      <style>{`@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
      <Nav loggedIn={loggedIn} />

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
        <div>
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-good-line bg-good-bg px-3 py-1 text-xs font-semibold text-good animate-fade-up">
            <Icon name="chef" className="w-3.5 h-3.5" /> For cloud kitchens on Zomato, Swiggy and direct orders
          </span>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl animate-fade-up [animation-delay:80ms]">
            Sales look great. <span className="text-accent">Is that dish making money?</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-2 animate-fade-up [animation-delay:160ms]">
            Kitchen Margin Tracker works out the real profit on every order after commission, GST, discounts,
            packaging and food cost, then shows you, and an AI assistant, exactly where the margin goes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-fade-up [animation-delay:240ms]">
            <Link to={startTo} className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-on-primary shadow-sm transition hover:opacity-90 active:scale-[0.98]">
              {loggedIn ? 'Open your dashboard' : 'Create a free owner account'}
              <Icon name="arrowRight" className="w-4 h-4 transition group-hover:translate-x-1" />
            </Link>
            <a href="#how" className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-6 py-3 font-semibold text-ink shadow-sm transition hover:bg-subtle">
              See how it works
            </a>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 animate-fade-up [animation-delay:320ms]">
            {[['5', 'costs deducted per order'], ['10', 'AI data tools'], ['2', 'user roles']].map(([n, l]) => (
              <div key={l}>
                <dt className="text-3xl font-extrabold text-ink">{n}</dt>
                <dd className="text-xs text-muted">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
        <HeroPreview />
      </section>

      {/* Problem: where a ₹450 order goes */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-accent">The problem</p>
          <h2 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">A ₹450 order is not ₹450 in your pocket</h2>
          <p className="mt-3 text-muted">Here is one Chicken Biryani order on Zomato, using the demo outlet's fee rule and recipe cost.</p>
        </Reveal>
        <Reveal className="mx-auto max-w-3xl rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <div className="space-y-3">
            {example.map((row, i) => (
              <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[13rem_1fr_6rem]">
                <span className="text-sm text-ink-2">{row.label}</span>
                <div className="col-span-2 row-start-2 h-3 overflow-hidden rounded-full bg-subtle sm:col-span-1 sm:row-start-auto">
                  <div style={{ width: `${(Math.abs(row.value) / 450) * 100}%`, animationDelay: `${i * 120}ms` }}
                    className={`h-full origin-left rounded-full animate-[grow_1s_cubic-bezier(0.22,1,0.36,1)_both] ${row.tone}`} />
                </div>
                <span className={`text-right text-sm font-semibold ${row.value < 0 ? 'text-bad' : 'text-ink'}`}>{rupees(row.value)}</span>
              </div>
            ))}
            <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-4 border-t border-line pt-4 sm:grid-cols-[13rem_1fr_6rem]">
              <span className="font-semibold text-ink">Actual profit</span>
              <div className="hidden h-3 overflow-hidden rounded-full bg-subtle sm:block">
                <div style={{ width: `${(exampleProfit / 450) * 100}%` }} className="h-full rounded-full bg-[var(--chart-profit)]" />
              </div>
              <span className="text-right text-lg font-bold text-good">{rupees(exampleProfit)}</span>
            </div>
          </div>
          <p className="mt-5 text-sm text-muted">That is a {((exampleProfit / 450) * 100).toFixed(1)}% margin before any discount. Add a ₹60 discount on a cheaper dish and it can go negative, which is exactly what the dashboard catches.</p>
        </Reveal>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-accent">Features</p>
          <h2 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">Everything between the order and the profit</h2>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 80} className="group rounded-xl border border-line bg-surface p-6 shadow-sm transition hover:border-ink/20 hover:shadow-md">
              <span className="mb-4 inline-flex rounded-lg border border-line bg-subtle p-2.5 text-ink">
                <Icon name={f.icon} />
              </span>
              <h3 className="font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-accent">How it works</p>
          <h2 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">Four steps to your real margins</h2>
        </Reveal>
        <ol className="grid gap-5 md:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 100} className="relative rounded-xl border border-line bg-surface p-6 shadow-sm">
              <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">{i + 1}</span>
              <h3 className="font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* AI assistant */}
      <section id="ai" className="mx-auto grid max-w-6xl scroll-mt-24 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-bold uppercase tracking-widest text-accent">AI assistant</p>
          <h2 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">Ask your numbers a question</h2>
          <p className="mt-4 text-ink-2">
            The assistant runs on Groq (with Google Gemini as backup) using function calling. It never guesses: it picks from 10 tools that
            read your outlet's orders, menu and fee rules, follows the dashboard filters, and remembers the conversation
            so you can ask follow-ups.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-ink-2">
            {['Find loss-making dishes and costly platforms', 'See where revenue goes: commission, GST, discounts, food cost', 'Test a price change before you make it', 'One-click insight cards on the dashboard'].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 rounded-full bg-info-bg p-1 text-info"><Icon name="check" className="w-3 h-3" /></span>{t}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={120} className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-line pb-4">
            <span className="rounded-lg bg-primary p-1.5 text-on-primary"><Icon name="sparkles" className="w-4 h-4" /></span>
            <span className="text-sm font-semibold text-ink">Ask the assistant</span>
            <span className="ml-auto rounded-md border border-line bg-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Example</span>
          </div>
          <div className="space-y-3">
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  <div className={`rounded-xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'rounded-br-sm bg-primary font-medium text-on-primary' : 'rounded-bl-sm border border-line bg-subtle text-ink-2'}`}>
                    {m.text}
                  </div>
                  {m.tools && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.tools.map((t) => <span key={t} className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink-2">{t}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-accent">Roles</p>
          <h2 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">Bring your kitchen manager along</h2>
        </Reveal>
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
          {[
            { role: 'Owner', tone: 'bg-primary text-on-primary', can: ['Everything a manager can do', 'Delete outlets, dishes, orders and fee rules', 'Add or remove delivery platforms', 'Add, edit and remove managers'] },
            { role: 'Manager', tone: 'border border-line bg-subtle text-ink', can: ['Works on the owner\'s outlets', 'Add and edit dishes, recipe costs, orders, fee rules', 'Full dashboard and AI assistant', 'Cannot delete records or manage the team'] },
          ].map((r, i) => (
            <Reveal key={r.role} delay={i * 120} className="rounded-xl border border-line bg-surface p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${r.tone}`}>{r.role[0]}</span>
                <h3 className="text-lg font-semibold text-ink">{r.role}</h3>
              </div>
              <ul className="space-y-2 text-sm text-ink-2">
                {r.can.map((c) => <li key={c} className="flex gap-2"><Icon name="check" className="mt-0.5 w-4 h-4 shrink-0 text-good" />{c}</li>)}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        <Reveal className="relative overflow-hidden rounded-2xl bg-primary p-10 text-center sm:p-14">
          <h2 className="relative text-3xl font-bold text-on-primary sm:text-4xl">Find your losing dish today</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-on-primary/70">Set up an outlet in a few minutes and see what every order really earns.</p>
          <Link to={startTo} className="relative mt-8 inline-flex items-center gap-2 rounded-lg bg-on-primary px-7 py-3.5 font-semibold text-primary transition hover:opacity-90 active:scale-[0.98]">
            {loggedIn ? 'Open your dashboard' : 'Get started'} <Icon name="arrowRight" className="w-4 h-4" />
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
          <span className="flex items-center gap-2"><Icon name="chef" className="w-4 h-4 text-ink" /> Kitchen Margin Tracker</span>
          <span>24CIE554 Full Stack Development · Nishita Shirwal &amp; Reyansh Keshava</span>
        </div>
      </footer>
    </div>
  );
}
