'use server';
/**
 * @fileOverview An AI agent that provides instant pet advice.
 *
 * - getInstantAdvice - A function that handles the advice generation process.
 * - GetInstantAdviceInput - The input type for the getInstantAdvice function.
 * - GetInstantAdviceOutput - The return type for the getInstantAdvice function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GetInstantAdviceInputSchema = z.object({
  question: z.string().describe('The question the user is asking.'),
});
export type GetInstantAdviceInput = z.infer<typeof GetInstantAdviceInputSchema>;

const GetInstantAdviceOutputSchema = z.string().describe("The AI's response to the user's question.");
export type GetInstantAdviceOutput = z.infer<typeof GetInstantAdviceOutputSchema>;

// This is the main function the client will call.
export async function getInstantAdvice(
  input: GetInstantAdviceInput
): Promise<GetInstantAdviceOutput> {
  const llmResponse = await instantAdviceFlow(input);
  
  if (!llmResponse) {
    throw new Error('The AI did not return a response.');
  }

  return llmResponse;
}

// Define the Genkit flow. This will be a simple wrapper around the AI model call.
const instantAdviceFlow = ai.defineFlow(
  {
    name: 'instantAdviceFlow',
    inputSchema: GetInstantAdviceInputSchema,
    outputSchema: GetInstantAdviceOutputSchema,
  },
  async (input) => {
    // Generate a response using the configured model and a clear prompt.
    const { text } = await ai.generate({
      prompt: `You are a friendly and knowledgeable pet care expert for the PetConnect app. 
               Your goal is to provide helpful, safe, and encouraging advice to pet owners.
               Always prioritize the pet's safety and well-being. 
               If a situation sounds urgent or serious, strongly advise the user to contact a veterinarian immediately. 
               Do not provide medical diagnoses.
               
               Please answer the following question from the user: "${input.question}"`,
    });

    return text;
  }
);
