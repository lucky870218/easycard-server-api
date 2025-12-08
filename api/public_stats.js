const { getClient, getTodayDate } = require('./db');

module.exports = async (req, res) => {
    // ✅ CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
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

        res.status(200).json({
            today,
            dailyCount,
            dailyLimit
        });

    } catch (error) {
        console.error('Error fetching public stats:', error);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        if (client) client.end();
    }
};
