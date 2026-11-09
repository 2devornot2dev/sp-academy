// app/api/test/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import z from "zod";

// Create a comprehensive language analysis schema
const schema = z.object({
  primary_greeting: z.object({
    phrase: z.string().describe("The greeting phrase in the original language"),
    language: z.string().describe("Detected language code (ISO 639-1)"),
    language_confidence: z.number().min(0).max(1).describe("Confidence score for language detection"),
    sentiment: z.enum(["positive", "negative", "neutral", "warm", "formal"]).describe("Emotional tone"),
    formality: z.enum(["formal", "informal", "slang", "religious", "colloquial"]).describe("Level of formality"),
    region: z.string().optional().describe("Specific region/dialect if applicable")
  }),
  
  translations: z.array(z.object({
    language: z.string().describe("Target language code"),
    phrase: z.string().describe("Translated greeting"),
    context: z.string().optional().describe("When to use this translation")
  })).min(1).describe("Translations in multiple languages"),
  
  cultural_context: z.object({
    appropriate_situations: z.array(z.string()).describe("Social contexts where this greeting is used"),
    inappropriate_situations: z.array(z.string()).describe("When NOT to use this greeting"),
    cultural_notes: z.string().describe("Important cultural nuances and taboos"),
    response_expectations: z.string().describe("Expected/typical response")
  }),
  
  linguistic_analysis: z.object({
    literal_meaning: z.string().describe("Direct word-for-word translation/meaning"),
    etymology: z.string().optional().describe("Origin and historical development"),
    pronunciation_guide: z.string().describe("IPA pronunciation or phonetic spelling"),
    related_phrases: z.array(z.string()).describe("Common variations or related expressions")
  }),
  
  difficulty_metrics: z.object({
    learner_difficulty: z.enum(["easy", "medium", "hard"]).describe("Difficulty for language learners"),
    frequency_score: z.number().min(1).max(10).describe("Commonness in everyday usage (1=rare, 10=ubiquitous)")
  }),
  
  comparisons: z.array(z.object({
    language: z.string().describe("Comparison language"),
    similar_greeting: z.string().describe("Equivalent greeting"),
    key_differences: z.string().describe("Cultural/usage differences")
  })).optional().describe("Cross-language comparisons")
});

// Convert to JSON Schema
const mySchema = z.toJSONSchema(schema);
delete mySchema.$schema;

export async function GET() {
  // Start overall timing
  console.time("⏱️ Total Request Duration");
  const requestStartTime = Date.now();
  
  try {
    console.log("🧪 Testing Moonshot with complex language schema...");
    console.log(JSON.stringify(mySchema, null, 2));

    const client = new OpenAI({
      apiKey: process.env.MOONSHOT_API_KEY!,
      baseURL: "https://api.moonshot.ai/v1",
    });

    // More sophisticated test cases
    const testScenarios = [
      {
        name: "Formal Japanese Business Greeting",
        prompt: "Provide a formal business greeting in Japanese. Include cultural context about business card exchange (meishi koukan), hierarchical respect, and how it differs from casual greetings. Add translations in English, Korean, and German."
      },
      {
        name: "Brazilian Portuguese Informal Greeting",
        prompt: "Explain how to greet close friends in Brazil. Include regional variations from Rio vs São Paulo, the use of 'beleza?', and cultural context about physical contact (cheek kisses, hugs). Provide Spanish and English comparisons."
      },
      {
        name: "Multiple Arabic Greetings",
        prompt: "Provide 3 Arabic greetings with different levels of formality (classical, modern standard, colloquial Egyptian). Explain religious/secular contexts and when each is appropriate. Include pronunciation in IPA."
      }
    ];

    // Pick a random scenario or cycle through them
    const scenario = testScenarios[Math.floor(Math.random() * testScenarios.length)];
    
    console.log(`📤 Testing: ${scenario.name}`);

    // Time just the API call
    console.time("⏱️ API Call Duration");
    const response = await client.chat.completions.create({
      model: "kimi-k2-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a linguistic and cultural expert. Provide detailed, accurate information about greetings in the requested language. ALWAYS respond with valid JSON matching the provided schema exactly. Include nuanced cultural details, regional variations, and practical usage guidance.`
        },
        {
          role: "user",
          content: scenario.prompt
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "comprehensive_greeting_analysis",
          strict: true,
          schema: mySchema
        },
      },
      temperature: 0.3, // Lower temperature for more consistent JSON output
    });
    console.timeEnd("⏱️ API Call Duration");

    const messageContent = response.choices[0].message.content;
    
    // Log token usage and response details
    console.log("📊 Token usage:", response.usage);
    console.log("🔧 Response content:", messageContent);
    
    if (!messageContent) {
      const duration = Date.now() - requestStartTime;
      console.timeEnd("⏱️ Total Request Duration");
      
      return NextResponse.json({
        success: false,
        error: "No content in response",
        scenario: scenario.name,
        performance: {
          totalDurationMs: duration,
          apiCallDurationMs: "N/A (no response)",
          timestamp: new Date().toISOString()
        }
      });
    }

    // Time validation/parsing
    console.time("⏱️ Validation & Parsing");
    try {
      const result = JSON.parse(messageContent);
      
      // Validate with Zod
      const validationResult = schema.safeParse(result);
      
      if (!validationResult.success) {
        console.timeEnd("⏱️ Validation & Parsing");
        const duration = Date.now() - requestStartTime;
        console.timeEnd("⏱️ Total Request Duration");
        
        console.error("⚠️ Zod validation failed:", validationResult.error);
        return NextResponse.json({
          success: false,
          scenario: scenario.name,
          error: "Schema validation failed",
          zod_errors: validationResult.error,
          raw_response: result,
          performance: {
            totalDurationMs: duration,
            apiCallDurationMs: "Check logs above",
            validationDurationMs: "Failed during validation",
            timestamp: new Date().toISOString()
          }
        });
      }

      console.timeEnd("⏱️ Validation & Parsing");
      const totalDuration = Date.now() - requestStartTime;
      console.timeEnd("⏱️ Total Request Duration");
      
      console.log("✅ Complex JSON schema parsing successful!");
      
      // Calculate schema complexity metrics
      const complexity = {
        total_fields: Object.keys(result).length,
        has_nested_objects: true,
        array_fields: Object.keys(result).filter(key => Array.isArray(result[key])).length,
        optional_fields_used: Object.keys(result).filter(key => result[key] !== undefined && result[key] !== null).length
      };

      return NextResponse.json({
        success: true,
        scenario: scenario.name,
        complexity,
        data: validationResult.data,
        token_usage: response.usage,
        performance: {
          totalDurationMs: totalDuration,
          apiCallDurationMs: "Check logs above",
          validationDurationMs: "Check logs above",
          timestamp: new Date().toISOString()
        }
      });
    } catch (parseError) {
      console.timeEnd("⏱️ Validation & Parsing");
      const duration = Date.now() - requestStartTime;
      console.timeEnd("⏱️ Total Request Duration");
      
      return NextResponse.json({
        success: false,
        scenario: scenario.name,
        error: "Invalid JSON response",
        content_preview: messageContent.substring(0, 500),
        parse_error: parseError instanceof Error ? parseError.message : "Unknown error",
        performance: {
          totalDurationMs: duration,
          apiCallDurationMs: "Check logs above",
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    const errorDuration = Date.now() - requestStartTime;
    console.timeEnd("⏱️ Total Request Duration");
    
    console.error(`❌ Test failed after ${errorDuration}ms:`, error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: error,
        performance: {
          totalDurationMs: errorDuration,
          failedAt: new Date().toISOString(),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 },
    );
  }
}