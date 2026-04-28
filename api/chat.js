export default async function handler(req, res) {

    // =========================
    // CORS (OPTIONAL BUT SAFE)
    // =========================
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight request
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "POST only" });
    }

    try {

        const { prompt } = req.body;

        // =========================
        // OPENAI CALL
        // =========================
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4.1-mini",
                messages: [
                    {
                        role: "system",
                        content: "Return ONLY valid JSON. No markdown. No backticks. No explanation. Output must be a clean JSON object with keys: summary, issue, recommendation, performance, analysis, riskLevel, score."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.3
            })
        });

        const data = await response.json();

        // =========================
        // EXTRACT AI RESPONSE
        // =========================
        let content = data.choices?.[0]?.message?.content || "";

        // CLEAN ANY MARKDOWN JUST IN CASE
        content = content
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        // =========================
        // RETURN CLEAN OUTPUT TO SFMC
        // =========================
        return res.status(200).json({
            answer: content
        });

    } catch (err) {
        return res.status(500).json({
            error: err.message
        });
    }
}
