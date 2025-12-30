/**
 * PromptOrchestrator
 *
 * This module orchestrates the complete flow:
 * 1. Receives raw user_prompt verbatim
 * 2. Calls prompt_manager to create enhanced_prompt
 * 3. Sends enhanced_prompt to ChatGPT API
 * 4. Returns all three values: user_prompt, enhanced_prompt, response_text
 *
 * Data flow:
 * user_prompt → prompt_manager → enhanced_prompt → ChatGPT API → response_text
 */

import OpenAI from "openai";
import { prompt_manager } from "./prompt_manager";

// Initialize OpenAI client
// The API key should be set in environment variable OPENAI_API_KEY
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export interface PromptOrchestratorInput {
  user_prompt: string;
}

export interface PromptOrchestratorOutput {
  user_prompt: string;
  enhanced_prompt: string;
  response_text: string;
}

/**
 * Main orchestration function
 * Complete flow: user_prompt → enhanced_prompt → ChatGPT → response_text
 */
export async function PromptOrchestrator(
  input: PromptOrchestratorInput
): Promise<PromptOrchestratorOutput> {
  const { user_prompt } = input;

  try {
    // Step 1: Call prompt_manager to get enhanced_prompt
    const { enhanced_prompt } = prompt_manager({ user_prompt });

    // Step 2: Send enhanced_prompt to ChatGPT API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast, cost-effective model
      messages: [
        {
          role: "system",
          content: `You are a TypeScript code generator for Nutrient Web SDK. Follow the instructions in the user message exactly. Output ONLY code, no explanations.`,
        },
        {
          role: "user",
          content: enhanced_prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent code generation
    });

    // Step 3: Extract response
    const response_text = completion.choices[0]?.message?.content || 'console.log("Hello World");';

    // Step 4: Return all three values
    return {
      user_prompt,
      enhanced_prompt,
      response_text,
    };
  } catch (error) {
    console.error("PromptOrchestrator error:", error);

    // Fallback response for POC
    const { enhanced_prompt } = prompt_manager({ user_prompt });

    return {
      user_prompt,
      enhanced_prompt,
      response_text: 'console.log("Hello World - Fallback");',
    };
  }
}
