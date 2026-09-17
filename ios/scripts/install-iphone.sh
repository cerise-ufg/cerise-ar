#!/usr/bin/env bash
#
# CERISE AR — build and install the iOS app onto a connected iPhone.
#
# Runs on macOS only (Xcode is required). From the repo root:
#
#     ./ios/scripts/install-iphone.sh                 # auto-detect team + device
#     ./ios/scripts/install-iphone.sh --team ABCDE12345
#     ./ios/scripts/install-iphone.sh --device 00008030-001A2B3C4D5E6F70
#     ./ios/scripts/install-iphone.sh --open          # just generate + open Xcode
#
set -euo pipefail

cd "$(dirname "$0")/.."          # -> repo/ios
IOS_DIR="$PWD"

TEAM=""
DEVICE=""
OPEN_ONLY=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --team)   TEAM="$2";   shift 2 ;;
        --device) DEVICE="$2"; shift 2 ;;
        --open)   OPEN_ONLY=1; shift ;;
        -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
        *) echo "unknown option: $1" >&2; exit 2 ;;
    esac
done

step() { printf '\n\033[1;35m==> %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- prerequisites
step "Checking prerequisites"

[[ "$(uname -s)" == "Darwin" ]] || die "this script only runs on macOS (Xcode is required)"

command -v xcodebuild >/dev/null 2>&1 || die "xcodebuild not found — install Xcode from the App Store, then run: sudo xcode-select -s /Applications/Xcode.app"
xcodebuild -version | head -1

if ! xcode-select -p >/dev/null 2>&1; then
    die "no active developer directory — run: sudo xcode-select -s /Applications/Xcode.app"
fi

# Resolve an xcodegen binary. Prefer one on PATH; else Homebrew; else download
# the official prebuilt release (this Mac may have neither brew nor xcodegen).
XCODEGEN="$(command -v xcodegen || true)"
if [[ -z "$XCODEGEN" ]]; then
    LOCAL_XG="$IOS_DIR/tools/xcodegen/bin/xcodegen"
    if [[ -x "$LOCAL_XG" ]]; then
        XCODEGEN="$LOCAL_XG"
    elif command -v brew >/dev/null 2>&1; then
        step "Installing XcodeGen via Homebrew"
        brew install xcodegen
        XCODEGEN="$(command -v xcodegen)"
    else
        step "Downloading XcodeGen (no Homebrew found)"
        mkdir -p "$IOS_DIR/tools"
        ( cd "$IOS_DIR/tools" \
          && curl -fL -o xcodegen.zip \
             https://github.com/yonaskolb/XcodeGen/releases/latest/download/xcodegen.zip \
          && rm -rf xcodegen && unzip -q xcodegen.zip )
        XCODEGEN="$LOCAL_XG"
        [[ -x "$XCODEGEN" ]] || die "failed to download XcodeGen"
    fi
fi
echo "xcodegen $("$XCODEGEN" --version)"

# ------------------------------------------------------------ generate project
step "Generating CeriseAR.xcodeproj from project.yml"
"$XCODEGEN" generate

if [[ $OPEN_ONLY -eq 1 ]]; then
    open CeriseAR.xcodeproj
    cat <<'EOS'

Xcode is open. To install on the iPhone:
  1. Select the CeriseAR target -> Signing & Capabilities -> pick your Team.
     (A free personal Apple ID works; the build then expires after 7 days.)
  2. Plug in the iPhone, unlock it, and tap "Trust This Computer".
  3. Pick the device in the toolbar and press Cmd+R.
EOS
    exit 0
fi

# -------------------------------------------------------------- signing team
if [[ -z "$TEAM" ]]; then
    step "Looking for a signing team"
    # Development certificates in the login keychain look like:
    #   "Apple Development: someone@example.com (TEAMID1234)"
    TEAM="$(security find-identity -v -p codesigning 2>/dev/null \
            | sed -n 's/.*"Apple Develop[^"]*(\([A-Z0-9]\{10\}\))".*/\1/p' \
            | head -1)"
fi

if [[ -z "$TEAM" ]]; then
    cat >&2 <<'EOS'

error: no Apple development signing identity found on this Mac.

Add an Apple ID first (a free one is fine):
    Xcode -> Settings -> Accounts -> "+" -> Apple ID

then re-run this script, or pass the team explicitly:
    ./ios/scripts/install-iphone.sh --team ABCDE12345
EOS
    exit 1
fi
echo "team: $TEAM"

# ------------------------------------------------------------------- device
step "Looking for a connected iPhone"
DEVICES_JSON="$(xcrun xctrace list devices 2>/dev/null || true)"

if [[ -z "$DEVICE" ]]; then
    # Physical devices are the lines that are NOT "Simulator" and carry a UDID.
    DEVICE_LINE="$(printf '%s\n' "$DEVICES_JSON" \
        | sed -n '/^== Devices ==/,/^== /p' \
        | grep -Ei 'iphone|ipad' \
        | grep -v 'Simulator' \
        | head -1 || true)"
    DEVICE="$(printf '%s' "$DEVICE_LINE" | sed -n 's/.*(\([0-9A-Fa-f-]\{25,\}\)).*/\1/p')"
    [[ -n "$DEVICE_LINE" ]] && echo "found: $DEVICE_LINE"
fi

if [[ -z "$DEVICE" ]]; then
    cat >&2 <<'EOS'

error: no iPhone/iPad detected.

  - Connect it over USB, unlock it, and tap "Trust This Computer".
  - Enable Developer Mode on the phone:
      Settings -> Privacy & Security -> Developer Mode -> On (the phone reboots).
  - Then re-run, or pass the UDID:  --device <UDID>

Connected devices right now:
EOS
    printf '%s\n' "$DEVICES_JSON" >&2
    exit 1
fi
echo "device: $DEVICE"

# -------------------------------------------------------------------- build
step "Building CeriseAR (Debug) for the device"
DERIVED="$IOS_DIR/.build"

xcodebuild \
    -project CeriseAR.xcodeproj \
    -scheme CeriseAR \
    -configuration Debug \
    -destination "id=$DEVICE" \
    -derivedDataPath "$DERIVED" \
    -allowProvisioningUpdates \
    DEVELOPMENT_TEAM="$TEAM" \
    CODE_SIGN_STYLE=Automatic \
    build

APP="$DERIVED/Build/Products/Debug-iphoneos/CeriseAR.app"
[[ -d "$APP" ]] || die "build finished but $APP is missing"

# ------------------------------------------------------------------ install
step "Installing onto the device"
if xcrun devicectl device install app --device "$DEVICE" "$APP"; then
    :
else
    echo "devicectl failed (Xcode < 15?), trying xcrun simctl/ios-deploy fallback" >&2
    command -v ios-deploy >/dev/null 2>&1 || die "install failed — open CeriseAR.xcodeproj and press Cmd+R instead"
    ios-deploy --bundle "$APP" --id "$DEVICE" --no-wifi
fi

cat <<'EOS'

Done. CERISE AR is on the iPhone.

First launch: the app is signed with a development certificate, so iOS asks you
to trust it once:
    Settings -> General -> VPN & Device Management -> (your Apple ID) -> Trust

If you used a free personal Apple ID, the app stops opening after 7 days —
re-run this script to refresh it.
EOS
