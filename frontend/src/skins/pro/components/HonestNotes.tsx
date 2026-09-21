import type { Note } from '../../../projects/notes'
import Reveal from './Reveal'

/** The professional rendering of the shared honest notes (see projects/notes.ts). */
export default function HonestNotes({ notes }: { notes: Note[] }) {
  return (
    <Reveal>
      <section className="paper-card p-6">
        <h3 className="font-sans text-xs tracking-widest text-quiet uppercase">How it works · honest notes</h3>
        <dl className="mt-5 space-y-5">
          {notes.map((note) => (
            <div key={note.label}>
              <dt
                className={`font-sans text-sm font-semibold ${note.warn ? 'text-red-700' : 'text-ink'}`}
              >
                {note.label}
              </dt>
              <dd className="mt-1 font-sans text-[15px] leading-[1.7] text-ink/80">{note.body}</dd>
              {note.table && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-100 border-collapse text-left font-sans text-sm">
                    <caption className="mb-2 text-left font-sans text-xs text-quiet">
                      {note.table.caption}
                    </caption>
                    <thead>
                      <tr className="border-b border-rule text-quiet">
                        {note.table.head.map((h) => (
                          <th key={h} className="py-1.5 pr-4 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {note.table.rows.map((row, r) => (
                        <tr
                          key={r}
                          className={`border-b border-rule last:border-0 ${
                            r === note.table!.shipped ? 'bg-coral-soft' : ''
                          }`}
                        >
                          {row.map((cell, c) => (
                            <td
                              key={c}
                              className={`py-1.5 pr-4 ${
                                r === note.table!.shipped && c === row.length - 1
                                  ? 'font-semibold text-coral'
                                  : 'text-ink/80'
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </dl>
      </section>
    </Reveal>
  )
}
