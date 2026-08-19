import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

// Auto-load .env if not already populated in current process
if (!process.env.MONGODB_URI) {
  try {
    if (typeof process.loadEnvFile === "function") {
      process.loadEnvFile();
    }
  } catch {
    // Ignore in bundled Next.js runtime where env is injected
  }
}

/**
 * Resolves mongodb+srv:// URIs using DNS-over-HTTPS (DoH) to prevent
 * ECONNREFUSED errors on Windows / restricted ISP networks where UDP port 53 is blocked.
 */
async function resolveMongoUri(uri: string): Promise<string> {
  if (!uri || !uri.startsWith("mongodb+srv://")) {
    return uri;
  }

  try {
    const match = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?$/);
    if (!match) return uri;

    const [, user, pass, host, dbPath = "/resume_screening_saas", queryParams = ""] = match;

    // Fetch SRV records via DNS-over-HTTPS (port 443 HTTPS - always allowed)
    const srvRes = await fetch(`https://dns.google/resolve?name=_mongodb._tcp.${host}&type=SRV`, {
      signal: AbortSignal.timeout(6000),
    });
    const srvJson = (await srvRes.json()) as any;

    if (srvJson.Answer && Array.isArray(srvJson.Answer) && srvJson.Answer.length > 0) {
      const hosts = srvJson.Answer.map((ans: any) => {
        const parts = String(ans.data).split(" ");
        const port = parts[2] || "27017";
        const target = (parts[3] || "").replace(/\.$/, "");
        return `${target}:${port}`;
      }).join(",");

      // Fetch TXT record for replicaSet name and authSource
      let extraParams = "ssl=true&authSource=admin";
      try {
        const txtRes = await fetch(`https://dns.google/resolve?name=${host}&type=TXT`, {
          signal: AbortSignal.timeout(4000),
        });
        const txtJson = (await txtRes.json()) as any;
        if (txtJson.Answer && txtJson.Answer[0]?.data) {
          const txtData = String(txtJson.Answer[0].data).replace(/^"|"$/g, "");
          extraParams = `ssl=true&${txtData}`;
        }
      } catch {
        // Use default SSL/authSource
      }

      const cleanDb = dbPath && dbPath !== "/" ? dbPath : "/resume_screening_saas";
      const existingParams = queryParams ? queryParams.replace(/^\?/, "&") : "";
      const directUri = `mongodb://${encodeURIComponent(decodeURIComponent(user))}:${encodeURIComponent(decodeURIComponent(pass))}@${hosts}${cleanDb}?${extraParams}${existingParams}`;
      return directUri;
    }
  } catch (err) {
    console.warn("[MongoDB] DoH SRV pre-resolution skipped, falling back to direct connection:", err);
  }

  return uri;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env"
    );
  }

  // Return existing active connection if already established and healthy (readyState === 1: connected)
  if (cached?.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If connection is disconnected (0) or disconnecting (3), reset cached promise to force fresh connection
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    cached!.conn = null;
    cached!.promise = null;
  }

  if (!cached!.promise) {
    cached!.promise = (async () => {
      const resolvedUri = await resolveMongoUri(MONGODB_URI);

      const opts: mongoose.ConnectOptions = {
        bufferCommands: true, // Enable Mongoose command buffering so queries wait safely during handshake
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 12000,
        socketTimeoutMS: 45000,
        family: 4, // Force IPv4 for fast, reliable connection
      };

      return mongoose.connect(resolvedUri, opts);
    })();
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    cached!.conn = null;
    throw e;
  }

  return cached!.conn;
}

export default connectToDatabase;
