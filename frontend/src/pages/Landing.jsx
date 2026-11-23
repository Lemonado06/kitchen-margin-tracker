
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import Reveal from '../components/Reveal';
import { homePath } from '../api/client';

const GREEN = '#3DD68C';

const features = [
  {
    icon: 'trend',
    title: 'Real profit per order',
    text: 'Calculate what remains after platform commission, GST on commission, discounts, packaging and food cost.',
    tag: 'CORE FEATURE',
  },
  {
    icon: 'dashboard',
    title: 'Know your best dishes',
    text: 'Track revenue, profit, margins and order KPIs. Find dishes that earn well and dishes that quietly lose money.',
    tag: 'ANALYTICS',
  },
  {
    icon: 'sparkles',
    title: 'AI margin assistant',
    text: 'Ask questions in plain English. Get answers based on your actual outlet data, orders, menu and fee rules.',
    tag: 'AI POWERED',
  },
  {
    icon: 'chef',
    title: 'Detailed menu costing',
    text: 'Break down dishes into ingredients, calculate recipe costs and understand food cost against selling price.',
    tag: 'MENU',
  },
  {
    icon: 'percent',
    title: 'Platform fee rules',
    text: 'Configure commission and GST rules for Zomato, Swiggy, Direct and other platforms, outlet by outlet.',
    tag: 'COST CONTROL',
  },
  {
    icon: 'users',
    title: 'Multi-role access',
    text: 'Give owners, managers and kitchen staff the access they need, without exposing sensitive profit data to everyone.',
    tag: 'TEAM',
  },
];

const steps = [
  {
    number: '01',
    title: 'Set up your outlet',
    text: 'Create an outlet and configure the delivery platforms and their commission rules.',
  },
  {
    number: '02',
    title: 'Cost your menu',
    text: 'Add dishes, selling prices and the ingredient costs behind every recipe.',
  },
  {
    number: '03',
    title: 'Record your orders',
    text: 'Add orders with their platform, discount and packaging costs.',
  },
  {
    number: '04',
    title: 'Understand your margins',
    text: 'Use your dashboard and AI assistant to identify where your money goes.',
  },
];

const chat = [
  { role: 'user', text: 'Which dishes are losing money?' },
  {
    role: 'ai',
    text: 'Your lowest-margin dishes need attention. I can compare their food costs, discounts and platform fees to find the cause.',
    tools: ['Dish profitability', 'Discount impact'],
  },
  { role: 'user', text: 'What if I increase the selling price?' },
  {
    role: 'ai',
    text: 'I can estimate the impact of a price change using your existing order and cost data.',
    tools: ['Price what-if'],
  },
];

const roles = [
  {
    role: 'Owner',
    description: 'Complete control over the business.',
    color: '#B69AFF',
    permissions: [
      'Manage outlets and business data',
      'View profit and analytics',
      'Manage team members',
      'Configure platform fee rules',
    ],
  },
  {
    role: 'Manager',
    description: 'Run day-to-day operations.',
    color: '#7CCBEB',
    permissions: [
      'Access assigned outlets',
      'Manage dishes and orders',
      'View profit and analytics',
      'Use the AI assistant',
    ],
  },
  {
    role: 'Kitchen staff',
    description: 'Focus on daily operations.',
    color: GREEN,
    permissions: [
      'Access outlet operations',
      'Add orders',
      'Access order records',
      'No access to profit or costs',
    ],
  },
];

