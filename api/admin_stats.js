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

        const totalRes = await client.query('SELECT SUM(count) AS totalCount FROM easycards');
        const totalCount = totalRes.rows[0].totalcount || 0;

        res.status(200).json({
            today,
            dailyCount,
            totalCount,
            dailyLimit
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        if (client) client.end();
    }
};
