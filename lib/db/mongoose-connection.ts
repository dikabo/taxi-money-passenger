import mongoose from 'mongoose';

/**
 * Fichier: /lib/db/mongoose-connection.ts
 * Objectif: Gère une connexion Mongoose mise en cache.
 */

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Veuillez définir la variable MONGODB_URI dans votre .env.local'
  );
}

// @ts-expect-error global.mongoose does not exist on type 'Global'
let cached = global.mongoose;

if (!cached) {
  // @ts-expect-error global.mongoose does not exist on type 'Global'
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;