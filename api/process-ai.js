export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const {
    JobID,
    EmailName,
    OpenRate,
    ClickRate,
    TotalSent
  } = req.body;

  if (!JobID) {
    return res.status(400).json({ error: "Missing JobID" });
  }

  const prompt = `
Analyze this email campaign:

Email: ${EmailName}
OpenRate: ${OpenRate}
ClickRate: ${ClickRate}
TotalSent: ${TotalSent}

Return JSON only:
{
  "summary": "",
  "issue": "",
  "recommendation": "",
  "performance": "",
  "score": number,
  "riskLevel": ""
}
`;

  const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Return ONLY valid JSON." },
        { role: "user", content: prompt }
      ]
    })
  });

  const data = await openaiResp.json();
  let raw = data.choices?.[0]?.message?.content || "{}";

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    parsed = {
      summary: raw,
      issue: "parse_error",
      recommendation: "",
      performance: "",
      score: 0,
      riskLevel: "High"
    };
  }

  return res.status(200).json(parsed);
}
