import express from 'express';
import { parseWordPressQuery } from '../controllers/wordpressNaturalLanguageController.js';
import { checkForClarifyingQuestions } from '../controllers/wordpressClarifyingController.js';
import { searchWordPressKnowledgeBase } from '../controllers/wordpressKnowledgeController.js';
import { generateWordPressSolution } from '../controllers/wordpressOpenAIController.js';
import { formatWordPressResponse, sendWordPressResponse } from '../controllers/wordpressResponseController.js';

const router = express.Router();

// Helper middleware to conditionally run knowledge base search
const conditionalKnowledgeSearch: express.RequestHandler = (req, res, next) => {
  if (res.locals.skipToResponse) {
    console.log("6. Skipping knowledge base search - clarifying questions needed");
    return next();
  }
  return searchWordPressKnowledgeBase(req, res, next);
};

// Helper middleware to conditionally run solution generation
const conditionalSolutionGeneration: express.RequestHandler = (req, res, next) => {
  if (res.locals.skipToResponse) {
    console.log("7. Skipping solution generation - clarifying questions needed");
    return next();
  }
  return generateWordPressSolution(req, res, next);
};

// WordPress Plugin Troubleshooting Route
// POST /api/wordpress/troubleshoot
router.post(
  '/troubleshoot',
  parseWordPressQuery,              // 1. Parse and analyze the user's question
  checkForClarifyingQuestions,      // 2. NEW: Check if we need to ask clarifying questions
  conditionalKnowledgeSearch,       // 3. MODIFIED: Only search if not asking questions
  conditionalSolutionGeneration,    // 4. MODIFIED: Only generate if not asking questions
  formatWordPressResponse,          // 5. Format response (handles both solutions and questions)
  sendWordPressResponse             // 6. Send response to client
);

// Health check route for WordPress service
router.get('/health', (_req, res) => {
  res.status(200).json({
    service: 'WordPress Plugin Troubleshooting',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;