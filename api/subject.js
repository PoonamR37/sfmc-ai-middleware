export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ error: "POST only" });
    }

    try {

        const { prompt } = req.body;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
- No spammy words (FREE, BUY NOW spam style)
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
        });

        const data = await response.json();

        let content = data.choices?.[0]?.message?.content || "";

        content = content
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

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

        return res.status(200).json(parsed);

    } catch (err) {

        return res.status(500).json({
            error: err.message
        });

    }
}
