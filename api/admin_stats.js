const { getClient, getTodayDate } = require('./db');

module.exports = async (req, res) => {
    // ✅ ✅ ✅ 補上 CORS（這就是你現在缺的）
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const ADMIN_KEY = process.env.ADMIN_KEY;
    const providedKey = req.query.key;

    if (providedKey !== ADMIN_KEY) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    let client;
    try {
        client = await getClient();
        const today = getTodayDate();

        // 🏆 修改後的 SQL 查詢
        const todayRes = await client.query(`
            SELECT COALESCE(count, 0) AS dailyCount
            FROM easycards
            WHERE date = $1
        `, [today]);

        // 處理當日計數 (如果沒有記錄，則為 0)
        // 注意：由於只查詢了一次，因此可能沒有 rows
        const dailyCount = todayRes.rows.length > 0 ? todayRes.rows[0].dailycount : 0;
        // dailyLimit 已被移除，無需定義

        // 查詢總數不變
        const totalRes = await client.query('SELECT SUM(count) AS totalCount FROM easycards');
        const totalCount = totalRes.rows[0].totalcount || 0;

        res.status(200).json({
            today,
            dailyCount,
            totalCount,
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        if (client) client.end();
    }
};
