import { IPlace } from '@baita/shared'
import {
  AddAPhoto as AddAPhotoIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  DeleteOutline as DeleteOutlineIcon,
  MyLocation as MyLocationIcon,
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
import { FC, useContext, useEffect, useState } from 'react'

import * as mutations from '@/api/mutations'
import * as queries from '@/api/queries'
import { Button, Text, TextInput } from '@/components'
import { useDeletePlace, useSavePlace } from '@/hooks/usePlaces'
import { NotificationContext } from '@/providers/notification'
import { getImageUrl } from '@/utils/files'
import { getLabels, Labels } from '@/utils/labels'

const PlaceModal: FC<{
  place: IPlace
  open: boolean
  onClose: () => void
}> = ({ place, open, onClose }) => {
  const [localPlace, setPlace] = useState<IPlace>(place)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const savePlace = useSavePlace()
  const deletePlace = useDeletePlace()
  const { showSnack } = useContext(NotificationContext)

  const isNew = !place.placeId
  const isBusy = savePlace.isPending || deletePlace.isPending || uploading

  useEffect(() => {
    setPlace(place)
  }, [place])

  useEffect(() => {
    if (
      isNew &&
      localPlace.position.lat === 0 &&
      localPlace.position.lng === 0
    ) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPlace((prev) => ({
            ...prev,
            position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          }))
        },
        () => {}
      )
    }
  }, [isNew, localPlace.position.lat, localPlace.position.lng])

  const onNameChange = (name: string) => {
    setPlace({ ...localPlace, name })
  }

  const onDescriptionChange = (description: string) => {
    setPlace({ ...localPlace, description })
  }

  const onUpdateLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlace({
          ...localPlace,
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        })
      },
      () => {}
    )
  }

  const onAddPhoto = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files
      if (!files || files.length === 0) return
      setUploading(true)
      try {
        const newPictures = [...localPlace.pictures]
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const ext = file.name.split('.').pop() || 'jpg'
          const fileKey = `${localPlace.placeId || '_new'}-${crypto.randomUUID()}.${ext}`
          try {
            const presignedUrl = await queries.fetchImageUploadUrl(fileKey)
            await mutations.uploadToPresignedUrl(presignedUrl, file)
            newPictures.push(fileKey)
          } catch {
            showSnack(labels.uploadError, 'error')
            break
          }
        }
        setPlace({ ...localPlace, pictures: newPictures })
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  const onRemovePhoto = (index: number) => {
    const newPictures = localPlace.pictures.filter((_, i) => i !== index)
    setPlace({ ...localPlace, pictures: newPictures })
    if (activePhoto >= newPictures.length && newPictures.length > 0) {
      setActivePhoto(newPictures.length - 1)
    } else if (newPictures.length === 0) {
      setActivePhoto(0)
    }
  }

  const onSave = () => {
    const { placeId, name, description, pictures, position, createdAt } =
      localPlace
    const payload: IPlace = {
      placeId,
      name,
      description,
      pictures,
      position,
      createdAt,
    }
    savePlace.mutate(payload, { onSuccess: onClose })
  }

  const onDelete = () => {
    setConfirmDelete(true)
  }

  const onConfirmDelete = () => {
    setConfirmDelete(false)
    deletePlace.mutate(localPlace, { onSuccess: onClose })
  }

  const hasLocation =
    localPlace.position.lat !== 0 || localPlace.position.lng !== 0

  return (
    <>
      <Dialog open={open} onClose={onClose} fullScreen>
        {/* Top App Bar */}
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
            <Button
              type="contained"
              color="primary"
              onClick={onSave}
              disabled={isBusy || !localPlace.name}
            >
              {savePlace.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : isNew ? (
                labels.save
              ) : (
                labels.update
              )}
            </Button>
          </Toolbar>
        </AppBar>
        {/* Photo Gallery */}
        <div
          style={{
            background: '#f5f5f5',
            position: 'relative',
          }}
        >
          {localPlace.pictures.length > 0 ? (
            <>
              {/* Active Photo (hero) */}
              <div style={{ position: 'relative' }}>
                <img
                  src={getImageUrl(localPlace.pictures[activePhoto])}
                  alt={`${localPlace.name} photo ${activePhoto + 1}`}
                  style={{
                    width: '100%',
                    height: 240,
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <IconButton
                  aria-label={labels.removePhoto}
                  onClick={() => onRemovePhoto(activePhoto)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 44,
                    height: 44,
                    background: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    '&:hover': { background: 'rgba(0,0,0,0.7)' },
                    '&:active': { background: 'rgba(0,0,0,0.8)' },
                  }}
                >
                  <CloseIcon style={{ fontSize: 20 }} />
                </IconButton>
              </div>

              {/* Thumbnail Strip */}
              {localPlace.pictures.length > 1 && (
                <div
                  className="d-flex overflow-auto"
                  style={{ padding: '8px 8px', gap: 6 }}
                >
                  {localPlace.pictures.map((pic, index) => (
                    <img
                      key={pic}
                      src={getImageUrl(pic)}
                      alt={`Thumbnail ${index + 1}`}
                      onClick={() => setActivePhoto(index)}
                      style={{
                        width: 52,
                        height: 52,
                        objectFit: 'cover',
                        borderRadius: 6,
                        cursor: 'pointer',
                        flexShrink: 0,
                        opacity: index === activePhoto ? 1 : 0.5,
                        border:
                          index === activePhoto
                            ? '2px solid #6366f1'
                            : '2px solid transparent',
                        transition: 'opacity 0.2s, border-color 0.2s',
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div
              className="d-flex flex-column align-items-center justify-content-center"
              style={{ height: 120 }}
            >
              <AddAPhotoIcon style={{ fontSize: 32, color: '#999' }} />
              <Text className="mt-1" style={{ color: '#999', fontSize: 12 }}>
                {labels.noPhotos}
              </Text>
            </div>
          )}

          {/* Add Photo Button */}
          <IconButton
            aria-label={labels.addPhoto}
            onClick={onAddPhoto}
            disabled={uploading}
            sx={{
              position: 'absolute',
              bottom: localPlace.pictures.length > 1 ? 72 : 8,
              right: 8,
              width: 44,
              height: 44,
              background: 'white',
              boxShadow: 1,
              '&:hover': { background: '#f0f0f0' },
              '&:active': { background: '#e0e0e0' },
            }}
          >
            {uploading ? (
              <CircularProgress size={20} />
            ) : (
              <AddAPhotoIcon style={{ fontSize: 20 }} />
            )}
          </IconButton>
        </div>

        {/* Form Content */}
        <DialogContent sx={{ pt: 3 }}>
          <TextInput
            label={labels.name}
            variant="outlined"
            placeholder={labels.namePlaceholder}
            value={localPlace.name}
            onChange={onNameChange}
          />

          <TextInput
            label={labels.notes}
            variant="outlined"
            placeholder={labels.notesPlaceholder}
            value={localPlace.description || ''}
            onChange={onDescriptionChange}
            className="mt-3"
          />

          {/* Location */}
          <div className="mt-3 d-flex align-items-center" style={{ gap: 8 }}>
            <MyLocationIcon style={{ fontSize: 16, color: '#999' }} />
            <Text className="fw-light fs-6" style={{ color: '#666' }}>
              {hasLocation
                ? `${localPlace.position.lat.toFixed(4)}, ${localPlace.position.lng.toFixed(4)}`
                : labels.noLocation}
            </Text>
            <IconButton
              aria-label={labels.updateLocation}
              onClick={onUpdateLocation}
              disabled={isBusy}
              size="small"
              sx={{ ml: 'auto' }}
            >
              <MyLocationIcon style={{ fontSize: 18 }} />
            </IconButton>
          </div>

          {/* Delete Action (existing places only) */}
          {!isNew && (
            <div className="mt-5 d-flex justify-content-center">
              <Button
                type="text"
                color="error"
                icon={
                  deletePlace.isPending ? (
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

      {/* Delete Confirmation */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogContent>
          <DialogContentText>
            {labels.confirmDeleteMessage.replace('{name}', localPlace.name)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>
            {labels.cancel}
          </Button>
          <Button type="text" color="error" onClick={onConfirmDelete}>
            {labels.confirmDelete}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default PlaceModal

const LABELS: Labels = {
  en: {
    name: 'Name',
    namePlaceholder: 'Place name',
    notes: 'Notes',
    notesPlaceholder: 'What makes this place special?',
    noPhotos: 'Add photos to remember this place',
    addPhoto: 'Add photo',
    removePhoto: 'Remove photo',
    uploadError: 'Failed to upload photo',
    noLocation: 'No location set',
    updateLocation: 'Update location',
    save: 'Save place',
    update: 'Update',
    cancel: 'Cancel',
    delete: 'Delete',
    confirmDeleteMessage:
      'Delete "{name}" and all its photos? This cannot be undone.',
    confirmDelete: 'Delete',
  },
  pt: {
    name: 'Nome',
    namePlaceholder: 'Nome do lugar',
    notes: 'Notas',
    notesPlaceholder: 'O que torna este lugar especial?',
    noPhotos: 'Adicione fotos para lembrar deste lugar',
    addPhoto: 'Adicionar foto',
    removePhoto: 'Remover foto',
    uploadError: 'Falha ao enviar foto',
    noLocation: 'Localização não definida',
    updateLocation: 'Atualizar localização',
    save: 'Salvar lugar',
    update: 'Atualizar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    confirmDeleteMessage:
      'Excluir "{name}" e todas as suas fotos? Isso não pode ser desfeito.',
    confirmDelete: 'Excluir',
  },
}

const labels = getLabels(LABELS)
