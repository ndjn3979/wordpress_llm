// server/controllers/wordpressClarifyingController.ts
import { RequestHandler } from 'express';
import { ServerError } from '../types';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper function to assess if query is vague and needs clarification
function assessQueryVagueness(
  query: string, 
  detectedPlugins: string[], 
  detectedProblems: string[]
): { isVague: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  // Only trigger for VERY short queries
  if (query.trim().split(/\s+/).length < 3) { // Changed from 5 to 3
    reasons.push('query_too_short');
  }
  
  // Only trigger for extremely generic terms WITHOUT any specifics
  const extremelyGeneric = /^(help|broken|not working|issue|problem)$/i;
  if (extremelyGeneric.test(query.trim())) {
    reasons.push('extremely_generic');
  }
  
  return {
    isVague: reasons.length >= 2, // Very strict
    reasons
  };
}

// Helper function to generate clarifying questions using OpenAI
async function generateClarifyingQuestions(
  query: string,
  vaguenessReasons: string[],
  detectedPlugins: string[],
  detectedProblems: string[]
): Promise<string[]> {
  const prompt = `
You are a WordPress troubleshooting expert. A user has asked: "${query}"

The query is vague for these reasons: ${vaguenessReasons.join(', ')}
Detected plugins: ${detectedPlugins.join(', ') || 'None'}
Detected problems: ${detectedProblems.join(', ') || 'None'}

Generate 3-5 specific clarifying questions to better understand their issue. Focus on:
1. What specific error messages they're seeing
2. When the problem started occurring
3. What plugins/themes are involved
4. What steps they've already tried
5. What specific functionality isn't working

Make questions conversational and helpful. Return only the questions, one per line.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a helpful WordPress troubleshooting assistant. Generate clear, specific clarifying questions." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    const response = completion.choices[0].message.content?.trim() || '';
    return response.split('\n').filter(q => q.trim().length > 0).slice(0, 5);
  } catch (error) {
    console.error('Error generating clarifying questions:', error);
    // Fallback questions if OpenAI fails
    return [
      "What specific error message are you seeing?",
      "When did this problem start happening?",
      "Which plugins do you have installed?",
      "What were you trying to do when the issue occurred?"
    ];
  }
}

export const checkForClarifyingQuestions: RequestHandler = async (_req, res, next) => {
  console.log("3.5. Checking if clarifying questions are needed");

  const { naturalLanguageQuery, queryContext } = res.locals;

  if (!naturalLanguageQuery || !queryContext) {
    return next(); // Skip if no data, let next middleware handle
  }

  try {
    const { detectedPlugins, detectedProblems } = queryContext;

    // Assess if the query is vague
    const vaguenessAssessment = assessQueryVagueness(
      naturalLanguageQuery,
      detectedPlugins,
      detectedProblems
    );

    console.log("4. Vagueness assessment:", vaguenessAssessment);

    if (vaguenessAssessment.isVague) {
      // Generate clarifying questions
      const clarifyingQuestions = await generateClarifyingQuestions(
        naturalLanguageQuery,
        vaguenessAssessment.reasons,
        detectedPlugins,
        detectedProblems
      );

      console.log("5. Generated clarifying questions:", clarifyingQuestions.length);

      // Store clarifying questions in response and skip to response formatting
      res.locals.clarifyingQuestions = {
        questions: clarifyingQuestions,
        originalQuery: naturalLanguageQuery,
        vaguenessReasons: vaguenessAssessment.reasons,
        detectedPlugins,
        detectedProblems
      };

      // Skip the knowledge base search and OpenAI solution generation
      // Jump directly to response formatting
      res.locals.skipToResponse = true;
      return next();
    }

    console.log("5. Query is specific enough, proceeding with normal flow");
    return next();

  } catch (error: any) {
    console.error("Error in clarifying questions check:", error);
    // On error, continue with normal flow
    return next();
  }
};