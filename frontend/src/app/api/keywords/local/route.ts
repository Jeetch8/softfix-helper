import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/config/database';
import { listExcelFiles, importKeywordsFromDirectory, importKeywordsFromFile } from '@/services/localExcelService';

export async function GET(request: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const directoryPath = searchParams.get('directoryPath');

  if (!directoryPath) {
    return NextResponse.json(
      { success: false, message: 'directoryPath query parameter is required' },
      { status: 400 },
    );
  }

  try {
    const result = listExcelFiles(directoryPath);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Error listing Excel files',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  await connectDB();
  const body = await request.json();
  const { action, filePath, directoryPath, userId = 'default-user' } = body;

  try {
    if (action === 'import-directory') {
      if (!directoryPath) {
        return NextResponse.json(
          { success: false, message: 'directoryPath is required in request body' },
          { status: 400 },
        );
      }
      console.log(`📂 Starting local import from: ${directoryPath}`);
      const result = await importKeywordsFromDirectory(directoryPath, userId);
      if (!result.success) {
        return NextResponse.json({ success: false, message: result.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: result.message, data: result });
    }

    if (action === 'import-file') {
      if (!filePath) {
        return NextResponse.json(
          { success: false, message: 'filePath is required in request body' },
          { status: 400 },
        );
      }
      console.log(`📄 Starting local import from file: ${filePath}`);
      const result = await importKeywordsFromFile(filePath, userId);
      return NextResponse.json({
        success: true,
        message: `Imported keywords from ${result.fileName}`,
        data: result,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action. Use "import-directory" or "import-file"' },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Error importing keywords',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
