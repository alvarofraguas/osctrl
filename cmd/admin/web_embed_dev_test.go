//go:build dev_no_embed

package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestUIRoute_BuildTagNoEmbed(t *testing.T) {
	h := newWebHandler()
	req := httptest.NewRequest(http.MethodGet, "/ui/", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("status: got %d, want 404 (dev_no_embed)", rr.Code)
	}
}