const formatINR = (value) =>
  `₹${Math.abs(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function Nav({ loggedIn }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#2A2F2B] bg-[#0C0E0D]/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3DD68C] text-[#07140D]">
            <Icon name="chef" className="h-5 w-5" />
          </span>
          <span className="text-sm font-bold tracking-tight text-[#F2F4F0] sm:text-base">
            Kitchen Margin Tracker
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-xs font-medium text-[#929891] md:flex">
          <a href="#problem" className="transition-colors duration-150 hover:text-[#3DD68C]">The problem</a>
          <a href="#features" className="transition-colors duration-150 hover:text-[#3DD68C]">Features</a>
          <a href="#how" className="transition-colors duration-150 hover:text-[#3DD68C]">How it works</a>
          <a href="#roles" className="transition-colors duration-150 hover:text-[#3DD68C]">Access</a>
        </nav>

        <div className="flex items-center gap-2">
          {loggedIn ? (
            <Link
              to={homePath()}
              className="rounded-lg bg-[#3DD68C] px-4 py-2.5 text-xs font-bold text-[#07140D] transition-colors duration-150 hover:bg-[#70E8AA]"
            >
              Open app <span className="ml-1">↗</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2.5 text-xs font-semibold text-[#C2C8C1] transition-colors duration-150 hover:bg-[#1A1C1B] hover:text-white"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-[#3DD68C] px-4 py-2.5 text-xs font-bold text-[#07140D] transition-colors duration-150 hover:bg-[#70E8AA]"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="mb-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#3DD68C]">
      <span className="h-px w-7 bg-[#3DD68C]" />
      {children}
    </p>
  );
}

function Receipt({
  orderValue = 450,
  commission = 25,
  foodCost = 90,
  packaging = 15,
  discount = 0,
}) {
  const commissionAmount = orderValue * commission / 100;
  const gst = commissionAmount * 0.18;
  const profit = orderValue - commissionAmount - gst - foodCost - packaging - discount;
  const margin = orderValue > 0 ? profit / orderValue * 100 : 0;

  const rows = [
    { label: 'Order value', value: orderValue, positive: true },
    { label: `Platform commission (${commission}%)`, value: -commissionAmount },
    { label: 'GST on commission (18%)', value: -gst },
    { label: 'Packaging', value: -packaging },
    { label: 'Food cost', value: -foodCost },
    ...(discount > 0 ? [{ label: 'Discount', value: -discount }] : []),
  ];

  return (
    <div className="overflow-hidden rounded-md bg-[#F2EDE0] text-[#1A1A17] shadow-xl shadow-black/20">
      <div className="receipt-grain p-6 sm:p-8">
        <div className="mb-6 flex items-start justify-between border-b border-dashed border-black/25 pb-5">
          <div>
            <p className="font-mono text-[9px] font-bold tracking-[0.18em] text-[#5D5F5D]">
              ORDER PROFIT BREAKDOWN
            </p>
            <h3 className="mt-2 font-serif text-2xl font-semibold tracking-tight">
              Chicken Biryani
            </h3>
            <p className="mt-1 text-[11px] text-[#5D5F5D]">
              Illustrative example · Zomato
            </p>
          </div>
          <span className="border border-black/15 px-2 py-1 font-mono text-[9px] font-bold tracking-wider text-[#5D5F5D]">
            DEMO
          </span>
        </div>

        <div className="space-y-4 font-mono text-xs tabular-nums sm:text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4">
              <span className={row.positive ? 'font-bold text-[#1A1A17]' : 'text-[#5D5F5D]'}>
                {row.label}
              </span>
              <span className={row.positive ? 'font-bold text-[#1A1A17]' : 'font-medium text-[#B5242F]'}>
                {row.positive ? '' : '−'}{formatINR(row.value)}
              </span>
            </div>
          ))}
        </div>

        <div className="my-6 border-t border-dashed border-black/30" />

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#006D41]">
              Actual profit
            </p>
            <p className="mt-1 text-[10px] text-[#5D5F5D]">
              After the listed costs
            </p>
          </div>
          <div className="text-right">
            <p className={`font-mono text-2xl font-bold tracking-tight sm:text-3xl ${profit >= 0 ? 'text-[#006D41]' : 'text-[#B5242F]'}`}>
              {profit < 0 ? '−' : ''}{formatINR(profit)}
            </p>
            <p className="mt-1 font-mono text-[11px] font-bold text-[#5D5F5D]">
              {margin.toFixed(1)}% margin
            </p>
          </div>
        </div>

        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-black/10">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${profit >= 0 ? 'bg-[#00864F]' : 'bg-[#C22D38]'}`}
            style={{ width: `${Math.min(100, Math.max(0, margin))}%` }}
          />
        </div>
      </div>
      <div className="receipt-teeth h-3" />
    </div>
  );
}

