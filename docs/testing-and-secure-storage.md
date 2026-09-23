# Secure storage and regression tests

Native access and refresh tokens live together in Expo SecureStore. The cached
user profile remains in AsyncStorage. No token is written back to AsyncStorage
if protected storage fails.

On the first read after upgrading, the vault writes the legacy pair to protected
storage, records an installation marker, and removes the plaintext tokens. All
vault operations run in order so migration cannot race with refresh or logout.
An empty protected record on logout prevents an interrupted cleanup from
restoring an old session. The installation marker also prevents retained iOS
Keychain credentials from being reused after a fresh installation. Storage errors
are propagated; the next operation can retry.

Web retains its existing AsyncStorage token keys and persistence through
`tokenStorage.web.ts`. Reloading the page does not discard the stored session.
The SecureStore migration applies only to Android and iOS.

## Build and rollout

This change adds a native module. Build and install a new Android/iOS binary;
restarting Metro or publishing an OTA update cannot add SecureStore to an old
binary. App version 1.0.1 creates new environment-specific runtime versions so
the new JavaScript is not delivered to 1.0.0 binaries. The config plugin excludes
SecureStore data from Android backup and does not request biometric access.
Locally generated native projects need regeneration before building; do not
discard native edits without reviewing them.

Before release, test an in-place upgrade with a signed-in 1.0.0 app, relaunch,
token refresh, logout/relaunch, and reinstall on both Android and iOS. Unit tests
mock storage and do not verify the native Keychain/Keystore integration.

## Tests

- `npm test -- --runInBand`: run the regression suite locally.
- `npm run test:ci`: type-check tests and run them serially, as CI does.
- `npx tsc --noEmit`: type-check application code.

The suite covers session migration and storage failures, concurrent migration
and logout, protected storage adapters, session invalidation/expiry, branch
selection, package coverage and payment reconciliation. It does not replace
device tests or backend integration tests. Use synthetic credentials in tests;
never add real account tokens or passwords to fixtures.
