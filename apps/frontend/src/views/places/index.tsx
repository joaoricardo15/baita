import { withAuthenticationRequired } from '@auth0/auth0-react'
import { IPlace } from '@baita/shared'
import {
  Add as AddIcon,
  AddLocationAltOutlined as AddLocationAltOutlinedIcon,
} from '@mui/icons-material'
import { AdvancedMarker, APIProvider, Map } from '@vis.gl/react-google-maps'
import { FC, useState } from 'react'

import { Button, EmptyState, Loading, Logo, Skeleton, Text } from '@/components'
import { usePlaces } from '@/hooks/usePlaces'
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from '@/utils/config'
import { getLabels, Labels } from '@/utils/labels'

import PlaceModal from './components/placeModal'

const newPlace: () => IPlace = () => ({
  placeId: '',
  name: '',
  pictures: [],
  position: { lat: 0, lng: 0 },
})

export const Places: FC = () => {
  const { data: places, isLoading: loading } = usePlaces()

  const [place, setPlace] = useState<IPlace>()

  const onPlaceClick = (p: IPlace) => {
    setPlace(p)
  }

  const onClose = () => {
    setPlace(undefined)
  }

  return (
    <>
      {loading || !places ? (
        <Skeleton elements={3} height={100} />
      ) : places.length === 0 ? (
        <>
          <EmptyState
            icon={<AddLocationAltOutlinedIcon style={{ fontSize: 48 }} />}
            title={labels.emptyTitle}
            description={labels.emptyDescription}
          />
          <div className="d-flex align-items-center justify-content-center mt-5">
            <Button
              type="text"
              color="primary"
              icon={<AddIcon />}
              onClick={() => setPlace(newPlace())}
            >
              {labels.addFirst}
            </Button>
          </div>
        </>
      ) : (
        <>
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              defaultZoom={14}
              disableDefaultUI={true}
              mapId={GOOGLE_MAPS_MAP_ID}
              defaultCenter={places[0].position}
              style={{
                left: 0,
                width: '100vw',
                height: 'calc(100vh - 140px)',
                position: 'fixed',
                marginTop: '-0.5rem',
              }}
            >
              {places.map((p) => (
                <AdvancedMarker
                  key={p.placeId}
                  clickable={true}
                  onClick={() => onPlaceClick(p)}
                  position={p.position}
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
                    {p.name}
                  </Text>
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
          <div
            className="d-flex align-items-center justify-content-center"
            style={{ position: 'fixed', bottom: 20, left: 0, right: 0 }}
          >
            <Button
              type="contained"
              color="primary"
              icon={<AddIcon />}
              onClick={() => setPlace(newPlace())}
            >
              {labels.addPlace}
            </Button>
          </div>
        </>
      )}

      {place && <PlaceModal place={place} open={true} onClose={onClose} />}
    </>
  )
}

export default withAuthenticationRequired(Places, {
  onRedirecting: () => <Loading />,
})

const LABELS: Labels = {
  en: {
    emptyTitle: 'No places yet',
    emptyDescription:
      'Save your favorite spots and they will appear here on the map.',
    addFirst: 'Add your first place',
    addPlace: 'Add place',
    loadError: 'Could not load places',
  },
  pt: {
    emptyTitle: 'Nenhum lugar ainda',
    emptyDescription:
      'Salve seus lugares favoritos e eles aparecerão aqui no mapa.',
    addFirst: 'Adicione seu primeiro lugar',
    addPlace: 'Adicionar lugar',
    loadError: 'Não foi possível carregar lugares',
  },
}

const labels = getLabels(LABELS)
