export default async function handler(req, res) {

    // STEP 1: GET DATA FROM SFMC
    const record = req.body;

    if (!record) {
        return res.status(400).json({
            error: "No record received"
        });
    }

    try {

        // STEP 2: CALL OPENAI
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
                            content: "Return ONLY JSON with keys: summary, issue, recommendation, performance, analysis, riskLevel, score"
                        },
                        {
                            role: "user",
                            content: JSON.stringify(record)
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        // STEP 3: EXTRACT AI RESPONSE
        const aiText = data?.choices?.[0]?.message?.content || "{}";

        let ai;

        try {
            ai = JSON.parse(aiText);
        } catch (e) {
            ai = {
                summary: "parse_error",
                issue: "invalid_json_from_openai",
                recommendation: "",
                performance: "Low",
                analysis: aiText,
                riskLevel: "High",
                score: 0
            };
        }

        // STEP 4: RETURN TO SFMC
        return res.status(200).json(ai);

    } catch (err) {

        return res.status(500).json({
            summary: "error",
            issue: err.message,
            recommendation: "",
            performance: "Low",
            analysis: "",
            riskLevel: "High",
            score: 0
        });
    }
}
