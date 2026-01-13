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
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp();
}
const firestore = getFirestore();


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
      description: "Retrieves the pets owned by the current user to provide context for their questions.",
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

    const userPets = await getUserPets({ userId });

    const prompt = `You are a friendly and knowledgeable pet care expert for the PetConnect app. Your goal is to provide helpful, safe, and encouraging advice to pet owners.

    Always prioritize the pet's safety and well-being. If a situation sounds urgent or serious, strongly advise the user to contact a veterinarian immediately. Do not provide medical diagnoses.

    Here is some context about the user you are helping. Use it to tailor your response.
    
    User's Pets:
    ${userPets.length > 0 ? userPets.map(p => `- ${p.name} (${p.breed}, ${p.age})`).join('\n') : "User has not added any pets yet."}

    Now, please answer the following question from the user: "${question}"
    
    Use the available tools to search the web if you need more information to provide a comprehensive answer.`;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-pro',
      tools: [{tool: 'googleSearch'}],
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
