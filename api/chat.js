````javascript
export default async function handler(req, res) {

    // =========================
    // ALLOW ONLY POST
    // =========================
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "POST only"
        });
    }

    try {

        const { prompt } = req.body;

        // =========================
        // VALIDATE PROMPT
        // =========================
        if (!prompt || typeof prompt !== "string") {

            return res.status(400).json({
                error: "Invalid prompt"
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

2. riskLevel MUST be ONLY:
   "Low", "Medium", "High"

3. score MUST be a number between 0–100

SCORING LOGIC:
- 80–100 → High performance, Low risk
- 50–79 → Avg performance, Medium risk
- 0–49 → Low performance, High risk
`
                        },

                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                })
            }
        );

        // =========================
        // OPENAI RESPONSE
        // =========================
        const data = await response.json();

        console.log(
            "OPENAI RAW RESPONSE:",
            JSON.stringify(data)
        );

        // =========================
        // VALIDATE RESPONSE
        // =========================
        if (
            !data ||
            !data.choices ||
            !data.choices[0] ||
            !data.choices[0].message
        ) {

            return res.status(500).send(
                JSON.stringify({
                    error: "Invalid OpenAI response",
                    raw: data
                })
            );
        }

        // =========================
        // EXTRACT CONTENT
        // =========================
        let content =
            data.choices[0].message.content || "";

        content = content
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        // =========================
        // SAFE PARSE
        // =========================
        let parsed;

        try {

            parsed = JSON.parse(content);

        } catch (e) {

            parsed = {
                summary: "Parse Error",
                issue: "Invalid JSON from model",
                recommendation:
                    "Check prompt or model response",
                performance: "Avg",
                analysis: content,
                riskLevel: "Medium",
                score: 50
            };
        }

        // =========================
        // RETURN STRINGIFIED JSON
        // =========================
        return res
            .status(200)
            .send(JSON.stringify(parsed));

    } catch (err) {

        return res
            .status(500)
            .send(
                JSON.stringify({
                    summary: "API Error",
                    issue: err.message,
                    recommendation: "Check Vercel logs",
                    performance: "Low",
                    analysis: "",
                    riskLevel: "High",
                    score: 0
                })
            );
    }
}
````
