import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Check auth
    const supabaseAuth = await createServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin
    const { data: userData } = await supabaseAuth
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: PNG, JPEG, GIF, WebP, SVG' }, { status: 400 });
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
    }

    // Use service role client for storage upload
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate a clean file name
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const sanitizedName = file.name
      .replace(/\.[^.]+$/, '') // remove extension
      .replace(/[^a-zA-Z0-9-_]/g, '_') // sanitize
      .substring(0, 50); // limit length
    const fileName = `${Date.now()}-${sanitizedName}.${ext}`;

    // Get optional folder from form data
    const folder = (formData.get('folder') as string) || 'general';
    const filePath = `${folder}/${fileName}`;

    // Upload to storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('note-images')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('note-images')
      .getPublicUrl(data.path);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
