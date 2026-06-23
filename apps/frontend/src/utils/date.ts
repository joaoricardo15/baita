import { getLabels, Labels } from './labels'

export const getTimeDiffLabel = (date: string) => {
  const timeDiff = new Date().getTime() - new Date(date).getTime()

  const secondsDiff = timeDiff / 1000

  const secondsInMinute = 60,
    secondsInHour = secondsInMinute * 60,
    secondsInDay = secondsInHour * 24,
    secondsInMonth = secondsInDay * 30

  let labelUnit, labelValue
  if (secondsDiff >= secondsInMonth) {
    labelValue = secondsDiff / secondsInMonth
    labelUnit = labels.months
  } else if (secondsDiff >= secondsInDay) {
    labelValue = secondsDiff / secondsInDay
    labelUnit = labels.days
  } else if (secondsDiff >= secondsInHour) {
    labelValue = secondsDiff / secondsInHour
    labelUnit = labels.hours
  } else if (secondsDiff >= secondsInMinute) {
    labelValue = secondsDiff / secondsInMinute
    labelUnit = labels.minutes
  } else {
    return labels.now
  }

  const roundedLabelValue = Math.floor(labelValue)

  return `${roundedLabelValue} ${labelUnit}${
    roundedLabelValue > 1 ? 's' : ''
  } ${labels.later}`
}

export const isToday = (input: string) => {
  const today = new Date()
  const date = new Date(input)
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

const LABELS: Labels = {
  en: {
    now: 'Now',
    minutes: 'minute',
    hours: 'hour',
    days: 'day',
    months: 'month',
    later: 'ago',
  },
  pt: {
    now: 'Agora',
    minutes: 'minuto',
    hours: 'hora',
    days: 'dia',
    months: 'mês',
    later: 'atrás',
  },
}

const labels = getLabels(LABELS)

export const sortByDateDesc = <T extends { createdAt?: string }>(
  items: T[]
): T[] =>
  [...items].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  )
