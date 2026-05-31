````javascript id="ohz13t"
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

                    temperature: 0.4,

                    messages: [

                        {
                            role: "system",

                            content: `
You are a senior email marketing copy optimizer.

Your job is to improve subject lines to increase open rates.

Return ONLY valid JSON. No markdown.

Schema:
{
  "currentAnalysis": "",
  "issues": "",
  "improvedSubjectLines": ["", "", ""],
  "recommendedSubject": "",
  "reason": "",
  "expectedImpact": "High | Medium | Low",
  "scoreBoostEstimate": number
}

Rules:
- Generate 3 improved subject lines
- Keep them under 60 characters
- Must increase curiosity, urgency, or relevance
- No spammy words
- Personalization allowed
- Score boost = estimated open rate improvement (0–30)
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
                currentAnalysis: "Parse error",
                issues: "Invalid model output",
                improvedSubjectLines: [],
                recommendedSubject: "",
                reason: content,
                expectedImpact: "Low",
                scoreBoostEstimate: 0
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
                    error: err.message
                })
            );
    }
}
````
