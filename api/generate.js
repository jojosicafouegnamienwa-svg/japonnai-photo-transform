export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { photo, reference, description } = req.body;

    if (!photo || !reference || !description) {
      return res.status(400).json({
        error: "Photo, référence et description sont obligatoires."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY n'est pas configurée dans Vercel."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Utilise la première image comme photo principale de la personne et la deuxième comme référence visuelle.

Transformation demandée :
${description}

Conserve l'identité et les traits du visage de la personne de la première image autant que possible. Utilise la deuxième image uniquement comme référence pour la transformation demandée. Génère une nouvelle image réaliste.`
                },
                {
                  inline_data: {
                    mime_type: photo.mimeType,
                    data: photo.data
                  }
                },
                {
                  inline_data: {
                    mime_type: reference.mimeType,
                    data: reference.data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ["IMAGE"]
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Erreur Gemini"
      });
    }

    const parts = data.candidates?.[0]?.content?.parts || [];

    const imagePart = parts.find(
      part => part.inlineData || part.inline_data
    );

    if (!imagePart) {
      return res.status(500).json({
        error: "Gemini n'a pas retourné d'image."
      });
    }

    const imageData =
      imagePart.inlineData?.data ||
      imagePart.inline_data?.data;

    const mimeType =
      imagePart.inlineData?.mimeType ||
      imagePart.inline_data?.mime_type ||
      "image/png";

    return res.status(200).json({
      image: `data:${mimeType};base64,${imageData}`
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Erreur serveur"
    });
  }
}
