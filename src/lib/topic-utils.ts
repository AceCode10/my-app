/**
 * Topic helpers shared by learner-facing pages.
 *
 * Ingestion parks questions it cannot classify on a per-subject "Unclassified"
 * topic (see `src/lib/ingestion/topic-assignment.ts`) so they stay reachable in
 * the test builder. That bucket is a staging area for teachers, not a syllabus
 * topic, so it must never appear in student navigation.
 */

export const UNCLASSIFIED_TOPIC_NAME = 'Unclassified';
export const UNCLASSIFIED_TOPIC_SLUG = 'unclassified';

interface TopicLike {
  name?: string | null;
  slug?: string | null;
}

export function isUnclassifiedTopic(topic: TopicLike | null | undefined): boolean {
  if (!topic) return false;
  return (
    topic.slug === UNCLASSIFIED_TOPIC_SLUG ||
    topic.name?.trim().toLowerCase() === UNCLASSIFIED_TOPIC_NAME.toLowerCase()
  );
}

/** Drop the ingestion parking bucket from a list of topics. */
export function withoutUnclassified<T extends TopicLike>(topics: T[] | null | undefined): T[] {
  return (topics || []).filter((topic) => !isUnclassifiedTopic(topic));
}
