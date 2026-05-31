export default async function handler(req, res) {

    const { record } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4.1-mini",
            messages: [
                {
                    role: "system",
                    content: "Return ONLY JSON with summary, issue, recommendation, performance, analysis, riskLevel, score"
                },
                {
                    role: "user",
                    content: JSON.stringify(record)
                }
            ]
        })
    });

    const data = await response.json();

    const ai = JSON.parse(data.choices[0].message.content);

    return res.status(200).json(ai);
}
