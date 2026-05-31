export default async function handler(req, res) {

    // =========================
    // POST ONLY
    // =========================
    if (req.method !== "POST") {
        return res.status(405).json({ error: "POST only" });
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
        // TIMEOUT PROTECTION (CRITICAL FOR SFMC)
        // =========================
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        // =========================
        // OPENAI REQUEST
        // =========================
        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                signal: controller.signal,
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

STRICT RULES:
- Output ONLY valid JSON
- No markdown
- No explanation
- No code fences
- Output must start with { and end with }
- If unsure, still return valid JSON

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

        clearTimeout(timeout);

        // =========================
        // HANDLE OPENAI FAILURES
        // =========================
        if (!response.ok) {

            const errText = await response.text();

            console.error("OPENAI ERROR:", errText);

            return res.status(500).json({
                currentAnalysis: "OpenAI Error",
                issues: errText?.slice(0, 500),
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

        let content = data?.choices?.[0]?.message?.content || "";

        // =========================
        // EMPTY RESPONSE GUARD
        // =========================
        if (!content || typeof content !== "string") {
            return res.status(500).json({
                currentAnalysis: "Empty Response",
                issues: "No content returned from model",
                improvedSubjectLines: [],
                recommendedSubject: "",
                reason: "OpenAI returned empty output",
                expectedImpact: "Low",
                scoreBoostEstimate: 0
            });
        }

        // =========================
        // CLEAN RESPONSE
        // =========================
        content = content
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        // =========================
        // SAFE JSON EXTRACTION (IMPORTANT)
        // =========================
        const firstBrace = content.indexOf("{");
        const lastBrace = content.lastIndexOf("}");

        if (firstBrace === -1 || lastBrace === -1) {
            return res.status(500).json({
                currentAnalysis: "Invalid Output",
                issues: "No JSON object found in model response",
                improvedSubjectLines: [],
                recommendedSubject: "",
                reason: "Model did not return valid JSON structure",
                expectedImpact: "Low",
                scoreBoostEstimate: 0
            });
        }

        const cleanJson = content.substring(firstBrace, lastBrace + 1);

        // =========================
        // SAFE PARSE
        // =========================
        let parsed;

        try {
            parsed = JSON.parse(cleanJson);
        } catch (e) {

            parsed = {
                currentAnalysis: "Parse Error",
                issues: "Invalid JSON returned by model",
                improvedSubjectLines: [],
                recommendedSubject: "",
                reason: content,
                expectedImpact: "Low",
                scoreBoostEstimate: 0
            };
        }

        // =========================
        // SUCCESS RESPONSE
        // =========================
        return res.status(200).json(parsed);

    } catch (err) {

        console.error("FATAL ERROR:", err);

        return res.status(500).json({
            currentAnalysis: "Server Error",
            issues: err.message,
            improvedSubjectLines: [],
            recommendedSubject: "",
            reason: "Unhandled exception",
            expectedImpact: "Low",
            scoreBoostEstimate: 0
        });
    }
}
