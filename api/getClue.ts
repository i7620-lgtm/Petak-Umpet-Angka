import { GoogleGenAI, Type } from "@google/genai";

// Handler default untuk Vercel Serverless Functions
export default async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { availableNumbers, round, difficulty } = req.body;

  // Validasi input
  if (!availableNumbers || !round || !difficulty) {
    return res.status(400).json({ error: 'Missing required parameters: availableNumbers, round, difficulty' });
  }
  
  // Ambil API Key dari environment variables di Vercel
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on the server.' });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const prompt = `Anda adalah "pencari" dalam permainan petak umpet angka.
Ini adalah ronde ${round}.
Tingkat kesulitan yang diminta adalah ${difficulty} dari 10.

Angka yang tersedia untuk Anda pilih adalah: [${availableNumbers.join(', ')}].

Tugas Anda:
1. Secara rahasia, pilih satu angka dari daftar yang tersedia.
2. Buat petunjuk tentang angka yang Anda pilih, sesuaikan kerumitan petunjuk dengan tingkat kesulitan yang diminta:
   - **Tingkat 1 (Sangat Mudah):** Berikan petunjuk yang sangat langsung dan jelas. Hampir seperti teka-teki anak-anak. Contoh: "Aku adalah hasil dari 2+2." (untuk angka 4) atau "Aku adalah angka pertama." (untuk angka 1).
   - **Tingkat 5 (Sedang):** Berikan petunjuk yang cerdas dan sedikit samar, membutuhkan sedikit pemikiran. Ini adalah tingkat kesulitan standar. Contoh: "Aku adalah angka yang sering dikaitkan dengan nasib buruk." (untuk angka 13).
   - **Tingkat 10 (Sangat Sulit):** Berikan petunjuk yang lebih abstrak, metaforis, atau memerlukan pengetahuan umum yang lebih luas. Petunjuk harus tetap logis dan bisa dipecahkan, tetapi sangat menantang. Contoh: "Dalam mitologi Romawi, aku adalah jumlah dewa utama di Olympus." (untuk angka 12) atau "Aku adalah nomor atom untuk Oksigen." (untuk angka 8).
3. Kembalikan respons Anda sebagai objek JSON dengan dua kunci: "clue" (petunjuk Anda) dan "chosenNumber" (angka yang Anda pilih).

Contoh respons untuk angka 8 dengan kesulitan sedang:
{
  "clue": "Aku mencari angka yang terlihat seperti kacamata yang diletakkan miring, atau mungkin simbol tak terhingga.",
  "chosenNumber": 8
}
`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clue: {
                type: Type.STRING,
                description: 'Petunjuk samar tentang angka yang dipilih, disesuaikan dengan tingkat kesulitan.',
              },
              chosenNumber: {
                type: Type.INTEGER,
                description: 'Angka yang dipilih dari daftar yang tersedia.',
              },
            },
            required: ["clue", "chosenNumber"],
          },
        },
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);

    // Kirim respons yang berhasil kembali ke klien
    return res.status(200).json(parsed);

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    // Jika terjadi error, kirim respons error kembali ke klien
    return res.status(500).json({ error: 'Failed to generate clue from AI.' });
  }
}
