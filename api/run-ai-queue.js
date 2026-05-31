export default async function handler(req, res) {

  // STEP 1: FETCH FROM SFMC (you will later replace with SFMC API call)
  const record = req.body;

  if (!record || !record.JobID) {
    return res.status(400).json({ error: "No JobID" });
  }

  // STEP 2: CALL OPENAI
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
          content: "Return ONLY JSON: summary, issue, recommendation, performance, score, riskLevel"
        },
        {
          role: "user",
          content: JSON.stringify(record)
        }
      ]
    })
  });

  const data = await response.json();

  let raw = data?.choices?.[0]?.message?.content || "{}";

  let ai;
  try {
    ai = JSON.parse(raw);
  } catch (e) {
    ai = {
      summary: raw,
      issue: "parse_error",
      recommendation: "",
      performance: "",
      score: 0,
      riskLevel: "High"
    };
  }

  // STEP 3: RETURN AI RESULT
  return res.status(200).json({
    jobId: record.JobID,
    ai
  });
}
