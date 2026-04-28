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
        messages: [
          {
            role: "system",
            content: "Return ONLY valid JSON. No markdown. No backticks. No explanation. Output must be raw JSON object."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3
      })
    });

    const data = await response.json();

    // 🔥 EXTRACT CLEAN CONTENT
    let content = data.choices?.[0]?.message?.content || "";

    // 🔥 HARD CLEAN (remove markdown if model still adds it)
    content = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // 🔥 RETURN CLEAN STRUCTURE FOR SFMC
    return res.status(200).json({
      answer: content
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
