import { withAuthenticationRequired } from '@auth0/auth0-react'
import { IGuide, IPlace } from '@baita/shared'
import {
  Add as AddIcon,
  AddLocationAltOutlined as AddLocationAltOutlinedIcon,
  Map as MapOutlinedIcon,
} from '@mui/icons-material'
import { Fab, SwipeableDrawer, Tab, Tabs } from '@mui/material'
import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
} from '@vis.gl/react-google-maps'
import { FC, useContext, useEffect, useState } from 'react'

import { EmptyState, ListItem, Loading, Skeleton } from '@/components'
import { useDeleteGuide, useGuides } from '@/hooks/useGuides'
import { useDeletePlace, usePlaces } from '@/hooks/usePlaces'
import { NotificationContext } from '@/providers/notification'
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from '@/utils/config'
import { getLabels, Labels } from '@/utils/labels'
import { buildGoogleMapsUrl, shareGuide } from '@/utils/maps'

import GuideCard from './components/guideCard'
import GuideModal from './components/guideModal'
import PlaceCard from './components/placeCard'
import PlaceModal from './components/placeModal'

const SHEET_HANDLE = 32

type SheetTab = 'places' | 'guides'

const newPlace: () => IPlace = () => ({
  placeId: '',
  name: '',
  description: '',
  pictures: [],
  position: { lat: 0, lng: 0 },
})

const newGuide: () => IGuide = () => ({
  guideId: '',
  name: '',
  description: '',
  placeIds: [],
})

const MapBounds: FC<{ places: IPlace[] }> = ({ places }) => {
  const map = useMap()

  useEffect(() => {
    if (!map || places.length === 0) return
    map.setCenter(places[0].position)
    map.setZoom(13)
  }, [map, places])

  return null
}

export const Places: FC = () => {
  const { data: places, isLoading: placesLoading } = usePlaces()
  const { data: guides, isLoading: guidesLoading } = useGuides()
  const deletePlace = useDeletePlace()
  const deleteGuide = useDeleteGuide()
  const { showSnack } = useContext(NotificationContext)

  const [place, setPlace] = useState<IPlace>()
  const [guide, setGuide] = useState<IGuide>()
  const [sheetOpen, setSheetOpen] = useState(true)
  const [tab, setTab] = useState<SheetTab>('places')

  const loading = placesLoading || guidesLoading

  const sorted = places
    ? [...places].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
    : []

  const sortedGuides = guides
    ? [...guides].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
    : []

  const onDeletePlace = (p: IPlace) => {
    deletePlace.mutate(p)
  }

  const onDeleteGuide = (g: IGuide) => {
    deleteGuide.mutate(g.guideId)
  }

  const onShareGuide = async (g: IGuide) => {
    const resolved = (places || []).filter((p) =>
      g.placeIds.includes(p.placeId)
    )
    const ordered = g.placeIds
      .map((id) => resolved.find((p) => p.placeId === id))
      .filter(Boolean) as IPlace[]
    if (ordered.length === 0) return
    const url = buildGoogleMapsUrl(ordered)
    const result = await shareGuide(g.name, url)
    if (result === 'clipboard') {
      showSnack(labels.linkCopied, 'success')
    }
  }

  const onFabClick = () => {
    if (tab === 'guides') {
      setGuide(newGuide())
    } else {
      setPlace(newPlace())
    }
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
        {place && (
          <PlaceModal
            place={place}
            open={true}
            onClose={() => setPlace(undefined)}
          />
        )}
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
            defaultZoom={13}
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
                onClick={() => setPlace(p)}
                position={p.position}
                title={p.name}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'white',
                      padding: '7px 14px',
                      borderRadius: 24,
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#1a1a2e',
                      maxWidth: 150,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      boxShadow:
                        '0 2px 12px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      width: 2,
                      height: 10,
                      background: 'rgba(99,102,241,0.4)',
                      borderRadius: 1,
                    }}
                  />
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#6366f1',
                      boxShadow: '0 0 0 3px rgba(99,102,241,0.2)',
                    }}
                  />
                </div>
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>
      </div>

      {/* Bottom Sheet */}
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
            height: 'calc(70dvh)',
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

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{ minHeight: 40, borderBottom: '1px solid #f0f0f0' }}
        >
          <Tab label={labels.tabPlaces} value="places" sx={{ minHeight: 40 }} />
          <Tab label={labels.tabGuides} value="guides" sx={{ minHeight: 40 }} />
        </Tabs>

        {/* Scrollable Content */}
        <div
          style={{
            overflow: 'auto',
            flex: 1,
            padding: '8px 12px 80px',
          }}
        >
          {tab === 'places' ? (
            sorted.map((p, index) => (
              <ListItem key={p.placeId} index={index}>
                <PlaceCard
                  place={p}
                  onEdit={() => setPlace(p)}
                  onDelete={() => onDeletePlace(p)}
                />
              </ListItem>
            ))
          ) : sortedGuides.length === 0 ? (
            <EmptyState
              icon={<MapOutlinedIcon style={{ fontSize: 48 }} />}
              title={labels.guidesEmpty}
              description={labels.guidesEmptyDesc}
            />
          ) : (
            sortedGuides.map((g, index) => (
              <ListItem key={g.guideId} index={index}>
                <GuideCard
                  guide={g}
                  onEdit={() => setGuide(g)}
                  onShare={() => onShareGuide(g)}
                  onDelete={() => onDeleteGuide(g)}
                />
              </ListItem>
            ))
          )}
        </div>
      </SwipeableDrawer>

      {/* FAB */}
      <Fab
        color="primary"
        onClick={onFabClick}
        sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}
      >
        <AddIcon />
      </Fab>

      {/* Modals */}
      {place && (
        <PlaceModal
          place={place}
          open={true}
          onClose={() => setPlace(undefined)}
        />
      )}
      {guide && (
        <GuideModal
          guide={guide}
          open={true}
          onClose={() => setGuide(undefined)}
        />
      )}
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
    tabPlaces: 'Places',
    tabGuides: 'Guides',
    place: 'place',
    places: 'places',
    guidesEmpty: 'Create your first guide',
    guidesEmptyDesc:
      'Pick your favorite spots and share them as a walking route.',
    linkCopied: 'Link copied!',
  },
  pt: {
    emptyTitle: 'Nenhum lugar ainda',
    emptyDescription:
      'Salve seus lugares favoritos e eles aparecerão aqui no mapa.',
    tabPlaces: 'Lugares',
    tabGuides: 'Guias',
    place: 'lugar',
    places: 'lugares',
    guidesEmpty: 'Crie seu primeiro guia',
    guidesEmptyDesc:
      'Escolha seus lugares favoritos e compartilhe como uma rota a pé.',
    linkCopied: 'Link copiado!',
  },
}

const labels = getLabels(LABELS)
