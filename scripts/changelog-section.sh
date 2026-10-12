#!/usr/bin/env bash
# Prints the CHANGELOG.md section of the version in the root package.json: the lines after
# "## [<version>] - <date>" up to the next "## " heading or link definition. Fails if the version
# is not semver or the section is missing or empty. Used by the release workflow and by CI, so a
# version bump without release notes fails before it reaches main.
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(jq -r .version package.json)
if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  echo "package.json version '$version' is not semver" >&2
  exit 1
fi
notes=$(awk -v v="$version" '
  index($0, "## [" v "] - ") == 1 { found = 1; next }
  found && (/^## / || /^\[[^]]+\]: /) { exit }
  found { print }
' CHANGELOG.md)
if ! grep -q '[^[:space:]]' <<< "$notes"; then
  echo "CHANGELOG.md has no dated section for $version" >&2
  exit 1
fi
printf '%s\n' "$notes"
