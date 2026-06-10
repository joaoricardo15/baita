/**
 * Post-Login Action: Provision Baita user record.
 *
 * Uses app_metadata.provisioned flag for idempotency:
 * - If flag is set → user already provisioned, skip.
 * - If flag is absent → call API to create user record.
 * - If API returns success → set flag so we never call again.
 * - If API fails → flag stays unset, retries on next login.
 *
 * The Baita API always returns HTTP 200 with { success, message, data }
 * in the body, so we must parse the JSON to detect actual failures.
 *
 * Non-blocking: login always succeeds. If provisioning fails,
 * the app_metadata flag stays unset and retries on next login.
 *
 * Secrets (Auth0 Action config):
 *   BAITA_CREATE_USER_API_KEY — internal provisioning API key
 *
 * Variables (public, not secrets):
 *   BAITA_API_URL             — https://api.baita.help
 */

const BAITA_API_URL = 'https://api.baita.help'

exports.onExecutePostLogin = async (event, api) => {
  if (event.user.app_metadata?.provisioned) return

  const { user, secrets } = event

  try {
    const response = await fetch(`${BAITA_API_URL}/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': secrets.BAITA_CREATE_USER_API_KEY,
      },
      body: JSON.stringify({
        user_id: user.user_id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        picture: user.picture || '',
      }),
    })

    const result = await response.json()

    if (result.success) {
      api.user.setAppMetadata('provisioned', true)
    } else {
      console.error(`Provisioning failed: ${result.message}`)
    }
  } catch (error) {
    console.error('Provisioning error:', error.message)
  }
}
