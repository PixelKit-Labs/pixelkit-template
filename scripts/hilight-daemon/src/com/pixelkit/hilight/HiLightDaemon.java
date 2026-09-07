package com.pixelkit.hilight;

import android.hardware.lights.Light;
import android.hardware.lights.LightState;
import android.os.Binder;
import android.os.IBinder;

import java.io.*;
import java.lang.reflect.Array;
import java.lang.reflect.Method;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/**
 * HiLightDaemon
 *
 * Lightweight, zero-dependency background daemon that drives the Pixel 11 Pro
 * HiLight 8-LED rear camera ring. Runs as UID 2000 (com.android.shell) via app_process,
 * which natively holds android.permission.CONTROL_DEVICE_LIGHTS.
 *
 * Exposes an HTTP REST server on 127.0.0.1:11080 for local React Native / Expo apps:
 *   GET  /status  -> JSON device status & active light pattern
 *   POST /set     -> { "color": "#00E5FF", "brightness": 0.85, "mode": "pulse", "durationMs": 4000 }
 *   POST /off     -> blanks all LEDs and runs cleanup sequence
 */
public class HiLightDaemon {
    private static final int PORT = 11080;
    private static final long MAX_ACTIVE_HOLD_MS = 60_000L; // 60s hard hardware safety clamp

    private static Class<?> ilightsClass;
    private static Object lightsService;
    private static Class<?> lightStateArrayClass;
    private static Method mOpenSession;
    private static Method mSetLightStates;
    private static Method mCloseSession;

    private static final List<Integer> lightIds = new CopyOnWriteArrayList<>();
    private static final Object sessionLock = new Object();
    private static IBinder activeToken = null;
    private static ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private static ScheduledFuture<?> autoOffTask = null;

    private static volatile boolean isLit = false;
    private static volatile String activeColor = "#000000";
    private static volatile String activeMode = "off";
    private static volatile float activeBrightness = 1.0f;

