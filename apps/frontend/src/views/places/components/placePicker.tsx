import { IPlace } from '@baita/shared'
import {
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import { FC, useState } from 'react'

import { Button, Text } from '@/components'
import { getLabels, Labels } from '@/utils/labels'

const PlacePicker: FC<{
  open: boolean
  places: IPlace[]
  selectedIds: string[]
  onConfirm: (ids: string[]) => void
  onClose: () => void
}> = ({ open, places, selectedIds, onConfirm, onClose }) => {
  const [selected, setSelected] = useState<string[]>(selectedIds)

  const onToggle = (placeId: string) => {
    setSelected((prev) =>
      prev.includes(placeId)
        ? prev.filter((id) => id !== placeId)
        : [...prev, placeId]
    )
  }

  const onDone = () => {
    onConfirm(selected)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogContent sx={{ px: 1, py: 2 }}>
        <Text className="fw-bold px-3 pb-2">{labels.title}</Text>
        {places.length === 0 ? (
          <Text className="px-3 fw-light" style={{ color: '#999' }}>
            {labels.noPlaces}
          </Text>
        ) : (
          <List disablePadding>
            {places.map((place) => (
              <ListItemButton
                key={place.placeId}
                onClick={() => onToggle(place.placeId)}
                dense
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox
                    edge="start"
                    checked={selected.includes(place.placeId)}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText primary={place.name} />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{labels.cancel}</Button>
        <Button type="contained" color="primary" onClick={onDone}>
          {labels.done}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default PlacePicker

export function resolveGuideChanges(
  currentIds: string[],
  newSelectedIds: string[]
): string[] {
  const added = newSelectedIds.filter((id) => !currentIds.includes(id))
  const kept = currentIds.filter((id) => newSelectedIds.includes(id))
  return [...kept, ...added]
}

const LABELS: Labels = {
  en: {
    title: 'Select places',
    done: 'Done',
    cancel: 'Cancel',
    noPlaces: 'No places saved yet',
  },
  pt: {
    title: 'Selecionar lugares',
    done: 'Pronto',
    cancel: 'Cancelar',
    noPlaces: 'Nenhum lugar salvo ainda',
  },
}

const labels = getLabels(LABELS)
