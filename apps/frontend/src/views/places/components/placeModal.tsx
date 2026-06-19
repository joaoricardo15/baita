import { IPlace } from '@baita/shared'
import {
  AddAPhoto as AddAPhotoIcon,
  AddLocationAltOutlined as AddLocationAltOutlinedIcon,
  Close as CloseIcon,
  DeleteOutline as DeleteOutlineIcon,
  MyLocation as MyLocationIcon,
} from '@mui/icons-material'
import {
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  IconButton,
} from '@mui/material'
import axios from 'axios'
import { FC, useEffect, useState } from 'react'

import * as queries from '@/api/queries'
import { Button, Text, TextInput } from '@/components'
import { useDeletePlace, useSavePlace } from '@/hooks/usePlaces'
import { FILES_BASE_URL } from '@/utils/config'
import { getLabels, Labels } from '@/utils/labels'

const PlaceModal: FC<{
  place: IPlace
  open: boolean
  onClose: () => void
}> = ({ place, open, onClose }) => {
  const [localPlace, setPlace] = useState<IPlace>(place)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [uploading, setUploading] = useState(false)
  const savePlace = useSavePlace()
  const deletePlace = useDeletePlace()

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
          const fileKey = `${localPlace.placeId || '_new'}/${crypto.randomUUID()}.${ext}`
          try {
            const presignedUrl = await queries.fetchImageUploadUrl(fileKey)
            await axios.put(presignedUrl, file)
            newPictures.push(fileKey)
          } catch {
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
    setPlace({
      ...localPlace,
      pictures: localPlace.pictures.filter((_, i) => i !== index),
    })
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
      createdAt: createdAt || new Date().toISOString(),
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
        {/* Hero Photo Area */}
        <div
          style={{
            background: '#f5f5f5',
            minHeight: localPlace.pictures.length > 0 ? 200 : 120,
            position: 'relative',
          }}
        >
          {localPlace.pictures.length > 0 ? (
            <div
              className="d-flex overflow-auto"
              style={{ scrollSnapType: 'x mandatory' }}
              role="region"
              aria-label={labels.photosCarousel}
            >
              {localPlace.pictures.map((picture, index) => (
                <div
                  key={index}
                  style={{
                    minWidth: '100%',
                    scrollSnapAlign: 'start',
                    position: 'relative',
                  }}
                >
                  <img
                    src={`${FILES_BASE_URL}/${picture.split('/').map(encodeURIComponent).join('/')}`}
                    alt={`${localPlace.name} photo ${index + 1}`}
                    style={{
                      width: '100%',
                      height: 200,
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <IconButton
                    aria-label={labels.removePhoto}
                    onClick={() => onRemovePhoto(index)}
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
              ))}
            </div>
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
              bottom: 8,
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

          {/* Photo Counter */}
          {localPlace.pictures.length > 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                borderRadius: 12,
                padding: '2px 8px',
                fontSize: 12,
              }}
            >
              {localPlace.pictures.length} {labels.photos}
            </div>
          )}
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

          {/* Location Section */}
          <div className="mt-3 d-flex align-items-center justify-content-between">
            <div>
              <Text className="fw-light fs-6" style={{ color: '#666' }}>
                {hasLocation
                  ? `${localPlace.position.lat.toFixed(4)}, ${localPlace.position.lng.toFixed(4)}`
                  : labels.noLocation}
              </Text>
            </div>
            <Button
              type="text"
              icon={<MyLocationIcon style={{ fontSize: 18 }} />}
              onClick={onUpdateLocation}
              disabled={isBusy}
            >
              {hasLocation ? labels.updateLocation : labels.addLocation}
            </Button>
          </div>
        </DialogContent>

        {/* Action Footer */}
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <div>
            {!isNew && (
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
            )}
          </div>
          <div className="d-flex gap-2">
            <Button onClick={onClose}>{labels.cancel}</Button>
            <Button
              type="contained"
              color="primary"
              icon={
                savePlace.isPending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AddLocationAltOutlinedIcon style={{ fontSize: 18 }} />
                )
              }
              onClick={onSave}
              disabled={isBusy || !localPlace.name}
            >
              {isNew ? labels.save : labels.update}
            </Button>
          </div>
        </DialogActions>
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
    photos: 'photos',
    photosCarousel: 'Place photos',
    addPhoto: 'Add photo',
    removePhoto: 'Remove photo',
    noLocation: 'No location set',
    addLocation: 'Set location',
    updateLocation: 'Update',
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
    photos: 'fotos',
    photosCarousel: 'Fotos do lugar',
    addPhoto: 'Adicionar foto',
    removePhoto: 'Remover foto',
    noLocation: 'Localização não definida',
    addLocation: 'Definir localização',
    updateLocation: 'Atualizar',
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
