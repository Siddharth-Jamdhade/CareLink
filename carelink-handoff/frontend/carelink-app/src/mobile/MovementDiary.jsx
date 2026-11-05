// CareLink Mobile - MovementDiary.jsx - enhanced 2026-11-05
import React, { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'carelink_movements';
const MAX_NOTES = 5;
const MAX_CHARS = 500;

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = JSON.parse(raw || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

/**
 * MovementDiary — purely local movement note-taking.
 * Notes are NEVER sent to any server.
 * @param {{ week: number }} props
 */
export default function MovementDiary({ week }) {
  const [notes, setNotes] = useState(() => loadNotes());
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef(null);
  const statusRef = useRef(null);

  // Keep state fresh if another tab writes to localStorage
  useEffect(() => {
    const onStorage = e => {
      if (e.key === STORAGE_KEY) setNotes(loadNotes());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addNote = useCallback(e => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const note = { id: Date.now(), text: trimmed, timestamp: new Date().toISOString() };
    const updated = [note, ...notes].slice(0, MAX_NOTES);
    setNotes(updated);
    saveNotes(updated);
    setText('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    textareaRef.current?.focus();
  }, [notes, text]);

  const clearAll = useCallback(() => {
    if (!window.confirm('Remove all movement notes from this device? This cannot be undone.')) return;
    setNotes([]);
    saveNotes([]);
  }, []);

  const remaining = MAX_CHARS - text.length;

  if (week < 16) {
    return (
      <section className="cl-card cl-movement-diary" aria-label="Movement notes">
        <p className="cl-eyebrow">MOVEMENT NOTES</p>
        <p className="cl-muted">
          Movement notes are available from week&nbsp;16. Movements are commonly first felt between
          16 and 24&nbsp;weeks.
        </p>
      </section>
    );
  }

  return (
    <section className="cl-card cl-movement-diary" aria-label="Movement diary — local notes">
      <div className="cl-row">
        <p className="cl-eyebrow">MOVEMENT NOTES</p>
        <span className="cl-local-badge" aria-label="Local notes not shared with care team">
          Local notes · not shared with care team
        </span>
      </div>

      <p className="cl-movement-disclaimer" role="note">
        These are your personal observations. <strong>Do not use this diary to assess your
        baby's health.</strong> Contact your maternity care team immediately if movements are
        reduced, absent, or have changed.
      </p>

      <form onSubmit={addNote} className="cl-movement-form" aria-label="Add movement note">
        <label htmlFor="cl-movement-input" className="cl-sr">
          Add a movement note (max {MAX_CHARS} characters)
        </label>
        <textarea
          id="cl-movement-input"
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
          placeholder="e.g. Felt 5 kicks after lunch…"
          rows={3}
          maxLength={MAX_CHARS}
          aria-describedby="cl-movement-counter"
        />
        <div className="cl-movement-meta">
          <span
            id="cl-movement-counter"
            aria-live="polite"
            aria-atomic="true"
            className={remaining < 50 ? 'cl-counter-warn' : ''}
          >
            {remaining} characters remaining
          </span>
          <button
            type="submit"
            className="cl-primary cl-movement-submit"
            disabled={!text.trim()}
            aria-label="Save movement note"
          >
            Save note
          </button>
        </div>
        {saved && (
          <p
            role="status"
            aria-live="polite"
            ref={statusRef}
            className="cl-movement-saved"
          >
            Note saved locally.
          </p>
        )}
      </form>

      {notes.length > 0 && (
        <div className="cl-movement-list">
          <h3 className="cl-movement-list-title">Recent notes (last {Math.min(notes.length, MAX_NOTES)})</h3>
          <ul aria-label="Movement note history" className="cl-movement-entries">
            {notes.map(note => (
              <li key={note.id} className="cl-movement-entry">
                <time dateTime={note.timestamp} className="cl-movement-time">
                  {new Date(note.timestamp).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </time>
                <p className="cl-movement-text">{note.text}</p>
              </li>
            ))}
          </ul>
          <button
            className="cl-text cl-movement-clear"
            onClick={clearAll}
            aria-label="Clear all movement notes from this device"
          >
            Clear all notes
          </button>
        </div>
      )}

      <p className="cl-muted cl-movement-footer">
        Notes are stored only on this device and are never sent to your care team or CareLink
        servers. They will be removed if you clear your browser data.
      </p>
    </section>
  );
}
