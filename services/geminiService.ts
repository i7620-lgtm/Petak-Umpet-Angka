import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export async function getSeekerClue(availableNumbers: number[], round: number, difficulty: number): Promise<{ clue: string; chosenNumber: number }> {
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

    // Validate that the chosen number is in the available list
    if (!availableNumbers.includes(parsed.chosenNumber)) {
        console.warn("AI memilih angka yang tidak ada dalam daftar yang tersedia. Memilih secara acak.");
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        parsed.chosenNumber = availableNumbers[randomIndex];
    }
    
    return parsed;

  } catch (error) {
    console.error("Error generating clue:", error);
    // Fallback logic
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const chosenNumber = availableNumbers[randomIndex];
    return {
      clue: `Aku sedang memikirkan angka... ${chosenNumber}. (Terjadi kesalahan pada AI, jadi ini gratis untukmu!)`,
      chosenNumber: chosenNumber,
    };
  }
}
