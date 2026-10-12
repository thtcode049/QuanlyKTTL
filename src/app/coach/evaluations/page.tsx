"use client";

import React, { useState } from "react";
import {
  Award,
  Star,
  Search,
  Check,
  Save,
  Sparkles,
  TrendingUp,
  Brain,
  Shield,
  Target,
  Swords,
} from "lucide-react";
import { dataStore, StudentData, StudentEvaluationData } from "@/lib/data-store";
import { getStudentAvatarUrl } from "@/lib/chess-avatars";
import EvaluationStars from "@/components/evaluation-stars";
import confetti from "canvas-confetti";

export default function CoachEvaluationsPage() {
  const [currentCoachId, setCurrentCoachId] = useState<string>("user-coach-1");
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [month, setMonth] = useState(10);
  const [year, setYear] = useState(2026);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tải danh sách học viên của riêng HLV hiện tại
  React.useEffect(() => {
    let coachId = "user-coach-1";
    let isAdmin = false;
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.id) coachId = u.id;
        if (u.role === "ADMIN") isAdmin = true;
      } catch (e) {}
    }
    setCurrentCoachId(coachId);

    const myClasses = isAdmin
      ? dataStore.classes
      : dataStore.classes.filter((c) => c.coachId === coachId);
    const myClassIds = myClasses.map((c) => c.id);
    const myStudents = isAdmin
      ? dataStore.students
      : dataStore.students.filter((s) => s.classIds.some((cid) => myClassIds.includes(cid)));
    setStudents(myStudents);
    setSelectedStudentId(myStudents[0]?.id || "");
  }, []);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  // Lấy đánh giá của học viên
  const currentEval =
    dataStore.evaluations.find(
      (e) => e.studentId === selectedStudent?.id && e.month === month && e.year === year
    ) || {
      id: `eval-${selectedStudent?.id}-${month}-${year}`,
      studentId: selectedStudent?.id || "",
      month,
      year,
      opening: 3,
      tactics: 3,
      calculation: 3,
      endgame: 3,
      generalNote: "",
    };

  const [opening, setOpening] = useState(currentEval.opening);
  const [tactics, setTactics] = useState(currentEval.tactics);
  const [calculation, setCalculation] = useState(currentEval.calculation);
  const [endgame, setEndgame] = useState(currentEval.endgame);
  const [generalNote, setGeneralNote] = useState(currentEval.generalNote || "");
  const [elo, setElo] = useState(selectedStudent?.eloRating || 1000);

  // Khi đổi học viên, load lại state
  const handleSelectStudent = (std: StudentData) => {
    setSelectedStudentId(std.id);
    const ev = dataStore.evaluations.find(
      (e) => e.studentId === std.id && e.month === month && e.year === year
    );
    setOpening(ev?.opening || 3);
    setTactics(ev?.tactics || 3);
    setCalculation(ev?.calculation || 3);
    setEndgame(ev?.endgame || 3);
    setGeneralNote(ev?.generalNote || "");
    setElo(std.eloRating);
  };

  const handleSaveEvaluation = () => {
    // Cập nhật Elo cho học viên
    if (selectedStudent) {
      selectedStudent.eloRating = elo;
    }

    const existingIndex = dataStore.evaluations.findIndex(
      (e) => e.studentId === selectedStudent?.id && e.month === month && e.year === year
    );

    const updatedData: StudentEvaluationData = {
      id: `eval-${selectedStudent?.id}-${month}-${year}`,
      studentId: selectedStudent?.id || "",
      month,
      year,
      opening,
      tactics,
      calculation,
      endgame,
      generalNote,
    };

    if (existingIndex >= 0) {
      dataStore.evaluations[existingIndex] = updatedData;
    } else {
      dataStore.evaluations.push(updatedData);
    }

    setSaveSuccess(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#00B18A", "#E67E22", "#738136"],
    });
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Đánh Giá Kỳ Thủ & Hệ Số Elo
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Theo dõi sự tiến bộ định kỳ: Khai cuộc, Chiến thuật, Tính toán và Tàn cuộc của học sinh.
          </p>
        </div>

        <button
          onClick={handleSaveEvaluation}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover active:scale-95"
        >
          <Save className="h-4 w-4" />
          <span>Lưu Đánh Giá Chuyên Môn</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 border border-emerald-200 animate-fade-in shadow-sm">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>Đã lưu thành công đánh giá và hệ số Elo cho kỳ thủ {selectedStudent?.fullName}!</span>
        </div>
      )}

      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-soft">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-brand-primary shadow-sm">
            <Award className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-900">
            Chưa có học viên nào để đánh giá chuyên môn
          </h2>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            Hệ thống không hiển thị dữ liệu học sinh mẫu đối với tài khoản thật của bạn. Vui lòng tạo lớp học và thêm học sinh để bắt đầu theo dõi tiến độ và đánh giá kỹ năng cờ vua.
          </p>
          <a
            href="/coach/classes"
            className="mt-6 flex items-center gap-2 rounded-2xl bg-brand-primary px-6 py-3 text-xs font-bold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-primary-hover active:scale-95 transition-all"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Đến Quản Lý Lớp Học</span>
          </a>
        </div>
      ) : (
        <>
          {/* Main Grid: Student List Left - Detail Rating Right */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Student Selector */}
            <div className="rounded-2xl bg-white p-4 shadow-soft border border-slate-200/80 lg:col-span-4">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-slate-900">Danh Sách Kỳ Thủ ({students.length})</h3>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên hoặc mã..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs focus:border-brand-primary focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-[550px] space-y-1.5 overflow-y-auto pr-1">
            {filteredStudents.map((std) => {
              const isSelected = std.id === selectedStudent?.id;
              const avatarUrl = getStudentAvatarUrl(std.avatar, std.fullName);
              return (
                <div
                  key={std.id}
                  onClick={() => handleSelectStudent(std)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl p-2.5 transition-all ${
                    isSelected
                      ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                      : "bg-slate-50/70 hover:bg-slate-100 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={avatarUrl}
                      alt={std.fullName}
                      className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/30 flex-shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">{std.fullName}</span>
                        <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                          ({std.code})
                        </span>
                      </div>
                      <p className={`text-[11px] ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                        {std.currentLevel} • Sinh năm {std.birthYear}
                      </p>
                    </div>
                  </div>

                  <span className={`rounded-lg px-2 py-0.5 text-xs font-black ${
                    isSelected ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                  }`}>
                    ★ {std.eloRating}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed 4 criteria rating */}
        <div className="space-y-6 lg:col-span-8">
          {selectedStudent && (
            <div className="rounded-2xl bg-white p-6 shadow-soft border border-slate-200/80">
              {/* Header profile */}
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-slate-100 ring-2 ring-brand-primary/30 shadow-md shadow-brand-primary/20 flex-shrink-0">
                    <img
                      src={getStudentAvatarUrl(selectedStudent.avatar, selectedStudent.fullName)}
                      alt={selectedStudent.fullName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{selectedStudent.fullName}</h2>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-brand-primary">
                        {selectedStudent.currentLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Mã HV: {selectedStudent.code} • Phụ huynh: {selectedStudent.parentName} ({selectedStudent.parentPhone})
                    </p>
                  </div>
                </div>

                {/* Elo adjust */}
                <div className="rounded-xl bg-amber-50 p-3 border border-amber-200/80 text-center">
                  <span className="text-[10px] font-bold uppercase text-amber-800">Hệ số Elo Nội Bộ</span>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <input
                      type="number"
                      value={elo}
                      onChange={(e) => setElo(Number(e.target.value))}
                      className="w-20 rounded-lg border border-amber-300 bg-white py-1 text-center text-sm font-black text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                  </div>
                </div>
              </div>

              {/* 4 Criteria Sliders / Stars */}
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Đánh Giá 4 Tiêu Chí Cờ Vua Chuẩn Hóa:
                </h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <EvaluationStars
                    label="1. Khai cuộc (Opening)"
                    value={opening}
                    onChange={setOpening}
                    icon="opening"
                  />

                  <EvaluationStars
                    label="2. Chiến thuật (Tactics)"
                    value={tactics}
                    onChange={setTactics}
                    icon="tactics"
                  />

                  <EvaluationStars
                    label="3. Tính toán (Calculation)"
                    value={calculation}
                    onChange={setCalculation}
                    icon="calculation"
                  />

                  <EvaluationStars
                    label="4. Tàn cuộc (Endgame)"
                    value={endgame}
                    onChange={setEndgame}
                    icon="endgame"
                  />
                </div>
              </div>

              {/* Coach General Notes */}
              <div className="mt-6">
                <label className="block text-xs font-bold text-slate-700">
                  Nhận xét chi tiết của Huấn luyện viên
                </label>
                <textarea
                  rows={4}
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  placeholder="Ghi nhận sự tiến bộ, ưu điểm và điểm cần khắc phục của học sinh trong tháng..."
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 focus:border-brand-primary focus:bg-white focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveEvaluation}
                  className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover active:scale-95"
                >
                  <Save className="h-4 w-4" />
                  <span>Lưu Đánh Giá Chuyên Môn</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )}
</div>
  );
}
