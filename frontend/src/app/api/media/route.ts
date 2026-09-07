import { NextRequest, NextResponse } from 'next/server';
import { getSignedUrlForS3 } from '@/services/s3Service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  if (!key) {
    return NextResponse.json({ success: false, message: 'Key parameter is required' }, { status: 400 });
  }
  try {
    const signedUrl = await getSignedUrlForS3(key);
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ success: false, message: 'Error generating signed URL' }, { status: 500 });
  }
}
