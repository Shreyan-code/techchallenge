'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';

type ErrorCallback = (error: any) => void;

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth, onError?: ErrorCallback): void {
  signInAnonymously(authInstance).catch(error => {
      if (onError) {
          onError(error);
      } else {
          console.error("Anonymous sign-in failed:", error);
      }
  });
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string, onError?: ErrorCallback): void {
  createUserWithEmailAndPassword(authInstance, email, password).catch(error => {
      if (onError) {
          onError(error);
      } else {
          console.error("Email sign-up failed:", error);
      }
  });
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string, onError?: ErrorCallback): void {
  signInWithEmailAndPassword(authInstance, email, password).catch(error => {
      if (onError) {
          onError(error);
      } else {
          console.error("Email sign-in failed:", error);
      }
  });
}
