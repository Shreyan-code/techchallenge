
// To run this script, use: npm run seed
// This script will populate your Firestore database with dummy data.
// Before running, make sure you have authenticated with the Firebase CLI
// and have set up a service account for the Admin SDK.
// For more info on service accounts: https://firebase.google.com/docs/admin/setup

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { firebaseConfig } from '../firebase/config'; // Using client config just for projectId

// --- IMPORTANT ---
// To run this script, you need to authenticate using a service account.
// 1. Go to your Firebase Project Settings -> Service accounts.
// 2. Click "Generate new private key" and download the JSON file.
// 3. Save this file as `serviceAccountKey.json` in the ROOT of your project.
// 4. IMPORTANT: Add `serviceAccountKey.json` to your `.gitignore` file to avoid committing it.
let serviceAccount: any;
try {
  serviceAccount = require('../../serviceAccountKey.json');
} catch (e) {
  console.error(
    'Error: `serviceAccountKey.json` not found in the project root.'
  );
  console.error(
    'Please download it from your Firebase project settings and place it in the root directory.'
  );
  process.exit(1);
}

// Initialize Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount),
  projectId: firebaseConfig.projectId,
});

const firestore = getFirestore();

const DUMMY_USERS = [
  {
    email: 'sara.p@example.com',
    firstName: 'Sara',
    lastName: 'Palmer',
    userName: 'sara_paws',
    bio: 'Lover of all things fluffy. My golden retriever, Max, is my best friend. Always up for a hike!',
    city: 'Boulder',
    state: 'CO',
    country: 'USA',
    discoverable: true,
    pets: [
      {
        name: 'Max',
        breed: 'Golden Retriever',
        age: '4 years',
        bio: 'A certified good boy who loves chasing squirrels and napping in sunbeams.',
        imageUrl: 'https://picsum.photos/seed/max/400/400'
      },
    ],
  },
  {
    email: 'arjun.r@example.com',
    firstName: 'Arjun',
    lastName: 'Rao',
    userName: 'arjun_and_luna',
    bio: 'Cat dad to a mischievous Indie cat named Luna. Software engineer by day, professional cat cuddler by night.',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    discoverable: true,
    pets: [
      {
        name: 'Luna',
        breed: 'Indie',
        age: '2 years',
        bio: 'I may be small, but I am the queen of this castle. I enjoy knocking things off tables.',
        imageUrl: 'https://picsum.photos/seed/luna/400/400'
      },
    ],
  },
  {
    email: 'chen.w@example.com',
    firstName: 'Chen',
    lastName: 'Wang',
    userName: 'chen_walks_dogs',
    bio: 'Exploring the city with my two best buds, Rocky and Apollo. We love finding new parks and cafes.',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    discoverable: false, // This user will not show up in search
    pets: [
      {
        name: 'Rocky',
        breed: 'French Bulldog',
        age: '3 years',
        bio: 'Likes: snacks. Dislikes: bath time.',
        imageUrl: 'https://picsum.photos/seed/rocky/400/400'
      },
      {
        name: 'Apollo',
        breed: 'Beagle',
        age: '5 years',
        bio: 'My nose knows all the secrets. I will lead you to the best smells.',
        imageUrl: 'https://picsum.photos/seed/apollo/400/400'
      },
    ],
  },
  {
    email: 'priya.s@example.com',
    firstName: 'Priya',
    lastName: 'Sharma',
    userName: 'priya_and_kiwi',
    bio: 'Bird enthusiast and proud parakeet parent. Kiwi brings so much color and song into my life!',
    city: 'Mysuru',
    state: 'Karnataka',
    country: 'India',
    discoverable: true,
    pets: [
      {
        name: 'Kiwi',
        breed: 'Parakeet',
        age: '1 year',
        bio: 'Chirp chirp! I love millet seeds and shiny things.',
        imageUrl: 'https://picsum.photos/seed/kiwi/400/400'
      },
    ],
  },
];

async function seedDatabase() {
  console.log('Starting database seed...');
  const batch = firestore.batch();
  const usersCollection = firestore.collection('users');
  const petsCollection = firestore.collection('pets');
  
  for (const userData of DUMMY_USERS) {
    try {
      console.log(`Creating user profile: ${userData.email}`);
      const userRef = usersCollection.doc();
      const uid = userRef.id;
      
      const petIds: string[] = [];
      
      // Create pet documents
      for (const petData of userData.pets) {
          const petRef = petsCollection.doc();
          batch.set(petRef, {
              ...petData,
              id: petRef.id,
              ownerId: uid,
          });
          petIds.push(petRef.id);
          console.log(`  - Staging pet: ${petData.name} for user ${userData.email}`);
      }

      // Stage user profile document for creation
      batch.set(userRef, {
        id: uid,
        email: userData.email,
        userName: userData.userName,
        firstName: userData.firstName,
        lastName: userData.lastName,
        bio: userData.bio,
        city: userData.city,
        state: userData.state,
        country: userData.country,
        petIds: petIds,
        discoverable: userData.discoverable,
        onboardingCompleted: true,
        profilePicture: `https://i.pravatar.cc/150?u=${userData.email}`
      });

      console.log(`Successfully staged user and profile for ${userData.email}`);
    } catch (error: any) {
      console.error(`Failed to stage user ${userData.email}:`, error);
    }
  }

  try {
    await batch.commit();
    console.log('Batch commit successful. Database seeding complete!');
  } catch (error) {
    console.error('An unexpected error occurred during batch commit:', error);
  }
}

seedDatabase().catch((error) => {
  console.error('An unexpected error occurred during seeding:', error);
});
