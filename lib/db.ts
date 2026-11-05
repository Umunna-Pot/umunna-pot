import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DB = process.env.MONGODB_DB || "umunna_pot"

declare global {
  // eslint-disable-next-line no-var
  var mongooseConnection:
    | {
        conn: typeof import("mongoose") | null
        promise: Promise<typeof import("mongoose")> | null
      }
    | undefined
}

const cached = global.mongooseConnection || { conn: null, promise: null }
global.mongooseConnection = cached

export async function dbConnect(): Promise<typeof import("mongoose") | null> {
  if (!MONGODB_URI) {
    console.warn("[MongoDB] MONGODB_URI not defined, operating in detached mode")
    return null
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      dbName: MONGODB_DB,
      maxPoolSize: 4,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        console.log("[MongoDB] Connected successfully to", MONGODB_DB)
        return m
      })
      .catch((err) => {
        console.error("[MongoDB] Connection error:", err)
        cached.promise = null
        throw err
      })
  }

  try {
    cached.conn = await cached.promise
    return cached.conn
  } catch (error) {
    cached.promise = null
    console.error("[MongoDB] Failed to resolve connection:", error)
    return null
  }
}

