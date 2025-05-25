import { RequestHandler } from 'express';
import { ServerError } from '../types';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper function to create context from search results
function createContextFromSearchResults(searchResults: any): string {
  const contextParts: string[] = [];

  // Add relevant articles
  if (searchResults.articles && searchResults.articles.length > 0) {
    contextParts.push("RELEVANT TROUBLESHOOTING ARTICLES:");
    
    searchResults.articles.forEach((result: any, index: number) => {
      const article = result.article;
      contextParts.push(`\nArticle ${index + 1}: ${article.title}`);
      contextParts.push(`Problem: ${article.problem_description}`);
      contextParts.push(`Symptoms: ${article.symptoms.slice(0, 3).join(', ')}`);
      contextParts.push(`Solutions: ${article.solution_steps.slice(0, 5).join(' | ')}`);
      if (article.error_codes && article.error_codes.length > 0) {
        contextParts.push(`Common Errors: ${article.error_codes.join(', ')}`);
      }
    });
  }

  // Add relevant scenarios
  if (searchResults.scenarios && searchResults.scenarios.length > 0) {
    contextParts.push("\n\nRELEVANT INTEGRATION SCENARIOS:");
    
    searchResults.scenarios.forEach((result: any, index: number) => {
      const scenario = result.scenario;
      contextParts.push(`\nScenario ${index + 1}: ${scenario.name}`);
      contextParts.push(`Description: ${scenario.description}`);
      contextParts.push(`Common Symptoms: ${scenario.common_symptoms.slice(0, 3).join(', ')}`);
      contextParts.push(`Typical Causes: ${scenario.typical_causes.slice(0, 3).join(', ')}`);
    });
  }

  return contextParts.join('\n');
}

// Helper function to create emergency response prompt
function createEmergencyPrompt(query: string, context: string): string {
  return `
You are a WordPress emergency response specialist. The user has a CRITICAL SITE ISSUE that needs immediate help.

USER'S EMERGENCY: ${query}

RELEVANT TROUBLESHOOTING INFO:
${context}

RESPONSE REQUIREMENTS:
1. Start with 🚨 EMERGENCY STEPS
2. Provide 3-5 immediate action items in order of priority
3. Each step should be specific and actionable
4. Include what to do if they can't access admin
5. Mention backup/safety considerations
6. Keep it concise but complete - this is an emergency!

Format your response with clear step numbers and action-oriented language.
  `;
}

// Helper function to create standard troubleshooting prompt
function createStandardPrompt(
  query: string, 
  context: string, 
  detectedPlugins: string[], 
  detectedProblems: string[],
  urgencyLevel: string
): string {
  return `
You are a WordPress plugin troubleshooting expert. Help the user solve their specific issue using the provided knowledge base information.

USER'S QUESTION: ${query}
IMPORTANT: Do NOT give generic advice. Give specific, actionable solutions based on their actual query.

DETECTED CONTEXT:
- Plugins involved: ${detectedPlugins.join(', ') || 'Not specified'}
- Problem types: ${detectedProblems.join(', ') || 'General troubleshooting'}
- Urgency level: ${urgencyLevel}

RELEVANT KNOWLEDGE BASE INFO:
${context}

RESPONSE REQUIREMENTS:
1. Acknowledge the specific plugins/issue mentioned
2. Provide step-by-step troubleshooting instructions
3. Start with the most likely solutions first
4. Include both quick fixes and comprehensive solutions
5. Mention any relevant tools or plugins
6. Add prevention tips if appropriate
7. Use clear, numbered steps
8. Be specific and actionable
9. Address their SPECIFIC situation, not general WordPress issues
10. Use the knowledge base to provide targeted solutions

RESPONSE FORMAT:
**Issue Summary:** [Brief description of what you understand]
**Recommended Solution:** [Step-by-step instructions]
**If That Doesn't Work:** [Alternative approaches]
**Prevention:** [How to avoid this in the future]

Keep your response practical and focused on solving their specific problem.
  `;
}

export const generateWordPressSolution: RequestHandler = async (_req, res, next) => {
  console.log("11. Starting WordPress solution generation");

  const { naturalLanguageQuery, queryContext, searchResults } = res.locals;

  if (!naturalLanguageQuery || !queryContext || !searchResults) {
    const error: ServerError = {
      log: 'OpenAI middleware did not receive required data',
      status: 500,
      message: { err: 'An error occurred before generating solution' },
    };
    return next(error);
  }

  try {
    const { detectedPlugins, detectedProblems, urgencyLevel } = queryContext;

    // Create context from search results
    const context = createContextFromSearchResults(searchResults);
    console.log("12. Context created, length:", context.length);

    // Determine if this is an emergency
    const isEmergency = urgencyLevel === 'emergency';
    console.log("13. Emergency mode:", isEmergency);

    // Create appropriate prompt
    const systemPrompt = isEmergency 
      ? createEmergencyPrompt(naturalLanguageQuery, context)
      : createStandardPrompt(
          naturalLanguageQuery, 
          context, 
          detectedPlugins, 
          detectedProblems, 
          urgencyLevel
        );

    console.log("14. Calling OpenAI API");

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a WordPress troubleshooting expert. Provide clear, actionable solutions based on the provided knowledge base." 
        },
        { role: "user", content: systemPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent troubleshooting advice
      max_tokens: 1000
    });

    // Extract the response
    const generatedSolution = completion.choices[0].message.content?.trim() || '';
    console.log("15. OpenAI response generated, length:", generatedSolution.length);

    // Store the solution in res.locals
    res.locals.wordPressSolution = {
      solution: generatedSolution,
      metadata: {
        detectedPlugins,
        detectedProblems,
        urgencyLevel,
        articlesUsed: searchResults.articles.length,
        scenariosUsed: searchResults.scenarios.length,
        isEmergency,
        timestamp: new Date().toISOString()
      }
    };

    console.log("16. Solution ready for response");
    return next();

  } catch (error: any) {
    console.error("OpenAI Error:", error);
    const serverError: ServerError = {
      log: `Error generating WordPress solution: ${error.message}`,
      status: 500,
      message: { err: 'An error occurred while generating the solution' },
    };
    return next(serverError);
  }
};