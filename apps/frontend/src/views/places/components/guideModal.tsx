import { IGuide, IPlace } from '@baita/shared'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  DeleteOutline as DeleteOutlineIcon,
  DragIndicator as DragIndicatorIcon,
  Share as ShareIcon,
} from '@mui/icons-material'
import {
  AppBar,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  IconButton,
  Toolbar,
} from '@mui/material'
import { FC, useContext, useState } from 'react'

import { Button, Text, TextInput } from '@/components'
import { useDeleteGuide, useSaveGuide } from '@/hooks/useGuides'
import { usePlaces } from '@/hooks/usePlaces'
import { NotificationContext } from '@/providers/notification'
import { getLabels, Labels } from '@/utils/labels'
import { buildGoogleMapsUrl, shareGuide } from '@/utils/maps'

import PlacePicker, { resolveGuideChanges } from './placePicker'

const SortablePlace: FC<{
  placeId: string
  index: number
  name: string
  onRemove: () => void
}> = ({ placeId, index, name, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: placeId })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: 'flex',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <div
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none', cursor: 'grab', padding: '0 8px' }}
      >
        <DragIndicatorIcon style={{ fontSize: 20, color: '#bbb' }} />
      </div>
      <Text className="fw-light" style={{ width: 24, color: '#999' }}>
        {index + 1}
      </Text>
      <Text className="flex-grow-1 text-truncate">{name}</Text>
      <IconButton
        onClick={onRemove}
        size="small"
        aria-label="Remove"
        sx={{ width: 44, height: 44 }}
      >
        <CloseIcon style={{ fontSize: 18 }} />
      </IconButton>
    </div>
  )
}

