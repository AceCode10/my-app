'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Server action to fix context-only questions
 * This runs on the server with proper auth context
 */
export async function fixContextQuestions() {
  try {
    const supabase = await createClient();
    
    // For this specific admin operation, we'll proceed without strict auth check
    // In production, you might want to add proper auth verification
    console.log('Running context questions fix...');
    
    // First, let's check what's in the database
    const { data: allPaperQuestions, error: pqCountError } = await supabase
      .from('paper_questions')
      .select('id, question_text, marks, part_label, parent_question_id')
      .limit(10);
    
    const { data: allQuestions, error: qCountError } = await supabase
      .from('questions')
      .select('id, stem_md, marks, part_label, parent_question_id')
      .limit(10);
    
    const results = {
      paper_questions_fixed: 0,
      questions_fixed: 0,
      errors: [] as string[]
    };

    // Fix paper_questions table
    console.log('Checking paper_questions for parent questions...');
    const { data: paperQuestionsWithChildren, error: pqError } = await supabase
      .from('paper_questions')
      .select('parent_question_id')
      .not('parent_question_id', 'is', null);

    if (pqError) {
      results.errors.push(`Error fetching paper_questions children: ${pqError.message}`);
    } else {
      console.log(`Found ${paperQuestionsWithChildren?.length || 0} child questions in paper_questions`);
      const parentIds = [...new Set(paperQuestionsWithChildren?.map(q => q.parent_question_id) || [])];
      console.log(`Unique parent IDs:`, parentIds);
      
      if (parentIds.length > 0) {
        console.log('Updating parent questions...');
        const { data: updated, error: updateError } = await supabase
          .from('paper_questions')
          .update({ 
            marks: 0, 
            needs_answer: false,
            question_type: 'context'
          })
          .in('id', parentIds)
          .select('id');
        
        if (updateError) {
          results.errors.push(`Error updating paper_questions parents: ${updateError.message}`);
        } else {
          results.paper_questions_fixed = updated?.length || 0;
          console.log(`Fixed ${updated?.length || 0} paper_questions`);
        }
      }
    }

    // Fix questions table
    console.log('Checking questions table for parent questions...');
    const { data: questionsWithChildren, error: qError } = await supabase
      .from('questions')
      .select('parent_question_id')
      .not('parent_question_id', 'is', null);

    if (qError) {
      results.errors.push(`Error fetching questions children: ${qError.message}`);
    } else {
      console.log(`Found ${questionsWithChildren?.length || 0} child questions in questions table`);
      const parentIds = [...new Set(questionsWithChildren?.map(q => q.parent_question_id) || [])];
      console.log(`Unique parent IDs in questions:`, parentIds);
      
      if (parentIds.length > 0) {
        console.log('Updating parent questions in questions table...');
        const { data: updated, error: updateError } = await supabase
          .from('questions')
          .update({ 
            marks: 0, 
            needs_answer: false,
            question_type: 'context'
          })
          .in('id', parentIds)
          .select('id');
        
        if (updateError) {
          results.errors.push(`Error updating questions parents: ${updateError.message}`);
        } else {
          results.questions_fixed = updated?.length || 0;
          console.log(`Fixed ${updated?.length || 0} questions`);
        }
      }
    }

    // Also fix questions with context patterns
    const contextPatterns = [
      'consists of both',
      'has been the victim',
      'needs to be considered',
      'the following',
      'read the',
      'study the'
    ];

    console.log('Checking for context patterns...');
    for (const pattern of contextPatterns) {
      console.log(`Checking pattern: ${pattern}`);
      
      // Update paper_questions
      const { error: pqPatternError, count: pqCount } = await supabase
        .from('paper_questions')
        .update({ marks: 0, needs_answer: false, question_type: 'context' })
        .is('part_label', null)
        .ilike('question_text', `%${pattern}%`)
        .gt('marks', 0);
      
      if (pqPatternError) {
        results.errors.push(`Pattern update error (paper_questions): ${pqPatternError.message}`);
      } else if (pqCount && pqCount > 0) {
        results.paper_questions_fixed += pqCount;
        console.log(`Fixed ${pqCount} paper_questions with pattern: ${pattern}`);
      }

      // Update questions - check both stem_md and stem_markdown
      const { error: qPatternError, count: qCount } = await supabase
        .from('questions')
        .update({ marks: 0, needs_answer: false, question_type: 'context' })
        .is('part_label', null)
        .or(`stem_md.ilike.%${pattern}%,stem_markdown.ilike.%${pattern}%`)
        .gt('marks', 0);
      
      if (qPatternError) {
        results.errors.push(`Pattern update error (questions): ${qPatternError.message}`);
      } else if (qCount && qCount > 0) {
        results.questions_fixed += qCount;
        console.log(`Fixed ${qCount} questions with pattern: ${pattern}`);
      }
    }
    
    // Also fix standalone questions that are clearly context-only
    // These are questions that are very short and don't ask for an answer
    const { error: standaloneError, count: standaloneCount } = await supabase
      .from('questions')
      .update({ marks: 0, needs_answer: false, question_type: 'context' })
      .is('part_label', null)
      .is('parent_question_id', null)
      .lt('marks', 3)  // Questions with 1-2 marks that are likely context
      .or('stem_md.ilike.%victim%,stem_md.ilike.%consists of%,stem_md.ilike.%following%,stem_md.ilike.%considers%');
    
    if (standaloneError) {
      results.errors.push(`Standalone update error: ${standaloneError.message}`);
    } else if (standaloneCount && standaloneCount > 0) {
      results.questions_fixed += standaloneCount;
      console.log(`Fixed ${standaloneCount} standalone context questions`);
    }

    // Revalidate pages to show updated data
    revalidatePath('/admin/fix-questions');
    revalidatePath('/dashboard/student/papers');
    revalidatePath('/resources/topical-questions');
    revalidatePath('/dashboard/teacher/test-builder');

    return {
      success: true,
      message: 'Context questions fixed',
      results: {
        ...results,
        debug: {
          sample_paper_questions: allPaperQuestions?.slice(0, 3),
          sample_questions: allQuestions?.slice(0, 3),
          paper_questions_total: allPaperQuestions?.length,
          questions_total: allQuestions?.length,
          paper_children_found: paperQuestionsWithChildren?.length,
          questions_children_found: questionsWithChildren?.length
        }
      }
    };

  } catch (error: any) {
    console.error('Error fixing context questions:', error);
    return { 
      success: false, 
      error: error.message || 'Internal server error' 
    };
  }
}

