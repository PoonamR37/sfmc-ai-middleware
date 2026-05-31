export default async function handler(req, res) {

    try {

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

                    messages: [
                        {
                            role: "user",
                            content:
                                "Return ONLY valid JSON with key message and value hello"
                        }
                    ],

                    temperature: 0
                })
            }
        );

        const data = await response.json();

        let content =
    data?.choices?.[0]?.message?.content || "";

content = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

return res.status(200).json({
    raw: content
});

    } catch(err) {

        return res.status(500).json({
            error: err.message
        });

    }
}
