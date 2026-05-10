package handlers

import (
	"net/http"

	"github.com/jmpsec/osctrl/cmd/admin/sessions"
	"github.com/jmpsec/osctrl/pkg/utils"
	"github.com/rs/zerolog/log"
)

// BootstrapResponse to return a JSON with the current user and their accessible environments
type BootstrapResponse struct {
	User string   `json:"user"`
	Envs []string `json:"envs"`
}

// JSONBootstrapHandler - Handler for JSON endpoint to return current user and accessible environments
func (h *HandlersAdmin) JSONBootstrapHandler(w http.ResponseWriter, r *http.Request) {
	if h.DebugHTTPConfig.EnableHTTP {
		utils.DebugHTTPDump(h.DebugHTTP, r, h.DebugHTTPConfig.ShowBody)
	}
	// Get context data
	ctx := r.Context().Value(sessions.ContextKey(sessions.CtxSession)).(sessions.ContextValue)
	// Get current user from context
	username := ctx[sessions.CtxUser]
	// List all environments
	allEnvs, err := h.Envs.All()
	if err != nil {
		log.Err(err).Msg("error listing environments")
		http.Error(w, "error listing environments", http.StatusInternalServerError)
		return
	}
	// Filter to environments the user has access to
	allowed := h.allowedEnvironments(username, allEnvs)
	envNames := make([]string, 0, len(allowed))
	for _, env := range allowed {
		envNames = append(envNames, env.Name)
	}
	// Encode and send response
	utils.HTTPResponse(w, utils.JSONApplicationUTF8, http.StatusOK, BootstrapResponse{
		User: username,
		Envs: envNames,
	})
}
