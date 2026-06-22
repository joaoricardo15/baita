import { withAuthenticationRequired } from '@auth0/auth0-react'
import { IGuide, IPlace } from '@baita/shared'
import {
  Add as AddIcon,
  AddLocationAltOutlined as AddLocationAltOutlinedIcon,
  Map as MapOutlinedIcon,
  MyLocation as MyLocationIcon,
  Send as SendIcon,
} from '@mui/icons-material'
import {
  Button,
  CircularProgress,
  Fab,
  SwipeableDrawer,
  Tab,
  Tabs,
} from '@mui/material'
import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
} from '@vis.gl/react-google-maps'
import { FC, useContext, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { EmptyState, ListItem, Loading, Skeleton } from '@/components'
import { useDeleteGuide, useGuides } from '@/hooks/useGuides'
import { useDeletePlace, usePlaces } from '@/hooks/usePlaces'
import { useDeleteUsualPlace, useUsualPlaces } from '@/hooks/useUsualPlaces'
import { AuthContext } from '@/providers/auth'
import { NotificationContext } from '@/providers/notification'
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from '@/utils/config'
import { getLabels, Labels } from '@/utils/labels'
import { getIngestUrl, testLocationConnection } from '@/utils/location'
import { buildGoogleMapsUrl, shareGuide } from '@/utils/maps'

import GuideCard from './components/guideCard'
import GuideModal from './components/guideModal'
import PlaceCard from './components/placeCard'
import PlaceModal from './components/placeModal'
import TrackModeSetup from './components/trackModeSetup'
import UsualPlaceCard from './components/usualPlaceCard'

const SHEET_HANDLE = 32
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

type SheetTab = 'places' | 'guides' | 'usual'

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
  const { data: usualPlaces, isLoading: usualLoading } = useUsualPlaces()
  const deletePlace = useDeletePlace()
  const deleteGuide = useDeleteGuide()
  const deleteUsualPlace = useDeleteUsualPlace()
  const { user } = useContext(AuthContext)
  const { showSnack } = useContext(NotificationContext)
  const [sending, setSending] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      const lat = parseFloat(searchParams.get('lat') || '0')
      const lng = parseFloat(searchParams.get('lng') || '0')
      if (lat && lng) {
        setPlace({ ...newPlace(), position: { lat, lng } })
        setTab('usual')
      }
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const [place, setPlace] = useState<IPlace>()
  const [guide, setGuide] = useState<IGuide>()
  const [sheetOpen, setSheetOpen] = useState(true)
  const [tab, setTab] = useState<SheetTab>('places')
  const [trackSetupOpen, setTrackSetupOpen] = useState(false)

  const loading = placesLoading || guidesLoading || usualLoading

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

  const sortedUsual = usualPlaces
    ? [...usualPlaces].sort((a, b) => b.score - a.score)
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

  const handleSendLocation = async () => {
    const userId = user?.userId || ''
    if (!userId) return
    setSending(true)
    const result = await testLocationConnection(getIngestUrl(userId))
    setSending(false)
    if (result.success) {
      showSnack(labels.locationSent, 'success')
    } else {
      showSnack(labels.locationFailed, 'error')
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
        open={true}
        onOpen={() => setSheetOpen(true)}
        onClose={() => setSheetOpen(false)}
        disableBackdropTransition
        disableDiscovery={IS_IOS}
        disableSwipeToOpen={IS_IOS}
        swipeAreaWidth={IS_IOS ? 0 : SHEET_HANDLE}
        variant="permanent"
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            height: sheetOpen ? 'calc(70dvh)' : '120px',
            maxHeight: '70dvh',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: 'visible',
            transition: 'height 0.3s ease',
          },
        }}
        sx={{
          '& .MuiDrawer-paper': {
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
          },
        }}
      >
        {/* Drag Handle — tap to toggle */}
        <div
          role="button"
          tabIndex={0}
          aria-label={sheetOpen ? 'Collapse' : 'Expand'}
          onClick={() => setSheetOpen(!sheetOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setSheetOpen(!sheetOpen)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: SHEET_HANDLE,
            cursor: 'pointer',
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
          <Tab label={labels.tabUsual} value="usual" sx={{ minHeight: 40 }} />
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
          ) : tab === 'guides' ? (
            sortedGuides.length === 0 ? (
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
            )
          ) : sortedUsual.length === 0 ? (
            <div>
              <EmptyState
                icon={<MyLocationIcon style={{ fontSize: 48 }} />}
                title={labels.usualEmpty}
                description={labels.usualEmptyDesc}
              />
              <div className="text-center mt-3">
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<MyLocationIcon />}
                  onClick={() => setTrackSetupOpen(true)}
                >
                  {labels.setupButton}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                className="d-flex align-items-center justify-content-between mb-2 px-1"
                style={{ fontSize: '0.75rem', color: '#888' }}
              >
                <span>
                  {sortedUsual.length} {labels.placesTracked}
                </span>
                <Button
                  size="small"
                  startIcon={
                    sending ? (
                      <CircularProgress size={12} />
                    ) : (
                      <SendIcon style={{ fontSize: 14 }} />
                    )
                  }
                  onClick={handleSendLocation}
                  disabled={sending}
                  sx={{ fontSize: '0.7rem', textTransform: 'none' }}
                >
                  {labels.sendNow}
                </Button>
              </div>
              {sortedUsual.map((up, index) => (
                <ListItem key={up.usualPlaceId} index={index}>
                  <UsualPlaceCard
                    place={up}
                    onDelete={() => deleteUsualPlace.mutate(up.usualPlaceId)}
                  />
                </ListItem>
              ))}
            </>
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
      <TrackModeSetup
        open={trackSetupOpen}
        onClose={() => setTrackSetupOpen(false)}
      />
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
    tabUsual: 'Usual',
    place: 'place',
    places: 'places',
    guidesEmpty: 'Create your first guide',
    guidesEmptyDesc:
      'Pick your favorite spots and share them as a walking route.',
    usualEmpty: 'No usual places yet',
    usualEmptyDesc:
      'Enable Track Mode to automatically detect places you visit frequently.',
    setupButton: 'Set up Track Mode',
    sendNow: 'Send now',
    placesTracked: 'places tracked',
    locationSent: 'Location sent!',
    locationFailed: 'Could not send location',
    linkCopied: 'Link copied!',
  },
  pt: {
    emptyTitle: 'Nenhum lugar ainda',
    emptyDescription:
      'Salve seus lugares favoritos e eles aparecerão aqui no mapa.',
    tabPlaces: 'Lugares',
    tabGuides: 'Guias',
    tabUsual: 'Habituais',
    place: 'lugar',
    places: 'lugares',
    guidesEmpty: 'Crie seu primeiro guia',
    guidesEmptyDesc:
      'Escolha seus lugares favoritos e compartilhe como uma rota a pé.',
    usualEmpty: 'Nenhum lugar habitual',
    usualEmptyDesc:
      'Ative o Track Mode para detectar automaticamente os lugares que frequenta.',
    setupButton: 'Configurar Track Mode',
    sendNow: 'Enviar agora',
    placesTracked: 'lugares rastreados',
    locationSent: 'Localização enviada!',
    locationFailed: 'Não foi possível enviar',
    linkCopied: 'Link copiado!',
  },
}

const labels = getLabels(LABELS)
