frontend_dir := "apps/frontend"
backend_dir := "apps/backend"

release-frontend version:
  @just _release {{frontend_dir}} frontend {{version}}

release-backend version:
  @just _release {{backend_dir}} backend {{version}}

_release app_dir app_name version:
  #!/usr/bin/env bash
  if [[ -z "{{version}}" ]]; then
    echo "Version is required, e.g. just release-frontend 1.2.3"
    exit 1
  fi

  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Working tree is not clean. Commit or stash changes first."
    exit 1
  fi

  if git rev-parse -q --verify "refs/tags/{{app_name}}-v{{version}}" >/dev/null 2>&1; then
    echo "Tag {{app_name}}-v{{version}} already exists."
    exit 1
  fi

  tmp_file=$(mktemp)
  jq --arg version "{{version}}" '.version = $version' "{{app_dir}}/package.json" > "$tmp_file"
  mv "$tmp_file" "{{app_dir}}/package.json"
  git add "{{app_dir}}/package.json"
  git commit -m "chore(release): {{app_name}} v{{version}}"
  git tag "{{app_name}}-v{{version}}"
  echo "Created tag {{app_name}}-v{{version}}"