/**
 * Server action to get stats about potential context questions
 */
/**
 * Server action to fix parent_question_id for existing paper_questions
 * This sets up the hierarchical structure based on question_number and part_label
 */
export async function fixParentQuestionIds() {
  try {
    const supabase = await createClient();
    console.log('Fixing parent_question_id for paper_questions...');
    
    // Get all paper_questions grouped by paper_id
    const { data: allQuestions, error: fetchError } = await supabase
      .from('paper_questions')
      .select('id, paper_id, question_number, part_label, parent_question_id')
      .order('paper_id')
      .order('question_number')
      .order('display_order');
    
    if (fetchError) {
      return { error: fetchError.message, fixed: 0 };
    }
    
    if (!allQuestions || allQuestions.length === 0) {
      return { message: 'No questions found', fixed: 0 };
    }
    
    // Group by paper_id
    const questionsByPaper = new Map<string, any[]>();
    for (const q of allQuestions) {
      if (!questionsByPaper.has(q.paper_id)) {
        questionsByPaper.set(q.paper_id, []);
      }
      questionsByPaper.get(q.paper_id)!.push(q);
    }
    
    const updates: { id: string; parent_question_id: string }[] = [];
    
    for (const [paperId, questions] of questionsByPaper) {
      // Group by question_number within each paper
      const questionsByNumber = new Map<number, any[]>();
      for (const q of questions) {
        const num = q.question_number;
        if (!questionsByNumber.has(num)) {
          questionsByNumber.set(num, []);
        }
        questionsByNumber.get(num)!.push(q);
      }
      
      for (const [questionNum, qGroup] of questionsByNumber) {
        if (qGroup.length <= 1) continue;
        
        // Find the main question (no part_label)
        const mainQuestion = qGroup.find((q: any) => !q.part_label);
        if (!mainQuestion) continue;
        
        // Find letter parts (a, b, c)
        const letterParts = qGroup.filter((q: any) => 
          q.part_label && /^[a-z]$/i.test(q.part_label)
        );
        
        // Find sub-parts like a(i), b(ii)
        const subParts = qGroup.filter((q: any) => 
          q.part_label && /^[a-z]\([ivx]+\)$/i.test(q.part_label)
        );
        
        // Set parent for letter parts
        for (const part of letterParts) {
          if (part.parent_question_id !== mainQuestion.id) {
            updates.push({ id: part.id, parent_question_id: mainQuestion.id });
          }
        }
        
        // Set parent for sub-parts
        for (const subPart of subParts) {
          const letterMatch = subPart.part_label.match(/^([a-z])/i);
          if (letterMatch) {
            const parentLetter = letterMatch[1].toLowerCase();
            const parentPart = letterParts.find((p: any) => p.part_label?.toLowerCase() === parentLetter);
            const targetParentId = parentPart ? parentPart.id : mainQuestion.id;
            if (subPart.parent_question_id !== targetParentId) {
              updates.push({ id: subPart.id, parent_question_id: targetParentId });
            }
          }
        }
        
        // Handle other parts
        const otherParts = qGroup.filter((q: any) => 
          q.part_label && 
          q.id !== mainQuestion.id &&
          !letterParts.includes(q) &&
          !subParts.includes(q)
        );
        for (const part of otherParts) {
          if (part.parent_question_id !== mainQuestion.id) {
            updates.push({ id: part.id, parent_question_id: mainQuestion.id });
          }
        }
      }
    }
    
    // Apply updates
    let fixed = 0;
    const errors: string[] = [];
    
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('paper_questions')
        .update({ parent_question_id: update.parent_question_id })
        .eq('id', update.id);
      
      if (updateError) {
        errors.push(`Error updating ${update.id}: ${updateError.message}`);
      } else {
        fixed++;
      }
    }
    
    console.log(`Fixed ${fixed} paper_questions with parent_question_id`);
    
    revalidatePath('/admin/papers');
    revalidatePath('/admin/fix-questions');
    
    return {
      message: `Fixed ${fixed} questions with parent_question_id`,
      fixed,
      total_checked: allQuestions.length,
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error: any) {
    console.error('Fix parent_question_id error:', error);
    return { error: error.message, fixed: 0 };
  }
}

