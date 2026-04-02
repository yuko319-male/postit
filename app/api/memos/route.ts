import { NextResponse } from "next/server";
import { 
  fetchMemosFromSheet, 
  addMemoToSheet, 
  updateMemoInSheet, 
  deleteMemoFromSheet,
  SheetRow
} from "@/lib/google-sheets";

export async function GET() {
  try {
    const memos = await fetchMemosFromSheet();
    return NextResponse.json({ memos });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: SheetRow = await request.json();
    await addMemoToSheet(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body: SheetRow = await request.json();
    await updateMemoInSheet(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await deleteMemoFromSheet(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
