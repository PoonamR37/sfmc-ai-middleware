export default async function handler(req, res) {

    // =========================
    // POST ONLY
    // =========================
    if (req.method !== "POST") {
        return res.status(405).json({ error: "POST only" });
    }

    try {

        // =========================
        // INPUT
        // =========================
        const { prompt, emailContent, metrics } = req.body || {};

        let finalPrompt = "";

        if (prompt) {

            finalPrompt = prompt;

        } else if (emailContent || metrics) {

            finalPrompt = `
Analyze this email campaign.

Email Content:
${emailContent || ""}

Metrics:
${JSON.stringify(metrics || {}, null, 2)}

Return ONLY valid JSON.

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
`;

        } else {

            return res.status(400).json({ error: "Invalid payload" });

        }

        // =========================
        // OPENAI CALL
        // =========================
        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4.1-mini",
                    temperature: 0.2,
                    messages: [
                        {
                            role: "system",
                            content: `
You are a strict email analytics engine.

Return ONLY valid JSON. No markdown. No code fences.

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
`
                        },
                        {
                            role: "user",
                            content: finalPrompt
                        }
                    ]
                })
            }
        );

        // =========================
        // OPENAI ERROR HANDLING
        // =========================
        if (!response.ok) {

            const errText = await response.text();

            return res.status(500).json({
                summary: "OpenAI Error",
                issue: errText,
                recommendation: "Check OpenAI logs",
                performance: "Low",
                analysis: "",
                riskLevel: "High",
                score: 0
            });

        }

        // =========================
        // RAW RESPONSE
        // =========================
        const data = await response.json();

        let content = data?.choices?.[0]?.message?.content || "";

        // =========================
        // CLEAN OUTPUT
        // =========================
        content = content
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        // =========================
        // SAFE PARSE (HARDENED)
        // =========================
        let parsed;

        try {

            parsed = JSON.parse(content);

        } catch (e) {

            // 🔥 fallback extraction (prevents total failure)
            parsed = {
                summary: "Parse Error",
                issue: "AI returned invalid JSON",
                recommendation: "Check model output formatting",
                performance: "Avg",
                analysis: content,
                riskLevel: "Medium",
                score: 50
            };

        }

        // =========================
        // FINAL GUARANTEE (IMPORTANT)
        // =========================
        return res.status(200).json({

            summary: parsed.summary || "",
            issue: parsed.issue || "",
            recommendation: parsed.recommendation || "",
            performance: parsed.performance || "Avg",
            analysis: parsed.analysis || "",
            riskLevel: parsed.riskLevel || "Medium",
            score: Number(parsed.score || 0)

        });

    } catch (err) {

        return res.status(500).json({
            summary: "API Error",
            issue: err.message,
            recommendation: "Check server logs",
            performance: "Low",
            analysis: "",
            riskLevel: "High",
            score: 0
        });

    }
}
