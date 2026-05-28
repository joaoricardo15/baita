import { withAuthenticationRequired } from '@auth0/auth0-react'
import {
  Add as AddIcon,
  ArrowBackOutlined as ArrowBackOutlinedIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { Fab, TextareaAutosize } from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'

import { Button, Loading, Skeleton, Text } from '../../components'
import { NotificationContext } from '../../providers/notification'
import { getLabels, Labels } from '../../utils/labels'
import ApiRequest from '../../utils/requests'

export interface INote {
  noteId: string
  title: string
  createdAt: number
  updatedAt: number
  category?: string
}

const emptyNote: () => INote = () => ({
  noteId: Date.now().toString(),
  title: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

export const Notes: FC = () => {
  const apiRequest = ApiRequest()

  const [notes, setNotes] = useState<INote[] | undefined>()
  const [note, setNote] = useState<INote | undefined>(emptyNote())
  const { showLoading } = useContext(NotificationContext)

  const onNoteChange = (value: string) => {
    if (note) {
      setNote({ ...note, title: value, updatedAt: Date.now() })
    }
  }

  const onNewNote = () => {
    if (note?.title) {
      apiRequest
        .addNote(note.noteId, note)
        .then(() => apiRequest.getNotes().then((notes) => setNotes(notes)))
    }
    setNote(emptyNote())
  }

  const onNoteSelect = (note: INote) => {
    setNote(note)
  }

  const onPublishNoteChange = () => {
    if (note?.title) {
      apiRequest
        .addNote(note.noteId, note)
        .then(() => apiRequest.getNotes().then((notes) => setNotes(notes)))
    }
  }

  const onNotesPageNavigate = () => {
    if (note?.title) {
      showLoading(true)
      apiRequest.addNote(note.noteId, note).then(() =>
        apiRequest.getNotes().then((notes) => {
          setNotes(notes)
          setNote(undefined)
          showLoading(false)
        })
      )
    } else {
      setNote(undefined)
    }
  }

  const onDeleteNote = (noteId: string) => {
    showLoading(true)
    apiRequest.deleteNote(noteId).then(() =>
      apiRequest.getNotes().then((notes) => {
        setNotes(notes)
        showLoading(false)
      })
    )
  }

  useEffect(() => {
    apiRequest.getNotes().then((notes) => setNotes(notes))
  }, [])

  return (
    <>
      <Fab
        color="primary"
        style={{ position: 'absolute', right: 10 }}
        onClick={() => onNewNote()}
        disabled={note && !note.title}
      >
        <AddIcon />
      </Fab>
      {note !== undefined ? (
        <>
          <Button
            type="text"
            icon={<ArrowBackOutlinedIcon />}
            onClick={onNotesPageNavigate}
          >
            Notes
          </Button>

          <div
            style={{ marginTop: '10vh' }}
            className="d-flex justify-content-center mx-4"
          >
            <TextareaAutosize
              className="w-100"
              value={note.title}
              onChange={(event) => onNoteChange(event.target.value)}
              onBlur={onPublishNoteChange}
              placeholder={labels.notePlaceHolder}
            />
          </div>
        </>
      ) : !notes ? (
        <div className="d-flex m-2">
          <Skeleton elements={5} width={36} height={36} />
          <Skeleton elements={5} height={36} className="w-100 mx-2" />
        </div>
      ) : (
        <div style={{ maxHeight: '70vh', overflow: 'scroll' }}>
          {notes.map((note, index) => (
            <div key={index} className="d-flex w-100 m-2">
              <Text
                style={{ lineBreak: 'anywhere' }}
                className="text-wrap fw-bold"
                onClick={() => onNoteSelect(note)}
              >
                {note.title}
              </Text>
              <Button
                iconButton
                icon={<DeleteIcon color="secondary" />}
                onClick={() => onDeleteNote(note.noteId)}
              ></Button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default withAuthenticationRequired(Notes, {
  onRedirecting: () => <Loading />,
})

const LABELS: Labels = {
  en: {
    notePlaceHolder: 'What is in your mind?',
  },
  pt: {
    notePlaceHolder: 'O que tá passando da tua cabeça?',
  },
}

const labels = getLabels(LABELS)
