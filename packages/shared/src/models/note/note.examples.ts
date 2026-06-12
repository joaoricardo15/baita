import { INote } from './note.schema'

export const exampleNote: INote = {
  noteId: 'note-abc123',
  title: 'Weekly grocery list',
  createdAt: 1718000000000,
  updatedAt: 1718100000000,
  category: 'personal',
}

export const exampleNoteList: INote[] = [
  exampleNote,
  {
    noteId: 'note-def456',
    title: 'Project ideas for Q3',
    createdAt: 1717900000000,
    updatedAt: 1717950000000,
    category: 'work',
  },
  {
    noteId: 'note-ghi789',
    title: 'Book recommendations from Maria',
    createdAt: 1717800000000,
    updatedAt: 1717800000000,
  },
]
