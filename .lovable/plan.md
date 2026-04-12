

## Update Service Worker with Improved Implementation

The user has provided an enhanced `public/sw.js` with several improvements over the current version.

### Changes

| Improvement | Detail |
|---|---|
| Dev-only logging | Logs gated behind `localhost` check |
| App badge support | `setAppBadge` on push, `clearAppBadge` on click |
| Navigate on click | `client.navigate(urlToOpen)` before focus, so clicking a notification opens the correct match URL |
| Code organization | Section headers, cleaner comments |

### File to Update

| File | Change |
|---|---|
| `public/sw.js` | Replace entirely with the user's improved version |