function HeroPreview() {
  const bars = [
    { name: 'Chicken Biryani', width: '88%', amount: '₹212', positive: true },
    { name: 'Veg Fried Rice', width: '58%', amount: '₹140', positive: true },
    { name: 'Paneer Tikka', width: '13%', amount: '−₹26', positive: false },
  ];

  return (
    <div className="w-full rounded-xl border border-[#2A2F2B] bg-[#151816] p-5 sm:p-7">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-[9px] tracking-[0.15em] text-[#858D85]">
            BUSINESS OVERVIEW
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[#F2F4F0]">
            Kitchen performance
          </h3>
        </div>
        <span className="rounded-md border border-[#2A2F2B] bg-[#1A1C1B] px-2.5 py-1 font-mono text-[9px] text-[#929891]">
          SAMPLE DATA
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Revenue', value: '₹2,800', color: 'text-[#F2F4F0]' },
          { label: 'Profit', value: '₹1,108', color: 'text-[#3DD68C]' },
          { label: 'Margin', value: '39.6%', color: 'text-[#F2F4F0]' },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-[#2A2F2B] bg-[#1A1C1B] p-3 sm:p-4">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#858D85]">
              {item.label}
            </p>
            <p className={`mt-2 font-mono text-base font-bold tracking-tight sm:text-xl ${item.color}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-[#2A2F2B] bg-[#1A1C1B] p-4">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs font-semibold text-[#F2F4F0]">Profit by dish</p>
          <span className="font-mono text-[9px] text-[#858D85]">TOP PERFORMERS</span>
        </div>

        <div className="space-y-5">
          {bars.map((bar) => (
            <div key={bar.name}>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="text-[#C2C8C1]">{bar.name}</span>
                <span className={`font-mono font-bold ${bar.positive ? 'text-[#3DD68C]' : 'text-[#E5484D]'}`}>
                  {bar.amount}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2F2B]">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${bar.positive ? 'bg-[#3DD68C]' : 'bg-[#E5484D]'}`}
                  style={{ width: bar.width }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#65502A] bg-[#211D16] p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#F2B134]/10 text-[#F2B134]">
          <Icon name="sparkles" className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs font-semibold text-[#F2B134]">Find the margin leak</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#BDB29B]">
            Identify dishes where food costs, discounts and platform fees are eating into your profit.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfitCalculator() {
  const [order, setOrder] = useState('450');
  const [commission, setCommission] = useState('25');
  const [food, setFood] = useState('90');
  const [packaging, setPackaging] = useState('15');
  const [discount, setDiscount] = useState('0');

  const orderValue = Math.max(0, Number(order) || 0);
  const commissionRate = Math.min(100, Math.max(0, Number(commission) || 0));
  const foodCost = Math.max(0, Number(food) || 0);
  const packagingCost = Math.max(0, Number(packaging) || 0);
  const discountCost = Math.max(0, Number(discount) || 0);

  const commissionAmount = orderValue * commissionRate / 100;
  const gst = commissionAmount * 0.18;
  const profit = orderValue - commissionAmount - gst - foodCost - packagingCost - discountCost;
  const margin = orderValue > 0 ? profit / orderValue * 100 : 0;

  const fields = [
    { label: 'Order value', value: order, setter: setOrder },
    { label: 'Commission', suffix: '%', value: commission, setter: setCommission },
    { label: 'Food cost', value: food, setter: setFood },
    { label: 'Packaging cost', value: packaging, setter: setPackaging },
    { label: 'Discount', value: discount, setter: setDiscount },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[#2A2F2B] bg-[#151816]">
      <div className="border-b border-[#2A2F2B] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] font-bold tracking-[0.18em] text-[#3DD68C]">
              INTERACTIVE CALCULATOR
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[#F2F4F0]">
              Calculate your order profit
            </h3>
          </div>
          <span className="rounded-lg border border-[#2A2F2B] bg-[#1A1C1B] p-3 text-[#3DD68C]">
            <Icon name="percent" className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#929891]">
          Change the values to see how much of the order you actually keep.
        </p>
      </div>

      <div className="grid md:grid-cols-2">
        <div className="space-y-4 p-6 sm:p-8">
          {fields.map((field) => (
            <label key={field.label} className="block">
              <span className="mb-2 block text-[11px] font-semibold text-[#C2C8C1]">
                {field.label}
              </span>
              <div className="flex items-center rounded-lg border border-[#2A2F2B] bg-[#0C0E0D] px-3 transition-colors duration-150 focus-within:border-[#3DD68C]">
                {field.suffix !== '%' && (
                  <span className="font-mono text-xs text-[#858D85]">₹</span>
                )}
                <input
                  type="number"
                  min="0"
                  max={field.suffix === '%' ? '100' : undefined}
                  step="any"
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  className="w-full bg-transparent px-2 py-3 font-mono text-sm font-semibold text-[#F2F4F0] outline-none"
                />
                {field.suffix === '%' && (
                  <span className="font-mono text-xs text-[#858D85]">%</span>
                )}
              </div>
            </label>
          ))}

          <button
            type="button"
            onClick={() => {
              setOrder('450');
              setCommission('25');
              setFood('90');
              setPackaging('15');
              setDiscount('0');
            }}
            className="pt-1 text-[11px] font-semibold text-[#3DD68C] transition-colors duration-150 hover:text-[#70E8AA]"
          >
            Reset example ↺
          </button>
        </div>

        <div className="flex flex-col justify-center border-t border-[#2A2F2B] bg-[#1A1C1B] p-6 sm:p-8 md:border-l md:border-t-0">
          <p className="font-mono text-[9px] font-bold tracking-[0.18em] text-[#858D85]">
            ESTIMATED PROFIT
          </p>
          <p className={`mt-3 font-mono text-3xl font-bold tracking-tight sm:text-4xl ${profit >= 0 ? 'text-[#3DD68C]' : 'text-[#E5484D]'}`}>
            {profit < 0 ? '−' : ''}{formatINR(profit)}
          </p>
          <p className="mt-2 text-xs text-[#929891]">
            {margin.toFixed(1)}% profit margin
          </p>

          <div className="my-7 h-px bg-[#2A2F2B]" />

          <div className="space-y-3 text-xs">
            <div className="flex justify-between gap-3 text-[#929891]">
              <span>Platform commission</span>
              <span className="font-mono text-[#E5484D]">−{formatINR(commissionAmount)}</span>
            </div>
            <div className="flex justify-between gap-3 text-[#929891]">
              <span>GST on commission (18%)</span>
              <span className="font-mono text-[#E5484D]">−{formatINR(gst)}</span>
            </div>
            <div className="flex justify-between gap-3 text-[#929891]">
              <span>Food + packaging + discount</span>
              <span className="font-mono text-[#E5484D]">−{formatINR(foodCost + packagingCost + discountCost)}</span>
            </div>
          </div>

          <p className="mt-6 rounded-lg border border-[#2A2F2B] bg-[#151816] p-3 text-[10px] leading-relaxed text-[#858D85]">
            Illustrative calculation. Actual platform deductions and applicable taxes may vary. This calculator is not connected to your account.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const loggedIn = !!localStorage.getItem('token');
  const startTo = loggedIn ? homePath() : '/register';

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0C0E0D] text-[#F2F4F0]">
      <style>{`
        html {
          scroll-behavior: smooth;
        }

        .receipt-grain {
          background-image: repeating-linear-gradient(
            0deg,
            rgba(26, 26, 23, .018) 0px,
            rgba(26, 26, 23, .018) 1px,
            transparent 1px,
            transparent 4px
          );
        }

        .receipt-teeth {
          background:
            linear-gradient(135deg, #F2EDE0 50%, transparent 50%) 0 0 / 16px 16px,
            linear-gradient(225deg, #F2EDE0 50%, transparent 50%) 0 0 / 16px 16px;
          background-repeat: repeat-x;
          background-position: top;
        }

        .landing-reveal {
          animation: landing-enter .55s cubic-bezier(.2,.7,.2,1) both;
        }

        @keyframes landing-enter {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
          .landing-reveal {
            animation: none;
          }
        }
      `}</style>

      <Nav loggedIn={loggedIn} />

      <main>
        {/* HERO */}
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-20 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:pb-32 lg:pt-28">
          <div className="landing-reveal">
            <div className="mb-7 inline-flex items-center gap-2 rounded-md border border-[#2A2F2B] bg-[#151816] px-3 py-2 font-mono text-[9px] font-bold tracking-[0.15em] text-[#3DD68C]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3DD68C]" />
              BUILT FOR INDIA'S FOOD BUSINESSES
            </div>

            <h1 className="max-w-3xl font-serif text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-[#F2F4F0] sm:text-6xl lg:text-[4.6rem]">
              Revenue is not
              <span className="mt-1 block italic text-[#3DD68C]">
                your profit.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-sm leading-8 text-[#929891] sm:text-base">
              Every order has a cost hiding behind it. Platform commissions,
              GST, discounts, packaging and ingredients all take a cut.
              Kitchen Margin Tracker shows you what you actually keep.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to={startTo}
                className="group inline-flex items-center gap-3 rounded-lg bg-[#3DD68C] px-6 py-4 text-xs font-bold text-[#07140D] transition-colors duration-150 hover:bg-[#70E8AA]"
              >
                {loggedIn ? 'Open your app' : 'Get started'}
                <Icon name="arrowRight" className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
              </Link>
              <a
                href="#problem"
                className="inline-flex items-center gap-2 rounded-lg border border-[#2A2F2B] px-6 py-4 text-xs font-semibold text-[#C2C8C1] transition-colors duration-150 hover:border-[#3DD68C] hover:text-[#3DD68C]"
              >
                See where it goes <span>↓</span>
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-[#2A2F2B] pt-7">
              {[
                ['01', 'Order-level profit'],
                ['02', 'Outlet analytics'],
                ['03', 'AI-assisted insights'],
              ].map(([number, label]) => (
                <div key={number} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-[#3DD68C]">{number}</span>
                  <span className="text-[11px] font-medium text-[#929891]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-reveal mx-auto w-full max-w-md" style={{ animationDelay: '100ms' }}>
            <Receipt />
            <p className="mt-5 text-center text-[10px] text-[#858D85]">
              Example calculation · Your own menu costs and fee rules go into the app
            </p>
          </div>
        </section>

        {/* PROBLEM */}
        <section id="problem" className="scroll-mt-20 border-y border-[#2A2F2B] bg-[#121513]">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-28">
            <Reveal>
              <SectionLabel>The hidden cost</SectionLabel>
              <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-[#F2F4F0] sm:text-5xl">
                The same dish.
                <span className="block text-[#858D85]">Different profit.</span>
              </h2>
              <p className="mt-6 max-w-lg text-sm leading-8 text-[#929891] sm:text-base">
                A dish can sell hundreds of times and still deliver disappointing
                margins. The platform, its commission, discounts and your recipe
                cost all change the final number.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  'A high order value does not guarantee high profit.',
                  'Different platforms can leave you with different margins.',
                  'A discount can turn a profitable order into a loss.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-xs text-[#C2C8C1]">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-[#3DD68C]" />
                    {item}
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={100}>
              <ProfitCalculator />
            </Reveal>
          </div>
        </section>

        {/* PRODUCT PREVIEW */}
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:py-32">
          <Reveal>
            <HeroPreview />
          </Reveal>
          <Reveal delay={100}>
            <SectionLabel>One clear picture</SectionLabel>
            <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-[#F2F4F0] sm:text-5xl">
              Stop managing by revenue.
              <span className="block text-[#3DD68C]">Start managing by margin.</span>
            </h2>
            <p className="mt-6 max-w-xl text-sm leading-8 text-[#929891] sm:text-base">
              See how your outlets, dishes and orders are performing.
              Understand where costs are accumulating and which parts of
              your menu deserve attention.
            </p>
            <Link
              to={startTo}
              className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-[#3DD68C] transition-colors duration-150 hover:text-[#70E8AA]"
            >
              Explore Kitchen Margin Tracker
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </Reveal>
        </section>

        {/* FEATURES */}
        <section id="features" className="scroll-mt-20 border-y border-[#2A2F2B] bg-[#121513]">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-28">
            <Reveal className="mx-auto mb-14 max-w-2xl text-center">
              <div className="flex justify-center">
                <SectionLabel>What you get</SectionLabel>
              </div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#F2F4F0] sm:text-5xl">
                Every cost. Every outlet.
                <span className="block text-[#858D85]">A clearer picture.</span>
              </h2>
              <p className="mt-5 text-xs leading-7 text-[#929891] sm:text-sm">
                The tools to understand the economics of your kitchen,
                from an individual order to your overall business.
              </p>
            </Reveal>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Reveal
                  key={feature.title}
                  delay={index * 50}
                  className="group rounded-xl border border-[#2A2F2B] bg-[#151816] p-6 transition-colors duration-150 hover:border-[#3DD68C]/50 hover:bg-[#1A1C1B]"
                >
                  <div className="mb-8 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#2A2F2B] bg-[#1A1C1B] text-[#3DD68C] transition-colors duration-150 group-hover:border-[#3DD68C]/40">
                      <Icon name={feature.icon} className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-[9px] font-bold tracking-[0.13em] text-[#858D85]">
                      {feature.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#F2F4F0]">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-xs leading-7 text-[#929891]">
                    {feature.text}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="scroll-mt-20 mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-28">
          <Reveal className="mx-auto mb-16 max-w-2xl text-center">
            <div className="flex justify-center">
              <SectionLabel>Simple workflow</SectionLabel>
            </div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#F2F4F0] sm:text-5xl">
              From order to insight.
              <span className="block text-[#858D85]">Four steps.</span>
            </h2>
          </Reveal>

          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <Reveal
                as="li"
                key={step.number}
                delay={index * 60}
                className="rounded-xl border border-[#2A2F2B] bg-[#151816] p-6 transition-colors duration-150 hover:border-[#3DD68C]/40"
              >
                <p className="font-mono text-xs font-bold text-[#3DD68C]">
                  {step.number}
                </p>
                <div className="my-7 h-px bg-[#2A2F2B]" />
                <h3 className="text-base font-semibold text-[#F2F4F0]">
                  {step.title}
                </h3>
                <p className="mt-3 text-xs leading-7 text-[#929891]">
                  {step.text}
                </p>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* AI */}
        <section id="ai" className="scroll-mt-20 border-y border-[#2A2F2B] bg-[#121513]">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:py-28">
            <Reveal>
              <SectionLabel>Ask your data</SectionLabel>
              <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-[#F2F4F0] sm:text-5xl">
                Your numbers have answers.
                <span className="block text-[#3DD68C]">Ask the AI.</span>
              </h2>
              <p className="mt-6 max-w-lg text-sm leading-8 text-[#929891] sm:text-base">
                Instead of digging through reports, ask questions in plain English.
                The AI assistant uses your business data to help explain performance
                and explore possible changes.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  'Find dishes with weak or negative margins.',
                  'Understand how discounts and platform fees affect profit.',
                  'Explore the impact of changing a dish price.',
                  'Ask follow-up questions in the same conversation.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-xs text-[#C2C8C1]">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-[#3DD68C]" />
                    {item}
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-xl border border-[#2A2F2B] bg-[#151816] p-5 sm:p-7">
                <div className="mb-6 flex items-center gap-3 border-b border-[#2A2F2B] pb-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#2A2F2B] bg-[#1A1C1B] text-[#3DD68C]">
                    <Icon name="sparkles" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#F2F4F0]">
                      Margin assistant
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#858D85]">
                      Illustrative conversation
                    </p>
                  </div>
                  <span className="ml-auto font-mono text-[9px] font-semibold text-[#3DD68C]">
                    AI DEMO
                  </span>
                </div>

                <div className="space-y-5">
                  {chat.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-[90%]">
                        <div className={`rounded-lg px-4 py-3 text-xs leading-6 ${message.role === 'user'
                            ? 'bg-[#3DD68C] font-medium text-[#07140D]'
                            : 'border border-[#2A2F2B] bg-[#1A1C1B] text-[#C2C8C1]'
                          }`}>
                          {message.text}
                        </div>
                        {message.tools && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {message.tools.map((tool) => (
                              <span key={tool} className="rounded-md border border-[#2A2F2B] px-2.5 py-1 font-mono text-[9px] text-[#929891]">
                                {tool}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between rounded-lg border border-[#2A2F2B] bg-[#0C0E0D] px-4 py-3">
                  <span className="text-[11px] text-[#858D85]">
                    Ask about your business...
                  </span>
                  <span className="rounded-md bg-[#3DD68C] p-2 text-[#07140D]">
                    <Icon name="sparkles" className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ROLES */}
        <section id="roles" className="scroll-mt-20 mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-28">
          <Reveal className="mx-auto mb-14 max-w-2xl text-center">
            <div className="flex justify-center">
              <SectionLabel>Built for teams</SectionLabel>
            </div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-[#F2F4F0] sm:text-5xl">
              The right access.
              <span className="block text-[#858D85]">For the right people.</span>
            </h2>
          </Reveal>

          <div className="mx-auto grid max-w-5xl gap-3 md:grid-cols-3">
            {roles.map((role, index) => (
              <Reveal
                key={role.role}
                delay={index * 60}
                className="rounded-xl border border-[#2A2F2B] bg-[#151816] p-6 transition-colors duration-150 hover:border-[#3DD68C]/30"
              >
                <span
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: role.color }}
                >
                  {role.role}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-[#F2F4F0]">
                  {role.description}
                </h3>
                <div className="my-6 h-px bg-[#2A2F2B]" />
                <ul className="space-y-4">
                  {role.permissions.map((permission) => (
                    <li key={permission} className="flex items-start gap-3 text-xs text-[#929891]">
                      <Icon
                        name="check"
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: role.color }}
                      />
                      {permission}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 lg:pb-32">
          <Reveal className="rounded-xl border border-[#2A2F2B] bg-[#151816] px-6 py-16 text-center sm:px-12 sm:py-20">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#3DD68C]">
              MAKE EVERY ORDER COUNT
            </p>
            <h2 className="mx-auto mt-5 max-w-3xl font-serif text-3xl font-semibold tracking-tight text-[#F2F4F0] sm:text-5xl">
              Know what your kitchen earns.
              <span className="block text-[#3DD68C]">Not just what it sells.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-xs leading-7 text-[#929891] sm:text-sm">
              Start tracking the real economics behind your orders,
              dishes and outlets.
            </p>
            <Link
              to={startTo}
              className="mt-9 inline-flex items-center gap-3 rounded-lg bg-[#3DD68C] px-7 py-4 text-xs font-bold text-[#07140D] transition-colors duration-150 hover:bg-[#70E8AA]"
            >
              {loggedIn ? 'Open your dashboard' : 'Create your account'}
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </Reveal>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#2A2F2B]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-center sm:flex-row sm:px-8 sm:text-left">
          <Link to="/" className="flex items-center gap-2 text-xs font-semibold text-[#C2C8C1]">
            <Icon name="chef" className="h-4 w-4 text-[#3DD68C]" />
            Kitchen Margin Tracker
          </Link>
          <p className="text-[10px] text-[#858D85]">
            24CIE554 Full Stack Development · Nishita Shirwal &amp; Reyansh Keshava
          </p>
        </div>
      </footer>
    </div>
  );
}
