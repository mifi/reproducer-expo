/**
 * Reproducer: `expo/fetch` never settles when the server sends a truncated
 * response and closes the socket while the request body is still uploading.
 *
 * 1. On a machine on the same LAN run `node server.mjs`.
 * 2. Enter that machine's LAN IP below.
 * 3. Tap "Upload 20 MB with expo/fetch". Expected: rejects within ~1 s of the
 *    server closing the socket. Actual: stays pending; only the 60 s
 *    AbortSignal ends it.
 * 4. Tap "Upload 20 MB with file.upload()". Same server, same bytes, same
 *    URLSession layer: it fails within a few seconds.
 */

import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';

const BODY_SIZE = 20 * 1024 * 1024;
const TIMEOUT_MS = 60_000;

function elapsedSince(startedAt) {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)} s`;
}

export default function App() {
  const [host, setHost] = useState('192.168.1.2');
  const [log, setLog] = useState([]);

  const append = (line) => setLog((prev) => [...prev, line]);
  const url = `http://${host}:8080/upload`;

  async function uploadWithExpoFetch() {
    const startedAt = Date.now();
    append(`expo/fetch: PUT ${url} ...`);
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: new Uint8Array(BODY_SIZE),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      append(`expo/fetch: resolved after ${elapsedSince(startedAt)}: HTTP ${response.status}`);
    } catch (err) {
      append(`expo/fetch: rejected after ${elapsedSince(startedAt)}: ${err}`);
    }
  }

  async function uploadWithFileSystem() {
    const startedAt = Date.now();
    append(`file.upload: PUT ${url} ...`);
    try {
      const file = new File(Paths.cache, 'big.bin');
      if (!file.exists) {
        file.create();
        file.write(new Uint8Array(BODY_SIZE));
      }
      const result = await file.upload(url, {
        httpMethod: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      append(`file.upload: resolved after ${elapsedSince(startedAt)}: HTTP ${result.status}`);
    } catch (err) {
      append(`file.upload: rejected after ${elapsedSince(startedAt)}: ${err}`);
    }
  }

  return (
    <View style={styles.container}>
      <Text>Server LAN IP (run `node server.mjs` there):</Text>
      <TextInput
        style={styles.input}
        value={host}
        onChangeText={setHost}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
      />
      <Button title="Upload 20 MB with expo/fetch" onPress={uploadWithExpoFetch} />
      <Button title="Upload 20 MB with file.upload()" onPress={uploadWithFileSystem} />
      <Button title="Clear log" onPress={() => setLog([])} />
      {log.map((line, i) => (
        <Text key={i} style={styles.line}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    padding: 8,
    fontSize: 16,
  },
  line: {
    fontFamily: 'Menlo',
    fontSize: 12,
  },
});
