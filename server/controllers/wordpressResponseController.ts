import { RequestHandler } from 'express';
import { ServerError } from '../server/types/types';
import { ClarifyingQuestions } from '../types';

export const formatClarifyingQuestionsResponse = (
  clarifyingQuestions: ClarifyingQuestions,
  queryContext: any
): any => {
  return {
    needsClarification: true,
    clarifyingQuestions: {
      questions: clarifyingQuestions.questions,
      originalQuery: clarifyingQuestions.originalQuery,
      suggestions: [
        "Try to include specific error messages you're seeing",
        "Mention which plugins or themes you're using", 
        "Describe when the problem started happening",
        "Include what you were trying to do when it occurred"
      ]
    },
    analysis: {
      detectedPlugins: clarifyingQuestions.detectedPlugins,
      detectedProblems: clarifyingQuestions.detectedProblems,
      urgencyLevel: queryContext?.urgencyLevel || 'medium',
      isEmergency: false,
      vaguenessReasons: clarifyingQuestions.vaguenessReasons
    },
    metadata: {
      timestamp: new Date().toISOString(),
      responseType: 'clarifying_questions',
      responseId: generateResponseId()
    }
  };
};

export const formatWordPressResponse: RequestHandler = async (_req, res, next) => {
  console.log("17. Formatting WordPress response");

  const { clarifyingQuestions, queryContext, wordPressSolution, searchResults } = res.locals;

  // NEW: Handle clarifying questions response
  if (clarifyingQuestions) {
    console.log("18. Formatting clarifying questions response");
    
    const formattedResponse = formatClarifyingQuestionsResponse(
      clarifyingQuestions,
      queryContext
    );

    res.locals.formattedResponse = formattedResponse;
    return next();
  }

  // EXISTING: Handle normal solution response
  if (!wordPressSolution) {
    const error: ServerError = {
      log: 'Response formatter did not receive solution data',
      status: 500,
      message: { err: 'An error occurred while formatting the response' },
    };
    return next(error);
  }

  try {
    const { solution, metadata } = wordPressSolution;
    const { detectedPlugins, detectedProblems, urgencyLevel } = queryContext;

    // Create comprehensive response object (existing code)
    const formattedResponse = {
      needsClarification: false,
      
      // Main solution content
      solution: solution,
      
      // Query analysis summary
      analysis: {
        detectedPlugins: detectedPlugins,
        detectedProblems: detectedProblems,
        urgencyLevel: urgencyLevel,
        isEmergency: metadata.isEmergency
      },
      
      // Knowledge base usage info
      knowledgeBase: {
        articlesConsulted: metadata.articlesUsed,
        scenariosMatched: metadata.scenariosUsed,
        totalArticlesFound: searchResults.totalArticlesFound,
        totalScenariosFound: searchResults.totalScenariosFound
      },
      
      // Related articles for further reading
      relatedArticles: searchResults.articles.map((result: any) => ({
        title: result.article.title,
        relevanceScore: result.score.toFixed(2),
        category: result.article.category,
        scenario: result.article.scenario
      })),
      
      // Quick action suggestions based on urgency
      quickActions: generateQuickActions(detectedProblems, urgencyLevel),
      
      // Additional resources
      additionalResources: generateAdditionalResources(detectedPlugins),
      
      // Response metadata
      metadata: {
        timestamp: metadata.timestamp,
        processingTime: calculateProcessingTime(),
        responseType: 'solution',
        responseId: generateResponseId()
      }
    };

    console.log("18. Response formatted successfully");
    res.locals.formattedResponse = formattedResponse;
    return next();

  } catch (error: any) {
    const serverError: ServerError = {
      log: `Error formatting WordPress response: ${error.message}`,
      status: 500,
      message: { err: 'An error occurred while formatting the response' },
    };
    return next(serverError);
  }
};

