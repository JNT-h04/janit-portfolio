import type { Note } from '../projects/notes'
import HudPanel from './HudPanel'

/** The cyberpunk rendering of the shared honest notes (see projects/notes.ts). */
export default function HonestNotes({ notes }: { notes: Note[] }) {
  return (
    <HudPanel title="HOW IT WORKS" tag="HONEST NOTES">
      <ul className="space-y-4 text-text/85">
        {notes.map((note) => (
          <li key={note.label}>
            <span className={note.warn ? 'text-hot' : 'text-neon'}>{note.label}:</span> {note.body}
            {note.table && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-100 border-collapse font-mono text-sm">
                  <thead>
                    <tr className="border-b border-neon/20 text-left text-dim">
                      {note.table.head.map((h) => (
                        <th key={h} className="py-1 pr-4 font-normal">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {note.table.rows.map((row, r) => (
                      <tr key={r} className="border-b border-neon/10 last:border-0">
                        {row.map((cell, c) => (
                          <td
                            key={c}
                            className={`py-1 pr-4 ${
                              c === row.length - 1 ? (r === note.table!.shipped ? 'text-neon' : 'text-hot') : ''
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1 font-mono text-[11px] text-dim">// {note.table.caption}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </HudPanel>
  )
}
