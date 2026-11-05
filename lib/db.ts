import mongoose from "mongoose"

declare global {
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
  const uri = process.env.MONGODB_URI?.trim()
  const dbName = process.env.MONGODB_DB?.trim() || "umunna_pot"

  if (!uri) {
    console.warn("[MongoDB] MONGODB_URI not defined, operating in detached mode")
    return null
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn
  }

  if (cached.conn && mongoose.connection.readyState !== 1) {
    cached.conn = null
    cached.promise = null
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      dbName,
      maxPoolSize: 4,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }

    cached.promise = mongoose
      .connect(uri, opts)
      .then((m) => {
        console.log("[MongoDB] Connected successfully to", dbName)
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
