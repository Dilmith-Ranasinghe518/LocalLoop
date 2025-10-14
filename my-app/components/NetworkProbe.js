// components/NetworkProbe.js
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Button, ScrollView } from "react-native";
import { __debug } from "../firebaseConfig";

function installFetchLogger() {
  if (global.__fetchLoggerInstalled) return;
  const originalFetch = global.fetch;
  global.__fetchLoggerInstalled = true;

  global.fetch = async (input, init) => {
    const id = Math.random().toString(36).slice(2);
    try {
      console.log(`[FETCH:${id}] →`, input, init || {});
      const res = await originalFetch(input, init);
      console.log(`[FETCH:${id}] ← status`, res.status, res.ok);
      return res;
    } catch (err) {
      console.log(`[FETCH:${id}] ✖ error`, err);
      throw err;
    }
  };
}

const tests = [
  { url: "https://www.gstatic.com/generate_204", label: "Basic Google connectivity" },
  { url: "https://www.google.com/robots.txt", label: "Google robots" },
  { url: "https://www.googleapis.com/robots.txt", label: "Google APIs robots" },
  { url: "https://identitytoolkit.googleapis.com/v1/projects", label: "Firebase IdentityToolkit (HEAD)", method: "HEAD" },
  { url: `https://${__debug.firebaseConfig.authDomain}`, label: "Your authDomain host" },
];

export const NetworkProbe = () => {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    installFetchLogger();
    const outs = [];

    for (const t of tests) {
      try {
        const res = await fetch(t.url, { method: t.method || "GET" });
        outs.push({ url: `${t.label} (${t.url})`, ok: res.ok, status: res.status });
      } catch (e) {
        outs.push({ url: `${t.label} (${t.url})`, ok: false, error: (e && e.message) || String(e) });
      }
    }

    setResults(outs);
    setRunning(false);
  }, []);

  useEffect(() => { run().catch(() => {}); }, [run]);

  return (
    <View style={{ padding: 12, gap: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Network Probe</Text>
      <Text style={{ opacity: 0.7, marginBottom: 8 }}>Verifies simulator connectivity and Firebase host reachability.</Text>
      <Button title={running ? "Running…" : "Run again"} disabled={running} onPress={run} />
      <ScrollView style={{ maxHeight: 240, marginTop: 8 }}>
        {results.map((r, i) => (
          <View key={i} style={{ paddingVertical: 6, borderBottomWidth: 1, borderColor: "#eee" }}>
            <Text style={{ fontWeight: "500" }}>{r.url}</Text>
            {r.ok ? <Text>✅ OK — status {r.status}</Text> : <Text>❌ FAIL — {r.error || `status ${r.status}`}</Text>}
          </View>
        ))}
      </ScrollView>
      <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
        If the first test fails, it’s a simulator/debugger/network issue (not Firebase).
      </Text>
    </View>
  );
};
