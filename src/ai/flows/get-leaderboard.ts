
'use server';

/**
 * @fileOverview A Genkit flow to securely fetch the top users for the leaderboard.
 *
 * - getLeaderboard - A function that returns the top 10 users by XP.
 * - LeaderboardUser - The output type for a single user on the leaderboard.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Define the schema for the output data.
const LeaderboardUserSchema = z.object({
  uid: z.string(),
  displayName: z.string().optional().nullable(),
  photoURL: z.string().optional().nullable(),
  xp: z.number().optional().nullable(),
});

const GetLeaderboardOutputSchema = z.object({
  leaderboard: z.array(LeaderboardUserSchema),
});

export type LeaderboardUser = z.infer<typeof LeaderboardUserSchema>;

// Initialize Firebase Admin SDK if not already initialized.
if (!getApps().length) {
  initializeApp();
}
const firestore = getFirestore();

// Define the Genkit flow.
const getLeaderboardFlow = ai.defineFlow(
  {
    name: 'getLeaderboardFlow',
    inputSchema: z.void(),
    outputSchema: GetLeaderboardOutputSchema,
  },
  async () => {
    const usersRef = firestore.collection('users');
    const snapshot = await usersRef.orderBy('xp', 'desc').limit(10).get();
    
    const leaderboard: LeaderboardUser[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      leaderboard.push({
        uid: doc.id,
        displayName: data.displayName || 'Anonymous',
        photoURL: data.photoURL || null,
        xp: data.xp || 0,
      });
    });

    return { leaderboard };
  }
);

// Export a wrapper function to be called from the client.
export async function getLeaderboard(): Promise<{ leaderboard: LeaderboardUser[] }> {
  const result = await getLeaderboardFlow();
  return result;
}
