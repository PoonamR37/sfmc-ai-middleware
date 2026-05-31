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
        const { prompt } = req.body || {};

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({
                error: "Invalid prompt"
            });
        }

        // =========================
        // TIMEOUT PROTECTION (SFMC SAFE)
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
                    temperature: 0.6,

                    messages: [
                        {
                            role: "system",
                            content: `
You are a senior email subject line optimization engine.

STRICT RULES:
- Output ONLY valid JSON
- No markdown
- No explanation
- No backticks
- Must start with { and end with }
- Always return 3 subject lines

OUTPUT SCHEMA:
{
  "recommendedSubject": "",
  "improvedSubjectLines": ["", "", ""],
  "reason": "",
  "expectedImpact": "High | Medium | Low",
  "scoreBoostEstimate": number
}

QUALITY RULES:
- Make subject lines short, punchy, marketing optimized
- Use urgency or curiosity
- Avoid spam triggers
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
        // HANDLE OPENAI FAILURE
        // =========================
        if (!response.ok) {

            const errText = await response.text();

            console.error("OPENAI ERROR:", errText);

            return res.status(500).json({
                recommendedSubject: "",
                improvedSubjectLines: [],
                reason: "OpenAI API failed",
                expectedImpact: "Low",
                scoreBoostEstimate: 0,
                debug: errText?.slice(0, 500)
            });
        }

        // =========================
        // PARSE RESPONSE
        // =========================
        const data = await response.json();

        let content = data?.choices?.[0]?.message?.content || "";

        // =========================
        // EMPTY CHECK
        // =========================
        if (!content || typeof content !== "string") {
            return res.status(500).json({
                recommendedSubject: "",
                improvedSubjectLines: [],
                reason: "Empty response from model",
                expectedImpact: "Low",
                scoreBoostEstimate: 0,
                debug: "No content returned"
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
        // SAFE JSON EXTRACTION
        // =========================
        const first = content.indexOf("{");
        const last = content.lastIndexOf("}");

        if (first === -1 || last === -1) {
            return res.status(500).json({
                recommendedSubject: "",
                improvedSubjectLines: [],
                reason: "Invalid JSON structure returned",
                expectedImpact: "Low",
                scoreBoostEstimate: 0,
                debug: content
            });
        }

        const clean = content.substring(first, last + 1);

        // =========================
        // FINAL PARSE
        // =========================
        let parsed;

        try {
            parsed = JSON.parse(clean);
        } catch (e) {

            parsed = {
                recommendedSubject: "",
                improvedSubjectLines: [],
                reason: "JSON parse error",
                expectedImpact: "Low",
                scoreBoostEstimate: 0,
                debug: content
            };
        }

        // =========================
        // FINAL SAFETY NORMALIZATION
        // =========================
        parsed.improvedSubjectLines =
            Array.isArray(parsed.improvedSubjectLines)
                ? parsed.improvedSubjectLines.slice(0, 3)
                : [];

        parsed.recommendedSubject =
            parsed.recommendedSubject || parsed.improvedSubjectLines[0] || "";

        parsed.expectedImpact =
            parsed.expectedImpact || "Medium";

        parsed.scoreBoostEstimate =
            Number(parsed.scoreBoostEstimate || 0);

        // =========================
        // RETURN SUCCESS
        // =========================
        return res.status(200).json(parsed);

    } catch (err) {

        console.error("FATAL ERROR:", err);

        return res.status(500).json({
            recommendedSubject: "",
            improvedSubjectLines: [],
            reason: "Unhandled server error",
            expectedImpact: "Low",
            scoreBoostEstimate: 0,
            debug: err.message
        });
    }
}
