// api/redeem.js
const { getClient, getTodayDate } = require('./db');

module.exports = async (req, res) => {
    // 允許跨域請求
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    let client;
    try {
        client = await getClient();
        const today = getTodayDate();

        // 使用 SQL 事務和 RETURNING 來確保原子性、並發安全和一次性操作
        const redeemQuery = `
            WITH upsert AS (
                INSERT INTO coupons (date, count, daily_limit)
                VALUES ($1, 1, 100) 
                ON CONFLICT (date) DO UPDATE 
                SET count = coupons.count + 1 
                WHERE coupons.count < 100 
                RETURNING count, daily_limit
            )
            SELECT * FROM upsert
            UNION ALL
            SELECT count, daily_limit FROM coupons WHERE date = $1 AND count = 100;
        `;

        const result = await client.query(redeemQuery, [today]);
        
        // 檢查是否因為超過 100 限制而未能新增
        if (result.rows.length === 0 || result.rows[0].count > result.rows[0].daily_limit) {
            // 這部分邏輯稍微複雜，但簡單來說，如果 SQL 沒更新，表示超過了限制
            return res.status(403).json({ success: false, message: '今日 100 張悠遊卡已全數發放完畢，請明日再來！' });
        }
        
        const newDailyCount = result.rows[0].count;
        const dailyLimit = result.rows[0].daily_limit;
        
        // (可選) 重新查詢總數給前端參考
        const totalRes = await client.query('SELECT SUM(count) AS totalCount FROM coupons');
        const totalCount = totalRes.rows[0].totalcount || 0;


        res.status(200).json({ 
            success: true, 
            message: '悠遊卡兌換成功！', 
            dailyCount: newDailyCount,
            dailyLimit: dailyLimit,
            totalCount: totalCount
        });

    } catch (error) {
        console.error('Error during redemption:', error);
        res.status(500).json({ success: false, message: '兌換失敗：伺服器處理錯誤。' });
    } finally {
        if (client) client.end();
    }
};