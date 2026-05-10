//go:build !dev_no_embed

package main

import (
	"embed"
	"errors"
	"io/fs"
	"net/http"
	"strings"
)

//go:embed all:web/build
var webFS embed.FS

// newWebHandler serves the embedded SvelteKit SPA at /ui/*.
// Any request whose path-after-/ui/ is not an existing file in the
// embedded FS falls back to index.html so client-side routes resolve.
func newWebHandler() http.Handler {
	sub, err := fs.Sub(webFS, "web/build")
	if err != nil {
		panic("web/build not found in embed: " + err.Error())
	}
	fileServer := http.FileServer(http.FS(sub))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Strip /ui prefix so embed FS lookups are relative to web/build.
		// Without this, http.FileServer would look up /ui/foo, but the embed
		// FS only knows about /foo.
		stripped := strings.TrimPrefix(r.URL.Path, "/ui")
		if stripped == "" {
			stripped = "/"
		}

		// Long-cache for hashed assets, no-cache for index.html.
		if strings.HasPrefix(stripped, "/_app/immutable/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			w.Header().Set("Cache-Control", "no-cache")
		}

		// SPA fallback: if the file doesn't exist, serve index.html.
		// We probe the FS first.
		probe := strings.TrimPrefix(stripped, "/")
		if probe != "" && probe != "index.html" {
			if _, err := fs.Stat(sub, probe); errors.Is(err, fs.ErrNotExist) {
				stripped = "/"
			}
		}

		r2 := r.Clone(r.Context())
		r2.URL.Path = stripped
		fileServer.ServeHTTP(w, r2)
	})
}
