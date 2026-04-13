# Shared URLs — override by exporting before sourcing, or pass flags to each script.
# Production = current canonical repo (releases). Dev = day-to-day + auto-push target.
: "${PRODUCTION_REMOTE_URL:=https://github.com/nmatunog/B2C-PMES.git}"
: "${DEV_REMOTE_URL:=https://github.com/nmatunog/B2C-PMES-dev.git}"
