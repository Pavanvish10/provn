import { Lightbulb, MessageSquareQuote, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface QuestionAnalysisEntry {
  questionNumber: number;
  question: string;
  answer: string;
  score: number;
  feedback: string;
  improvementTip: string;
}

export interface QuestionAnalysisProps {
  entries: QuestionAnalysisEntry[];
}

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-300 bg-emerald-500/15";
  if (score >= 50) return "text-amber-300 bg-amber-500/15";
  return "text-rose-300 bg-rose-500/15";
}

export function QuestionAnalysis({ entries }: QuestionAnalysisProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-blue-950/30 backdrop-blur-xl sm:p-8">
      <h2 className="font-display text-lg font-semibold text-white">
        Question-by-Question Analysis
      </h2>
      <p className="mt-1 text-sm text-white/50">
        Every question, your answer, and the AI's feedback.
      </p>

      <Accordion type="single" collapsible className="mt-6 space-y-3">
        {entries.map((entry) => (
          <AccordionItem
            key={entry.questionNumber}
            value={`question-${entry.questionNumber}`}
            className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 [&[data-state=open]]:bg-white/[0.04]"
          >
            <AccordionTrigger className="text-white hover:no-underline [&>svg]:text-white/50">
              <div className="flex flex-1 items-center gap-3 pr-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    scoreColor(entry.score),
                  )}
                >
                  {entry.score}
                </span>
                <span className="flex-1 text-left text-sm font-medium text-white/85">
                  Q{entry.questionNumber}. {entry.question}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 text-white/70">
              <div className="flex gap-2.5 rounded-xl bg-white/[0.03] p-3">
                <MessageSquareQuote className="h-4 w-4 shrink-0 text-blue-300" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
                    Your Answer
                  </div>
                  <p className="mt-1 text-sm">{entry.answer}</p>
                </div>
              </div>
              <div className="flex gap-2.5 rounded-xl bg-white/[0.03] p-3">
                <Sparkles className="h-4 w-4 shrink-0 text-violet-300" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
                    AI Feedback
                  </div>
                  <p className="mt-1 text-sm">{entry.feedback}</p>
                </div>
              </div>
              <div className="flex gap-2.5 rounded-xl bg-white/[0.03] p-3">
                <Lightbulb className="h-4 w-4 shrink-0 text-amber-300" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-white/40">
                    Improvement Tip
                  </div>
                  <p className="mt-1 text-sm">{entry.improvementTip}</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
