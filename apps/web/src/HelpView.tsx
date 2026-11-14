import { QUICK_ADD_HELP } from '@errandipity/shared';
import type { ReactNode } from 'react';
import { cardClass, mutedClass } from './TaskRow';

const codeClass = 'rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.8rem] dark:bg-slate-700';

/** One topic on the Help page. Add further topics as more of these. */
function HelpSection({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section className={`${cardClass} space-y-4 p-4`}>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {intro && <p className={`text-sm ${mutedClass}`}>{intro}</p>}
      </div>
      {children}
    </section>
  );
}

function QuickAddSymbols() {
  return (
    <HelpSection
      title="Quick-add symbols"
      intro={
        <>
          The "+ Add task" line at the bottom of each day takes a task name. Add any of these symbols as separate
          words, anywhere in the line, to set more than the name. They are not case-sensitive, and anything that
          does not match one of the forms below is kept as part of the name.
        </>
      }
    >
      <dl className="space-y-5">
        {QUICK_ADD_HELP.map((symbol) => (
          <div key={symbol.prefix} className="space-y-2">
            <dt className="flex items-center gap-2 text-sm font-semibold">
              <code className={codeClass}>{symbol.prefix}</code>
              {symbol.label}
            </dt>
            <dd className="space-y-2 text-sm">
              <p>{symbol.description}</p>
              <p className="flex flex-wrap gap-1.5">
                {symbol.forms.map((form) => (
                  <code key={form} className={codeClass}>
                    {form}
                  </code>
                ))}
              </p>
              <ul className={`space-y-1 ${mutedClass}`}>
                {symbol.examples.map((example) => (
                  <li key={example.input}>
                    <code className={codeClass}>{example.input}</code> → {example.result}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
      <div className="space-y-1 border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
        <p className="font-semibold">Putting them together</p>
        <p>
          <code className={codeClass}>Team sync **Mon %%9:30 $$Weekly:MWF !!2</code>
        </p>
        <p className={mutedClass}>
          Creates "Team sync" next Monday at 9:30 AM, repeating every Monday, Wednesday and Friday, at priority 2.
          The line under the box shows what will be set as you type, and the + button opens the full form with
          the same values.
        </p>
      </div>
    </HelpSection>
  );
}

export function HelpView() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Help</h1>
      <QuickAddSymbols />
    </div>
  );
}
