// api/db.js
const { Client } = require('pg');

// 注意：在 Vercel 中，連接資訊應該從環境變數 (process.env) 獲取，而不是硬編碼！
// 這裡僅用於示範結構。
const connectionString = process.env.DATABASE_URL; 

// 獲取今天的日期 (YYYY-MM-DD)
exports.getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

// 建立資料庫客戶端並連接
exports.getClient = async () => {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Supabase 連接通常需要 SSL
    });
    await client.connect();
    return client;
};