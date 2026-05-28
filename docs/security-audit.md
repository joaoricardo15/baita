# Security Audit Report — Baita Platform

**Date:** 2026-05-27
**Scope:** baita-frontend + baita-serverless

---

## CRITICAL FINDINGS (Immediate Action Required)

### 1. Secrets Committed to Git History

**Severity: CRITICAL**
**Location:** `baita-serverless/src/partners/*/secrets.json`

The following secrets are stored as plaintext JSON files AND were committed to git history (commits `940b4bd` and `257c1ad`):

| File | Secret Type | Value Exposed |
|------|-------------|---------------|
| `src/partners/openAi/secrets.json` | OpenAI API Key | `sk-svcacct-ZDdBm_7Q...` (full service account key) |
| `src/partners/firebase/secrets.json` | GCP Service Account Private Key | Full RSA private key for `firebase-adminsdk-qq8o7@baita-373213` |
| `src/partners/pipedrive/secrets.json` | Pipedrive OAuth Client Secret | `94add699ad71bda705731350cb463bf13a44c49c` |
| `src/partners/google/secrets.json` | Google OAuth Client Secret | `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` |
| `src/partners/news/secrets.json` | NewsAPI Key | `ed62172b723f4a598514e9a0aec3d2ae` |

**Risk:** Even though `src/partners/*` is now in `.gitignore`, the secrets remain in git history. Anyone who clones the repo (or has cloned it in the past) has access to all these credentials.

**Impact:** Full OpenAI account access, GCP project impersonation, OAuth client compromise.

---

### 2. No API Authentication/Authorization

**Severity: CRITICAL**
**Location:** `baita-serverless/serverless.yml` (all endpoint definitions)

**No API Gateway authorizer is configured on any endpoint.** All endpoints use `cors: true` but have zero authentication:

- No JWT verification
- No API key requirement
- No Lambda authorizer
- No Cognito/Auth0 authorizer

This means:
- **Anyone can call `POST /user/{userId}/bots` with any userId** → create bots for other users
- **Anyone can call `DELETE /user/{userId}/bots/{botId}/api/{apiId}`** → delete other users' bots
- **Anyone can call `PUT /user/{userId}/bots/{botId}`** → modify other users' bots
- **Anyone can read other users' data** via the resource endpoints

**Impact:** Complete unauthorized access to all user data and bot operations. Any user can impersonate any other user by changing the `userId` in the path.

---

### 3. Firebase Service Account Private Key in Plaintext

**Severity: CRITICAL**
**Location:** `baita-serverless/src/partners/firebase/secrets.json`

A full GCP service account private key (`firebase-adminsdk`) is stored in a JSON file. This grants:
- Full Firebase Admin SDK access
- Push notification sending to ANY device token
- Potential access to Firestore, Cloud Storage, and other GCP services
- Ability to impersonate the service account for other GCP APIs

---

## HIGH SEVERITY FINDINGS

### 4. Overly Permissive IAM Policy (God Mode)

**Severity: HIGH**
**Location:** `baita-serverless/serverless.yml:49-59`

```yaml
Action:
  - 's3:*'
  - 'sqs:*'
  - 'logs:*'
  - 'lambda:*'
  - 'events:*'
  - 'dynamodb:*'
  - 'scheduler:*'
  - 'apigateway:*'
  - 'iam:PassRole'
Resource: '*'
```

The main Lambda execution role has **wildcard permissions on all resources** for 8 AWS services plus `iam:PassRole`. This violates the principle of least privilege — a compromised Lambda function can:
- Read/write ANY DynamoDB table in the account
- Invoke/modify ANY Lambda function
- Access ANY S3 bucket
- Create/delete API Gateways
- Pass IAM roles (privilege escalation)

---

### 5. Code Injection via Bot Code Generation

**Severity: HIGH**
**Location:** `baita-serverless/src/utils/code.ts`

