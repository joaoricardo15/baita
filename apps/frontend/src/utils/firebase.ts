import { getAnalytics, logEvent } from 'firebase/analytics'
import { initializeApp } from 'firebase/app'

import appConfig from './config'

const app = initializeApp({
  apiKey: 'AIzaSyDoIre-UjQst3DAw-fGi-LWL0Z08VVLriI',
  authDomain: 'baita-373213.firebaseapp.com',
  projectId: 'baita-373213',
  storageBucket: 'baita-373213.appspot.com',
  messagingSenderId: '106617044495',
  appId: '1:106617044495:web:bb732658a8bbb349c7ed7a',
  measurementId: 'G-RVXM9VHZ19',
})

const analytics = getAnalytics(app)

export const publishEvent = (
  eventName: string,
  params?: Record<string, unknown>
) => appConfig.isProduction && logEvent(analytics, eventName, params)