/**
 * Server action to fix parent_question_id for existing questions in the question bank
 * This sets up the hierarchical structure based on question_number and part_label
 */
export async function fixQuestionBankParentIds() {
  try {
    const supabase = await createClient();
    console.log('Fixing parent_question_id for questions bank...');
    
    // Get all questions grouped by topic_id
    const { data: allQuestions, error: fetchError } = await supabase
      .from('questions')
      .select('id, topic_id, question_number, part_label, parent_question_id')
      .not('topic_id', 'is', null)
      .order('topic_id')
      .order('question_number')
      .order('display_order');
    
    if (fetchError) {
      return { error: fetchError.message, fixed: 0 };
    }
    
    if (!allQuestions || allQuestions.length === 0) {
      return { message: 'No questions found', fixed: 0 };
    }
    
    // Group by topic_id
    const questionsByTopic = new Map<string, any[]>();
    for (const q of allQuestions) {
      if (!questionsByTopic.has(q.topic_id)) {
        questionsByTopic.set(q.topic_id, []);
      }
      questionsByTopic.get(q.topic_id)!.push(q);
    }
    
    const updates: { id: string; parent_question_id: string }[] = [];
    
    for (const [topicId, questions] of questionsByTopic) {
      // Group by question_number within each topic
      const questionsByNumber = new Map<number, any[]>();
      for (const q of questions) {
        const num = q.question_number;
        if (num === null || num === undefined) continue;
        if (!questionsByNumber.has(num)) {
          questionsByNumber.set(num, []);
        }
        questionsByNumber.get(num)!.push(q);
      }
      
      for (const [questionNum, qGroup] of questionsByNumber) {
        if (qGroup.length <= 1) continue;
        
        // Find the main question (no part_label)
        const mainQuestion = qGroup.find((q: any) => !q.part_label);
        if (!mainQuestion) continue;
        
        // Find letter parts (a, b, c)
        const letterParts = qGroup.filter((q: any) => 
          q.part_label && /^[a-z]$/i.test(q.part_label)
        );
        
        // Find sub-parts like a(i), b(ii)
        const subParts = qGroup.filter((q: any) => 
          q.part_label && /^[a-z]\([ivx]+\)$/i.test(q.part_label)
        );
        
        // Set parent for letter parts
        for (const part of letterParts) {
          if (part.parent_question_id !== mainQuestion.id) {
            updates.push({ id: part.id, parent_question_id: mainQuestion.id });
          }
        }
        
        // Set parent for sub-parts
        for (const subPart of subParts) {
          const letterMatch = subPart.part_label.match(/^([a-z])/i);
          if (letterMatch) {
            const parentLetter = letterMatch[1].toLowerCase();
            const parentPart = letterParts.find((p: any) => p.part_label?.toLowerCase() === parentLetter);
            const targetParentId = parentPart ? parentPart.id : mainQuestion.id;
            if (subPart.parent_question_id !== targetParentId) {
              updates.push({ id: subPart.id, parent_question_id: targetParentId });
            }
          }
        }
        
        // Handle other parts
        const otherParts = qGroup.filter((q: any) => 
          q.part_label && 
          q.id !== mainQuestion.id &&
          !letterParts.includes(q) &&
          !subParts.includes(q)
        );
        for (const part of otherParts) {
          if (part.parent_question_id !== mainQuestion.id) {
            updates.push({ id: part.id, parent_question_id: mainQuestion.id });
          }
        }
      }
    }
    
    // Apply updates
    let fixed = 0;
    const errors: string[] = [];
    
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('questions')
        .update({ parent_question_id: update.parent_question_id })
        .eq('id', update.id);
      
      if (updateError) {
        errors.push(`Error updating ${update.id}: ${updateError.message}`);
      } else {
        fixed++;
      }
    }
    
    console.log(`Fixed ${fixed} questions with parent_question_id`);
    
    revalidatePath('/admin/questions');
    revalidatePath('/resources/topical-questions');
    
    return {
      message: `Fixed ${fixed} questions with parent_question_id`,
      fixed,
      total_checked: allQuestions.length,
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error: any) {
    console.error('Fix question bank parent_question_id error:', error);
    return { error: error.message, fixed: 0 };
  }
}

