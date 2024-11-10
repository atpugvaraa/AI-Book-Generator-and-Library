import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Initialize the Gemini model
const gemini = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_OPENAI_API_KEY!);

export const runtime = 'nodejs';

interface ChapterInfo {
  chapter: string;
  subtopic: string;
}

// Helper function to generate chapters for the eBook
async function getChaptersArray(
  title: string,
  topic: string,
  chapters: number,
  target_audience: string
): Promise<ChapterInfo[]> {
  const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const chaptersArray: ChapterInfo[] = [];

  for (let idx = 0; idx < chapters; idx++) {
    const prompt = `For our eBook titled ${title}, which covers the topic ${topic}, we need a description for chapter ${
      idx + 1
    }. Our target audience is ${target_audience}. Provide a title and a brief overview for this chapter that outlines its focus and the key points it will cover.`;

    try {
      const response = await model.generateContent([prompt]);
      const chapterInfo = response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "No description available";

      chaptersArray.push({
        chapter: `Chapter ${idx + 1}`,
        subtopic: chapterInfo,
      });
    } catch (error: any) {
      console.error(`Error generating chapter ${idx + 1} details:`, error.message);
      chaptersArray.push({
        chapter: `Chapter ${idx + 1}`,
        subtopic: "Error generating content.",
      });
    }
  }

  return chaptersArray;
}

// Main POST handler for generating the full eBook content
export async function POST(req: Request) {
  const { title, topic, chapters, num_words, target_audience, author, book_description } = await req.json();

  // Generate chapter descriptions
  const chaptersArray = await getChaptersArray(title, topic, chapters, target_audience);

  let chapterContext = ''; // To carry context across chapters
  const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Loop through chapters and generate detailed content for each
  for (let idx = 0; idx < chaptersArray.length; idx++) {
    const { chapter, subtopic } = chaptersArray[idx];

    const prompt = `We are writing an eBook called ${title}. Overall, it is about ${topic}. Our reader is: ${target_audience}. Please follow the the following book description to generate the book: ${book_description}. We are currently writing the ${idx + 1} section for the chapter: ${chapter}. The previous sections covered the following context: ${chapterContext}. Using at least ${num_words} words, write the full contents of the section regarding this subtopic: ${subtopic}. The output should be as helpful to the reader as possible. Include quantitative facts and statistics, with references. Go as in-depth as necessary. You can split this into multiple paragraphs if you see fit. The output should also be in cohesive paragraph form. Do not include any parts that will require manual editing in the book later. If you find yourself needing to put insert [blank] anywhere, do not do it (this is very important). If you do not know something, do not include it in the output. Exclude any auxiliary information like the word count, as the entire output will go directly into the ebook for readers, without any human processing. Remember the ${num_words} word minimum, please adhere to it. I want you to act like ${author} and you should not hallucinate at all.`;

    try {
      const response = await model.generateContent([prompt]);
      const text = response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "No content generated.";
      chapterContext += `\n\n${text}`;
    } catch (error: any) {
      console.error(`Error generating content for chapter ${idx + 1}:`, error.message);
      chapterContext += `\n\nError generating content for ${chapter}.`;
    }
  }

  // Define file path for saving Markdown file
  const markdownPath = path.join(process.cwd(), 'output', `${title.replace(/\s+/g, '_')}.md`);

  // Ensure the output directory exists
  if (!fs.existsSync(path.dirname(markdownPath))) {
    fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  }

  // Write the final content to a Markdown file
  fs.writeFile(markdownPath, chapterContext, (err) => {
    if (err) {
      console.error('Error writing Markdown file:', err);
    } else {
      console.log(`Markdown file saved at: ${markdownPath}`);
    }
  });

  // Return response with the path to the saved file
  return NextResponse.json({
    message: 'eBook content generated and saved successfully',
    filePath: markdownPath,
  });
}
