export default async function handler(req, res) {

    // Allow only POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "POST only" });
    }

    try {

        const { prompt } = req.body;

        // =========================
        // CALL OPENAI
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
                        content: `
You are a data analyst.

Return ONLY valid JSON. No markdown. No explanations.

Schema:
{
  "summary": "",
  "issue": "",
  "recommendation": "",
  "performance": "High | Avg | Risk",
  "analysis": "",
  "riskLevel": "Low | Medium | High",
  "score": number
}
                        `
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
        // EXTRACT CONTENT
        // =========================
        let content = data.choices?.[0]?.message?.content || "";

        // CLEAN (just in case model adds formatting)
        content = content
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        // =========================
        // PARSE JSON SAFELY
        // =========================
        let parsed;

        try {
            parsed = JSON.parse(content);
        } catch (e) {
            // fallback safety
            parsed = {
                summary: "Parse Error",
                issue: "Invalid JSON from model",
                recommendation: "Fix prompt or model output",
                performance: "Avg",
                analysis: content,
                riskLevel: "Medium",
                score: 50
            };
        }

        // =========================
        // FINAL RESPONSE (IMPORTANT)
        // =========================
        return res.status(200).json(parsed);

    } catch (err) {
        return res.status(500).json({
            summary: "API Error",
            issue: err.message,
            recommendation: "Check Vercel logs",
            performance: "Risk",
            analysis: "",
            riskLevel: "High",
            score: 0
        });
    }
}
