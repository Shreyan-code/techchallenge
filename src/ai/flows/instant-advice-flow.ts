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
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const GetInstantAdviceInputSchema = z.object({
  userId: z.string().describe('The ID of the user asking for advice.'),
  question: z.string().describe('The question the user is asking.'),
});
export type GetInstantAdviceInput = z.infer<typeof GetInstantAdviceInputSchema>;

const GetInstantAdviceOutputSchema = z.string().describe("The AI's response to the user's question.");
export type GetInstantAdviceOutput = z.infer<typeof GetInstantAdviceOutputSchema>;

export async function getInstantAdvice(
  input: GetInstantAdviceInput
): Promise<GetInstantAdviceOutput> {
  return instantAdviceFlow(input);
}


const getUserPets = ai.defineTool(
    {
      name: 'getUserPets',
      description: "Retrieves the pets owned by the current user to provide context for their questions. Requires the user's ID.",
      inputSchema: z.object({
        userId: z.string(),
      }),
      outputSchema: z.array(z.object({
        name: z.string(),
        breed: z.string(),
        age: z.string(),
        bio: z.string().optional(),
      })),
    },
    async ({ userId }) => {
        let adminApp: App;
        if (!getApps().length) {
            adminApp = initializeApp();
        } else {
            adminApp = getApps()[0];
        }
        const firestore = getFirestore(adminApp);
        
        console.log("Fetching pets for user:", userId)
        const petsQuery = firestore.collection('pets').where('ownerId', '==', userId);
        const snapshot = await petsQuery.get();
        if (snapshot.empty) {
            console.log("No pets found for user:", userId);
            return [];
        }
        const pets = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                name: data.name,
                breed: data.breed,
                age: data.age,
                bio: data.bio
            };
        });
        console.log("Found pets:", pets);
        return pets;
    }
);


const instantAdviceFlow = ai.defineFlow(
  {
    name: 'instantAdviceFlow',
    inputSchema: GetInstantAdviceInputSchema,
    outputSchema: GetInstantAdviceOutputSchema,
  },
  async ({ userId, question }) => {

    const llmResponse = await ai.generate({
      prompt: `You are a friendly and knowledgeable pet care expert for the PetConnect app. Your goal is to provide helpful, safe, and encouraging advice to pet owners.

      Always prioritize the pet's safety and well-being. If a situation sounds urgent or serious, strongly advise the user to contact a veterinarian immediately. Do not provide medical diagnoses.
      
      To provide a personalized response, you MUST first use the getUserPets tool to get context about the user's current pets.
      
      Now, please answer the following question from the user: "${question}"
      
      You also have a Google Search tool available if you need more information to provide a comprehensive answer.`,
      model: 'googleai/gemini-pro',
      tools: [getUserPets, {tool: 'googleSearch'}],
      toolConfig: {
        // Pass the dynamic userId to the tool when it's called
        custom: (toolRequest) => {
            if (toolRequest.name === 'getUserPets') {
                return { userId };
            }
            return {};
        }
      },
      config: {
        safetySettings: [
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ],
      },
    });

    return llmResponse.text;
  }
);
