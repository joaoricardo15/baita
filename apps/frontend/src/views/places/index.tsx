import { withAuthenticationRequired } from '@auth0/auth0-react'
import { IPlace } from '@baita/shared'
import {
  Add as AddIcon,
  AddLocationAltOutlined as AddLocationAltOutlinedIcon,
} from '@mui/icons-material'
import { Fab, SwipeableDrawer } from '@mui/material'
import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
} from '@vis.gl/react-google-maps'
import { FC, useEffect, useState } from 'react'

import { EmptyState, ListItem, Loading, Skeleton, Text } from '@/components'
import { useDeletePlace, usePlaces } from '@/hooks/usePlaces'
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from '@/utils/config'
import { getLabels, Labels } from '@/utils/labels'

import PlaceCard from './components/placeCard'
import PlaceModal from './components/placeModal'

const SHEET_HANDLE = 32

const newPlace: () => IPlace = () => ({
  placeId: '',
  name: '',
  description: '',
  pictures: [],
  position: { lat: 0, lng: 0 },
})

const MapBounds: FC<{ places: IPlace[] }> = ({ places }) => {
  const map = useMap()

  useEffect(() => {
    if (!map || places.length === 0) return
    if (places.length === 1) {
      map.setCenter(places[0].position)
      map.setZoom(14)
      return
    }
    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity
    places.forEach((p) => {
      minLat = Math.min(minLat, p.position.lat)
      maxLat = Math.max(maxLat, p.position.lat)
      minLng = Math.min(minLng, p.position.lng)
      maxLng = Math.max(maxLng, p.position.lng)
    })
    const center = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 }
    map.setCenter(center)
    const latDiff = maxLat - minLat
    const lngDiff = maxLng - minLng
    const maxDiff = Math.max(latDiff, lngDiff)
    const zoom = maxDiff > 10 ? 4 : maxDiff > 1 ? 8 : maxDiff > 0.1 ? 12 : 14
    map.setZoom(zoom)
  }, [map, places])

  return null
}

export const Places: FC = () => {
  const { data: places, isLoading: loading } = usePlaces()
  const deletePlace = useDeletePlace()

  const [place, setPlace] = useState<IPlace>()
  const [sheetOpen, setSheetOpen] = useState(true)

  const sorted = places
    ? [...places].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
    : []

  const onPlaceClick = (p: IPlace) => {
    setPlace(p)
  }

  const onDeletePlace = (p: IPlace) => {
    deletePlace.mutate(p)
  }

  const onClose = () => {
    setPlace(undefined)
  }

  if (loading || !places) {
    return <Skeleton elements={3} height={100} />
  }

  if (places.length === 0) {
    return (
      <>
        <EmptyState
          icon={<AddLocationAltOutlinedIcon style={{ fontSize: 48 }} />}
          title={labels.emptyTitle}
          description={labels.emptyDescription}
        />
        <Fab
          color="primary"
          onClick={() => setPlace(newPlace())}
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
        >
          <AddIcon />
        </Fab>
        {place && <PlaceModal place={place} open={true} onClose={onClose} />}
      </>
    )
  }

  return (
    <>
      {/* Full-screen Map */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
        }}
      >
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            defaultZoom={14}
            disableDefaultUI={true}
            mapId={GOOGLE_MAPS_MAP_ID}
            defaultCenter={sorted[0].position}
            style={{ width: '100%', height: '100%' }}
          >
            <MapBounds places={sorted} />
            {sorted.map((p) => (
              <AdvancedMarker
                key={p.placeId}
                clickable={true}
                onClick={() => onPlaceClick(p)}
                position={p.position}
                title={p.name}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transform: 'translate(0, -100%)',
                  }}
                >
                  <div
                    style={{
                      background: '#1a1a2e',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      maxWidth: 140,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      border: '2px solid white',
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      background: '#1a1a2e',
                      transform: 'rotate(45deg)',
                      marginTop: -5,
                      borderRight: '2px solid white',
                      borderBottom: '2px solid white',
                    }}
                  />
                </div>
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>
      </div>

      {/* Bottom Sheet with Place List */}
      <SwipeableDrawer
        anchor="bottom"
        open={sheetOpen}
        onOpen={() => setSheetOpen(true)}
        onClose={() => setSheetOpen(false)}
        disableBackdropTransition
        disableSwipeToOpen={false}
        swipeAreaWidth={SHEET_HANDLE}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            height: `calc(70dvh)`,
            maxHeight: '70dvh',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: 'visible',
          },
        }}
        sx={{
          '& .MuiDrawer-paper': {
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          },
        }}
      >
        {/* Drag Handle */}
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: SHEET_HANDLE,
            cursor: 'grab',
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 99,
              background: '#d1d5db',
            }}
          />
        </div>

        {/* Sheet Header */}
        <div className="px-3 pb-2">
          <Text className="fw-bold" style={{ fontSize: 14 }}>
            {sorted.length} {sorted.length === 1 ? labels.place : labels.places}
          </Text>
        </div>

        {/* Scrollable List */}
        <div
          style={{
            overflow: 'auto',
            flex: 1,
            padding: '0 12px 80px',
          }}
        >
          {sorted.map((p, index) => (
            <ListItem key={p.placeId} index={index}>
              <PlaceCard
                place={p}
                onEdit={() => onPlaceClick(p)}
                onDelete={() => onDeletePlace(p)}
              />
            </ListItem>
          ))}
        </div>
      </SwipeableDrawer>

      {/* FAB */}
      <Fab
        color="primary"
        onClick={() => setPlace(newPlace())}
        sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}
      >
        <AddIcon />
      </Fab>

      {/* Place Detail Modal */}
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
    place: 'place',
    places: 'places',
  },
  pt: {
    emptyTitle: 'Nenhum lugar ainda',
    emptyDescription:
      'Salve seus lugares favoritos e eles aparecerão aqui no mapa.',
    place: 'lugar',
    places: 'lugares',
  },
}

const labels = getLabels(LABELS)
