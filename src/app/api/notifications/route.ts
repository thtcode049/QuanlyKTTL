import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const notifications = dataStore.getUserNotifications(userId || undefined);
    const unreadCount = dataStore.getUnreadNotificationCount(userId || undefined);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, message, type, link, taskId } = body;

    if (!userId || !title || !message) {
      return NextResponse.json({ error: "Thiếu thông tin người nhận hoặc nội dung" }, { status: 400 });
    }

    const notif = dataStore.createNotification({
      userId,
      title,
      message,
      type: type || "SYSTEM",
      link,
      taskId,
      isRead: false,
    });

    return NextResponse.json({ success: true, notification: notif });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { action, id, userId } = body;

    if (action === "read_all") {
      dataStore.markAllNotificationsAsRead(userId);
    } else if (id) {
      dataStore.markNotificationAsRead(id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
