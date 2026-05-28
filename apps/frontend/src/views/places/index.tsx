import { withAuthenticationRequired } from '@auth0/auth0-react'
import {
  Add as AddIcon,
  AddLocationAltOutlined as AddLocationAltOutlinedIcon,
  AddPhotoAlternateOutlined as AddPhotoAlternateOutlinedIcon,
  Close as CloseIcon,
  EditLocationOutlined as EditLocationOutlinedIcon,
  MyLocationOutlined as MyLocationOutlinedIcon,
  WrongLocationOutlined as WrongLocationOutlinedIcon,
} from '@mui/icons-material'
import { Fab, Modal } from '@mui/material'
import { AdvancedMarker, APIProvider, Map } from '@vis.gl/react-google-maps'
import axios from 'axios'
import { FC, useEffect, useState } from 'react'

import {
  Button,
  Highlight,
  Loading,
  Logo,
  Skeleton,
  Text,
  TextInput,
} from '../../components'
import ApiRequest from '../../utils/requests'

const googleMapsApiKey = 'AIzaSyDtemIhgSV-6K1y4jGStXVSKTKeEUY2Vh8'
const googleMapsMapId = '9bc619eba69cb21f'

export interface IPlace {
  placeId: string
  name: string
  pictures: string[]
  position: { lat: number; lng: number }
}

const Place: FC<{ place: IPlace; onClose: () => void }> = ({
  place,
  onClose,
}) => {
  const apiRequest = ApiRequest()
  const [localPlace, setPlace] = useState<IPlace>(place)

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
        console.log('file:', file)

        const fileId = file.name
        const presignedUrl = await apiRequest.getImageUploadUrl(fileId)
        console.log('presignedUrl:', presignedUrl)

        const result = await axios.put(presignedUrl, file)
        console.log('result:', result)

        setPlace({
          ...localPlace,
          pictures: [...localPlace.pictures, fileId],
        })
      }
    }
    input.click()
  }

  const onAddPlace = async () => {
    const placeId = btoa(
      `${localPlace.position.lat}:${localPlace.position.lng}`
    )

    await apiRequest.addPlace(placeId, { ...localPlace, placeId })

    onClose()
  }

  const onUpdatePlace = async () => {
    await apiRequest.updatePlace(localPlace.placeId, {
      ...localPlace,
      userId: undefined,
      sortKey: undefined,
    } as IPlace)

    onClose()
  }

  const onDeletePlace = async () => {
    await Promise.all(
      localPlace.pictures.map((pictureId) => apiRequest.removeImage(pictureId))
    )

    await apiRequest.deletePlace(localPlace.placeId)

    onClose()
  }

  return (
    <div className="bg-white m-5 p-5">
      <Button
        iconButton={true}
        icon={<CloseIcon />}
        onClick={() => onClose()}
      />
      <div>
        <Highlight data={localPlace} />
        <TextInput
          label="Place"
          placeholder="place name"
          value={localPlace.name}
          onChange={onNameChange}
        />
        <div>
          <Button
            className="mt-2"
            icon={<AddPhotoAlternateOutlinedIcon />}
            onClick={onAddPhoto}
          >
            Add a picture
          </Button>

          {localPlace.placeId ? (
            <>
              <Button
                className="mt-2"
                icon={<EditLocationOutlinedIcon />}
                onClick={() => onUpdatePlace()}
              >
                Update place
              </Button>
              <Button
                className="mt-2"
                icon={<WrongLocationOutlinedIcon />}
                onClick={() => onDeletePlace()}
              >
                Delete place
              </Button>
            </>
          ) : (
            <>
              <Button
                className="mt-2"
                icon={<MyLocationOutlinedIcon />}
                onClick={onCoordinatesChange}
              >
                Add coordinates
              </Button>
              <Button
                className="mt-2"
                icon={<AddLocationAltOutlinedIcon />}
                onClick={onAddPlace}
              >
                Add new place
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="d-flex mt-2">
        {localPlace.pictures.map((picture, index) => (
          <div key={index}>
            <img
              height={300}
              src={`https://baita-help-prod-files.s3.us-east-1.amazonaws.com/${encodeURIComponent(
                picture
              )}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export const Places: FC = () => {
  const apiRequest = ApiRequest()

  const [place, setPlace] = useState<IPlace>()
  const [places, setPlaces] = useState<IPlace[]>()

  const onPlaceCLick = (place: IPlace) => {
    setPlace(place)
  }

  const onClose = () => {
    setPlace(undefined)
    apiRequest.listPlaces().then((places: any) => {
      setPlaces(places)
    })
  }

  useEffect(() => {
    apiRequest.listPlaces().then((places: any) => {
      setPlaces(places)
    })
  }, [])

  return (
    <>
      {!places ? (
        <div className="d-flex m-2">
          <Skeleton elements={5} width={36} height={36} />
          <Skeleton elements={5} height={36} className="w-100 mx-2" />
        </div>
      ) : (
        <>
          <div>
            <Fab
              color="primary"
              style={{ position: 'absolute', right: 10 }}
              onClick={() =>
                setPlace({
                  placeId: '',
                  name: '',
                  pictures: [],
                  position: { lat: 0, lng: 0 },
                })
              }
            >
              <AddIcon />
            </Fab>
            <APIProvider apiKey={googleMapsApiKey}>
              <Map
                defaultZoom={14}
                disableDefaultUI={true}
                mapId={googleMapsMapId}
                defaultCenter={places[0].position}
                style={{
                  left: 0,
                  width: '100vw',
                  height: '100%',
                  position: 'fixed',
                  marginTop: '-0.5rem',
                }}
              >
                {places.map((place) => (
                  <AdvancedMarker
                    key={place.placeId}
                    clickable={true}
                    onClick={() => onPlaceCLick(place)}
                    position={place.position}
                  >
                    <Logo size={80} />
                    <Text
                      className="position-absolute bg-secondary px-1 rounded-3 text-white"
                      style={{
                        top: 10,
                        left: 8,
                        width: 'max-content',
                      }}
                    >
                      {place.name}
                    </Text>
                  </AdvancedMarker>
                ))}
              </Map>
            </APIProvider>
          </div>
          {place && (
            <Modal open={true}>
              <Place place={place} onClose={onClose} />
            </Modal>
          )}
        </>
      )}
    </>
  )
}

export default withAuthenticationRequired(Places, {
  onRedirecting: () => <Loading />,
})
