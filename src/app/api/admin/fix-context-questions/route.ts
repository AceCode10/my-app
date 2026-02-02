import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API endpoint to fix context-only questions in the database
 * 
 * Context-only questions are parent questions that:
 * 1. Have children (parts like a, b, c)
 * 2. Don't have their own marks (or incorrectly have marks assigned)
 * 3. Just provide context for the child questions
 * 
 * This endpoint will:
 * 1. Find all parent questions that have children
 * 2. Set their marks to 0 if they only contain context
 * 3. Set needs_answer to false for context-only questions
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify admin access - use the same method as GET
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user found in auth check');
      return NextResponse.json({ error: 'Unauthorized - No user' }, { status: 401 });
    }
    
    // Check if user is admin - check multiple possible ways
    let isAdmin = false;
    
    // Check email for super admin first
    if (user.email === 'denny@igcse.com') {
      isAdmin = true;
    }
    
    // Try profiles table if not admin by email
    if (!isAdmin) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile?.role === 'admin') {
          isAdmin = true;
        }
      } catch (err) {
        console.log('Profile check failed:', err);
      }
    }
    
    // Also check user metadata
    if (!isAdmin && user.user_metadata?.role === 'admin') {
      isAdmin = true;
    }
    
    console.log('User:', user.email, 'IsAdmin:', isAdmin);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results = {
      paper_questions_fixed: 0,
      questions_fixed: 0,
      errors: [] as string[]
    };

    // Fix paper_questions table
    // Step 1: Find all questions that have children (are parents)
    const { data: paperQuestionsWithChildren, error: pqError } = await supabase
      .from('paper_questions')
      .select('parent_question_id')
      .not('parent_question_id', 'is', null);

    if (pqError) {
      results.errors.push(`Error fetching paper_questions children: ${pqError.message}`);
    } else {
      // Get unique parent IDs
      const parentIds = [...new Set(paperQuestionsWithChildren?.map(q => q.parent_question_id) || [])];
      
      if (parentIds.length > 0) {
        // Update parent questions to have marks=0 and needs_answer=false
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
        }
      }
    }

    // Fix questions table (Question Bank)
    const { data: questionsWithChildren, error: qError } = await supabase
      .from('questions')
      .select('parent_question_id')
      .not('parent_question_id', 'is', null);

    if (qError) {
      results.errors.push(`Error fetching questions children: ${qError.message}`);
    } else {
      const parentIds = [...new Set(questionsWithChildren?.map(q => q.parent_question_id) || [])];
      
      if (parentIds.length > 0) {
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
        }
      }
    }

    // Also fix questions that appear to be context-only based on text patterns
    // These are questions with no part_label, have children, and text doesn't end with a question
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

    // For each pattern, find and update matching questions
    for (const pattern of contextPatterns) {
      // Update paper_questions
      const { error: pqPatternError, count: pqCount } = await supabase
        .from('paper_questions')
        .update({ marks: 0, needs_answer: false, question_type: 'context' })
        .is('part_label', null)
        .ilike('question_text', `%${pattern}%`)
        .gt('marks', 0)
        .select('id');
      
      if (pqPatternError) {
        results.errors.push(`Pattern update error (paper_questions): ${pqPatternError.message}`);
      } else if (pqCount) {
        results.paper_questions_fixed += pqCount.length;
        console.log(`Fixed ${pqCount.length} paper_questions with pattern: ${pattern}`);
      }

      // Update questions
      const { error: qPatternError, count: qCount } = await supabase
        .from('questions')
        .update({ marks: 0, needs_answer: false, question_type: 'context' })
        .is('part_label', null)
        .or(`stem_md.ilike.%${pattern}%,stem_markdown.ilike.%${pattern}%`)
        .gt('marks', 0)
        .select('id');
      
      if (qPatternError) {
        results.errors.push(`Pattern update error (questions): ${qPatternError.message}`);
      } else if (qCount) {
        results.questions_fixed += qCount.length;
        console.log(`Fixed ${qCount.length} questions with pattern: ${pattern}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Context questions fixed',
      results
    });

  } catch (error: any) {
    console.error('Error fixing context questions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify admin access - same as POST
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    let isAdmin = false;
    
    if (user.email === 'denny@igcse.com') {
      isAdmin = true;
    }
    
    if (!isAdmin) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile?.role === 'admin') {
          isAdmin = true;
        }
      } catch (err) {
        // Profile check failed
      }
    }
    
    if (!isAdmin && user.user_metadata?.role === 'admin') {
      isAdmin = true;
    }
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
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

    return NextResponse.json({
      total_potential_context: potentialContextQuestions.length,
      samples: potentialContextQuestions.slice(0, 10)
    });

  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
