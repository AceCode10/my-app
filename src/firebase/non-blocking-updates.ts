
'use client';
    
import {
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  serverTimestamp,
  increment,
  type Firestore,
  type CollectionReference,
  type DocumentReference,
  type SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';
import type { QuizAttempt } from '@/types';

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  setDoc(docRef, data, options).catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'write', // or 'create'/'update' based on options
        requestResourceData: data,
      })
    )
  })
  // Execution continues immediately
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Does NOT await the write operation internally.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  const promise = addDoc(colRef, data)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: data,
        })
      )
    });
  return promise;
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data,
        })
      )
    });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef)
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
      )
    });
}

/**
 * A non-blocking function to save a quiz attempt and update the user's XP.
 * @param firestore The Firestore instance.
 * @param userId The ID of the user.
 * @param attemptData The data for the quiz attempt.
 * @param xpGained The amount of XP the user gained.
 */
export function saveQuizAttempt(firestore: Firestore, userId: string, attemptData: Omit<QuizAttempt, 'id' | 'completedAt'>, xpGained: number) {
  const attemptWithTimestamp = {
    ...attemptData,
    completedAt: serverTimestamp(),
  };

  // Also add to a root collection for easier querying by teachers/admins
  const rootAttemptsRef = collection(firestore, 'quizAttempts');
  addDocumentNonBlocking(rootAttemptsRef, attemptWithTimestamp);

  // Update the user's XP
  const userRef = doc(firestore, 'users', userId);
  updateDocumentNonBlocking(userRef, {
    xp: increment(xpGained),
  });
}
