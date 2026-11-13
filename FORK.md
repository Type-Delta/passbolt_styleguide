# passbolt_styleguide Fork

<!-- In-synced fork: maintained with the `syncfork` skill. -->

This fork adds saved-account switching and account enrollment to the shared Passbolt UI, and builds the UI as a reproducible artifact that the companion `passbolt_browser_extension` fork pins by commit. It tracks `passbolt/passbolt_styleguide` `master`. The `base` tag records the upstream fork/sync point.

## Divergence Log

Each behavior where this fork differs from upstream has one entry here. If you change code in this repository, check if this log needs an update.

The rules:

- Update the entry that owns the behavior you changed, or add an entry with the next unused ID. One entry covers one behavior, not one commit.
- Describe the current behavior, why the fork needs it, and how it composes with upstream's related behavior. When the behavior changes, rewrite the entry. Do not append a changelog; git and the Merge History hold history.
- Under **Implementation evidence**, list the key source files and tests. Under **Recorded validation**, list the checks that proved the current behavior.
- Set **Last updated** to today's date on every entry you touch.
- Never reuse an ID. Retire an entry only with the user's explicit approval: delete it and name the retired ID in the next Merge History entry.
- When an ID conflicts from merges, renumber the IDs as needed.
- A change that does not alter how the fork differs from upstream (formatting, or an edit to this file) needs no entry.

### DL001 — Saved accounts in the vault and Quick Access

Upstream assumes one installed account per browser profile and has no account surface. This fork adds a shared `AccountsContext` that mirrors the extension's saved-account registry over the existing extension port (`passbolt.accounts.*`) and consumes it in three places:

- the vault user badge menu lists the other saved accounts, offers add and manage actions, shows the active account's server and a notice while a sign-in waits for MFA;
- the Quick Access popup shows the current account in its header and has `/accounts` and `/accounts/manage` routes that switch, add, lock or remove accounts;
- the vault opens a manage-accounts dialog for the same list.

The context only ever receives public summaries (id, domain, username, names, locked state); keys and passphrases stay in the extension. Removal asks for an inline confirmation on the row and warns that re-adding an account requires its private key again. Where no provider is mounted the context reports `isAvailable: false` and consumers render nothing, so pages served by the API are unchanged. When Quick Access cannot read an account at all (first use, or a sign-in waiting for MFA on the same backend), it renders only the account routes and never the key import form.

The profile action is labelled "Account Settings". Lock has a translated native tooltip explaining that it ends the remembered unlock while keeping the account and private key saved; its accessible description carries the same help. The popup header has 8px top padding on the existing spacing scale.

**Implementation evidence:** `src/shared/context/Accounts/AccountsContext.js`, `src/shared/services/api/accounts/AccountsServiceWorkerService.js`, `src/shared/components/Accounts/{AccountSwitcherList,ManageAccountsList,OpenAddAccountButton,PendingAccountNotice}/`, `src/react-extension/components/User/DisplayUserBadgeMenu/DisplayUserBadgeMenu.js`, `src/react-extension/components/User/ManageAccountsDialog/`, `src/react-quickaccess/ExtQuickAccess.js`, `src/react-quickaccess/components/{AccountsPage,ManageAccountsPage,Header}/`, `src/less/components/accounts.less`, `src/less/page-components/quickaccess/quickaccess_header.less`, `src/locales/en-UK/common.json`. Tests: `src/shared/context/Accounts/AccountsContext.test.js`, `src/shared/services/api/accounts/AccountsServiceWorkerService.test.js`, `src/react-quickaccess/ExtQuickAccess.test.js`, `src/react-quickaccess/components/AccountsPage/AccountsPage.test.js`, `src/shared/components/Accounts/*/*.test.js`, `src/react-extension/components/User/DisplayUserBadgeMenu/DispayUserBadgeMenu.test.js`.

