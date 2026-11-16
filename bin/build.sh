#!/bin/bash

# Exit on error
set -e

DIST_DIR="${ASTRO_OUT_DIR:-dist}"

echo "Starting build (Astro, outDir: $DIST_DIR)..."

# The vendor's locale files are short against en.json, and some of the missing
# strings exist only there -- a gap can surface as a modal "an error occurred"
# on a blank document (see bin/locale-fill.mjs). Fill them for the languages the
# site ships before the tree is hashed into VENDOR_VERSION and served.
node bin/locale-fill.mjs

pnpm astro build

# Inject the version stamps into sw.js.
#
# Two of them, and the difference is the point. The build stamp names the core
# cache (a new one per deploy). The *vendor* stamp names the runtime cache,
# which holds sdkjs / web-apps / fonts -- so a deploy that did not touch the
# vendor tree keeps the same runtime cache, discards nothing on activate, and
# can take over immediately (see the comment on RUNTIME_CACHE in public/sw.js).
#
# Hashed from $DIST_DIR (what is actually served), file contents included, so
# our own patches inside the vendor tree (x2t_helper.js) count too. `find
# -exec ... +` rather than a pipe through xargs: some vendor files have spaces
# in their names ("05_green leaf.pptx"). Sorted, so the value is reproducible.
SW_PATH="$DIST_DIR/sw.js"
if [ -f "$SW_PATH" ]; then
    TIMESTAMP=$(date +%s)
    if command -v shasum >/dev/null 2>&1; then
        HASH_CMD="shasum -a 256"
    else
        HASH_CMD="sha256sum"
    fi
    VENDOR_DIRS=""
    for dir in sdkjs web-apps fonts; do
        if [ -d "$DIST_DIR/$dir" ]; then
            VENDOR_DIRS="$VENDOR_DIRS $dir"
        fi
    done
    if [ -n "$VENDOR_DIRS" ]; then
        # Hashed from inside $DIST_DIR, with RELATIVE paths: `shasum` prints the
        # path next to each digest, so hashing "$DIST_DIR/sdkjs/..." would fold
        # the output directory's own name into the stamp -- the same vendor tree
        # built into `dist-e2e-4174/` would name a different runtime cache than
        # the one built into `dist/`. What this stamp claims to be, and what
        # sw.js relies on, is the content of the tree.
        # shellcheck disable=SC2086 # deliberate word splitting: a list of dirs
        VENDOR_VERSION=$(cd "$DIST_DIR" && find $VENDOR_DIRS -type f -exec $HASH_CMD {} + | LC_ALL=C sort | $HASH_CMD | cut -c1-12)
    else
        echo "[build] Warning: no vendor tree found; sw.js keeps its dev vendor stamp." >&2
        VENDOR_VERSION="novendor"
    fi
    # `sed -i` differs between BSD and GNU, so write to a temp file and move it
    # back -- that works identically everywhere. package.json runs this through
    # `sh`, which may be dash.
    sed -e "s/SW_VERSION_PLACEHOLDER/$TIMESTAMP/g" -e "s/VENDOR_VERSION_PLACEHOLDER/$VENDOR_VERSION/g" "$SW_PATH" > "$SW_PATH.tmp"
    mv "$SW_PATH.tmp" "$SW_PATH"
    echo "Service Worker version updated with timestamp: $TIMESTAMP, vendor: $VENDOR_VERSION"
else
    echo "Warning: $DIST_DIR/sw.js not found, skipping version injection."
fi

echo "Build completed successfully!"