export async function getContextQuestionStats() {
  try {
    const supabase = await createClient();
    console.log('Getting context question stats...');
    
    // Get stats about potential context questions - check both tables
    const { data: paperParents } = await supabase
      .from('paper_questions')
      .select('id, question_text, marks, part_label, parent_question_id, question_number')
      .is('part_label', null)
      .or('marks.gt.0,marks.is.null')
      .limit(200);

    // Count how many have children
    const parentIds = paperParents?.map(p => p.id) || [];
    const { data: childCounts } = await supabase
      .from('paper_questions')
      .select('parent_question_id')
      .in('parent_question_id', parentIds);

    const parentsWithChildren = new Set(childCounts?.map(c => c.parent_question_id) || []);

    // Also check questions table
    const { data: questionParents } = await supabase
      .from('questions')
      .select('id, stem_md, stem_markdown, marks, part_label, parent_question_id, question_number')
      .is('part_label', null)
      .or('marks.gt.0,marks.is.null')
      .limit(200);

    const qParentIds = questionParents?.map(p => p.id) || [];
    const { data: qChildCounts } = await supabase
      .from('questions')
      .select('parent_question_id')
      .in('parent_question_id', qParentIds);

    const qParentsWithChildren = new Set(qChildCounts?.map(c => c.parent_question_id) || []);

    // Context patterns to look for
    const contextPatterns = [
      'consists of both',
      'has been the victim',
      'needs to be considered',
      'the following',
      'read the',
      'study the',
      'look at',
      'consider the',
      'the diagram shows',
      'the table shows'
    ];

    const potentialContextQuestions = [
      ...paperParents?.filter(p => 
        parentsWithChildren.has(p.id) || 
        contextPatterns.some(pattern => p.question_text?.toLowerCase().includes(pattern))
      ).map(p => ({
        id: p.id,
        text: p.question_text?.substring(0, 100),
        marks: p.marks,
        has_children: parentsWithChildren.has(p.id),
        table: 'paper_questions'
      })) || [],
      
      ...questionParents?.filter(q => 
        qParentsWithChildren.has(q.id) || 
        contextPatterns.some(pattern => {
          const text = (q.stem_md || q.stem_markdown || '').toLowerCase();
          return text.includes(pattern);
        })
      ).map(q => ({
        id: q.id,
        text: (q.stem_md || q.stem_markdown || '').substring(0, 100),
        marks: q.marks,
        has_children: qParentsWithChildren.has(q.id),
        table: 'questions'
      })) || []
    ];

    return {
      total_potential_context: potentialContextQuestions.length,
      samples: potentialContextQuestions.slice(0, 10)
    };

  } catch (error: any) {
    console.error('GET error:', error);
    return { error: error.message };
  }
}