**Recorded validation:** the [onboarding .2 release](https://github.com/Type-Delta/passbolt_browser_extension/releases/tag/fork-v5.17.1-multi-account.2) records a full serial UI run with 656 suites and 8,544 tests, plus actual Chromium account switching, distinct secrets, cached credential fill and native TOTP. The tooltip, label and header follow-up passed 19 focused tests and default UI lint. Source-component Chromium checks in light/dark themes verified the native tooltip's accessible description and keyboard action, the visible label, 8px header padding and 380px document width without horizontal overflow. Those component captures are not a packaged-extension test; native tooltip pixels and Edge/Firefox/Safari execution were not claimed.

**Last updated:** 2026-11-13

### DL002 — Add-account wizard in its own extension tab

Upstream imports a key and asks for the passphrase inline on the login page. This fork composes the existing `ImportGpgKey`, `ChooseSecurityToken` and `Login` components into `AddAccountWizard`, mounted by `ExtAddAccount` in a separate extension tab (`quickaccess.html` with the add-account tab parameters). The three visible stages are server verification, account email/encrypted-key import, and unlock with a chosen security token and passphrase. Pending MFA, success and expired-session states complete that flow.

Secrets live only in the wizard's memory and the mounted `Login`. Each step is an attempt numbered by a generation counter, so a reply from a step the user has left is ignored; going back remounts `Login` so the passphrase is forgotten; a response after unmount does not act. When the extension reports that the onboarding session expired, the wizard stops and tells the user to reopen Add account from the extension rather than retrying in the stale tab. The companion extension's stylesheet manager selects the authentication stylesheet for this tab, honours a saved theme, and uses the default theme when none is stored. `ImportGpgKey` gained an ADD_ACCOUNT variation that renders a leading email field in the same form, disables native validation, exposes `#private-key`, and resets its processing state when the parent keeps the step mounted after an error. `Login` gained an ADD_ACCOUNT variation and skips the remember-me default unless the flow offers it.

**Implementation evidence:** `src/react-extension/ExtAddAccount.js`, `src/react-extension/components/AddAccount/AddAccountWizard/AddAccountWizard.js`, `src/react-extension/components/AddAccount/ChooseServerStep/ChooseServerStep.js`, `src/react-extension/components/Authentication/ImportGpgKey/ImportGpgKey.js`, `src/react-extension/components/AuthenticationLogin/Login/Login.js`, `src/less/components/add-account.less`, `src/locales/en-UK/common.json`. Tests: `src/react-extension/ExtAddAccount.test.js`, `src/react-extension/components/AddAccount/AddAccountWizard/AddAccountWizard.test.js`, `src/react-extension/components/Authentication/ImportGpgKey/ImportGpgKey.test.js`, `src/react-extension/components/AuthenticationLogin/Login/Login.test.js`.

**Recorded validation:** wizard tests cover stage order, late replies, unmount and session expiry. The .2 release records actual Chromium popup-to-tab launch, server retention before enrollment, real key/token/unlock and exact identity, recovery after an identity mismatch in the same tab, the trusted first-use prompt, launch after vault route navigation and native new/saved TOTP. The full UI suite passed 656 suites and 8,544 tests. Final release browser members matched the verified CI payloads; their only differences from the browser-tested candidate were generated CSS date headers.

**Last updated:** 2026-11-13

### DL003 — Same-origin translation URLs carry the frontend revision

Server pages stamped by the matched frontend overlay carry `ui-<tarball sha256>` in `#stylesheet-manager[cache-version]`. The shared `getTranslationPath` helper appends that value as `?v=` to locale URLs, but only for HTTP(S) pages, only when the URL is same-origin with the page, and only when the attribute matches the expected shape. Extension-local locale URLs and cross-origin requests are returned unchanged, and the existing en-GB to en-UK mapping is preserved. Both `TranslationProvider` implementations delegate to the helper, so a new UI release does not reuse cached locale JSON on the server pages while the extension keeps loading its bundled translations.

**Implementation evidence:** `src/shared/components/Internationalisation/translationPath.js`, `src/shared/components/Internationalisation/TranslationProvider.js`, `src/react-extension/components/Common/Internationalisation/TranslationProvider.js`. Tests: `src/shared/components/Internationalisation/translationPath.test.js`, `src/shared/components/Internationalisation/TranslationProvider.test.js`.

**Recorded validation:** 22 translation-path and provider tests plus 102 neighbouring tests and lint were recorded for this change.

**Last updated:** 2026-11-13

### DL004 — Reproducible pinned styleguide artifact and fork release workflow

Upstream's release output is not byte-stable across machines: LESS entry names were absolute paths (which changes webpack chunk ids per checkout root) and the stylesheet banner used the build day. This fork adds `npm run pack:fork` (`ci-scripts/build-ui-artifact.mjs`): it builds the UI, asserts the required JS/CSS/locale artifacts exist, optionally requires a clean tree and the pinned toolchain, takes `SOURCE_DATE_EPOCH` from the source commit, packs `passbolt-styleguide-<version>-fork.tgz`, and writes `passbolt-styleguide-artifact.json` with the source commit/ref/date, tarball SHA-256 and npm integrity, byte size, and Node/npm versions. `config/webpack.less.js` uses repository-relative POSIX entry names and the `SOURCE_DATE_EPOCH` date in the banner, so the same commit packs identically from any checkout path and on any day. `.nvmrc` and `packageManager` pin Node 22.14.0 with npm 10.9.2, and upstream's package dependencies are untouched.

`.github/workflows/ci.yml` verifies the toolchain, runs the LESS entry test, lint, the unit suite and a pinned pack. `.github/workflows/release.yml` replaces upstream's release-notes job: it builds the pinned tarball on `fork-v*` tags, writes `SHA256SUMS`, and creates or updates the GitHub release.

**Implementation evidence:** `ci-scripts/build-ui-artifact.mjs`, `config/webpack.less.js`, `config/webpack.less.test.cjs`, `package.json`, `.nvmrc`, `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.gitignore`, `README.md`.

**Recorded validation:** the real-config LESS entry regression passed across two checkout paths. For the .2 release, two independent clean builds of `d73114308716b9b52da2671b57c9ce0368c7217b` produced tarball SHA-256 `934f8a54e44ce8a97ec9130844d1be1266b898c90ca15bcba8e774bf44a99df9`. UI CI passed on that commit, and the companion [release workflow](https://github.com/Type-Delta/passbolt_browser_extension/actions/runs/43195456025) independently rebuilt and verified the same pin with clean provenance.

**Last updated:** 2026-11-13

### DL005 — Autofill call-to-action and menu survive focus into their iframes

Upstream removes the in-form call-to-action as soon as the field blurs and the in-form menu when the field is no longer the active element. Focus moving into the extension's cross-origin iframe blurs the field, so a legitimate click could destroy the very element being clicked.

This fork gives the call-to-action a short removal grace period and cancels removal when the pointer reaches the call-to-action or focus returns to the field; pointer-leave from the call-to-action uses the same grace period. The menu listens on capture phase for `focusout`, `focus` and `pointerdown` on the field's document and, when the field is framed, the host document, then checks on the next task and keeps itself while the iframe holds the shadow-root focus. Overlay probing now treats an unknown application or a missing iframe as overlaid (fail closed), and restores the page's inline `pointer-events` values and priorities exactly, including when the hit test throws. Upstream's protection that no hint is offered over a covered field is preserved.

**Implementation evidence:** `src/react-web-integration/lib/InForm/InFormCallToActionField.js`, `src/react-web-integration/lib/InForm/InformMenuField.js`, `src/react-web-integration/lib/InForm/InFormManager.js`, `src/react-web-integration/lib/InForm/InformManager.test.page.js`. Tests: `InFormCallToActionField.test.js`, `InformManager.test.js`, `InformMenuField.test.js`.

**Recorded validation:** unit tests cover the grace period, focus cancellation, listener cleanup on destroy, blocked missing/unknown applications, and exact pointer-events restoration including on throw; the menu page object blurs through the real grace period.

**Last updated:** 2026-11-13

## Sync Checklist

Project-specific checks every upstream sync runs, in addition to the full test suite, lint, typecheck, builds, and a smoke test of upstream and fork features.

- Reconstruct the released toolchain (Node 22.14.0, npm 10.9.2, from `.nvmrc`/`packageManager`), run `npm ci`, `npm run lint`, `npm run test:unit`, and `node --test config/webpack.less.test.cjs`.
- Pack the artifact twice from two different checkout paths with `npm run pack:fork -- --out <dir> --require-clean --require-pinned-toolchain`; require identical tarball bytes, a manifest whose source commit is HEAD, and every required build artifact present.
- Build all four themes and confirm the tarball has `build/css/themes/<theme>/{api_main,api_authentication,ext_authentication,ext_quickaccess}.min.css`, `build/locales/en-UK/common.json`, and the account-interface translations.
- With the companion extension build against a disposable backend, run the account UI happy path in a real browser: add an account from the full tab, switch between two accounts, see the pending MFA notice, lock and remove an account.
- On a disposable login page, focus a field and click the in-form call-to-action and menu (cross-origin iframe) and confirm both remain; cover the field and confirm the overlay probe suppresses the hint and restores the page's pointer-events.
- Publishing and deployment are separate release tasks, performed when explicitly requested. Sync verification uses disposable accounts and does not require owner credentials.

## Merge History

This is an append-only decision record, newest first, with one entry per upstream sync. It explains past integrations but does not by itself establish a current divergence; use the Divergence Log for that. Sync with upstream only when the user explicitly asks. Do not edit past entries.

Initialized with `syncfork init` on 2026-11-13 at upstream `master` commit `2265f62500e8a5f7f6ed5fffeb53e1e6a7dacf5b`, the confirmed `base` tag target. No fork-specific upstream sync had occurred. Initialization and merging the fork's own feature PR are not upstream syncs.
