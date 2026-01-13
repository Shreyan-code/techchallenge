
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
const auth = getAuth();

const DUMMY_USERS = [
  {
    email: 'sp@gmail.com',
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
    email: 'ar@gmail.com',
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
    email: 'cw@gmail.com',
    firstName: 'Chen',
    lastName: 'Wang',
    userName: 'chen_walks_dogs',
    bio: 'Exploring the city with my two best buds, Rocky and Apollo. We love finding new parks and cafes.',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    discoverable: true,
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
    email: 'ps@gmail.com',
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

async function deleteAllUsers() {
    try {
        const listUsersResult = await auth.listUsers(1000);
        const uidsToDelete = listUsersResult.users.map(userRecord => userRecord.uid);
        if (uidsToDelete.length > 0) {
            console.log(`Deleting ${uidsToDelete.length} existing users...`);
            const result = await auth.deleteUsers(uidsToDelete);
            console.log(`Successfully deleted ${result.successCount} users.`);
            if (result.failureCount > 0) {
                console.warn(`Failed to delete ${result.failureCount} users.`);
            }
        } else {
            console.log('No existing users to delete in Auth.');
        }
    } catch (error) {
        console.error('Error deleting users:', error);
    }
}

async function clearCollection(collectionPath: string) {
    const collectionRef = firestore.collection(collectionPath);
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
        console.log(`Collection '${collectionPath}' is already empty.`);
        return;
    }

    console.log(`Deleting ${snapshot.size} documents from '${collectionPath}'...`);
    const batch = firestore.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Successfully cleared collection '${collectionPath}'.`);
}


async function seedDatabase() {
  console.log('Starting database seed...');
  
  // Clean up existing data
  await deleteAllUsers();
  await clearCollection('users');
  await clearCollection('pets');
  await clearCollection('posts');
  console.log('Cleanup complete. Starting to seed new data...');

  const createdUserIds: { [key: string]: string } = {};

  for (const userData of DUMMY_USERS) {
    try {
      console.log(`Creating auth user: ${userData.email}`);
      const userRecord = await auth.createUser({
        email: userData.email,
        password: 'password',
        displayName: `${userData.firstName} ${userData.lastName}`,
        emailVerified: true,
        disabled: false
      });

      const uid = userRecord.uid;
      createdUserIds[userData.userName] = uid; // Store UID by username for post creation
      const petIds: string[] = [];
      
      const petsCollection = firestore.collection('pets');
      const userProfileRef = firestore.collection('users').doc(uid);
      const batch = firestore.batch();

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
      batch.set(userProfileRef, {
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
      
      await batch.commit();
      console.log(`Successfully created user, profile, and pets for ${userData.email}`);
    } catch (error: any) {
      console.error(`Failed to create user ${userData.email}:`, error);
    }
  }

  // --- Seed Posts ---
  console.log('Seeding posts...');
  const postsCollection = firestore.collection('posts');
  const DUMMY_POSTS = [
    {
      authorId: createdUserIds['sara_paws'],
      content: 'Beautiful day for a hike with Max! He absolutely loves the mountains.',
      imageUrl: 'https://picsum.photos/seed/hike_day/600/600',
      createdAt: Timestamp.now(),
      likes: [],
      commentCount: 0,
    },
    {
      authorId: createdUserIds['arjun_and_luna'],
      content: 'I think Luna is plotting world domination from her cardboard box. Should I be worried? 😂',
      imageUrl: 'https://picsum.photos/seed/luna_box/600/600',
      createdAt: Timestamp.fromMillis(Timestamp.now().toMillis() - 3600000), // 1 hour ago
      likes: [createdUserIds['sara_paws']],
      commentCount: 0,
    },
    {
      authorId: createdUserIds['chen_walks_dogs'],
      content: 'Rocky and Apollo enjoying some puppuccinos after a long walk in the park.',
      imageUrl: 'https://picsum.photos/seed/puppuccino/600/600',
      createdAt: Timestamp.fromMillis(Timestamp.now().toMillis() - 86400000), // 1 day ago
      likes: [createdUserIds['arjun_and_luna'], createdUserIds['priya_and_kiwi']],
      commentCount: 0,
    },
    {
      authorId: createdUserIds['priya_and_kiwi'],
      content: 'Kiwi learned a new trick today! So proud of my little feathered genius.',
      createdAt: Timestamp.fromMillis(Timestamp.now().toMillis() - 172800000), // 2 days ago
      likes: [],
      commentCount: 0,
    }
  ];

  for (const postData of DUMMY_POSTS) {
    if (postData.authorId) {
      const postRef = postsCollection.doc();
      await postRef.set({
        ...postData,
        id: postRef.id
      });
      console.log(`  - Created post for user ${Object.keys(createdUserIds).find(key => createdUserIds[key] === postData.authorId)}`);
    }
  }

  console.log('Database seeding complete!');
}

seedDatabase().catch((error) => {
  console.error('An unexpected error occurred during seeding:', error);
});
