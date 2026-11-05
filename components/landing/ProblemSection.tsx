"use client"

import {
  AlertTriangleIcon,
  LockKeyholeIcon,
  SmartphoneIcon,
  WalletCardsIcon,
} from "lucide-react"

const PAIN_POINTS = [
  {
    number: "01",
    title: "The Vanishing WhatsApp Treasurer",
    description:
      "Family hospital drives, alumni dues, and Ajo contributions still sit in one person's personal bank account—vulnerable to impulse borrowing, opacity, or sudden disappearance.",
    icon: AlertTriangleIcon,
  },
  {
    number: "02",
    title: "Crypto Complexity Excludes Relatives",
    description:
      "Traditional crypto multi-sig apps force every uncle and auntie to install complicated wallet extensions, buy gas tokens, and bridge assets—killing community adoption on day one.",
    icon: SmartphoneIcon,
  },
  {
    number: "03",
    title: "Lump-Sum Salary Burn & Urgent Requests",
    description:
      "Nigerian remote workers receive $2,000+ freelance payouts at once and watch inflation, impulse spend, and unbudgeted obligations drain a 3-month runway in two weeks.",
    icon: WalletCardsIcon,
  },
  {
    number: "04",
    title: "Rigid Time-Locks Ignore Real Emergencies",
    description:
      "Hard smart-contract locks trap your own money when medical or family emergencies happen, while cancellable savings apps fail the moment temptation strikes.",
    icon: LockKeyholeIcon,
  },
] as const

export function ProblemSection() {
  return (
    <section
      id="why-umunna"
      className="sheet-panel relative z-10 -mt-8 rounded-t-[36px] border-t border-border bg-card py-20 md:rounded-t-[56px] md:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:sticky lg:top-28 lg:col-span-5 lg:self-start" data-fx="left">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
              01 &middot; The Trust &amp; Access Gap
            </span>
            <h2 className="mt-5 font-display text-3xl leading-[1.08] font-bold tracking-[-0.035em] sm:text-4xl md:text-5xl">
              Communal wealth is African{" "}
              <span className="font-serif font-normal italic text-primary">
                heritage.
              </span>{" "}
              Manual custody broke it.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Across towns, churches, estates, and remote creator circles,
              pooling money is second nature—yet our tools force an impossible
              choice between blind human trust and unusable Web3 complexity.
            </p>
          </div>

          <div
            className="grid gap-4 sm:grid-cols-2 lg:col-span-7"
            data-fx="stagger"
          >
            {PAIN_POINTS.map((item) => {
              const Icon = item.icon
              return (
                <article
                  key={item.number}
                  className="group flex flex-col justify-between rounded-3xl border border-border bg-background/85 p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        /{item.number}
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
