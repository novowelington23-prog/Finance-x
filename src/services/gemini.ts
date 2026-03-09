import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Transaction {
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date?: string;
}

export async function processFinanceMessage(message: string, imageBase64?: string) {
  const model = "gemini-3.1-pro-preview";
  
  const systemInstruction = `
    Você é o "Finance X", um assistente financeiro pessoal premium e inteligente.
    Seu objetivo é ajudar o usuário a organizar suas finanças com precisão e elegância.
    
    Sempre que o usuário enviar um gasto ou ganho, você deve extrair as informações estruturadas.
    Se a informação for ambígua, peça esclarecimentos de forma profissional.
    
    Se o usuário enviar uma imagem (comprovante, nota fiscal), analise-a e extraia os dados financeiros com total atenção aos detalhes.
    
    Se o usuário pedir para gerar uma planilha ou relatório semanal, informe que ele pode clicar no botão "Relatório Semanal" no Dashboard ou que você está preparando os dados para ele baixar.
    
    Responda de forma clara, prestativa e sofisticada.
    Use emojis financeiros de forma equilibrada (💰, 📈, 💳).
    
    Se você identificar uma transação, retorne-a no formato JSON especificado.
    Se for apenas uma conversa, responda normalmente.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      reply: {
        type: Type.STRING,
        description: "A resposta profissional para o usuário.",
      },
      transaction: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          category: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["income", "expense"] },
          date: { type: Type.STRING }
        },
        description: "Dados da transação extraídos, se houver."
      }
    },
    required: ["reply"]
  };

  const parts: any[] = [{ text: message }];
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64.split(",")[1] || imageBase64
      }
    });
  }

  const result = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema
    }
  });

  return JSON.parse(result.text);
}

export async function generateAudioResponse(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Diga de forma amigável: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}
