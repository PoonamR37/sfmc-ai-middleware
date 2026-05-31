export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const ai = req.body;

  const sfmcResp = await fetch(
    "https://YOUR_SFMC_SOAP_OR_REST_ENDPOINT",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(ai)
    }
  );

  return res.status(200).json({
    success: true,
    message: "Written to SFMC",
    ai
  });
}