// Helper function to generate quick actions based on problem type and urgency
function generateQuickActions(detectedProblems: string[], urgencyLevel: string): string[] {
  const quickActions: string[] = [];

  if (urgencyLevel === 'emergency') {
    quickActions.push("💾 Check if you have a recent backup available");
    quickActions.push("🔧 Try deactivating all plugins except essential ones");
    quickActions.push("🎨 Switch to a default WordPress theme temporarily");
    return quickActions;
  }

  // Problem-specific quick actions
  if (detectedProblems.includes('sync_issue')) {
    quickActions.push("🔄 Check if all plugins are up to date");
    quickActions.push("🔑 Verify API keys and connections");
    quickActions.push("⚡ Try manual sync if available");
  }

  if (detectedProblems.includes('performance')) {
    quickActions.push("🧹 Clear all caches (browser and plugin)");
    quickActions.push("🔌 Deactivate non-essential plugins temporarily");
    quickActions.push("📊 Check server resource usage");
  }

  if (detectedProblems.includes('payment_issue')) {
    quickActions.push("🔒 Verify SSL certificate is working");
    quickActions.push("💳 Test with different payment methods");
    quickActions.push("📋 Check payment gateway logs");
  }

  if (detectedProblems.includes('security_lockout')) {
    quickActions.push("🌐 Try accessing from a different IP address");
    quickActions.push("📧 Check email for security notifications");
    quickActions.push("🛡️ Contact hosting provider if needed");
  }

  // Default actions if no specific problems detected
  if (quickActions.length === 0) {
    quickActions.push("🔄 Update all plugins and themes");
    quickActions.push("💾 Create a backup before making changes");
    quickActions.push("🧪 Test in staging environment if available");
  }

  return quickActions;
}

// Helper function to generate additional resources based on detected plugins
function generateAdditionalResources(detectedPlugins: string[]): Array<{name: string, url: string, description: string}> {
  const resources: Array<{name: string, url: string, description: string}> = [];

  // Plugin-specific resources
  if (detectedPlugins.includes('WooCommerce')) {
    resources.push({
      name: "WooCommerce System Status",
      url: "yoursite.com/wp-admin/admin.php?page=wc-status",
      description: "Check your store's system status and logs"
    });
  }

  if (detectedPlugins.includes('Yoast SEO')) {
    resources.push({
      name: "Yoast SEO Health Check",
      url: "yoursite.com/wp-admin/admin.php?page=wpseo_dashboard",
      description: "Review SEO health and configuration issues"
    });
  }

  if (detectedPlugins.includes('Elementor')) {
    resources.push({
      name: "Elementor System Info",
      url: "yoursite.com/wp-admin/admin.php?page=elementor#tab-system_info",
      description: "Check Elementor system requirements and compatibility"
    });
  }

  // General WordPress resources
  resources.push({
    name: "WordPress Health Check",
    url: "yoursite.com/wp-admin/site-health.php",
    description: "Check your site's overall health and performance"
  });

  resources.push({
    name: "Plugin Conflict Tester",
    url: "wordpress.org/plugins/health-check/",
    description: "Safely test for plugin conflicts without affecting visitors"
  });

  return resources;
}

// Helper function to calculate processing time (you'd implement this based on your timing needs)
function calculateProcessingTime(): string {
  // This would typically calculate time from request start
  // For now, return a placeholder
  return "~2.3s";
}

// Helper function to generate a unique response ID
function generateResponseId(): string {
  return `wp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const sendWordPressResponse: RequestHandler = async (_req, res, _next) => {
  console.log("19. Sending WordPress response to client");

  const { formattedResponse } = res.locals;

  if (!formattedResponse) {
    return res.status(500).json({
      error: 'No response data available',
      message: 'An error occurred while preparing the response'
    });
  }

  try {
    // Send the formatted response
    res.status(200).json({
      success: true,
      data: formattedResponse
    });

    console.log("20. Response sent successfully");

  } catch (error) {
    console.error("Error sending response:", error);
    res.status(500).json({
      error: 'Failed to send response',
      message: 'An error occurred while sending the response'
    });
  }
};