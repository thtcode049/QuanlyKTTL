"use client";

import React from "react";
import { Star, Shield, Target, Brain, Award } from "lucide-react";

interface EvaluationStarsProps {
  label: string;
  value: number; // 1 to 5
  onChange?: (val: number) => void;
  readOnly?: boolean;
  icon?: "opening" | "tactics" | "calculation" | "endgame";
}

export const EvaluationStars: React.FC<EvaluationStarsProps> = ({
  label,
  value,
  onChange,
  readOnly = false,
  icon,
}) => {
  const getIcon = () => {
    switch (icon) {
      case "opening":
        return <Shield className="h-4 w-4 text-emerald-600" />;
      case "tactics":
        return <Target className="h-4 w-4 text-amber-600" />;
      case "calculation":
        return <Brain className="h-4 w-4 text-blue-600" />;
      case "endgame":
        return <Award className="h-4 w-4 text-purple-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200/70">
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="text-xs font-semibold text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= value;
          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              onClick={() => onChange && onChange(star)}
              className={`p-0.5 transition-transform ${
                readOnly
                  ? "cursor-default"
                  : "hover:scale-125 focus:outline-none"
              }`}
            >
              <Star
                className={`h-4 w-4 ${
                  isFilled
                    ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                    : "text-slate-300"
                }`}
              />
            </button>
          );
        })}
        <span className="ml-1.5 text-xs font-bold text-slate-600">
          {value}/5
        </span>
      </div>
    </div>
  );
};

export default EvaluationStars;
