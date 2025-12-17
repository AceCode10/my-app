/**
 * Database Seed Script
 * 
 * This script populates the Supabase database with sample data from subjects.json
 * Run with: npx tsx scripts/seed-database.ts
 * 
 * Make sure you have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  console.error('\nMake sure these are set in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Load subjects data
const subjectsPath = path.join(__dirname, '../src/lib/subjects.json');
const subjectsData = JSON.parse(fs.readFileSync(subjectsPath, 'utf-8'));

interface SubjectJSON {
  name: string;
  code: string;
  slug: string;
  icon: string;
  color: string;
  practicals?: boolean;
  papers: {
    year: number;
    session: string;
    papers: { name: string; type: string; link: string }[];
  }[];
  topics: { name: string; description: string }[];
}

async function seedSubjects() {
  console.log('\n📚 Seeding subjects...');
  
  const subjects: SubjectJSON[] = subjectsData;
  let insertedCount = 0;
  
  for (let i = 0; i < subjects.length; i++) {
    const subject = subjects[i];
    
    // Check if subject already exists
    const { data: existing } = await supabase
      .from('subjects')
      .select('id')
      .eq('slug', subject.slug)
      .single();
    
    if (existing) {
      console.log(`   ⏭️  ${subject.name} already exists, skipping...`);
      continue;
    }
    
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name: subject.name,
        slug: subject.slug,
        code: subject.code,
        level: 'IGCSE',
      })
      .select()
      .single();
    
    if (error) {
      console.error(`   ❌ Error inserting ${subject.name}:`, error.message);
    } else {
      console.log(`   ✅ Inserted: ${subject.name}`);
      insertedCount++;
    }
  }
  
  console.log(`\n   📊 Subjects: ${insertedCount} inserted`);
}

async function seedTopics() {
  console.log('\n📖 Seeding topics...');
  
  const subjects: SubjectJSON[] = subjectsData;
  let insertedCount = 0;
  
  for (const subject of subjects) {
    // Get subject ID
    const { data: subjectRecord } = await supabase
      .from('subjects')
      .select('id')
      .eq('slug', subject.slug)
      .single();
    
    if (!subjectRecord) {
      console.log(`   ⚠️  Subject ${subject.name} not found, skipping topics...`);
      continue;
    }
    
    for (let i = 0; i < subject.topics.length; i++) {
      const topic = subject.topics[i];
      const topicSlug = topic.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      
      // Check if topic already exists
      const { data: existing } = await supabase
        .from('topics')
        .select('id')
        .eq('subject_id', subjectRecord.id)
        .eq('slug', topicSlug)
        .single();
      
      if (existing) {
        continue; // Skip existing topics silently
      }
      
      const { error } = await supabase
        .from('topics')
        .insert({
          subject_id: subjectRecord.id,
          name: topic.name,
          slug: topicSlug,
          description: topic.description,
        });
      
      if (error) {
        console.error(`   ❌ Error inserting topic ${topic.name}:`, error.message);
      } else {
        insertedCount++;
      }
    }
    
    console.log(`   ✅ ${subject.name}: ${subject.topics.length} topics`);
  }
  
  console.log(`\n   📊 Topics: ${insertedCount} inserted`);
}

async function seedPapers() {
  console.log('\n📄 Seeding past papers...');
  console.log('   ⏭️  Skipping - papers table schema varies. Add papers via admin UI.');
  console.log('\n   📊 Papers: skipped');
}

async function seedSampleQuestions() {
  console.log('\n❓ Seeding sample questions...');
  
  // Get a few subjects to add sample questions
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, slug')
    .in('slug', ['mathematics', 'biology', 'chemistry', 'physics', 'computer-science'])
    .limit(5);
  
  if (!subjects || subjects.length === 0) {
    console.log('   ⚠️  No subjects found to add questions');
    return;
  }
  
  let insertedCount = 0;
  
  for (const subject of subjects) {
    // Get topics for this subject
    const { data: topics } = await supabase
      .from('topics')
      .select('id, name')
      .eq('subject_id', subject.id)
      .limit(3);
    
    if (!topics || topics.length === 0) continue;
    
    for (const topic of topics) {
      // Check if questions already exist for this topic
      const { data: existing } = await supabase
        .from('questions')
        .select('id')
        .eq('topic_id', topic.id)
        .limit(1);
      
      if (existing && existing.length > 0) continue;
      
      // Create sample MCQ questions
      const sampleQuestions = generateSampleQuestions(subject.name, topic.name, topic.id);
      
      for (const question of sampleQuestions) {
        const { error } = await supabase
          .from('questions')
          .insert(question);
        
        if (!error) {
          insertedCount++;
        }
      }
    }
    
    console.log(`   ✅ ${subject.name}: sample questions added`);
  }
  
  console.log(`\n   📊 Questions: ${insertedCount} inserted`);
}

function generateSampleQuestions(subjectName: string, topicName: string, topicId: string) {
  const questions = [];
  
  // Generate 3-5 sample MCQ questions per topic
  const questionTemplates = [
    {
      stem: `Which of the following best describes ${topicName.toLowerCase()}?`,
      options: [
        { id: 'a', text: 'A fundamental concept in the subject' },
        { id: 'b', text: 'An advanced technique' },
        { id: 'c', text: 'A historical development' },
        { id: 'd', text: 'A practical application' },
      ],
      correct: 'a',
    },
    {
      stem: `What is the primary purpose of studying ${topicName.toLowerCase()}?`,
      options: [
        { id: 'a', text: 'To understand theoretical foundations' },
        { id: 'b', text: 'To develop practical skills' },
        { id: 'c', text: 'To prepare for examinations' },
        { id: 'd', text: 'All of the above' },
      ],
      correct: 'd',
    },
    {
      stem: `In ${subjectName}, ${topicName.toLowerCase()} is important because:`,
      options: [
        { id: 'a', text: 'It forms the basis for more advanced topics' },
        { id: 'b', text: 'It has real-world applications' },
        { id: 'c', text: 'It is frequently tested in exams' },
        { id: 'd', text: 'All of the above' },
      ],
      correct: 'd',
    },
  ];
  
  for (let i = 0; i < questionTemplates.length; i++) {
    const template = questionTemplates[i];
    questions.push({
      topic_id: topicId,
      stem_markdown: template.stem,
      question_type: 'mcq',
      difficulty: i === 0 ? 'easy' : i === 1 ? 'medium' : 'hard',
      marks: 1,
      options: template.options,
      correct_answer: template.correct,
      explanation: `This question tests your understanding of ${topicName.toLowerCase()} in ${subjectName}.`,
      status: 'published',
    });
  }
  
  return questions;
}

async function seedSampleNotes() {
  console.log('\n📝 Seeding sample notes...');
  
  // Get a few subjects to add sample notes
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, slug')
    .in('slug', ['mathematics', 'biology', 'chemistry'])
    .limit(3);
  
  if (!subjects || subjects.length === 0) {
    console.log('   ⚠️  No subjects found to add notes');
    return;
  }
  
  let insertedCount = 0;
  
  for (const subject of subjects) {
    // Get topics for this subject
    const { data: topics } = await supabase
      .from('topics')
      .select('id, name, slug')
      .eq('subject_id', subject.id)
      .limit(2);
    
    if (!topics || topics.length === 0) continue;
    
    for (const topic of topics) {
      // Check if notes already exist for this topic
      const { data: existing } = await supabase
        .from('notes')
        .select('id')
        .eq('topic_id', topic.id)
        .limit(1);
      
      if (existing && existing.length > 0) continue;
      
      const noteSlug = `${subject.slug}-${topic.slug}-notes`;
      
      const { error } = await supabase
        .from('notes')
        .insert({
          title: `${topic.name} - Complete Revision Notes`,
          subtitle: `Comprehensive guide for ${subject.name} students`,
          slug: noteSlug,
          topic_id: topic.id,
          subject_id: subject.id,
          content_md: generateSampleNoteContent(subject.name, topic.name),
          visibility: 'public',
          is_downloadable: true,
          view_count: Math.floor(Math.random() * 100) + 10,
          published_at: new Date().toISOString(),
          tags: [subject.slug, 'igcse', 'revision'],
        });
      
      if (!error) {
        insertedCount++;
      }
    }
    
    console.log(`   ✅ ${subject.name}: sample notes added`);
  }
  
  console.log(`\n   📊 Notes: ${insertedCount} inserted`);
}

function generateSampleNoteContent(subjectName: string, topicName: string): string {
  return `# ${topicName}

## Introduction

This topic is a fundamental part of the ${subjectName} IGCSE curriculum. Understanding ${topicName.toLowerCase()} is essential for success in your examinations.

## Key Concepts

### 1. Definition and Overview

${topicName} refers to the study of core principles and their applications in ${subjectName.toLowerCase()}. Students should be able to:

- Define key terms related to ${topicName.toLowerCase()}
- Explain the main concepts
- Apply knowledge to solve problems

### 2. Important Points to Remember

- **Point 1**: Always start with the basics before moving to complex topics
- **Point 2**: Practice regularly with past paper questions
- **Point 3**: Make connections between different topics

### 3. Common Exam Questions

Examiners often ask students to:

1. Define and explain key terms
2. Apply concepts to real-world scenarios
3. Analyze data and draw conclusions
4. Evaluate different approaches

## Summary

${topicName} is a crucial topic in ${subjectName}. Make sure you understand the fundamental concepts and practice applying them to different types of questions.

## Further Reading

- Cambridge IGCSE ${subjectName} Textbook
- Past paper questions on ${topicName.toLowerCase()}
- Online resources and videos
`;
}

async function main() {
  console.log('🚀 Starting database seed...\n');
  console.log('━'.repeat(50));
  
  try {
    // Test connection
    const { error: testError } = await supabase.from('subjects').select('count').limit(1);
    if (testError) {
      console.error('❌ Database connection failed:', testError.message);
      process.exit(1);
    }
    console.log('✅ Database connection successful\n');
    
    // Seed in order
    await seedSubjects();
    await seedTopics();
    await seedPapers();
    await seedSampleQuestions();
    await seedSampleNotes();
    
    console.log('\n' + '━'.repeat(50));
    console.log('✅ Database seeding complete!\n');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
