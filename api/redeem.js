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

        // **修改後的 SQL 查詢**：移除 100 張限制檢查，只進行計數增加 (原子性)
        const redeemQuery = `
            INSERT INTO easycards (date, count)
            VALUES ($1, 1) 
            ON CONFLICT (date) DO UPDATE 
            SET count = easycards.count + 1 
            RETURNING count;
        `;

        const result = await client.query(redeemQuery, [today]);
        
        // 由於不再有限制檢查，這裡一定會有結果
        if (result.rows.length === 0) {
            // 這是一個極不可能發生的情況，但作為錯誤處理
             throw new Error("SQL update failed without error.");
        }

        const newDailyCount = result.rows[0].count;
        // dailyLimit 變為 'N/A' 或一個很大的數，因為沒有限制
        const dailyLimit = '無限制'; 
        
        // (可選) 重新查詢總數給前端參考
        const totalRes = await client.query('SELECT SUM(count) AS totalCount FROM easycards');
        const totalCount = totalRes.rows[0].totalcount || 0;


        res.status(200).json({ 
            success: true, 
            message: '悠遊卡兌換成功！', 
            dailyCount: newDailyCount,
            dailyLimit: dailyLimit, // 傳回無限制
            totalCount: totalCount
        });

    } catch (error) {
        console.error('Error during redemption:', error);
        res.status(500).json({ success: false, message: '兌換失敗：伺服器處理錯誤。' });
    } finally {
        if (client) client.end();
    }
};