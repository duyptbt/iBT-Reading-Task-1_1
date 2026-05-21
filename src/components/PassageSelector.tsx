import React, { useState } from "react";
import { Passage } from "../types";
import { Sparkles, Loader2, ArrowRight, BookOpen, AlertTriangle } from "lucide-react";

interface PassageSelectorProps {
  passages: Passage[];
  currentPassageId: string;
  onSelectPassage: (id: string) => void;
  onGenerateCustom: (topic: string) => Promise<void>;
  isGenerating: boolean;
  generatorError: string | null;
}

export function PassageSelector({
  passages,
  currentPassageId,
  onSelectPassage,
  onGenerateCustom,
  isGenerating,
  generatorError
}: PassageSelectorProps) {
  const [customTopic, setCustomTopic] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim() || isGenerating) return;
    onGenerateCustom(customTopic.trim()).then(() => {
      setCustomTopic("");
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-6" id="passage-selector">
      {/* Curated Presets list */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono mb-3">
          1. Select An Academic Passage
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {passages.map((passage) => {
            const isSelected = passage.id === currentPassageId;
            return (
              <button
                key={passage.id}
                id={`btn-select-${passage.id}`}
                onClick={() => onSelectPassage(passage.id)}
                disabled={isGenerating}
                className={`py-3 px-4 rounded-xl text-left border transition-all relative overflow-hidden group ${
                  isSelected
                    ? "border-slate-950 bg-slate-950 text-white shadow-md shadow-slate-950/10"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-slate-50 disabled:opacity-50"
                }`}
              >
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <span
                      className={`text-[9px] font-mono font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                      }`}
                    >
                      {passage.category}
                    </span>
                    <h3 className="text-sm font-semibold mt-2 tracking-tight line-clamp-1">
                      {passage.title}
                    </h3>
                  </div>
                  <span className={`text-[11px] mt-2 inline-flex items-center gap-1 font-medium ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                    <BookOpen className="w-3 h-3" /> Practicing Task 1
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Custom passage Generator */}
      <div className="border-t border-gray-100 pt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 fill-indigo-200" /> 2. Generate Any Custom Topic (AI)
        </h2>
        <p className="text-xs text-gray-500 mb-4 max-w-2xl leading-relaxed">
          Type any college-level subject (e.g., <em>Quantum Physics, Marine Ecosystems, Ancient Greece</em>). Gemini will construct an authentic 10-word completion passage.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              id="input-custom-topic"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              disabled={isGenerating}
              placeholder="e.g., Evolution of Archaea, Volcanic Formations, French Impressionism"
              className="w-full text-sm font-sans border border-gray-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500 disabled:opacity-75 transition-all text-gray-800 placeholder-gray-400 font-medium"
            />
          </div>
          <button
            type="submit"
            id="btn-generate-custom"
            disabled={!customTopic.trim() || isGenerating}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold px-5 py-3 transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Passage
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Dynamic Loading Explanatory messages */}
        {isGenerating && (
          <div className="mt-4 bg-indigo-50/50 border border-indigo-100/30 rounded-xl p-4 flex gap-3 items-start animate-pulse">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mt-0.5" />
            <div>
              <p className="text-xs font-bold text-indigo-950 font-sans">
                Curating TOEFL Reading Material Particles...
              </p>
              <p className="text-[11px] text-indigo-700/80 mt-1 max-w-xl">
                Our AI model is selecting 10 cohesive academic keywords, parsing linguistic structures, and writing authoritative paragraphs conforming to standard iBT formats. This usually takes 5-10 seconds.
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {generatorError && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 items-start" id="generator-error-banner">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-950 font-sans">
                Linguistic Generation Paused
              </p>
              <p className="text-[11px] text-red-700/90 mt-1 leading-relaxed max-w-xl">
                {generatorError}
              </p>
              <p className="text-[10px] text-slate-500 mt-2">
                Tip: You can continue practicing with all our standard preset passages above without any interruptions!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
