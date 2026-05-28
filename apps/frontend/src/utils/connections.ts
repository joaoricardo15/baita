import Axios from 'axios'

export function createConnection(
  url: string,
  auth: { username: string; password: string }
) {
  return Axios.request({ method: 'post', url, auth })
}
