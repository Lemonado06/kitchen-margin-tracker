
import { Link } from 'react-router-dom';
import Icon from './Icon';

const features = [
  {
    icon: 'trend',
    number: '01',
    title: 'Know your real profit',
    text: 'Calculate profit per order after platform commission, GST, discounts and food costs.',
  },
  {
    icon: 'store',
    number: '02',
    title: 'Manage every outlet',
    text: 'Bring your outlets, dishes, orders and delivery platforms together.',
  },
  {
    icon: 'sparkles',
    number: '03',
    title: 'Make better decisions',
    text: 'Use AI-powered analysis to identify loss-making dishes and opportunities.',
  },
];

export default function AuthShell({ title, subtitle, children }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0C0E0D] px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-xl border border-[#2A2F2B] bg-[#151816] shadow-2xl md:min-h-[620px] md:grid-cols-2">
        {/* Brand and feature panel */}
        <section className="relative hidden flex-col justify-between border-r border-[#2A2F2B] bg-[#111412] p-9 lg:p-11 md:flex">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#31513E] bg-[#1C2B21] text-[#3DD68C]">
                <Icon name="chef" className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold tracking-tight text-[#F2EDE0]">
                  Kitchen Margin Tracker
                </p>
                <p className="mt-0.5 font-mono text-[8px] tracking-[0.15em] text-[#858D85]">
                  BUSINESS OPERATIONS
                </p>
              </div>
            </Link>
          </div>

          <div className="my-12">
            <p className="mb-4 flex items-center gap-2 font-mono text-[9px] tracking-[0.16em] text-[#3DD68C]">
              <span className="h-px w-6 bg-[#3DD68C]" />
              BUILT FOR CLOUD KITCHENS
            </p>

            <h2 className="max-w-sm text-3xl font-semibold leading-[1.2] tracking-tight text-[#F2EDE0] xl:text-4xl">
              Know which dishes
              <span className="text-[#3DD68C]"> actually make money.</span>
            </h2>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#929891]">
              Stop guessing your margins. Understand where every rupee
              goes and make decisions backed by your numbers.
            </p>

            <div className="mt-10 space-y-5">
              {features.map((feature) => (
                <div
                  key={feature.number}
                  className="flex items-start gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#2A2F2B] bg-[#1A1C1B] text-[#3DD68C]">
                    <Icon name={feature.icon} className="h-4 w-4" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-[#737B73]">
                        {feature.number}
                      </span>
                      <h3 className="text-sm font-semibold text-[#E5E8E1]">
                        {feature.title}
                      </h3>
                    </div>

                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#858D85]">
                      {feature.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#2A2F2B] pt-5">
            <p className="font-mono text-[9px] tracking-wider text-[#737B73]">
              ZOMATO · SWIGGY · DIRECT ORDERS
            </p>
            <p className="mt-2 text-[10px] text-[#737B73]">
              Built for the economics of modern food businesses.
            </p>
          </div>
        </section>

        {/* Authentication panel */}
        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#31513E] bg-[#1C2B21] text-[#3DD68C]">
              <Icon name="chef" className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-[#F2EDE0]">
                Kitchen Margin Tracker
              </p>
              <p className="font-mono text-[8px] tracking-wider text-[#858D85]">
                BUSINESS OPERATIONS
              </p>
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-3 font-mono text-[9px] tracking-[0.16em] text-[#3DD68C]">
              ACCOUNT PORTAL
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-[#F2EDE0] sm:text-3xl">
              {title}
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-[#929891]">
              {subtitle}
            </p>
          </div>

          {children}

          <div className="mt-8 border-t border-[#2A2F2B] pt-5">
            <div className="flex items-center justify-center gap-2 text-[#737B73]">
              <Icon name="shield" className="h-3.5 w-3.5" />
              <span className="text-[10px]">
                Your account is protected with secure authentication.
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