    public static void main(String[] args) {
        System.out.println("[PixelKit HiLightDaemon] Starting on UID " + android.os.Process.myUid() + " (pid " + android.os.Process.myPid() + ")...");

        try {
            initLightsFramework();
        } catch (Throwable t) {
            System.err.println("[PixelKit HiLightDaemon] Failed to bind lights framework: " + t.getMessage());
            t.printStackTrace();
            System.exit(1);
        }

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("[PixelKit HiLightDaemon] Shutting down, cleaning up LEDs...");
            performClear(true);
        }));

        startHttpServer();
    }

    private static void initLightsFramework() throws Exception {
        IBinder binder = (IBinder) Class.forName("android.os.ServiceManager")
                .getMethod("getService", String.class)
                .invoke(null, "lights");
        if (binder == null) {
            throw new IllegalStateException("Android system service 'lights' returned null");
        }

        ilightsClass = Class.forName("android.hardware.lights.ILightsManager");
        lightsService = Class.forName("android.hardware.lights.ILightsManager$Stub")
                .getMethod("asInterface", IBinder.class)
                .invoke(null, binder);
        lightStateArrayClass = Class.forName("[Landroid.hardware.lights.LightState;");

        mOpenSession = ilightsClass.getMethod("openSession", IBinder.class, int.class);
        mSetLightStates = ilightsClass.getMethod("setLightStates", IBinder.class, int[].class, lightStateArrayClass);
        mCloseSession = ilightsClass.getMethod("closeSession", IBinder.class);

        // Discover application lights (type 10 on API 37)
        List<?> allLights = (List<?>) ilightsClass.getMethod("getLights").invoke(lightsService);
        lightIds.clear();
        for (Object item : allLights) {
            Light l = (Light) item;
            if (l.getType() == 10) { // Light.LIGHT_TYPE_APPLICATION
                lightIds.add(l.getId());
            }
        }

        System.out.println("[PixelKit HiLightDaemon] Found " + lightIds.size() + " HiLight LEDs (IDs: " + lightIds + ")");
        if (lightIds.isEmpty()) {
            System.err.println("[PixelKit HiLightDaemon] Warning: No application lights detected. Device might not be Pixel 11 Pro.");
        }

        // Clean slate
        performClear(false);
    }

    private static void startHttpServer() {
        try (ServerSocket serverSocket = new ServerSocket(PORT, 50, InetAddress.getByName("127.0.0.1"))) {
            System.out.println("[PixelKit HiLightDaemon] HTTP Server listening on http://127.0.0.1:" + PORT);

            ExecutorService threadPool = Executors.newCachedThreadPool();

            while (!Thread.currentThread().isInterrupted()) {
                Socket client = serverSocket.accept();
                threadPool.execute(() -> handleClient(client));
            }
        } catch (IOException e) {
            System.err.println("[PixelKit HiLightDaemon] Server socket error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private static void handleClient(Socket socket) {
        try (
            InputStream in = socket.getInputStream();
            OutputStream out = socket.getOutputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))
        ) {
            String requestLine = reader.readLine();
            if (requestLine == null || requestLine.isEmpty()) return;

            String[] parts = requestLine.split(" ");
            String method = parts.length > 0 ? parts[0].toUpperCase() : "GET";
            String path = parts.length > 1 ? parts[1] : "/";

            // Parse headers
            Map<String, String> headers = new HashMap<>();
            String headerLine;
            int contentLength = 0;
            while ((headerLine = reader.readLine()) != null && !headerLine.isEmpty()) {
                int colon = headerLine.indexOf(':');
                if (colon > 0) {
                    String name = headerLine.substring(0, colon).trim().toLowerCase();
                    String val = headerLine.substring(colon + 1).trim();
                    headers.put(name, val);
                    if (name.equals("content-length")) {
                        try { contentLength = Integer.parseInt(val); } catch (NumberFormatException ignored) {}
                    }
                }
            }

            // Read Body if present
            StringBuilder bodyBuilder = new StringBuilder();
            if (contentLength > 0) {
                char[] buf = new char[Math.min(contentLength, 4096)];
                int totalRead = 0;
                while (totalRead < contentLength) {
                    int read = reader.read(buf, 0, Math.min(buf.length, contentLength - totalRead));
                    if (read == -1) break;
                    bodyBuilder.append(buf, 0, read);
                    totalRead += read;
                }
            }
            String body = bodyBuilder.toString();

            // Routing
            String responseJson;
            int statusCode = 200;

            if (method.equals("OPTIONS")) {
                responseJson = "{}";
            } else if (path.startsWith("/status") || path.startsWith("/ping")) {
                responseJson = getStatusJson();
            } else if (path.startsWith("/set") && method.equals("POST")) {
                responseJson = handleSet(body);
            } else if (path.startsWith("/off") && method.equals("POST")) {
                performClear(true);
                responseJson = "{\"status\":\"ok\",\"mode\":\"off\"}";
            } else {
                statusCode = 404;
                responseJson = "{\"error\":\"Not Found\"}";
            }

            byte[] responseBytes = responseJson.getBytes(StandardCharsets.UTF_8);
            String responseHeader = "HTTP/1.1 " + statusCode + " OK\r\n" +
                    "Content-Type: application/json; charset=utf-8\r\n" +
                    "Content-Length: " + responseBytes.length + "\r\n" +
                    "Access-Control-Allow-Origin: *\r\n" +
                    "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                    "Access-Control-Allow-Headers: Content-Type, Authorization\r\n" +
                    "Connection: close\r\n\r\n";

            out.write(responseHeader.getBytes(StandardCharsets.US_ASCII));
            out.write(responseBytes);
            out.flush();
        } catch (Throwable t) {
            // Ignore socket disconnects
        } finally {
            try { socket.close(); } catch (IOException ignored) {}
        }
    }

    private static String getStatusJson() {
        return "{" +
                "\"status\":\"ok\"," +
                "\"daemon\":\"pixelkit-hilight-daemon\"," +
                "\"version\":\"1.0.7\"," +
                "\"uid\":" + android.os.Process.myUid() + "," +
                "\"pid\":" + android.os.Process.myPid() + "," +
                "\"ledCount\":" + lightIds.size() + "," +
                "\"lightIds\":" + lightIds.toString() + "," +
                "\"isLit\":" + isLit + "," +
                "\"currentColor\":\"" + activeColor + "\"," +
                "\"mode\":\"" + activeMode + "\"," +
                "\"brightness\":" + activeBrightness +
                "}";
    }

    private static String handleSet(String jsonBody) {
        String colorHex = parseJsonString(jsonBody, "color", "#00E5FF");
        String mode = parseJsonString(jsonBody, "mode", "glow");
        float brightness = parseJsonFloat(jsonBody, "brightness", 1.0f);
        long durationMs = parseJsonLong(jsonBody, "durationMs", 0L);

        int argb = parseHexColor(colorHex, brightness);
        setAllLeds(argb, mode, colorHex, brightness, durationMs);

        return "{\"status\":\"ok\",\"appliedColor\":\"" + colorHex + "\",\"mode\":\"" + mode + "\"}";
    }

    private static void setAllLeds(int argb, String mode, String rawHex, float brightness, long durationMs) {
        synchronized (sessionLock) {
            try {
                if (autoOffTask != null) {
                    autoOffTask.cancel(false);
                    autoOffTask = null;
                }

                if (activeToken == null) {
                    activeToken = new Binder();
                    mOpenSession.invoke(lightsService, activeToken, 0);
                }

                int count = lightIds.size();
                int[] ids = new int[count];
                for (int i = 0; i < count; i++) ids[i] = lightIds.get(i);

                Object states = Array.newInstance(LightState.class, count);
                for (int i = 0; i < count; i++) {
                    LightState state = new LightState.Builder().setColor(argb).build();
                    Array.set(states, i, state);
                }

                mSetLightStates.invoke(lightsService, activeToken, ids, states);

                isLit = (argb != 0);
                activeColor = rawHex;
                activeMode = mode;
                activeBrightness = brightness;

                // Schedule auto off
                long timeout = (durationMs > 0) ? Math.min(durationMs, MAX_ACTIVE_HOLD_MS) : MAX_ACTIVE_HOLD_MS;
                autoOffTask = scheduler.schedule(() -> {
                    synchronized (sessionLock) {
                        performClear(true);
                    }
                }, timeout, TimeUnit.MILLISECONDS);

            } catch (Throwable t) {
                System.err.println("[PixelKit HiLightDaemon] Error setting lights: " + t.getMessage());
                t.printStackTrace();
            }
        }
    }

    private static void performClear(boolean closeSession) {
        synchronized (sessionLock) {
            try {
                if (autoOffTask != null) {
                    autoOffTask.cancel(false);
                    autoOffTask = null;
                }

                if (activeToken != null) {
                    int count = lightIds.size();
                    int[] ids = new int[count];
                    for (int i = 0; i < count; i++) ids[i] = lightIds.get(i);

                    // 1. Alpha-black write
                    Object alphaBlackStates = Array.newInstance(LightState.class, count);
                    for (int i = 0; i < count; i++) {
                        Array.set(alphaBlackStates, i, new LightState.Builder().setColor(0x01000000).build());
                    }
                    mSetLightStates.invoke(lightsService, activeToken, ids, alphaBlackStates);
                    Thread.sleep(25);

                    // 2. Canonical black write
                    Object canonicalBlackStates = Array.newInstance(LightState.class, count);
                    for (int i = 0; i < count; i++) {
                        Array.set(canonicalBlackStates, i, new LightState.Builder().setColor(0x00000000).build());
                    }
                    mSetLightStates.invoke(lightsService, activeToken, ids, canonicalBlackStates);

                    if (closeSession) {
                        mCloseSession.invoke(lightsService, activeToken);
                        activeToken = null;

                        // Stuck-LED mitigation passes at priority -1000
                        for (int pass = 0; pass < 2; pass++) {
                            IBinder cleanupToken = new Binder();
                            mOpenSession.invoke(lightsService, cleanupToken, -1000);
                            mSetLightStates.invoke(lightsService, cleanupToken, ids, canonicalBlackStates);
                            mCloseSession.invoke(lightsService, cleanupToken);
                            Thread.sleep(50);
                        }
                    }
                }

                isLit = false;
                activeMode = "off";
                activeColor = "#000000";
            } catch (Throwable t) {
                System.err.println("[PixelKit HiLightDaemon] Error clearing lights: " + t.getMessage());
            }
        }
    }

    private static int parseHexColor(String hex, float brightness) {
        try {
            String clean = hex.replace("#", "").trim();
            long val = Long.parseLong(clean, 16);
            int r, g, b;
            if (clean.length() == 6) {
                r = (int) ((val >> 16) & 0xFF);
                g = (int) ((val >> 8) & 0xFF);
                b = (int) (val & 0xFF);
            } else if (clean.length() == 8) {
                r = (int) ((val >> 16) & 0xFF);
                g = (int) ((val >> 8) & 0xFF);
                b = (int) (val & 0xFF);
            } else {
                return 0xFF00E5FF;
            }

            float clampB = Math.max(0.0f, Math.min(1.0f, brightness));
            int scaledR = Math.round(r * clampB);
            int scaledG = Math.round(g * clampB);
            int scaledB = Math.round(b * clampB);

            return (0xFF << 24) | (scaledR << 16) | (scaledG << 8) | scaledB;
        } catch (Throwable t) {
            return 0xFF00E5FF;
        }
    }

    private static String parseJsonString(String json, String key, String defaultVal) {
        if (json == null) return defaultVal;
        String search = "\"" + key + "\"";
        int idx = json.indexOf(search);
        if (idx == -1) return defaultVal;
        int colon = json.indexOf(':', idx + search.length());
        if (colon == -1) return defaultVal;
        int quoteStart = json.indexOf('"', colon + 1);
        if (quoteStart == -1) return defaultVal;
        int quoteEnd = json.indexOf('"', quoteStart + 1);
        if (quoteEnd == -1) return defaultVal;
        return json.substring(quoteStart + 1, quoteEnd);
    }

    private static float parseJsonFloat(String json, String key, float defaultVal) {
        if (json == null) return defaultVal;
        String search = "\"" + key + "\"";
        int idx = json.indexOf(search);
        if (idx == -1) return defaultVal;
        int colon = json.indexOf(':', idx + search.length());
        if (colon == -1) return defaultVal;
        int end = json.indexOf(',', colon);
        if (end == -1) end = json.indexOf('}', colon);
        if (end == -1) end = json.length();
        try {
            return Float.parseFloat(json.substring(colon + 1, end).trim());
        } catch (Throwable t) {
            return defaultVal;
        }
    }

    private static long parseJsonLong(String json, String key, long defaultVal) {
        if (json == null) return defaultVal;
        String search = "\"" + key + "\"";
        int idx = json.indexOf(search);
        if (idx == -1) return defaultVal;
        int colon = json.indexOf(':', idx + search.length());
        if (colon == -1) return defaultVal;
        int end = json.indexOf(',', colon);
        if (end == -1) end = json.indexOf('}', colon);
        if (end == -1) end = json.length();
        try {
            return Long.parseLong(json.substring(colon + 1, end).trim());
        } catch (Throwable t) {
            return defaultVal;
        }
    }
}
