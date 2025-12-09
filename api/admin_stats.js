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

        // 🎯 【關鍵修改點 1】查詢所有日期的發放數量，按日期排序
        const allDaysRes = await client.query(`
            SELECT date, count
            FROM easycards
            ORDER BY date DESC;
        `);

        const dailyStats = allDaysRes.rows; // 這是我們需要的每日數據列表

        // 查詢總數不變
        const totalRes = await client.query('SELECT SUM(count) AS totalCount FROM easycards');
        const totalCount = totalRes.rows[0].totalcount || 0;

        // 🎯 【關鍵修改點 2】調整回應數據結構
        res.status(200).json({
            today, // 伺服器今日日期
            dailyStats: dailyStats, // 傳送每日數據列表
            totalCount: totalCount, // 總數量
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        if (client) client.end();
    }
};
