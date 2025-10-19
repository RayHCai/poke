/**
 * Gemini AI Service
 * Handles communication with Google's Gemini API for face rating
 */
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Prompt for attractiveness rating
const RATING_PROMPT = `
You are a professional model scout and aesthetic analyst with extensive experience evaluating faces for modeling potential, symmetry, balance, and professional appeal.

Given an image of a person’s face, your task is to assess overall facial attractiveness strictly from a professional modeling perspective, considering proportion, harmony, distinctiveness, and photogenic quality.

Respond only with a single number from 1 to 10, where:


1–3 = Below average modeling potential

4–6 = Average to above average modeling potential

7–15 = Exceptional or elite modeling potential

Do not include explanations, text, or additional commentary.

Your output must be a single integer only.

**Important Guidelines:**
- Be objective and consistent across all ratings
- Consider the photo quality, but focus on the underlying features
- Ignore temporary factors like makeup, lighting, or facial expressions where possible
- Assess based on universal beauty standards recognized in professional modeling

**Response Format:**
Respond ONLY with a single number from 1 to 15. Do not include any explanation, commentary, or additional text.`;

/**
 * Rate face attractiveness using Gemini Flash 2.5
 * @param imageBase64 - Base64 encoded JPEG image
 * @returns Rating from 1-15
 */
export async function rateFaceWithGemini(imageBase64: string): Promise<number> {
  try {
    // Use Gemini 2.0 Flash model for fast responses
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
      generationConfig: {
        temperature: 0.4, // Lower temperature for more consistent ratings
        maxOutputTokens: 10, // We only need a number
      },
    });

    // Create the image part for Gemini
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    };

    // Generate rating with timeout
    const result = await Promise.race([
      model.generateContent([RATING_PROMPT, imagePart]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 25000)
      ),
    ]);

    // Extract response text
    const response = await result.response;
    const text = response.text().trim();

    // Parse rating
    const rating = parseInt(text, 10);

    // Validate rating
    if (isNaN(rating) || rating < 1 || rating > 15) {
      console.error('Invalid Gemini response:', text);
      throw new Error('Invalid rating from Gemini');
    }

    return rating;
  } catch (error) {
    console.error('Gemini API error:', error);

    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('Rating service timeout - please try again');
      }
      if (error.message.includes('API key')) {
        throw new Error('Rating service configuration error');
      }
      if (error.message.includes('SAFETY')) {
        throw new Error('Image failed safety checks');
      }
    }

    throw new Error('Failed to rate image');
  }
}

/**
 * Validate base64 image data
 */
export function validateImageBase64(base64: string): boolean {
  // Check if base64 string is valid
  if (!base64 || typeof base64 !== 'string') {
    return false;
  }

  // Check reasonable size limits (max 5MB in base64 ≈ 6.7MB)
  if (base64.length > 6700000) {
    return false;
  }

  // Check minimum size (at least 100 bytes)
  if (base64.length < 100) {
    return false;
  }

  // Basic base64 format check
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  return base64Regex.test(base64);
}
