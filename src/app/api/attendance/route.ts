import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");

  let sessions = dataStore.sessions;
  if (classId) {
    sessions = sessions.filter((s) => s.classId === classId);
  }

  return NextResponse.json({
    success: true,
    data: sessions,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classId, date, topic, records } = body;

    const existingIndex = dataStore.sessions.findIndex(
      (s) => s.classId === classId && s.date === date
    );

    const newSession = {
      id: `sess-${classId}-${date}`,
      classId,
      date,
      topic: topic || "Buổi học cờ vua",
      records: records || [],
    };

    if (existingIndex >= 0) {
      dataStore.sessions[existingIndex] = newSession;
    } else {
      dataStore.sessions.push(newSession);
    }

    const d = new Date(date);
    dataStore.recalculateAllInvoices(d.getMonth() + 1, d.getFullYear());

    return NextResponse.json({
      success: true,
      data: newSession,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
