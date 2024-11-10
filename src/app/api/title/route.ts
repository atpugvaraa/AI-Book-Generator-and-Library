import { GoogleGenerativeAI } from '@google/generative-ai';

const gemini = new GoogleGenerativeAI(
  process.env.OPENAI_API_KEY!, // Replace with your Gemini API key
);

export const runtime = 'edge';

export async function POST(req: Request, descrition: string, theme: string, target: string) {
  try {
    const prompt =`We are writing an eBook. It is about ${descrition} for dev with the theme of ${theme}. Our reader is: ${target}. Write a short, catchy title clearly directed at our reader that is less than 9 words and proposes a “big promise” that will be sure to grab the readers attention.`;

    const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash"})

    const response = await model.generateContent([
      prompt
    ]);

    const text = response.response.candidates?.[0].content.parts[0].text 

    console.log(text)
    return text
  } catch (error) {
    console.log(error)
    throw error
  }
}