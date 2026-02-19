
const { Client } = require('pg');
require('dotenv').config();

async function testConnection(name, connectionString) {
    if (!connectionString) {
        console.log(`[${name}] SKIP: Connection string not found.`);
        return;
    }
    console.log(`[${name}] Testing connection...`);
    // Mask password for display
    const masked = connectionString.replace(/:([^:@]+)@/, ':****@');
    console.log(`[${name}] URL: ${masked}`);

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase
    });

    try {
        await client.connect();
        const res = await client.query('SELECT NOW()');
        console.log(`[${name}] SUCCESS! Connected. Time: ${res.rows[0].now}`);
        await client.end();
        return true;
    } catch (err) {
        console.error(`[${name}] FAILED: ${err.message}`);
        if (err.message.includes('password')) {
            console.error(`[${name}] HINT: Check if the password in .env is correct.`);
        }
        await client.end();
        return false;
    }
}

async function run() {
    console.log('--- Database Connection Test ---');
    const directSuccess = await testConnection('MIGRATIONS (Direct 5432)', process.env.DATABASE_URL);
    const poolerSuccess = await testConnection('APP (Pooler 6543)', process.env.DATABASE_URL_POOLING);

    if (directSuccess && poolerSuccess) {
        console.log('\n✅ All connections successful.');
    } else {
        console.log('\n❌ Some connections failed.');
    }
}

run();