User-supplied data (task labels, variable values) is embedded into generated Lambda code. While `sanitizeForCodeString()` escapes `\`, `'`, `` ` ``, and `$`, the `getInputString()` function uses `JSON.stringify` with regex replacements that strip output markers:

```typescript
export const getInputString = (input: DataType = ''): string => {
  return JSON.stringify(input)
    .replace(new RegExp(`"${OUTPUT_CODE}`, 'g'), '')
    .replace(new RegExp(`${OUTPUT_CODE}"`, 'g'), '')
}
```

The stripping of `OUTPUT_CODE` markers from JSON strings creates a potential injection vector: if a user crafts input data that contains the exact `OUTPUT_CODE` pattern, they could break out of the JSON string context and inject arbitrary JavaScript into the generated Lambda.

**Impact:** Arbitrary code execution in the Lambda runtime, which has the overly-permissive IAM role from Finding #4.

---

### 6. CORS Wildcard (All Origins Allowed)

**Severity: HIGH**
**Location:** `baita-serverless/serverless.yml` (all endpoints have `cors: true`)

Setting `cors: true` in Serverless Framework defaults to `Access-Control-Allow-Origin: *`. Combined with Finding #2 (no auth), this means:
- Any website can make authenticated API calls on behalf of users
- CSRF attacks are trivially possible
- No origin restriction protects the API

---

### 7. Bot-Generated Lambda Has Broad Permissions

**Severity: HIGH**
**Location:** `baita-serverless/serverless.yml:355-365` (bot execution role)

Bot Lambdas (user-generated code) run with:
```yaml
Action:
  - lambda:InvokeFunction
  - logs:CreateLogStream
  - logs:CreateLogGroup
  - logs:PutLogEvents
Resource: '*'
```

While narrower than the main role, `lambda:InvokeFunction` on `Resource: '*'` means any bot Lambda can invoke ANY Lambda in the account — including the main API Lambdas or other users' bot Lambdas.

---

## MEDIUM SEVERITY FINDINGS

### 8. Dependency Vulnerabilities (Backend)

**Severity: MEDIUM**
**Location:** `baita-serverless/package.json`

`npm audit` reports **22 vulnerabilities** (2 high, 18 moderate, 2 low):
- `uuid` vulnerability affecting multiple packages
- `yargs-parser` prototype pollution (via swagger2openapi)
- `@google-cloud/storage` and `firebase-admin` with vulnerable transitive deps

---

### 9. No Rate Limiting

**Severity: MEDIUM**
**Location:** All API endpoints

No rate limiting, throttling, or usage quotas are configured at any level:
- No API Gateway usage plans
- No per-user request limits
- No abuse protection

Combined with no auth (#2), this enables:
- DoS attacks against the API
- Mass bot creation/deletion
- API key exhaustion (OpenAI, NewsAPI)

---

### 10. Secrets Exposed in DynamoDB Data

**Severity: MEDIUM**
**Location:** DynamoDB `baita-help-prod` table (bot records)

Bot execution results (`sampleResult.inputData`) store the resolved environment variable values (e.g., full OpenAI Bearer tokens in the `headers.Authorization` field). This means:
- Any endpoint that returns bot data leaks API keys in sample results
- The frontend displays these in test results (JSON viewer)

---

### 11. No Input Validation on Bot Metadata

**Severity: MEDIUM**
**Location:** `baita-serverless/src/endpoints/bot/update/index.ts`

The `name`, `description`, and `image` fields from the request body are stored directly without validation:
- No length limits (could store arbitrarily large strings)
- No sanitization (XSS payload could be stored)
- No URL validation on `image` field

---

## LOW SEVERITY FINDINGS

### 12. Frontend Public Keys (Acceptable Risk)

**Severity: LOW / INFO**
**Location:** `baita-frontend/src/utils/firebase.ts`, `baita-frontend/src/utils/push.ts`

Firebase config and VAPID public key are exposed in frontend code. This is **by design** — these are client-side identifiers, not secrets. Firebase security rules (not API key) control access. However, the Firebase API key should be restricted in the GCP console to only the domains that need it.

### 13. `window.open` without Full Sanitization

**Severity: LOW**
**Location:** `baita-frontend/src/views/feed/index.tsx:27`

```typescript
window.open(content.url, '_blank', 'noreferrer')
```

The `content.url` comes from bot outputs (user-controlled data). While `noreferrer` is set, there's no URL validation — a `javascript:` URL could theoretically be injected if content is user-generated.

---

## MITIGATION PLAN (Priority Order)

### Phase 1: IMMEDIATE (Do Today)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | **Rotate ALL compromised secrets** | 2h | Prevents exploitation of leaked credentials |
| 2 | **Add API Gateway Authorizer** (Auth0 JWT) | 4h | Blocks all unauthorized API access |
| 3 | **Restrict CORS** to `https://www.baita.help` + `http://localhost:3000` | 30m | Blocks cross-origin abuse |

