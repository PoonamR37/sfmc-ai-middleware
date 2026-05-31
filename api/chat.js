export default async function handler(req, res) {

    // =========================
    // ALLOW ONLY POST
    // =========================
    if (req.method !== "POST") {
        return res.status(405).json({ error: "POST only" });
    }

    try {

        // =========================
        // INPUT NORMALIZATION
        // =========================
        const body = req.body || {};

        const prompt =
            body.prompt ||
            (body.emailContent
                ? `Analyze this email performance:

Email Content:
${body.emailContent}

Metrics:
${JSON.stringify(body.metrics || {}, null, 2)}`
                : null);

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ error: "Invalid prompt" });
        }

        // =========================
        // TIMEOUT PROTECTION
        // =========================
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        // =========================
        // OPENAI CALL
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
                    temperature: 0.2,

                    messages: [
                        {
                            role: "system",
                            content: `
You are a strict JSON generator.

ABSOLUTE RULES:
- Output ONLY valid JSON
- No markdown
- No explanation
- No extra text
- No code fences
- Output must start with { and end with }
- If unsure, still output valid JSON

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
                            content: prompt
                        }
                    ]
                })
            }
        );

        clearTimeout(timeout);

        // =========================
        // HANDLE OPENAI ERRORS
        // =========================
        if (!response.ok) {

            const errText = await response.text();

            console.error("OPENAI ERROR:", errText);

            return res.status(500).json({
                summary: "OpenAI Error",
                issue: errText?.slice(0, 500),
                recommendation: "Check OpenAI API key, quota, or model availability",
                performance: "Low",
                riskLevel: "High",
                score: 0
            });
        }

        // =========================
        // PARSE OPENAI RESPONSE
        // =========================
        const data = await response.json();

        let content = data?.choices?.[0]?.message?.content || "";

        if (!content || typeof content !== "string") {
            return res.status(500).json({
                summary: "Empty Response",
                issue: "OpenAI returned empty content",
                recommendation: "Check model behavior or prompt",
                performance: "Low",
                riskLevel: "High",
                score: 0
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
        const firstBrace = content.indexOf("{");
        const lastBrace = content.lastIndexOf("}");

        if (firstBrace === -1 || lastBrace === -1) {
            return res.status(500).json({
                summary: "Invalid Model Output",
                issue: "No JSON object detected in response",
                recommendation: "Fix prompt or model formatting",
                performance: "Low",
                riskLevel: "High",
                score: 0
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
                summary: "Parse Error",
                issue: "Invalid JSON structure returned by model",
                recommendation: "Improve prompt strictness",
                performance: "Avg",
                analysis: content,
                riskLevel: "Medium",
                score: 50
            };
        }

        // =========================
        // SUCCESS RESPONSE
        // =========================
        return res.status(200).json(parsed);

    } catch (err) {

        console.error("FATAL API ERROR:", err);

        return res.status(500).json({
            summary: "API Crash",
            issue: err.message,
            recommendation: "Check Vercel logs",
            performance: "Low",
            riskLevel: "High",
            score: 0
        });
    }
}
