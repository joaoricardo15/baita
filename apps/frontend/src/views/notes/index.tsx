import { withAuthenticationRequired } from '@auth0/auth0-react'
import {
  Add as AddIcon,
  InterestsOutlined as InterestsOutlinedIcon,
} from '@mui/icons-material'
import { Dialog, DialogContent, TextareaAutosize } from '@mui/material'
import { FC, useState } from 'react'

import { Button, EmptyState, Loading, Skeleton } from '@/components'
import { INote } from '@baita/shared'
import { useDeleteNote, useNotes, useSaveNote } from '@/hooks/useNotes'
import { getLabels, Labels } from '@/utils/labels'

import NoteCard from './components/noteCard'

const emptyNote: () => INote = () => ({
  noteId: Date.now().toString(),
  title: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

export const Notes: FC = () => {
  const { data: notes, isLoading: loading } = useNotes()
  const saveNote = useSaveNote()
  const deleteNote = useDeleteNote()

  const [editingNote, setEditingNote] = useState<INote | undefined>()

  const onNewNote = () => {
    setEditingNote(emptyNote())
  }

  const onEditNote = (note: INote) => {
    setEditingNote(note)
  }

  const onNoteChange = (value: string) => {
    if (editingNote) {
      setEditingNote({ ...editingNote, title: value, updatedAt: Date.now() })
    }
  }

  const onSaveNote = () => {
    if (editingNote?.title) {
      saveNote.mutate(editingNote)
    }
    setEditingNote(undefined)
  }

  const onDeleteNote = (noteId: string) => {
    deleteNote.mutate(noteId)
  }

  return (
    <>
      {loading || !notes ? (
        <Skeleton elements={3} height={100} />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={<InterestsOutlinedIcon style={{ fontSize: 48 }} />}
          title={labels.emptyTitle}
          description={labels.emptyDescription}
        />
      ) : (
        notes.map((note) => (
          <div className="mb-2" key={note.noteId}>
            <NoteCard
              note={note}
              onEdit={() => onEditNote(note)}
              onDelete={() => onDeleteNote(note.noteId)}
            />
          </div>
        ))
      )}

      <div className="d-flex align-items-center justify-content-center mt-5">
        <Button
          type="text"
          color="primary"
          icon={<AddIcon />}
          onClick={onNewNote}
        >
          {labels.addNote}
        </Button>
      </div>

      <Dialog
        open={editingNote !== undefined}
        onClose={onSaveNote}
        fullWidth
        maxWidth="sm"
      >
        <DialogContent>
          <TextareaAutosize
            autoFocus
            className="w-100 border-0"
            minRows={5}
            value={editingNote?.title || ''}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder={labels.notePlaceholder}
            style={{ outline: 'none', resize: 'none', fontSize: '1rem' }}
          />
          <div className="d-flex justify-content-end mt-3">
            <Button
              type="text"
              color="primary"
              onClick={onSaveNote}
              disabled={!editingNote?.title}
            >
              {labels.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default withAuthenticationRequired(Notes, {
  onRedirecting: () => <Loading />,
})

const LABELS: Labels = {
  en: {
    emptyTitle: 'No notes yet',
    emptyDescription: 'Capture your thoughts and ideas here.',
    addNote: 'Add note',
    notePlaceholder: 'What is on your mind?',
    save: 'Save',
    loadError: 'Could not load notes',
    saveError: 'Could not save note',
    deleteError: 'Could not delete note',
  },
  pt: {
    emptyTitle: 'Nenhuma nota ainda',
    emptyDescription: 'Capture seus pensamentos e ideias aqui.',
    addNote: 'Adicionar nota',
    notePlaceholder: 'O que esta passando na sua cabeca?',
    save: 'Salvar',
    loadError: 'Nao foi possivel carregar notas',
    saveError: 'Nao foi possivel salvar nota',
    deleteError: 'Nao foi possivel excluir nota',
  },
}

const labels = getLabels(LABELS)