**Secret Rotation Checklist:**
- [ ] OpenAI: Revoke `sk-svcacct-ZDdBm...` in OpenAI dashboard, generate new key
- [ ] Firebase: Delete service account key `810cd14b...` in GCP IAM, generate new key
- [ ] Pipedrive: Regenerate client secret in Pipedrive developer portal
- [ ] Google OAuth: Regenerate client secret in GCP Console > Credentials
- [ ] NewsAPI: Regenerate API key in newsapi.org account

### Phase 2: THIS WEEK

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 4 | **Move secrets to AWS Secrets Manager or SSM Parameter Store** | 3h | Secrets never touch code/repo |
| 5 | **Scope IAM policies** (replace `Resource: '*'` with specific ARNs) | 2h | Limits blast radius |
| 6 | **Remove secrets from git history** (`git filter-repo`) | 1h | Prevents historical exposure |
| 7 | **Add rate limiting** (API Gateway usage plan or WAF) | 2h | Prevents abuse |
| 8 | **Restrict bot Lambda permissions** (scope `lambda:InvokeFunction` to `baita-help-prod-task-*`) | 1h | Prevents cross-bot invocation |

### Phase 3: NEXT SPRINT

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 9 | **Sanitize sampleResult data** — strip secrets before storing | 3h | Prevents secret leakage in UI |
| 10 | **Validate bot metadata** (name/description length limits, URL pattern on image) | 2h | Prevents stored XSS |
| 11 | **Harden code generation** — use template literals with proper escaping, or sandbox approach | 4h | Prevents code injection |
| 12 | **Update vulnerable deps** (`npm audit fix` + manual upgrades) | 2h | Removes known vulns |
| 13 | **Add URL validation** for `window.open` calls in frontend | 30m | Prevents javascript: URL injection |
| 14 | **Restrict Firebase API key** in GCP Console to specific domains/APIs | 15m | Limits abuse surface |

### Phase 4: ONGOING

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 15 | **Add automated secret scanning** (pre-commit hook with `gitleaks` or `detect-secrets`) | 1h | Prevents future secret commits |
| 16 | **Add security headers** (CSP, HSTS, X-Frame-Options) to frontend | 1h | Defense in depth |
| 17 | **Implement request logging/monitoring** (CloudWatch alarms on suspicious patterns) | 3h | Detect attacks |
| 18 | **Regular dependency audits** (automate `npm audit` in CI) | 1h | Catch new vulns early |

---

## Summary

| Severity | Count | Key Theme |
|----------|-------|-----------|
| CRITICAL | 3 | Secrets in git + No authentication + Firebase private key |
| HIGH | 4 | God-mode IAM + Code injection + Wildcard CORS + Bot Lambda permissions |
| MEDIUM | 4 | Vulnerable deps + No rate limiting + Secrets in DB data + No input validation |
| LOW | 2 | Frontend public keys + window.open URL |

**The most dangerous combination:** Finding #2 (no auth) + Finding #4 (god-mode IAM) + Finding #5 (code injection) = An attacker can deploy arbitrary code to your AWS account that has full access to all resources, without any authentication.
