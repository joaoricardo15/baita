#!/usr/bin/env bash
set -euo pipefail

# Baita Resource Integrity Audit
# Detects orphaned resources across DynamoDB, EventBridge Scheduler, and S3.
# Usage: ./scripts/audit-resources.sh
# Requires: AWS CLI configured with profile 'baita', jq installed

PROFILE="baita"
REGION="us-east-1"
TABLE="baita-backend-prod"
FILES_BUCKET="baita-backend-prod-files"
SCHEDULER_PREFIX="baita-backend-prod-bot-"

echo "=== Baita Resource Integrity Audit ==="
echo "Date: $(date -Iseconds)"
echo ""

# --- Phase 1: Extract bot records from DynamoDB ---
echo "--- [1/5] Scanning DynamoDB for bot records..."
BOT_IDS=$(aws dynamodb scan \
  --profile "$PROFILE" --region "$REGION" \
  --table-name "$TABLE" \
  --filter-expression "begins_with(sortKey, :sk)" \
  --expression-attribute-values '{":sk": {"S": "#BOT#"}}' \
  --projection-expression "botId, userId, active, #n" \
  --expression-attribute-names '{"#n": "name"}' \
  --output json | jq -r '.Items[].botId.S')

BOT_COUNT=$(echo "$BOT_IDS" | grep -c . || echo 0)
echo "  Found $BOT_COUNT bot records in DynamoDB"

# --- Phase 2: List EventBridge Schedule Groups ---
echo "--- [2/5] Listing EventBridge schedule groups..."
SCHEDULE_GROUPS=$(aws scheduler list-schedule-groups \
  --profile "$PROFILE" --region "$REGION" \
  --name-prefix "$SCHEDULER_PREFIX" \
  --output json | jq -r '.ScheduleGroups[].Name')

SCHED_COUNT=$(echo "$SCHEDULE_GROUPS" | grep -c . || echo 0)
echo "  Found $SCHED_COUNT schedule groups"

# --- Phase 3: Cross-reference for orphaned schedulers ---
echo "--- [3/5] Cross-referencing schedulers vs bots..."
ORPHANED_SCHEDULERS=()
for group in $SCHEDULE_GROUPS; do
  bot_id="${group#$SCHEDULER_PREFIX}"
  if ! echo "$BOT_IDS" | grep -q "^${bot_id}$"; then
    ORPHANED_SCHEDULERS+=("$group")
  fi
done

if [ ${#ORPHANED_SCHEDULERS[@]} -eq 0 ]; then
  echo "  ✓ No orphaned schedulers found"
else
  echo "  ✗ Found ${#ORPHANED_SCHEDULERS[@]} orphaned schedule groups:"
  for g in "${ORPHANED_SCHEDULERS[@]}"; do
    echo "    - $g"
  done
fi

# --- Phase 4: Check for records without #USER ---
echo "--- [4/5] Checking for orphaned user data (records without #USER)..."
USER_IDS=$(aws dynamodb scan \
  --profile "$PROFILE" --region "$REGION" \
  --table-name "$TABLE" \
  --filter-expression "sortKey = :sk" \
  --expression-attribute-values '{":sk": {"S": "#USER"}}' \
  --projection-expression "userId" \
  --output json | jq -r '.Items[].userId.S')

ALL_USER_IDS=$(aws dynamodb scan \
  --profile "$PROFILE" --region "$REGION" \
  --table-name "$TABLE" \
  --projection-expression "userId" \
  --output json | jq -r '.Items[].userId.S' | sort -u)

ORPHANED_USERS=()
for uid in $ALL_USER_IDS; do
  if [ "$uid" = "baita" ]; then continue; fi
  if ! echo "$USER_IDS" | grep -q "^${uid}$"; then
    ORPHANED_USERS+=("$uid")
  fi
done

if [ ${#ORPHANED_USERS[@]} -eq 0 ]; then
  echo "  ✓ No orphaned user data found"
else
  echo "  ✗ Found ${#ORPHANED_USERS[@]} userIds with records but no #USER entry:"
  for u in "${ORPHANED_USERS[@]}"; do
    count=$(aws dynamodb query \
      --profile "$PROFILE" --region "$REGION" \
      --table-name "$TABLE" \
      --key-condition-expression "userId = :uid" \
      --expression-attribute-values "{\":uid\": {\"S\": \"$u\"}}" \
      --select COUNT \
      --output json | jq -r '.Count')
    echo "    - $u ($count records)"
  done
fi

# --- Phase 5: S3 inventory ---
echo "--- [5/5] Checking S3 files bucket..."
S3_COUNT=$(aws s3 ls "s3://$FILES_BUCKET/" --profile "$PROFILE" --region "$REGION" --recursive 2>/dev/null | wc -l | tr -d ' ')
echo "  S3 files bucket: $S3_COUNT objects"

# --- Summary ---
echo ""
echo "=== Audit Summary ==="
echo "  Bots in DynamoDB:       $BOT_COUNT"
echo "  Schedule groups:        $SCHED_COUNT"
echo "  Orphaned schedulers:    ${#ORPHANED_SCHEDULERS[@]}"
echo "  Orphaned user data:     ${#ORPHANED_USERS[@]}"
echo "  S3 objects:             $S3_COUNT"

if [ ${#ORPHANED_SCHEDULERS[@]} -gt 0 ] || [ ${#ORPHANED_USERS[@]} -gt 0 ]; then
  echo ""
  echo "  ⚠ Issues detected. Run with --fix to clean up."
  exit 1
else
  echo ""
  echo "  ✓ All resources are consistent."
fi
