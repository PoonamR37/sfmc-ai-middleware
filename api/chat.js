export default async function handler(req, res) {

    // Allow only POST
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
                temperature: 0.2, // 🔥 improves consistency
                messages: [
                    {
                        role: "system",
                        content: `
You are a strict email performance analytics engine.

Return ONLY valid JSON. No markdown. No explanations.

You MUST follow these rules exactly:

Schema:
{
  "summary": "",
  "issue": "",
  "recommendation": "",
  "performance": "High | Avg | Low",
  "analysis": "",
  "riskLevel": "Low | Medium | High",
  "score": number
}

STRICT RULES:

1. performance MUST be ONLY:
   "High", "Avg", or "Low"
   ❌ NEVER: "Risk", "Good", "Bad", etc.

2. riskLevel MUST be ONLY:
   "Low", "Medium", "High"

3. score MUST be a number between 0–100

SCORING LOGIC:
- 80–100 → High performance, Low risk
- 50–79 → Avg performance, Medium risk
- 0–49 → Low performance, High risk

If uncertain, choose closest valid category — NEVER free text.
`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        });

        const data = await response.json();

        // =========================
        // EXTRACT RESPONSE
        // =========================
        let content = data.choices?.[0]?.message?.content || "";

        // Clean formatting just in case
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
            parsed = {
                summary: "Parse Error",
                issue: "Invalid JSON from model",
                recommendation: "Check prompt or model response",
                performance: "Avg",
                analysis: content,
                riskLevel: "Medium",
                score: 50
            };
        }

        // =========================
        // FINAL RESPONSE
        // =========================
        return res.status(200).json(parsed);

    } catch (err) {

        return res.status(500).json({
            summary: "API Error",
            issue: err.message,
            recommendation: "Check Vercel logs",
            performance: "Low",
            analysis: "",
            riskLevel: "High",
            score: 0
        });

    }
}
