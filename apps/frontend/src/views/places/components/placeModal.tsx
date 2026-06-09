import { IPlace } from '@baita/shared'
import {
  AddLocationAltOutlined as AddLocationAltOutlinedIcon,
  AddPhotoAlternateOutlined as AddPhotoAlternateOutlinedIcon,
  Close as CloseIcon,
  EditLocationOutlined as EditLocationOutlinedIcon,
  MyLocationOutlined as MyLocationOutlinedIcon,
  WrongLocationOutlined as WrongLocationOutlinedIcon,
} from '@mui/icons-material'
import { Dialog, DialogContent } from '@mui/material'
import axios from 'axios'
import { FC, useState } from 'react'

import * as queries from '@/api/queries'
import { Button, Highlight, TextInput } from '@/components'
import { useDeletePlace, useSavePlace } from '@/hooks/usePlaces'
import { FILES_BASE_URL } from '@/utils/config'
import { getLabels, Labels } from '@/utils/labels'

const PlaceModal: FC<{
  place: IPlace
  open: boolean
  onClose: () => void
}> = ({ place, open, onClose }) => {
  const [localPlace, setPlace] = useState<IPlace>(place)
  const savePlace = useSavePlace()
  const deletePlace = useDeletePlace()

  const onNameChange = (name: string) => {
    setPlace({ ...localPlace, name })
  }

  const onCoordinatesChange = () => {
    navigator.geolocation.getCurrentPosition((position) => {
      setPlace({
        ...localPlace,
        position: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
      })
    })
  }

  const onAddPhoto = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files || []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileId = file.name
        const presignedUrl = await queries.fetchImageUploadUrl(fileId)
        await axios.put(presignedUrl, file)

        setPlace({
          ...localPlace,
          pictures: [...localPlace.pictures, fileId],
        })
      }
    }
    input.click()
  }

  const onSavePlace = () => {
    savePlace.mutate(
      { ...localPlace, userId: undefined, sortKey: undefined } as IPlace,
      { onSuccess: onClose }
    )
  }

  const onDeletePlace = () => {
    deletePlace.mutate(localPlace, { onSuccess: onClose })
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogContent>
        <div className="d-flex justify-content-end">
          <Button iconButton icon={<CloseIcon />} onClick={onClose} />
        </div>
        <div>
          <Highlight data={localPlace} />
          <TextInput
            label="Place"
            variant="outlined"
            placeholder="place name"
            value={localPlace.name}
            onChange={onNameChange}
          />
          <div className="mt-3">
            <Button
              className="mt-2"
              icon={<AddPhotoAlternateOutlinedIcon />}
              onClick={onAddPhoto}
            >
              {labels.addPicture}
            </Button>

            {localPlace.placeId ? (
              <>
                <Button
                  className="mt-2"
                  icon={<EditLocationOutlinedIcon />}
                  onClick={onSavePlace}
                >
                  {labels.updatePlace}
                </Button>
                <Button
                  className="mt-2"
                  icon={<WrongLocationOutlinedIcon />}
                  onClick={onDeletePlace}
                >
                  {labels.deletePlace}
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="mt-2"
                  icon={<MyLocationOutlinedIcon />}
                  onClick={onCoordinatesChange}
                >
                  {labels.addCoordinates}
                </Button>
                <Button
                  className="mt-2"
                  icon={<AddLocationAltOutlinedIcon />}
                  onClick={onSavePlace}
                >
                  {labels.addNewPlace}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="d-flex mt-3 overflow-auto">
          {localPlace.pictures.map((picture, index) => (
            <div key={index} className="me-2">
              <img
                height={200}
                style={{ borderRadius: 8, objectFit: 'cover' }}
                src={`${FILES_BASE_URL}/${encodeURIComponent(picture)}`}
                alt={`Place photo ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PlaceModal

const LABELS: Labels = {
  en: {
    addPicture: 'Add picture',
    updatePlace: 'Update place',
    deletePlace: 'Delete place',
    addCoordinates: 'Add coordinates',
    addNewPlace: 'Add new place',
  },
  pt: {
    addPicture: 'Adicionar foto',
    updatePlace: 'Atualizar lugar',
    deletePlace: 'Excluir lugar',
    addCoordinates: 'Adicionar coordenadas',
    addNewPlace: 'Adicionar novo lugar',
  },
}

const labels = getLabels(LABELS)
