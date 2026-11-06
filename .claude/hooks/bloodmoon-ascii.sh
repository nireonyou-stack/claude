#!/bin/bash
# Blood Moon sheet CSS must be ASCII-only: Roll20 drops the roll template (chat card) styles
# when the sheet CSS has any non-ASCII character. This mistake happened twice, so this hook
# blocks `git commit` / `git push` while any Blood Moon CSS file has one.
# Checks: bloodmoon/roll20/sheet/*.css in this repo, and "Blood Moon (Korean)/*.css" in sibling clones (the Roll20 fork).
cmd=$(jq -r '.tool_input.command // empty')
printf '%s' "$cmd" | grep -Eq '(^|[^[:alnum:]_-])git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+(commit|push)([[:space:]]|$)' || exit 0
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
bad=""
for f in "$root"/bloodmoon/roll20/sheet/*.css "$root"/../*/"Blood Moon (Korean)"/*.css; do
  [ -f "$f" ] || continue
  hits=$(LC_ALL=C grep -n '[^[:print:][:space:]]' "$f" | cut -c1-100)
  [ -n "$hits" ] && bad="$bad$f
$hits
"
done
[ -z "$bad" ] && exit 0
{
  echo "Blocked: non-ASCII characters in Blood Moon sheet CSS. Roll20 drops the chat card (roll template) styles when the sheet CSS has any non-ASCII character. Rewrite these lines in ASCII (e.g. English comments), then retry:"
  printf '%s' "$bad"
} >&2
exit 2
