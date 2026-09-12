// Test server for the reproducer. Run with: node server.mjs
//
// Accepts a PUT upload and, once 1 MB has arrived, writes a *truncated* HTTP
// status line and closes the socket. This is the wire outcome Node's own
// `socketOnError` in `_http_server.js` produces whenever its `write()` of a
// 408 loses the race with the `destroy()` that follows in the same tick.
import http from 'node:http';

http
  .createServer((req, res) => {
    if (req.method !== 'PUT') {
      res.writeHead(404).end();
      return;
    }

    let bytes = 0;
    let torn = false;

    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (torn || bytes < 1_000_000) return;
      torn = true;

      console.log(`received ${bytes} bytes, sending truncated response and closing`);
      req.socket.write('HTTP/1.1 408 Req');
      setTimeout(() => req.socket.destroy(), 250);
    });

    req.on('error', () => {}); // expected: ECONNRESET
  })
  .listen(8080, '0.0.0.0', () => console.log('listening on 0.0.0.0:8080'));
