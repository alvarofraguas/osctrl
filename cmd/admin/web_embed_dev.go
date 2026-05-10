//go:build dev_no_embed

package main

import "net/http"

// newWebHandler in dev_no_embed mode returns 404 for /ui/*.
// The SvelteKit dev server runs separately on :5173 with a Vite proxy
// for backend calls, so this handler is intentionally inert.
func newWebHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	})
}
