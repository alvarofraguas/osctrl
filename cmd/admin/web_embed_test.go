//go:build !dev_no_embed

package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestUIRoute_ServesIndexHtml(t *testing.T) {
	h := newWebHandler()
	req := httptest.NewRequest(http.MethodGet, "/ui/", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200", rr.Code)
	}
	body, _ := io.ReadAll(rr.Body)
	if !strings.Contains(strings.ToLower(string(body)), "<!doctype html>") {
		t.Errorf("expected html body, got %q", string(body[:min(200, len(body))]))
	}
}

func TestUIRoute_DeepLinkFallback(t *testing.T) {
	h := newWebHandler()
	req := httptest.NewRequest(http.MethodGet, "/ui/nodes/abc-123", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200", rr.Code)
	}
	body, _ := io.ReadAll(rr.Body)
	if !strings.Contains(strings.ToLower(string(body)), "<!doctype html>") {
		t.Errorf("deep link should fall back to index.html, got %q",
			string(body[:min(200, len(body))]))
	}
}
