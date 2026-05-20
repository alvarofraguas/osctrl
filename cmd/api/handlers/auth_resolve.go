package handlers

import (
	"errors"
	"fmt"

	"github.com/jmpsec/osctrl/pkg/auth"
	"github.com/jmpsec/osctrl/pkg/users"
)

// ErrAuthUserRejected is returned by resolveFederatedUser when the
// identity cannot be turned into a usable AdminUser. Callers should
// not surface this to clients verbatim — return a generic
// "authentication failed" error to avoid leaking which path
// rejected (timing-oracle and information-disclosure defense).
var ErrAuthUserRejected = errors.New("auth: identity cannot be resolved to an AdminUser")

// resolveFederatedUser maps a federated identity (OIDC, SAML
// eventually) to an existing AdminUser. Policy mirrors legacy
// admin's:
//
//  1. Username exists in admin_users → use that row.
//  2. Else if `jitProvision` is true on the env's provider config
//     → create a new AdminUser with zero env permissions. The
//     operator must grant access manually.
//  3. Else → reject.
//
// Threat T16 (privilege escalation via JIT): the JIT path
// constructs AdminUser with admin=false, service=false. There is no
// path in this function that produces a row with admin=true; that
// guarantee is enforced by callsite, not by data validation.
//
// Threat T25 (mass-assignment via JIT): the function never
// deserializes ResolvedIdentity directly into the struct. Field-
// by-field copy with explicit flags.
//
// Threat T15 (account takeover): the IdPSubject field binds a
// federated identity to a specific AdminUser row. On first login the
// subject is stamped; on subsequent logins it must match. This
// prevents a different IdP identity with the same username from
// hijacking the account.
func (h *HandlersApi) resolveFederatedUser(identity auth.ResolvedIdentity, jitProvision bool, authSource string) (users.AdminUser, error) {
	if identity.PreferredUsername == "" {
		return users.AdminUser{}, fmt.Errorf("%w: empty username", ErrAuthUserRejected)
	}
	if exists, existing := h.Users.ExistsGet(identity.PreferredUsername); exists {
		if existing.IdPSubject == "" {
			existing.IdPSubject = identity.Subject
			existing.AuthSource = authSource
			if err := h.Users.Update(existing); err != nil {
				return users.AdminUser{}, fmt.Errorf("%w: binding IdP subject: %v", ErrAuthUserRejected, err)
			}
		} else if existing.IdPSubject != identity.Subject {
			return users.AdminUser{}, fmt.Errorf("%w: IdP subject mismatch for user %s", ErrAuthUserRejected, identity.PreferredUsername)
		}
		return existing, nil
	}
	if !jitProvision {
		return users.AdminUser{}, fmt.Errorf("%w: user not provisioned and jitProvision disabled", ErrAuthUserRejected)
	}
	// JIT: build a NON-admin, NON-service AdminUser. The empty
	// password means CheckLoginCredentials can never authenticate
	// this user via /login — they MUST come back through the SSO
	// flow. Operators may set a password later via the user-mgmt
	// API if they want a dual-auth account.
	u, err := h.Users.New(
		identity.PreferredUsername, // username
		"",                         // password (empty: forces SSO-only)
		identity.Email,             // email (informational)
		identity.Name,              // fullname (display)
		false,                      // admin = false
		false,                      // service = false
	)
	if err != nil {
		return users.AdminUser{}, fmt.Errorf("%w: new user: %v", ErrAuthUserRejected, err)
	}
	// Tag the row with the provider type (oidc / saml) so the Users
	// page can display the right badge. Purely informational; the auth
	// flow itself doesn't gate on this field.
	u.AuthSource = authSource
	u.IdPSubject = identity.Subject
	if err := h.Users.Create(u); err != nil {
		return users.AdminUser{}, fmt.Errorf("%w: create user: %v", ErrAuthUserRejected, err)
	}
	return u, nil
}
