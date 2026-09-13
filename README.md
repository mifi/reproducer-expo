# reproducer-expo

Reproduces: `expo/fetch` never settles when the server sends a truncated HTTP
response and closes the socket while the request body is still uploading (iOS,
development build).

Created with `npx create-expo-app@latest --template blank@sdk-56`, then upgraded to SDK 57, plus
`expo-dev-client` (the bug was observed in a development build) and
`expo-file-system` (for the comparison upload that does surface the failure).

## Steps

1. `npm install`
2. `npx expo run:ios --device` (development build on a physical iPhone)
3. On a machine on the same LAN: `node server.mjs`
4. In the app, enter that machine's LAN IP and tap **Upload 20 MB with expo/fetch**.
   - Expected: "rejected after ~1 s" once the server closes the socket.
   - Actual: nothing until the 60 s `AbortSignal` fires.
5. Tap **Upload 20 MB with file.upload()**: same server, same bytes, fails within a few seconds.

See `App.js` and `server.mjs` for details.
