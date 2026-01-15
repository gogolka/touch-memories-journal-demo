
import { GoogleGenAI, Type } from "@google/genai";

// Always use the named parameter and assume API_KEY is provided by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIPrompts = async (context: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 3 creative travel book caption ideas or layout themes for a trip to: ${context}. 
      Keep it short and inspirational. Format as JSON array of strings. Language: Ukrainian.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    // response.text is a property that returns the generated string.
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Gemini Error:", error);
    return ["Моя незабутня подорож", "Миттєвості щастя", "Нові горизонти"];
  }
};
