import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assigneeId = searchParams.get("assigneeId");
    const branchId = searchParams.get("branchId");

    let tasks = dataStore.tasks;
    if (assigneeId) {
      tasks = dataStore.getCoachTasks(assigneeId);
    }
    if (branchId && branchId !== "ALL") {
      tasks = tasks.filter((t) => t.branchId === branchId);
    }

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, category, priority, kpiPoints, dueDate, branchId, assigneeId, creatorId, creatorName } = body;

    if (!title || !assigneeId || !dueDate) {
      return NextResponse.json({ error: "Thiếu thông tin tiêu đề, HLV hoặc hạn nộp" }, { status: 400 });
    }

    const newTask = dataStore.createTask({
      title,
      description: description || "",
      category: category || "CHUYEN_MON",
      priority: priority || "MEDIUM",
      status: "PENDING",
      kpiPoints: Number(kpiPoints) || 10,
      dueDate,
      branchId,
      assigneeId,
      creatorId: creatorId || "user-admin",
      creatorName: creatorName || "Ban Chủ Nhiệm CLB",
    });

    // Cố gắng đồng bộ vào Database Supabase nếu có bảng
    try {
      await prisma.task.create({
        data: {
          id: newTask.id,
          title: newTask.title,
          description: newTask.description,
          category: newTask.category,
          priority: newTask.priority,
          status: newTask.status,
          kpiPoints: newTask.kpiPoints,
          dueDate: new Date(newTask.dueDate),
          branchId: newTask.branchId || null,
          assigneeId: newTask.assigneeId,
          creatorId: newTask.creatorId || null,
        },
      });
    } catch (dbErr) {
      // Bỏ qua lỗi DB nếu chưa chạy migration trên Supabase
    }

    return NextResponse.json({ success: true, task: newTask });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { action, taskId, reportNote, reportAttachments, approved, feedback, reviewerId, updates } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Thiếu taskId" }, { status: 400 });
    }

    let updatedTask = null;

    if (action === "submit_report") {
      updatedTask = dataStore.submitTaskReport(taskId, reportNote, reportAttachments);
      try {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: "COMPLETED_PENDING_REVIEW",
            reportNote,
            reportAttachments,
            submittedAt: new Date(),
          },
        });
      } catch (e) {}
    } else if (action === "review") {
      updatedTask = dataStore.reviewTask(taskId, Boolean(approved), feedback, reviewerId);
      try {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: approved ? "APPROVED" : "REJECTED",
            reviewedAt: new Date(),
            reviewFeedback: feedback,
          },
        });
      } catch (e) {}
    } else {
      updatedTask = dataStore.updateTask(taskId, updates || {});
    }

    if (!updatedTask) {
      return NextResponse.json({ error: "Không tìm thấy nhiệm vụ" }, { status: 404 });
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    if (!taskId) return NextResponse.json({ error: "Thiếu taskId" }, { status: 400 });

    dataStore.deleteTask(taskId);
    try {
      await prisma.task.delete({ where: { id: taskId } });
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
