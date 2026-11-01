import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { AI_TOOLS_DECLARATIONS, AiToolExecutor } from './ai.tools';
import { aiStructuredResponseSchema, AiStructuredResponse } from './ai.schema';
import { AnalyticsService } from '../analytics/analytics.service';

export class AiService {
  static async askAssistant(businessId: string, question: string): Promise<AiStructuredResponse> {
    // 1. Fallback Mode: Gemini API Key tanımlı değilse deterministik yerel motor yanıtı üret
    if (!env.GEMINI_API_KEY) {
      return this.generateFallbackResponse(businessId, question);
    }

    try {
      // 2. Gemini API REST endpoint'ine bağlanma (Gemini 2.5 Flash / Pro model)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;

      const systemInstruction = `You are StockMind AI, an expert business inventory management assistant.
Your goal is to answer the user's inventory question accurately using ONLY data retrieved through the provided tools.
Never invent numbers, stock quantities, sales figures, or dates.
You MUST format your final response as a valid JSON object matching this schema:
{
  "summary": "High-level direct summary answering the query",
  "findings": ["Key observation 1", "Key observation 2"],
  "metrics": [{"label": "Metric Name", "value": "Metric Value"}],
  "recommendations": [
    {
      "title": "Action Title",
      "actionType": "REORDER" | "PRICING" | "DISCOUNT" | "INSPECT_EXPIRED" | "GENERAL",
      "description": "Action description",
      "productId": "optional-product-uuid",
      "suggestedQuantity": 0
    }
  ],
  "limitations": "Optional statement if certain requested data was unavailable"
}`;

      let contents: any[] = [
        {
          role: 'user',
          parts: [{ text: question }],
        },
      ];

      // 3. First Round Call with Tools
      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          tools: [{ functionDeclarations: AI_TOOLS_DECLARATIONS }],
        }),
      });

      let jsonResponse: any = await response.json();
      let candidate = jsonResponse?.candidates?.[0];
      let functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall);

      // 4. Tool Execution Loop
      if (functionCalls && functionCalls.length > 0) {
        contents.push(candidate.content); // Model's intention to call tools

        const functionResponsesParts = [];

        for (const callPart of functionCalls) {
          const call = callPart.functionCall;
          const toolResult = await AiToolExecutor.executeTool(businessId, call.name, call.args);

          functionResponsesParts.push({
            functionResponse: {
              name: call.name,
              response: { result: toolResult },
            },
          });
        }

        contents.push({
          role: 'user',
          parts: functionResponsesParts,
        });

        // 5. Second Round Call for Final Structured Response
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: { responseMimeType: 'application/json' },
          }),
        });

        jsonResponse = await response.json();
        candidate = jsonResponse?.candidates?.[0];
      }

      const textOutput = candidate?.content?.parts?.[0]?.text || '{}';
      const parsedJson = JSON.parse(textOutput);

      // 6. Zod Validation on LLM Output
      const validatedOutput = aiStructuredResponseSchema.parse(parsedJson);

      // 7. Persist AI Recommendation to DB
      if (validatedOutput.recommendations.length > 0) {
        await prisma.aiRecommendation.create({
          data: {
            businessId,
            summary: validatedOutput.summary,
            payload: validatedOutput as any,
          },
        });
      }

      return validatedOutput;
    } catch (error) {
      console.error('[AI_SERVICE_ERROR]', error);
      return this.generateFallbackResponse(businessId, question);
    }
  }

  /**
   * Gemini API anahtarı olmadığında veya ağ hatasında çalışan güvenli fallback motoru
   */
  private static async generateFallbackResponse(
    businessId: string,
    _question: string
  ): Promise<AiStructuredResponse> {
    const [summary, risks, reorders] = await Promise.all([
      AnalyticsService.getInventorySummary(businessId),
      AnalyticsService.getStockoutRisks(businessId),
      AnalyticsService.getReorderRecommendations(businessId),
    ]);

    const criticalRisks = risks.filter((r) => r.riskLevel === 'CRITICAL');

    return {
      summary: `Automated Inventory Analysis: System contains ${summary.totalProducts} active products with a total retail value of ₺${summary.totalRetailValue}.`,
      findings: [
        `${summary.lowStockCount} products are below low stock threshold.`,
        `${criticalRisks.length} products face immediate stockout risks.`,
        `${reorders.length} reorder recommendations generated.`,
      ],
      metrics: [
        { label: 'Total Products', value: summary.totalProducts },
        { label: 'Inventory Value', value: `₺${summary.totalRetailValue}` },
        { label: 'Low Stock Count', value: summary.lowStockCount },
        { label: 'Critical Risks', value: criticalRisks.length },
      ],
      recommendations: reorders.slice(0, 3).map((r) => ({
        title: `Reorder ${r.name}`,
        actionType: 'REORDER',
        description: r.rationale,
        productId: r.productId,
        suggestedQuantity: r.suggestedReorderQty,
      })),
      limitations: 'Live LLM API Key is not configured in environment. Using deterministic rules engine.',
    };
  }
}