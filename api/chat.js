export default async function handler(req, res) {

    // =========================
    // POST ONLY
    // =========================
    if (req.method !== "POST") {

        return res.status(405).json({
            error: "POST only"
        });

    }

    try {

        // =========================
        // ACCEPT BOTH FORMATS
        // =========================
        const {
            prompt,
            emailContent,
            metrics
        } = req.body || {};

        let finalPrompt = "";

        // OLD FORMAT SUPPORT
        if (prompt) {

            finalPrompt = prompt;

        }

        // NEW FORMAT SUPPORT
        else if (emailContent || metrics) {

            finalPrompt =
`
Analyze this email campaign.

Email Content:
${emailContent || ""}

Metrics:
${JSON.stringify(metrics || {})}

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

        }

        // INVALID INPUT
        else {

            return res.status(400).json({
                error: "Invalid payload"
            });

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
                    "Authorization":
                        `Bearer ${process.env.OPENAI_API_KEY}`
                },

                body: JSON.stringify({

                    model: "gpt-4.1-mini",

                    temperature: 0.2,

                    messages: [

                        {
                            role: "system",

                            content:
`
You are a strict email analytics engine.

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
        // OPENAI ERROR
        // =========================
        if (!response.ok) {

            const errText =
                await response.text();

            return res.status(500).json({

                summary: "OpenAI Error",

                issue: errText,

                recommendation:
                    "Check OpenAI response",

                performance: "Low",

                analysis: "",

                riskLevel: "High",

                score: 0
            });

        }

        // =========================
        // GET CONTENT
        // =========================
        const data =
            await response.json();

        let content =
            data?.choices?.[0]?.message?.content || "";

        // =========================
        // REMOVE MARKDOWN
        // =========================
        content = content
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        // =========================
        // SAFE JSON PARSE
        // =========================
        let parsed;

        try {

            parsed = JSON.parse(content);

        } catch(e) {

            parsed = {

                summary: "Parse Error",

                issue:
                    "Invalid JSON returned",

                recommendation:
                    "Fix AI formatting",

                performance: "Avg",

                analysis: content,

                riskLevel: "Medium",

                score: 50
            };

        }

        // =========================
        // SUCCESS
        // =========================
        return res.status(200).json(parsed);

    } catch(err) {

        return res.status(500).json({

            summary: "API Error",

            issue: err.message,

            recommendation:
                "Check Vercel logs",

            performance: "Low",

            analysis: "",

            riskLevel: "High",

            score: 0
        });

    }
}
