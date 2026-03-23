import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useI18n } from '../i18n';
import { Plus, Search, FileText, Pin, Trash2, Save, Share2, Download, MoreVertical } from 'lucide-react';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Note, ExamProfile } from '../types';
import { format } from 'date-fns';

export default function Notes() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const [notes, setNotes] = useState<Note[]>([]);
  const [examProfile, setExamProfile] = useState<ExamProfile | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'users', profile.uid, 'notes'),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
      setNotes(data);
      setLoading(false);
    });

    const profileId = profile.currentExamProfileId || 'default';
    const unsubscribeProfile = onSnapshot(doc(db, 'users', profile.uid, 'examProfiles', profileId), (snapshot) => {
      if (snapshot.exists()) {
        setExamProfile(snapshot.data() as ExamProfile);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeProfile();
    };
  }, [profile?.uid, profile?.currentExamProfileId]);

  const createNote = async () => {
    if (!profile?.uid) return;
    const newNote: Partial<Note> = {
      subjectId: examProfile?.subjects[0]?.id || 'general',
      title: 'Untitled Note',
      content: '',
      tags: [],
      pinned: false,
      updatedAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, 'users', profile.uid, 'notes'), newNote);
    setActiveNote({ id: docRef.id, ...newNote } as Note);
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    if (!profile?.uid) return;
    const updatedAt = new Date().toISOString();
    await updateDoc(doc(db, 'users', profile.uid, 'notes', id), { ...updates, updatedAt });
    if (activeNote?.id === id) {
      setActiveNote({ ...activeNote, ...updates, updatedAt });
    }
  };

  const deleteNote = async (id: string) => {
    if (!profile?.uid) return;
    await deleteDoc(doc(db, 'users', profile.uid, 'notes', id));
    if (activeNote?.id === id) setActiveNote(null);
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const downloadNote = () => {
    if (!activeNote) return;
    const blob = new Blob([activeNote.content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeNote.title || 'note'}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareNote = async () => {
    if (!activeNote) return;
    const text = `${activeNote.title}\n\n${activeNote.content}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: activeNote.title,
          text: activeNote.content,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Note copied to clipboard!');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-text-secondary">Loading...</div>;

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6">
      {/* Sidebar */}
      <aside className="w-80 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">{t('notes.title')}</h1>
          <button 
            onClick={createNote}
            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('notes.search')}
            className="w-full pl-10 pr-4 py-2 bg-elevated border border-border rounded-xl text-sm outline-none focus:border-primary/50"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
          {filteredNotes.map(note => {
            const subject = examProfile?.subjects.find(s => s.id === note.subjectId);
            return (
              <button
                key={note.id}
                onClick={() => setActiveNote(note)}
                className={`w-full text-left p-4 rounded-2xl border transition-all space-y-2 group ${
                  activeNote?.id === note.id ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5' : 'bg-surface border-border hover:bg-elevated'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">{subject?.name || 'General'}</span>
                  {note.pinned && <Pin size={12} className="text-primary fill-primary" />}
                </div>
                <h3 className="font-bold text-sm text-text-primary truncate">{note.title}</h3>
                <p className="text-xs text-text-secondary line-clamp-2">{note.content || 'No content yet...'}</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] text-text-secondary font-medium">{format(new Date(note.updatedAt), 'MMM do')}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="p-1 text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </button>
            );
          })}
          {filteredNotes.length === 0 && (
            <div className="text-center py-12 text-text-secondary text-sm italic">
              {t('notes.no_notes')}
            </div>
          )}
        </div>
      </aside>

      {/* Editor */}
      <main className="flex-1 bg-surface border border-border rounded-3xl overflow-hidden flex flex-col">
        {activeNote ? (
          <>
            <header className="p-6 border-b border-border flex items-center justify-between bg-elevated/30">
              <div className="flex items-center gap-4 flex-1">
                <select 
                  value={activeNote.subjectId}
                  onChange={(e) => updateNote(activeNote.id, { subjectId: e.target.value })}
                  className="bg-surface border border-border rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-primary/50"
                >
                  {examProfile?.subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  <option value="general">General</option>
                </select>
                <input 
                  type="text" 
                  value={activeNote.title}
                  onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                  className="flex-1 bg-transparent text-lg font-bold outline-none focus:text-primary transition-colors"
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => updateNote(activeNote.id, { pinned: !activeNote.pinned })}
                  className={`p-2 rounded-lg transition-all ${activeNote.pinned ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  <Pin size={18} fill={activeNote.pinned ? 'currentColor' : 'none'} />
                </button>
                <button 
                  onClick={downloadNote}
                  className="p-2 text-text-secondary hover:text-text-primary transition-all"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={shareNote}
                  className="p-2 text-text-secondary hover:text-text-primary transition-all"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </header>
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
              <textarea 
                value={activeNote.content}
                onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                placeholder="Start writing your thoughts..."
                className="w-full h-full bg-transparent outline-none resize-none text-text-primary leading-relaxed placeholder:text-text-secondary/30"
              />
            </div>
            <footer className="px-6 py-3 border-t border-border bg-elevated/30 flex items-center justify-between text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              <div className="flex items-center gap-4">
                <span>{activeNote.content.split(/\s+/).filter(Boolean).length} {t('notes.word_count')}</span>
                <span>{activeNote.content.length} characters</span>
              </div>
              <span>{t('notes.last_edited')}: {format(new Date(activeNote.updatedAt), 'HH:mm')}</span>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-elevated flex items-center justify-center text-text-secondary">
              <FileText size={40} />
            </div>
            <div className="space-y-1">
              <p className="text-text-primary font-medium">No note selected</p>
              <p className="text-sm text-text-secondary">Select a note from the sidebar or create a new one.</p>
            </div>
            <button 
              onClick={createNote}
              className="px-6 py-2 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
            >
              Create New Note
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
