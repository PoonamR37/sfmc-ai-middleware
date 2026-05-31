export default async function handler(req, res) {

    const { record, ai } = req.body;

    await fetch("https://YOUR-SFMC-ENDPOINT", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            JobID: record.JobID,
            AI_Summary: ai.summary,
            AI_Issue: ai.issue,
            AI_Recommendation: ai.recommendation,
            AI_Performance: ai.performance,
            AI_Analysis: ai.analysis,
            AI_RiskLevel: ai.riskLevel,
            AI_Score: ai.score
        })
    });

    return res.status(200).json({ success: true });
}
