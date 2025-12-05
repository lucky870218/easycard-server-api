// api/stats.js
const { getClient, getTodayDate } = require('./db');

// Vercel Serverless Function 導出
module.exports = async (req, res) => {
    // 簡單 Admin Key 驗證 (請在 Vercel 環境變數中設定 ADMIN_KEY)
    const ADMIN_KEY = process.env.ADMIN_KEY;
    const providedKey = req.query.key; 

    if (providedKey !== ADMIN_KEY) {
        return res.status(401).send('Unauthorized');
    }

    let client;
    try {
        client = await getClient();
        const today = getTodayDate();

        // 查詢今日數量 (如果今天沒有紀錄，用 COALESCE 返回 0)
        const todayRes = await client.query(`
            SELECT COALESCE(count, 0) AS dailyCount, daily_limit 
            FROM easycards 
            WHERE date = $1
            UNION ALL 
            SELECT 0, 100 
            WHERE NOT EXISTS (SELECT 1 FROM easycards WHERE date = $1)
            LIMIT 1;
        `, [today]);
        
        const dailyCount = todayRes.rows[0].dailycount;
        const dailyLimit = todayRes.rows[0].daily_limit;

        // 查詢總數量
        const totalRes = await client.query('SELECT SUM(count) AS totalCount FROM easycards');
        const totalCount = totalRes.rows[0].totalcount || 0;

        res.status(200).json({
            today: today,
            dailyCount,
            totalCount,
            dailyLimit
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).send('Server Error');
    } finally {
        if (client) client.end();
    }
};