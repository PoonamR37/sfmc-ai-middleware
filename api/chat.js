export default async function handler(req, res) {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    const data = await response.json();

    return res.status(200).json({
      status: "API KEY WORKING",
      models: data
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
}