const GuideModal: FC<{
  guide: IGuide
  open: boolean
  onClose: () => void
}> = ({ guide, open, onClose }) => {
  const [localGuide, setGuide] = useState<IGuide>(guide)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const saveGuide = useSaveGuide()
  const deleteGuide = useDeleteGuide()
  const { data: places } = usePlaces()
  const { showSnack } = useContext(NotificationContext)

  const isNew = !guide.guideId
  const isBusy = saveGuide.isPending || deleteGuide.isPending

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  )

  const resolvedPlaces = (places || []).filter((p) =>
    localGuide.placeIds.includes(p.placeId)
  )

  const orderedPlaces = localGuide.placeIds
    .map((id) => resolvedPlaces.find((p) => p.placeId === id))
    .filter(Boolean) as IPlace[]

  const onNameChange = (name: string) => {
    setGuide({ ...localGuide, name })
  }

  const onDescriptionChange = (description: string) => {
    setGuide({ ...localGuide, description })
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = localGuide.placeIds.indexOf(active.id as string)
    const newIndex = localGuide.placeIds.indexOf(over.id as string)
    setGuide({
      ...localGuide,
      placeIds: arrayMove(localGuide.placeIds, oldIndex, newIndex),
    })
  }

  const onRemovePlace = (placeId: string) => {
    setGuide({
      ...localGuide,
      placeIds: localGuide.placeIds.filter((id) => id !== placeId),
    })
  }

  const onPickerConfirm = (selectedIds: string[]) => {
    setGuide({
      ...localGuide,
      placeIds: resolveGuideChanges(localGuide.placeIds, selectedIds),
    })
  }

  const onSave = () => {
    const payload: IGuide = {
      guideId: localGuide.guideId,
      name: localGuide.name,
      description: localGuide.description,
      placeIds: localGuide.placeIds,
      createdAt: localGuide.createdAt || new Date().toISOString(),
    }
    saveGuide.mutate(payload, { onSuccess: onClose })
  }

  const onDelete = () => {
    setConfirmDelete(true)
  }

  const onConfirmDelete = () => {
    setConfirmDelete(false)
    deleteGuide.mutate(localGuide.guideId, { onSuccess: onClose })
  }

  const onShare = async () => {
    if (orderedPlaces.length === 0) return
    const url = buildGoogleMapsUrl(orderedPlaces)
    const result = await shareGuide(localGuide.name, url)
    if (result === 'clipboard') {
      showSnack(labels.linkCopied, 'success')
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullScreen>
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{ borderBottom: '1px solid #eee' }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', minHeight: 56 }}>
            <IconButton
              aria-label={labels.cancel}
              onClick={onClose}
              edge="start"
            >
              <ArrowBackIcon />
            </IconButton>
            <div className="d-flex" style={{ gap: 8 }}>
              {!isNew && orderedPlaces.length >= 1 && (
                <IconButton onClick={onShare} aria-label={labels.share}>
                  <ShareIcon />
                </IconButton>
              )}
              <Button
                type="contained"
                color="primary"
                onClick={onSave}
                disabled={isBusy || !localGuide.name}
              >
                {saveGuide.isPending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : isNew ? (
                  labels.save
                ) : (
                  labels.update
                )}
              </Button>
            </div>
          </Toolbar>
        </AppBar>

        <DialogContent sx={{ pt: 3 }}>
          <TextInput
            label={labels.name}
            variant="outlined"
            placeholder={labels.namePlaceholder}
            value={localGuide.name}
            onChange={onNameChange}
          />
          <TextInput
            label={labels.notes}
            variant="outlined"
            placeholder={labels.notesPlaceholder}
            value={localGuide.description || ''}
            onChange={onDescriptionChange}
            className="mt-3"
          />

          {/* Places Section */}
          <div className="mt-4 d-flex align-items-center justify-content-between">
            <Text className="fw-bold" style={{ fontSize: 14 }}>
              {labels.placesSection} ({localGuide.placeIds.length})
            </Text>
            <Button
              type="text"
              icon={<AddIcon style={{ fontSize: 18 }} />}
              onClick={() => setPickerOpen(true)}
            >
              {labels.add}
            </Button>
          </div>

          {localGuide.placeIds.length === 0 ? (
            <Text
              className="mt-2 fw-light"
              style={{ color: '#999', fontSize: 13 }}
            >
              {labels.noPlaces}
            </Text>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={localGuide.placeIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="mt-2">
                  {localGuide.placeIds.map((placeId, index) => {
                    const place = orderedPlaces.find(
                      (p) => p.placeId === placeId
                    )
                    return (
                      <SortablePlace
                        key={placeId}
                        placeId={placeId}
                        index={index}
                        name={place?.name || placeId}
                        onRemove={() => onRemovePlace(placeId)}
                      />
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Delete */}
          {!isNew && (
            <div className="mt-5 d-flex justify-content-center">
              <Button
                type="text"
                color="error"
                icon={
                  deleteGuide.isPending ? (
                    <CircularProgress size={16} />
                  ) : (
                    <DeleteOutlineIcon style={{ fontSize: 18 }} />
                  )
                }
                onClick={onDelete}
                disabled={isBusy}
              >
                {labels.delete}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Place Picker */}
      <PlacePicker
        open={pickerOpen}
        places={places || []}
        selectedIds={localGuide.placeIds}
        onConfirm={onPickerConfirm}
        onClose={() => setPickerOpen(false)}
      />

      {/* Delete Confirmation */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogContent>
          <DialogContentText>
            {labels.confirmDelete.replace('{name}', localGuide.name)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>
            {labels.cancel}
          </Button>
          <Button type="text" color="error" onClick={onConfirmDelete}>
            {labels.deleteConfirm}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default GuideModal

const LABELS: Labels = {
  en: {
    name: 'Name',
    namePlaceholder: 'Guide name',
    notes: 'Notes',
    notesPlaceholder: 'Who is this guide for?',
    placesSection: 'Places',
    add: 'Add',
    noPlaces: 'Add places to create a walking route',
    save: 'Save',
    update: 'Update',
    cancel: 'Cancel',
    share: 'Share',
    linkCopied: 'Link copied!',
    delete: 'Delete guide',
    confirmDelete: 'Delete "{name}"? Your places won\'t be affected.',
    deleteConfirm: 'Delete',
  },
  pt: {
    name: 'Nome',
    namePlaceholder: 'Nome do guia',
    notes: 'Notas',
    notesPlaceholder: 'Para quem é este guia?',
    placesSection: 'Lugares',
    add: 'Adicionar',
    noPlaces: 'Adicione lugares para criar uma rota a pé',
    save: 'Salvar',
    update: 'Atualizar',
    cancel: 'Cancelar',
    share: 'Compartilhar',
    linkCopied: 'Link copiado!',
    delete: 'Excluir guia',
    confirmDelete: 'Excluir "{name}"? Seus lugares não serão afetados.',
    deleteConfirm: 'Excluir',
  },
}

const labels = getLabels(LABELS)
