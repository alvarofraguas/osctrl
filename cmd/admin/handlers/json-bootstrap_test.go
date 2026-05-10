package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jmpsec/osctrl/cmd/admin/sessions"
	"github.com/jmpsec/osctrl/pkg/config"
	"github.com/jmpsec/osctrl/pkg/environments"
	"github.com/jmpsec/osctrl/pkg/users"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupBootstrapTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err, "failed to open in-memory SQLite database")
	return db
}

func TestJSONBootstrapHandler(t *testing.T) {
	db := setupBootstrapTestDB(t)

	// Create EnvManager with two environments
	envMgr := environments.CreateEnvironment(db)
	devEnv := environments.TLSEnvironment{
		Name:     "dev",
		Hostname: "dev.example.com",
		UUID:     "uuid-dev-1111",
		Secret:   "devsecret",
	}
	prodEnv := environments.TLSEnvironment{
		Name:     "prod",
		Hostname: "prod.example.com",
		UUID:     "uuid-prod-2222",
		Secret:   "prodsecret",
	}
	require.NoError(t, envMgr.Create(&devEnv))
	require.NoError(t, envMgr.Create(&prodEnv))

	// Create UserManager and add alice as an admin (admin users pass CheckPermissions for all envs)
	jwtConf := &config.YAMLConfigurationJWT{
		JWTSecret:     "test-secret",
		HoursToExpire: 1,
	}
	userMgr := users.CreateUserManager(db, jwtConf)
	alice := users.AdminUser{
		Username: "alice",
		Email:    "alice@example.com",
		Admin:    true,
	}
	require.NoError(t, db.Create(&alice).Error)

	// Build handler with minimal config (debug HTTP disabled)
	debugCfg := &config.YAMLConfigurationDebug{EnableHTTP: false}
	h := CreateHandlersAdmin(
		WithEnvs(envMgr),
		WithUsers(userMgr),
		WithDebugHTTP(debugCfg),
	)

	// Build request with session context
	req := httptest.NewRequest(http.MethodGet, "/ui/api/bootstrap", nil)
	ctxVal := sessions.ContextValue{
		sessions.CtxUser: "alice",
	}
	req = req.WithContext(context.WithValue(req.Context(), sessions.ContextKey(sessions.CtxSession), ctxVal))

	rr := httptest.NewRecorder()
	h.JSONBootstrapHandler(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json; charset=UTF-8", rr.Header().Get("Content-Type"))

	var resp BootstrapResponse
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&resp))
	assert.Equal(t, "alice", resp.User)
	assert.Equal(t, []string{"dev", "prod"}, resp.Envs)
}
