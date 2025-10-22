
'use server';

import { collection, writeBatch, getDocs, Firestore, query, doc } from 'firebase/firestore';
import allSubjectsData from './subjects.json';
import type { SubjectData } from './subjects';
import type { Note, Subject, Topic } from '@/types';

/**
 * Checks which content (subjects, topics, notes) already exists in Firestore.
 * @param firestore The Firestore instance.
 * @returns An object containing sets of existing slugs/keys.
 */
async function getExistingContent(firestore: Firestore) {
  const [subjectsSnapshot, topicsSnapshot, notesSnapshot] = await Promise.all([
    getDocs(collection(firestore, 'subjects')),
    getDocs(collection(firestore, 'topics')),
    getDocs(collection(firestore, 'notes')),
  ]);

  const existingSubjects = new Set(subjectsSnapshot.docs.map(doc => doc.id));
  const existingTopics = new Set(topicsSnapshot.docs.map(doc => doc.id));
  const existingNotes = new Set(
    notesSnapshot.docs.map(doc => `${doc.data().subjectId}-${doc.data().topicId}`)
  );

  return { existingSubjects, existingTopics, existingNotes };
}

/**
 * Seeds Subjects, Topics, and Notes collections in Firestore from local JSON data.
 * This function is idempotent and will not create duplicates.
 * @param firestore The Firestore instance.
 * @returns A summary of the seeding operation.
 */
export async function seedDatabaseContent(firestore: Firestore): Promise<{ status: 'success' | 'info' | 'error', message: string, added: { subjects: number, topics: number, notes: number } }> {
  try {
    const { existingSubjects, existingTopics, existingNotes } = await getExistingContent(firestore);
    
    const batch = writeBatch(firestore);
    let subjectsAddedCount = 0;
    let topicsAddedCount = 0;
    let notesAddedCount = 0;

    const subjectsCollection = collection(firestore, 'subjects');
    const topicsCollection = collection(firestore, 'topics');
    const notesCollection = collection(firestore, 'notes');

    for (const subject of allSubjectsData as SubjectData[]) {
      // 1. Seed Subjects
      if (!existingSubjects.has(subject.slug)) {
        const newSubjectRef = doc(subjectsCollection, subject.slug);
        const subjectData: Omit<Subject, 'id'> = {
          name: subject.name,
          code: subject.code,
          slug: subject.slug,
          level: 'IGCSE', // Defaulting as per schema
          examBoard: 'CIE', // Defaulting
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        batch.set(newSubjectRef, subjectData);
        subjectsAddedCount++;
      }

      // 2. Seed Topics and Notes
      if (subject.topics) {
        for (const [index, topic] of subject.topics.entries()) {
          const topicSlug = topic.name.toLowerCase().replace(/ /g, '-');
          const topicId = `${subject.slug}-${topicSlug}`;

          // Seed Topic
          if (!existingTopics.has(topicId)) {
            const newTopicRef = doc(topicsCollection, topicId);
            const topicData: Omit<Topic, 'id'> = {
                subjectId: subject.slug,
                parentTopicId: null,
                name: topic.name,
                slug: topicSlug,
                order: index + 1,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            batch.set(newTopicRef, topicData);
            topicsAddedCount++;
          }
          
          // Seed Note for the Topic
          const noteKey = `${subject.slug}-${topicId}`;
          if (!existingNotes.has(noteKey) && topic.content_html) {
            const newNoteRef = doc(notesCollection); // Auto-generate ID
            const noteData: Omit<Note, 'id'> = {
              topicId: topicId,
              subjectId: subject.slug, // Add subjectId for better querying
              title: topic.name,
              subtitle: topic.description,
              slug: topicSlug,
              contentRaw: '', // Raw content is not in seed data
              contentFormat: 'richTextJson', // Assume rendered html is from a rich text source
              renderedHtml: topic.content_html,
              version: 1,
              authorId: 'system-seed',
              visibility: 'public',
              tags: [subject.name, topic.name],
              attachments: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              publishedAt: new Date(),
            };
            batch.set(newNoteRef, noteData);
            notesAddedCount++;
          }
        }
      }
    }

    if (subjectsAddedCount > 0 || topicsAddedCount > 0 || notesAddedCount > 0) {
      await batch.commit();
      const message = `Successfully seeded ${subjectsAddedCount} subjects, ${topicsAddedCount} topics, and ${notesAddedCount} notes.`;
      return { status: 'success', message, added: { subjects: subjectsAddedCount, topics: topicsAddedCount, notes: notesAddedCount } };
    } else {
      const message = 'Database is already up to date. No new content was added.';
      return { status: 'info', message, added: { subjects: 0, topics: 0, notes: 0 } };
    }
  } catch (error) {
    const message = `Failed to seed content: ${(error as Error).message}`;
    console.error(message, error);
    return { status: 'error', message, added: { subjects: 0, topics: 0, notes: 0 } };
  }
}
