set dotenv-load

frontend_dir := "apps/frontend"
backend_dir := "apps/backend"
frontend_image := "ghcr.io/vieitesss/tandem-frontend"
backend_image := "ghcr.io/vieitesss/tandem-backend"

alias f := release-frontend
alias b := release-backend
alias fd := release-frontend-dev
alias bd := release-backend-dev

_default:
  @just --list

release-frontend version:
  @just _release {{frontend_dir}} frontend {{version}} false

release-backend version:
  @just _release {{backend_dir}} backend {{version}} false

release-frontend-dev version:
  @just _release {{frontend_dir}} frontend {{version}} true

release-backend-dev version:
  @just _release {{backend_dir}} backend {{version}} true

_release app_dir app_name version prerelease:
  #!/usr/bin/env bash
  if [[ -z "{{version}}" ]]; then
    echo "Version is required, e.g. just release-frontend 1.2.3"
    exit 1
  fi

  if [[ "{{prerelease}}" == "true" ]]; then
    commit_sha=$(git rev-parse --short=8 HEAD)
    release_version="{{version}}-${commit_sha}"
    image_version="{{version}}-${commit_sha}"
  else
    release_version="{{version}}"
    image_version="{{version}}"
  fi

  if ! command -v jq >/dev/null 2>&1; then
    echo "jq is required to bump versions."
    exit 1
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is required to build release images."
    exit 1
  fi

  if ! command -v gh >/dev/null 2>&1; then
    echo "gh is required to create GitHub releases."
    exit 1
  fi

  if git rev-parse -q --verify "refs/tags/{{app_name}}-v${release_version}" >/dev/null 2>&1; then
    echo "Tag {{app_name}}-v${release_version} already exists."
    exit 1
  fi

  case "{{app_name}}" in
    frontend)
      image_name="{{frontend_image}}"
      ;;
    backend)
      image_name="{{backend_image}}"
      ;;
    *)
      echo "Unknown app name {{app_name}}."
      exit 1
      ;;
  esac

  if [[ "{{app_name}}" == "frontend" ]]; then
    supabase_url="${NEXT_PUBLIC_SUPABASE_URL:-${SUPABASE_URL}}"
    supabase_anon_key="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY}}"
    if [[ -z "${supabase_url}" || -z "${supabase_anon_key}" ]]; then
      echo "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL/SUPABASE_ANON_KEY) must be set for frontend releases."
      exit 1
    fi
    build_args=(
      --build-arg "NEXT_PUBLIC_SUPABASE_URL=${supabase_url}"
      --build-arg "NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabase_anon_key}"
    )
  else
    build_args=()
  fi

  tmp_file=$(mktemp)
  jq --arg version "${release_version}" '.version = $version' "{{app_dir}}/package.json" > "$tmp_file"
  mv "$tmp_file" "{{app_dir}}/package.json"

  git add "{{app_dir}}/package.json"
  git commit -m "chore(release): {{app_name}} v${release_version}"
  git tag "{{app_name}}-v${release_version}"
  git push origin HEAD
  git push origin "{{app_name}}-v${release_version}"
  if [[ "{{prerelease}}" == "true" ]]; then
    docker buildx build --platform linux/arm64 "${build_args[@]}" -t "${image_name}:${image_version}" --push "{{app_dir}}"
  else
    docker buildx build --platform linux/arm64 "${build_args[@]}" -t "${image_name}:${image_version}" -t "${image_name}:latest" --push "{{app_dir}}"
    gh release create "{{app_name}}-v${release_version}" --generate-notes
  fi
  echo "Created tag {{app_name}}-v${release_version}"
