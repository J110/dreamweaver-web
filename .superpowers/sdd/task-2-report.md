# Task 2 Report: Apply the Theme at the Web Application Shell

## Implementation
- Added `EmberlightThemeController` to resolve the active theme from cached entitlement data and route state, apply root attributes, respect data-saver mode, notify the optional native bridge, and respond to cross-tab plus same-tab entitlement updates.
- Mounted the controller once in `AppShell` without changing existing providers, navigation, authentication, billing, or entitlement logic.
- Added Dream Valley UI, premium display, and Devanagari fonts; added free-theme aliases plus the premium Emberlight token, heading, and reduced-motion contracts.

## Test-first evidence
- Added the specified source-level controller test before creating the controller.
- Red test result: Jest did not reach the expected missing-file assertion because the installed dependency tree cannot resolve `@babel/runtime/helpers/interopRequireDefault`.

## Verification
- Focused Jest command: failed before test execution due to the unresolved `@babel/runtime` dependency.
- Production build: failed.
- Diff whitespace check: passed.

## Self-review
- Reviewed the requested integration points against the task brief: controller import/mount placement, root theme mutation, native notification, font variables/body class, semantic free aliases, premium overrides, Hindi heading font, and reduced-motion override are present.
- No billing, authentication, entitlement, or layout markup behavior was modified beyond the requested controller mount and body font class.

## Environment concern
- Jest's Babel transformer lacks `@babel/runtime`, preventing the focused tests from loading. The production build output is included below.

## Command output
### Focused Jest
```
FAIL src/components/EmberlightThemeController.test.js
  ● Test suite failed to run

    Cannot find module '@babel/runtime/helpers/interopRequireDefault' from 'src/components/EmberlightThemeController.test.js'

      1 | import fs from 'node:fs';
      2 | import path from 'node:path';
    > 3 |
        | ^
      4 | test('theme controller owns root theme selection and native notification', () => {
      5 |   const source = fs.readFileSync(
      6 |     path.join(process.cwd(), 'src/components/EmberlightThemeController.js'),

      at Resolver._throwModNotFoundError (node_modules/jest-resolve/build/index.js:895:11)
      at Object.<anonymous> (src/components/EmberlightThemeController.test.js:3:30)


Test Suites: 1 failed, 1 passed, 2 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        0.127 s, estimated 1 s
Ran all test suites matching src/components/EmberlightThemeController.test.js|src/utils/emberlightTheme.test.js.

```

### Production build
```

> dreamweaver-web@1.0.0 build
> next build

   ▲ Next.js 14.1.0

   Creating an optimized production build ...
request to https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&display=swap failed, reason: getaddrinfo ENOTFOUND fonts.googleapis.com

Retrying 1/3...
request to https://fonts.googleapis.com/css2?family=Fraunces:wght@100..900&display=swap failed, reason: getaddrinfo ENOTFOUND fonts.googleapis.com

Retrying 1/3...
request to https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi:wght@400&display=swap failed, reason: getaddrinfo ENOTFOUND fonts.googleapis.com

Retrying 1/3...
request to https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&display=swap failed, reason: getaddrinfo ENOTFOUND fonts.googleapis.com

Retrying 2/3...
request to https://fonts.googleapis.com/css2?family=Fraunces:wght@100..900&display=swap failed, reason: getaddrinfo ENOTFOUND fonts.googleapis.com

Retrying 2/3...
request to https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi:wght@400&display=swap failed, reason: getaddrinfo ENOTFOUND fonts.googleapis.com

Retrying 2/3...
request to https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&display=swap failed, reason: getaddrinfo ENOTFOUND fonts.googleapis.com

Retrying 3/3...
request to https://fonts.googleapis.com/css2?family=Fraunces:wght@100..900&display=swap failed, reason: getaddrinfo ENOTFOUND fonts.googleapis.com

Retrying 3/3...
request to https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi:wght@400&display=swap failed, reason: getaddrinfo ENOTFOUND fonts.googleapis.com

Retrying 3/3...
FetchError: request to https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&display=swap failed, reason: getaddrinfo ENOTFOUND fonts.googleapis.com
    at ClientRequest.<anonymous> (/Users/anmolmohan/Music/Bed Time Story App/dreamweaver-web/.worktrees/emberlight/node_modules/next/dist/compiled/node-fetch/index.js:1:66160)
    at ClientRequest.emit (node:events:508:20)
    at emitErrorEvent (node:_http_client:108:11)
    at TLSSocket.socketErrorListener (node:_http_client:575:5)
    at TLSSocket.emit (node:events:508:20)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
  type: 'system',
  errno: 'ENOTFOUND',
  code: 'ENOTFOUND'
}
FetchError: request to https://fonts.googleapis.com/css2?family=Fraunces:wght@100..900&display=swap failed, reason: getaddrinfo ENOTFOUND fonts.googleapis.com
    at ClientRequest.<anonymous> (/Users/anmolmohan/Music/Bed Time Story App/dreamweaver-web/.worktrees/emberlight/node_modules/next/dist/compiled/node-fetch/index.js:1:66160)
    at ClientRequest.emit (node:events:508:20)
    at emitErrorEvent (node:_http_client:108:11)
    at TLSSocket.socketErrorListener (node:_http_client:575:5)
    at TLSSocket.emit (node:events:508:20)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
  type: 'system',
  errno: 'ENOTFOUND',
  code: 'ENOTFOUND'
}
FetchError: request to https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi:wght@400&display=swap failed, reason: getaddrinfo ENOTFOUND fonts.googleapis.com
    at ClientRequest.<anonymous> (/Users/anmolmohan/Music/Bed Time Story App/dreamweaver-web/.worktrees/emberlight/node_modules/next/dist/compiled/node-fetch/index.js:1:66160)
    at ClientRequest.emit (node:events:508:20)
    at emitErrorEvent (node:_http_client:108:11)
    at TLSSocket.socketErrorListener (node:_http_client:575:5)
    at TLSSocket.emit (node:events:508:20)
    at emitErrorNT (node:internal/streams/destroy:170:8)
    at emitErrorCloseNT (node:internal/streams/destroy:129:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
  type: 'system',
  errno: 'ENOTFOUND',
  code: 'ENOTFOUND'
}
Failed to compile.

src/app/layout.js
`next/font` error:
Failed to fetch `Fraunces` from Google Fonts.

src/app/layout.js
`next/font` error:
Failed to fetch `Quicksand` from Google Fonts.

src/app/layout.js
`next/font` error:
Failed to fetch `Tiro Devanagari Hindi` from Google Fonts.


> Build failed because of webpack errors

```

## Test-scoped correction and final verification

### Root cause and correction
- Babel transformed the source-level controller test ESM Node built-in imports into @babel/runtime/helpers/interopRequireDefault before Jest executed the test. That helper is absent from the installed dependency tree.
- Replaced only those two test imports with CommonJS require calls. This avoids the Babel helper without adding a runtime dependency or changing production behavior.

### Focused Task 2 tests
- Command: npx jest src/components/EmberlightThemeController.test.js src/utils/emberlightTheme.test.js --runInBand
- Result: Test Suites: 2 passed, 2 total; Tests: 8 passed, 8 total; Snapshots: 0 total; Time: 0.285 s.

### Production build retry
- npm run build completed successfully outside the sandbox.
