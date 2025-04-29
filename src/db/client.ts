import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

let client: Client;

export async function getClient() {
  if (!client) {
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: true
      }
    });
    await client.connect();
  }
  return client;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (client) {
    await client.end();
  }
  process.exit(0);
});
