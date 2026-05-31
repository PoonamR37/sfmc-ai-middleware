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
        // VALIDATE INPUT
        // =========================
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({
                error: "Invalid prompt"
            });
        }

        // =========================
        // OPENAI REQUEST
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

                    temperature: 0.4,

                    messages: [
                        {
                            role: "system",

                            content: `
You are a senior email marketing copy optimizer.

Return ONLY valid JSON.

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
        // HANDLE FAILURES
        // =========================
        if (!response.ok) {

            const errText = await response.text();

            return res.status(500).json({
                currentAnalysis: "API Error",
                issues: errText,
                improvedSubjectLines: [],
                recommendedSubject: "",
                reason: "OpenAI request failed",
                expectedImpact: "Low",
                scoreBoostEstimate: 0
            });
        }

        // =========================
        // PARSE RESPONSE
        // =========================
        const data = await response.json();

        let content =
            data?.choices?.[0]?.message?.content || "";

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
                issues: "Invalid JSON output",
                improvedSubjectLines: [],
                recommendedSubject: "",
                reason: content,
                expectedImpact: "Low",
                scoreBoostEstimate: 0
            };
        }

        // =========================
        // SUCCESS
        // =========================
        return res.status(200).json(parsed);

    } catch (err) {

        return res.status(500).json({
            currentAnalysis: "Server Error",
            issues: err.message,
            improvedSubjectLines: [],
            recommendedSubject: "",
            reason: "",
            expectedImpact: "Low",
            scoreBoostEstimate: 0
        });
    }
}
