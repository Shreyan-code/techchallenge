'use server';
/**
 * @fileOverview An AI agent that identifies pet breeds from an image.
 *
 * - identifyPetBreedFromImage - A function that handles the pet breed identification process.
 * - IdentifyPetBreedFromImageInput - The input type for the identifyPetBreedFromImage function.
 * - IdentifyPetBreedFromImageOutput - The return type for the identifyPetBreedFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifyPetBreedFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a pet, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type IdentifyPetBreedFromImageInput = z.infer<typeof IdentifyPetBreedFromImageInputSchema>;

const IdentifyPetBreedFromImageOutputSchema = z.object({
  identifiedBreed: z.string().describe('The identified breed of the pet in the image.'),
  confidence: z.number().describe('The confidence level of the identification (0-1).'),
});
export type IdentifyPetBreedFromImageOutput = z.infer<typeof IdentifyPetBreedFromImageOutputSchema>;

export async function identifyPetBreedFromImage(input: IdentifyPetBreedFromImageInput): Promise<IdentifyPetBreedFromImageOutput> {
  return identifyPetBreedFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'identifyPetBreedFromImagePrompt',
  input: {schema: IdentifyPetBreedFromImageInputSchema},
  output: {schema: IdentifyPetBreedFromImageOutputSchema},
  prompt: `You are an expert in pet breeds. Analyze the image and identify the breed of the pet.  Return your best guess along with a confidence level (0-1).

Photo: {{media url=photoDataUri}}`,
});

const identifyPetBreedFromImageFlow = ai.defineFlow(
  {
    name: 'identifyPetBreedFromImageFlow',
    inputSchema: IdentifyPetBreedFromImageInputSchema,
    outputSchema: IdentifyPetBreedFromImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
