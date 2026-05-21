import React, { useState, useEffect, useRef, useMemo } from "react";
import { curatedPassages } from "./data/passages";
import { Passage, UserProgress, AIFeedback } from "./types";
import { 
  GraduationCap, 
  Timer, 
  BookOpen, 
  Sparkles, 
  Loader2, 
  ArrowRight, 
  AlertTriangle, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Info, 
  BrainCircuit, 
  Check, 
  HelpCircle, 
  Trophy, 
  Compass, 
  Pause, 
  Play, 
  Flame, 
  X
} from "lucide-react";

export default function App() {
  // Passages State
  const [passages, setPassages] = useState<Passage[]>(() => {
    try {
      const saved = localStorage.getItem("toefl_passages");
      return saved ? JSON.parse(saved) : curatedPassages;
    } catch {
      return curatedPassages;
    }
  });

  const [currentPassageId, setCurrentPassageId] = useState<string>(() => {
    return localStorage.getItem("toefl_current_passage_id") || "glaciers";
  });
  
  // Answers state: Maps word id (0 to 9) to user's custom filled letters string
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>(() => {
    try {
      const saved = localStorage.getItem("toefl_user_answers");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isSubmitted, setIsSubmitted] = useState<boolean>(() => {
    return localStorage.getItem("toefl_is_submitted") === "true";
  });

  // UI state
  const [focusedWordId, setFocusedWordId] = useState<number | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const [practiceMode, setPracticeMode] = useState<"practice" | "timed">(() => {
    return (localStorage.getItem("toefl_practice_mode") as "practice" | "timed") || "timed";
  });

  // Timer states
  const TIMER_START_SECONDS = 600; // 10 minutes default
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    const saved = localStorage.getItem("toefl_time_remaining");
    return saved ? parseInt(saved, 10) : TIMER_START_SECONDS;
  });

  const [countUpTime, setCountUpTime] = useState<number>(() => {
    const saved = localStorage.getItem("toefl_count_up_time");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(() => {
    return localStorage.getItem("toefl_is_timer_paused") === "true";
  });
  
  // Active Passage Ref
  const currentPassage = useMemo(() => {
    return passages.find((p) => p.id === currentPassageId) || passages[0];
  }, [passages, currentPassageId]);

  // Ref container for auto-focus progression with individual character positions
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Synchronize state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("toefl_passages", JSON.stringify(passages));
    } catch (e) {
      console.warn(e);
    }
  }, [passages]);

  useEffect(() => {
    localStorage.setItem("toefl_current_passage_id", currentPassageId);
  }, [currentPassageId]);

  useEffect(() => {
    try {
      localStorage.setItem("toefl_user_answers", JSON.stringify(userAnswers));
    } catch (e) {
      console.warn(e);
    }
  }, [userAnswers]);

  useEffect(() => {
    localStorage.setItem("toefl_is_submitted", isSubmitted ? "true" : "false");
  }, [isSubmitted]);

  useEffect(() => {
    localStorage.setItem("toefl_practice_mode", practiceMode);
  }, [practiceMode]);

  useEffect(() => {
    localStorage.setItem("toefl_time_remaining", timeRemaining.toString());
  }, [timeRemaining]);

  useEffect(() => {
    localStorage.setItem("toefl_count_up_time", countUpTime.toString());
  }, [countUpTime]);

  useEffect(() => {
    localStorage.setItem("toefl_is_timer_paused", isTimerPaused ? "true" : "false");
  }, [isTimerPaused]);

  // 1. Load predesigned exercises from API if desired, otherise fallback is fine.
  useEffect(() => {
    fetch("/api/passages")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.passages) {
          setPassages(data.passages);
        }
      })
      .catch((err) => console.log("Failed to fetch custom passages, using static default presets", err));
  }, []);

  // 2. Timer Hook: Handled based on practiceMode
  useEffect(() => {
    let interval: any = null;
    if (!isSubmitted && !isTimerPaused) {
      interval = setInterval(() => {
        if (practiceMode === "timed") {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              // Auto-submit when countdown hits zero
              handleAutoSubmit();
              return 0;
            }
            return prev - 1;
          });
        } else {
          setCountUpTime((prev) => prev + 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [practiceMode, isSubmitted, isTimerPaused]);

  // 3. Reset Answers whenever passage changes
  const handleSelectPassage = (id: string) => {
    setCurrentPassageId(id);
    setUserAnswers({});
    setIsSubmitted(false);
    setTimeRemaining(TIMER_START_SECONDS);
    setCountUpTime(0);
    setIsTimerPaused(false);
    setFocusedWordId(null);
  };

  // 4. Input changed handlers for individual char fields
  const handleCharChange = (wordId: number, charIdx: number, val: string, totalChars: number) => {
    // Only permit standard alphabetical letters
    const char = val.replace(/[^a-zA-Z]/g, "").toLowerCase().slice(-1);
    
    setUserAnswers((prev) => {
      const currentAns = prev[wordId] || "";
      const padded = currentAns.padEnd(totalChars, " ");
      const charArray = padded.split("");
      charArray[charIdx] = char || " ";
      const updated = charArray.join("");
      return {
        ...prev,
        [wordId]: updated,
      };
    });

    // Auto-focus move to next character cell
    if (char && charIdx < totalChars - 1) {
      const nextRef = inputRefs.current[`${wordId}-${charIdx + 1}`];
      if (nextRef) {
        nextRef.focus();
      }
    } else if (char && charIdx === totalChars - 1) {
      // Move to first char of the next word task (if exists)
      const nextWordId = wordId + 1;
      if (nextWordId <= 9) {
        const nextWordRef = inputRefs.current[`${nextWordId}-0`];
        if (nextWordRef) {
          nextWordRef.focus();
          setFocusedWordId(nextWordId);
        }
      }
    }
  };

  const handleCharKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    wordId: number,
    charIdx: number,
    totalChars: number
  ) => {
    const currentVal = userAnswers[wordId]?.[charIdx] || "";
    
    if (e.key === "Backspace") {
      if (currentVal && currentVal !== " ") {
        // Clear current box letter
        setUserAnswers((prev) => {
          const currentAns = prev[wordId] || "";
          const padded = currentAns.padEnd(totalChars, " ");
          const charArray = padded.split("");
          charArray[charIdx] = " ";
          return {
            ...prev,
            [wordId]: charArray.join(""),
          };
        });
      } else if (charIdx > 0) {
        // Current cell is empty, move backward and clear previous cell
        const prevRef = inputRefs.current[`${wordId}-${charIdx - 1}`];
        if (prevRef) {
          prevRef.focus();
          setUserAnswers((prev) => {
            const currentAns = prev[wordId] || "";
            const padded = currentAns.padEnd(totalChars, " ");
            const charArray = padded.split("");
            charArray[charIdx - 1] = " ";
            return {
              ...prev,
              [wordId]: charArray.join(""),
            };
          });
        }
      } else if (charIdx === 0 && wordId > 0) {
        // At first character of current word, move backward to last character of previous word
        const prevWordId = wordId - 1;
        const prevWordTotal = currentPassage?.wordTasks.find(t => t.id === prevWordId)?.missing.length || 0;
        if (prevWordTotal > 0) {
          const prevWordLastRef = inputRefs.current[`${prevWordId}-${prevWordTotal - 1}`];
          if (prevWordLastRef) {
            prevWordLastRef.focus();
            setFocusedWordId(prevWordId);
          }
        }
      }
    } else if (e.key === "ArrowLeft") {
      if (charIdx > 0) {
        inputRefs.current[`${wordId}-${charIdx - 1}`]?.focus();
      } else if (wordId > 0) {
        const prevWordId = wordId - 1;
        const prevWordTotal = currentPassage?.wordTasks.find(t => t.id === prevWordId)?.missing.length || 0;
        if (prevWordTotal > 0) {
          inputRefs.current[`${prevWordId}-${prevWordTotal - 1}`]?.focus();
          setFocusedWordId(prevWordId);
        }
      }
    } else if (e.key === "ArrowRight") {
      if (charIdx < totalChars - 1) {
        inputRefs.current[`${wordId}-${charIdx + 1}`]?.focus();
      } else if (wordId < 9) {
        const nextWordId = wordId + 1;
        inputRefs.current[`${nextWordId}-0`]?.focus();
        setFocusedWordId(nextWordId);
      }
    }
  };

  // 5. Build submission status
  const scoreResult = useMemo(() => {
    if (!currentPassage) return 0;
    let score = 0;
    currentPassage.wordTasks.forEach((task) => {
      const answer = (userAnswers[task.id] || "").replace(/\s/g, "").toLowerCase();
      if (answer === task.missing.toLowerCase().trim()) {
        score++;
      }
    });
    return score;
  }, [userAnswers, currentPassage]);

  // 6. Submit logic
  const handleSubmitQuiz = () => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    setIsTimerPaused(true);
  };

  const handleAutoSubmit = () => {
    if (isSubmitted) return;
    handleSubmitQuiz();
  };

  // 7. Reset exercise action
  const handleResetChallenge = () => {
    if (window.confirm("Are you sure you want to clear your current progress and restart the timer?")) {
      setUserAnswers({});
      setIsSubmitted(false);
      setTimeRemaining(TIMER_START_SECONDS);
      setCountUpTime(0);
      setIsTimerPaused(false);
      setFocusedWordId(null);
    }
  };

  // Helper formatting for seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Total blanks filled status
  const answersFilledCount = useMemo(() => {
    return Object.values(userAnswers).filter((val): val is string => typeof val === "string" && val.replace(/\s/g, "").length > 0).length;
  }, [userAnswers]);

  // Splitting passage logic dynamically to place custom inputs
  const renderedPassageText = useMemo(() => {
    if (!currentPassage) return null;
    const parts = currentPassage.rawTextWithPlaceholders.split(/(\{\d+\})/g);

    return parts.map((part, index) => {
      const match = part.match(/^\{(\d+)\}$/);
      if (match) {
        const id = parseInt(match[1], 10);
        const task = currentPassage.wordTasks.find((t) => t.id === id);
        if (task) {
          const isCorrectAnswer = (userAnswers[id] || "").replace(/\s/g, "").toLowerCase() === task.missing.toLowerCase();
          const isFilled = (userAnswers[id] || "").replace(/\s/g, "").length > 0;
          const isFocused = focusedWordId === id;

          return (
            <span 
              key={index} 
              id={`word-blank-wrapper-${id}`}
              className={`inline-flex flex-col items-center relative select-none mx-1 px-1 rounded-lg transition-all cursor-pointer ${
                isFocused ? "bg-blue-50/50 outline outline-2 outline-blue-500/20" : "hover:bg-slate-50"
              }`}
              onClick={() => {
                if (!isSubmitted) {
                  setFocusedWordId(id);
                  // Focus first unfilled character cell or the first cell
                  const ansStr = userAnswers[id] || "";
                  let focusIdx = 0;
                  for (let i = 0; i < task.missing.length; i++) {
                    if (!ansStr[i] || ansStr[i] === " ") {
                      focusIdx = i;
                      break;
                    }
                  }
                  inputRefs.current[`${id}-${focusIdx}`]?.focus();
                } else {
                  setFocusedWordId(id);
                }
              }}
            >
              <span className="flex items-center font-serif text-xl font-semibold text-slate-800 tracking-normal select-none">
                {/* Prefix part */}
                <span className="text-slate-800 font-bold select-text mr-0.5">{task.prefix}</span>
                
                {/* Sequential individual character input cells */}
                <span className="inline-flex gap-[2px] items-center">
                  {Array.from({ length: task.missing.length }).map((_, charIdx) => {
                    const cellVal = userAnswers[id]?.[charIdx] || "";
                    const displayChar = cellVal.trim();
                    const isCellCorrect = isSubmitted && displayChar.toLowerCase() === task.missing[charIdx].toLowerCase();

                    return (
                      <input
                        key={charIdx}
                        type="text"
                        id={`field-input-${id}-${charIdx}`}
                        ref={(el) => { inputRefs.current[`${id}-${charIdx}`] = el; }}
                        value={displayChar}
                        onChange={(e) => handleCharChange(id, charIdx, e.target.value, task.missing.length)}
                        onKeyDown={(e) => handleCharKeyDown(e, id, charIdx, task.missing.length)}
                        disabled={isSubmitted}
                        maxLength={1}
                        placeholder="_"
                        className={`w-5 sm:w-6 h-7 text-center font-mono focus:outline-none transition-all outline-none font-normal border-b-2 text-base rounded-t ${
                          isSubmitted
                            ? isCellCorrect
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                              : "border-red-400 bg-rose-55 text-rose-800"
                            : isFocused
                              ? "border-blue-600 bg-blue-50/60 text-blue-900"
                              : displayChar
                                ? "border-blue-200 bg-slate-50 text-slate-950"
                                : "border-slate-300 bg-transparent text-slate-400 hover:border-slate-400"
                        }`}
                        onFocus={() => setFocusedWordId(id)}
                      />
                    );
                  })}
                </span>
              </span>
              
              {/* Submission bubble feedback icon */}
              {isSubmitted && (
                <span className="absolute -top-3 right-0 z-10">
                  {isCorrectAnswer ? (
                    <span className="flex items-center justify-center w-4 h-4 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                      <Check className="w-3 h-3 stroke-[3.5]" />
                    </span>
                  ) : (
                    <span className="flex items-center justify-center w-4 h-4 bg-red-500 text-white rounded-full p-0.5 shadow-sm">
                      <X className="w-3 h-3 stroke-[3.5]" />
                    </span>
                  )}
                </span>
              )}
            </span>
          );
        }
      }
      return <span key={index} className="font-serif select-text text-xl leading-[2.1] text-slate-700 font-normal">{part}</span>;
    });
  }, [currentPassage, userAnswers, isSubmitted, focusedWordId]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans select-none" id="toefl-practice-box">
      
      {/* 1. Header Area with exact Professional Polish layout */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-10 shrink-0 sticky top-0 z-20 shadow-sm" id="header-nav">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-800 rounded shadow-md shadow-blue-800/10 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xl font-mono">T</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight flex items-center gap-2">
              TOEFL iBT® Task 1 Prep
              <span className="text-[10px] bg-indigo-50 border border-indigo-100 font-mono text-indigo-700 px-1.5 py-0.5 rounded font-extrabold uppercase">
                Word Completer
              </span>
            </h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-sans font-bold">
              Reading Section • Micro-Literacy
            </p>
          </div>
        </div>

        {/* Display live stats: Timer & Tracker */}
        <div className="flex items-center gap-6 sm:gap-10">
          <div className="text-center">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
              {practiceMode === "timed" ? "Thời gian còn lại" : "Thời gian tự luyện"}
            </p>
            <p className={`text-xl font-mono font-bold ${practiceMode === "timed" && timeRemaining <= 60 ? "text-red-600 animate-pulse" : "text-blue-800"}`}>
              {practiceMode === "timed" ? formatTime(timeRemaining) : formatTime(countUpTime)}
            </p>
          </div>
          <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
          
          <div className="text-center hidden sm:block">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Từ đã điền</p>
            <p className="text-xl font-mono font-bold text-slate-700">
              {answersFilledCount.toString().padStart(2, "0")} <span className="text-slate-300">/</span> 10
            </p>
          </div>
        </div>
      </header>

      {/* 2. Top Banner: Selection & Dashboard controls */}
      <section className="bg-slate-50 border-b border-slate-200 px-6 sm:px-10 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0" id="controls-panel">
        {/* Passages List Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-tight mr-2 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-slate-400" /> Chọn chủ đề:
          </span>
          {passages.map((p) => {
            const isSelected = p.id === currentPassageId;
            return (
              <button
                key={p.id}
                id={`btn-select-topic-${p.id}`}
                onClick={() => handleSelectPassage(p.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isSelected
                    ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {p.title} <span className="text-[9px] font-mono opacity-60 ml-1">({p.category})</span>
              </button>
            );
          })}
        </div>

        {/* Practice Mode Setup */}
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-200 p-0.5 rounded-lg border border-slate-300">
            <button
              id="mode-timed"
              onClick={() => {
                setPracticeMode("timed");
                setIsTimerPaused(false);
              }}
              disabled={isSubmitted}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
                practiceMode === "timed"
                  ? "bg-white text-slate-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 disabled:opacity-50"
              }`}
            >
              <Timer className="w-3 h-3" /> Tính giờ (10p)
            </button>
            <button
              id="mode-practice"
              onClick={() => {
                setPracticeMode("practice");
                setIsTimerPaused(false);
              }}
              disabled={isSubmitted}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
                practiceMode === "practice"
                  ? "bg-white text-slate-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 disabled:opacity-50"
              }`}
            >
              <Flame className="w-3 h-3" /> Chế độ tự luyện
            </button>
          </div>

          {/* Pause Timer toggle in Practice Mode */}
          {!isSubmitted && (
            <button
              id="btn-pause-timer"
              onClick={() => setIsTimerPaused(!isTimerPaused)}
              className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white"
              title={isTimerPaused ? "Tiếp tục" : "Tạm dừng"}
            >
              {isTimerPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Guided Help Modal toggle */}
          <button
            id="btn-help-modal"
            onClick={() => setShowHelpModal(true)}
            className="text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Hướng dẫn
          </button>
        </div>
      </section>

      {/* 3. Main Workspace split */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative" id="layout-body">
        
        {/* Left Side: Dynamic Reading Passage panel */}
        <section className="flex-1 p-6 sm:p-12 overflow-y-auto bg-white shadow-inner flex flex-col justify-between" id="reading-passage-view">
          <div className="max-w-3xl mx-auto w-full">
            
            {/* Task Instructions Banner on Top */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8" id="top-task-instructions">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Hướng dẫn làm bài
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-medium">
                Điền các chữ cái còn thiếu để hoàn thành 10 từ học thuật được đánh dấu trong bài đọc. 
                Mỗi ký tự <code className="font-mono bg-slate-100 px-1 py-0.5 text-xs rounded text-slate-800">_</code> đại diện cho đúng một chữ cái còn thiếu.
              </p>
            </div>

            {/* Passage Meta info and dynamic AI labels */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                Phân loại: {currentPassage?.category}
              </span>
              <span className="text-xs text-slate-400 italic">
                {currentPassageId.startsWith("custom_") && "✨ Tự động tạo bởi AI"}
              </span>
            </div>

            <h2 className="text-3xl font-serif font-black text-slate-800 mb-8 tracking-tight">
              {currentPassage?.title}
            </h2>

            {/* Simulated Paused Screen Cover */}
            {isTimerPaused && !isSubmitted ? (
               <div className="bg-slate-50/95 border border-slate-200/60 rounded-2xl p-10 py-16 text-center shadow-lg my-10 max-w-2xl mx-auto flex flex-col items-center">
                <Timer className="w-12 h-12 text-blue-700 animate-bounce mb-3" />
                <h3 className="text-xl font-bold text-slate-800">Đã tạm dừng bài luyện tập</h3>
                <p className="text-sm text-slate-500 max-w-md mt-2">
                  Đồng hồ đếm ngược đã dừng. Hãy tập trung cao độ và nhấn tiếp tục khi bạn sẵn sàng làm bài đọc học thuật.
                </p>
                <button
                  id="btn-resume-timer"
                  onClick={() => setIsTimerPaused(false)}
                  className="mt-6 px-8 py-3 bg-blue-800 text-white rounded-xl font-bold text-sm hover:bg-blue-900 shadow-md shadow-blue-800/10 transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" /> Tiếp tục luyện tập
                </button>
              </div>
            ) : (
              /* Actual Interactive Paragraph Text */
              <div className="text-slate-800 bg-white/50 relative">
                <p className="leading-[2.2] select-text">
                  {renderedPassageText}
                </p>
              </div>
            )}

            {/* Hint Card corresponding to the active focused word input */}
            {focusedWordId !== null && currentPassage && (
              <div className="mt-12 bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-xs relative" id="active-hint-callout">
                <button
                  id="btn-close-hint"
                  onClick={() => setFocusedWordId(null)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200"
                  title="Đóng gợi ý"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 text-blue-800 p-1.5 rounded-lg mt-0.5">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono uppercase text-slate-400 font-extrabold">
                      Gợi ý cho ô trống #{focusedWordId + 1}
                    </h4>
                    <p className="text-sm font-semibold text-slate-800 mt-1">
                      {currentPassage.wordTasks[focusedWordId].hint}
                    </p>
                    {isSubmitted ? (
                      <p className="text-xs text-indigo-700 font-mono mt-2 font-semibold">
                        Từ đúng: <strong className="font-bold underline">{currentPassage.wordTasks[focusedWordId].prefix}</strong> + <strong className="font-sans font-bold bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded text-indigo-900">{currentPassage.wordTasks[focusedWordId].missing}</strong> = <strong className="font-bold">{currentPassage.wordTasks[focusedWordId].fullWord}</strong>
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-400">Tiền tố cho sẵn: </span>
                        <kbd className="text-xs bg-slate-200 border border-slate-300 px-1.5 py-0.5 rounded font-mono text-slate-800 uppercase font-black tracking-wider">
                          {currentPassage.wordTasks[focusedWordId].prefix}
                        </kbd>
                        <span className="text-xs text-slate-400">Độ dài phần thiếu: </span>
                        <span className="text-xs bg-slate-200 border border-slate-300 px-1.5 py-0.5 rounded font-semibold text-slate-800">
                          {currentPassage.wordTasks[focusedWordId].missing.length} ký tự
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Curated scholarly explanation shown once standard test is submitted */}
            {isSubmitted && currentPassage && (
              <div className="mt-8 border-t border-slate-100 pt-8" id="scholarly-analysis">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-600" />
                  Phân tích diễn ngôn học thuật
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-2 p-5 bg-indigo-50/50 border border-indigo-100 rounded-xl font-medium">
                  {currentPassage.explanation}
                </p>
              </div>
            )}
          </div>
          
          {/* Subtle note in reading block */}
          <div className="mt-8 text-center text-xs text-slate-400 italic">
            Bài thi đọc TOEFL iBT thường kiểm tra năng lực liên kết diễn ngôn và các mối quan hệ ngữ cảnh.
          </div>
        </section>

        {/* Right Side: Sidebar Panel (Task Instructions, Tracker, custom generator) */}
        <aside className="w-full lg:w-96 bg-slate-100 border-t lg:border-t-0 lg:border-l border-slate-200 p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto shrink-0" id="sidebar-panel">
          
          {/* Vocabulary Completion Progress card */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col" id="tracker-card">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Theo dõi từ vựng
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {currentPassage?.wordTasks.map((task) => {
                const answerValue = (userAnswers[task.id] || "").replace(/\s/g, "");
                const isCorrectAnswer = answerValue.toLowerCase() === task.missing.toLowerCase();
                const isFilledIn = answerValue.length > 0;
                
                let chipStyle = "";
                let indicatorText = "";

                if (isSubmitted) {
                  if (isCorrectAnswer) {
                    chipStyle = "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold";
                    indicatorText = `✓ ${task.fullWord}`;
                  } else {
                    chipStyle = "bg-rose-50 text-rose-800 border-red-200 font-semibold";
                    indicatorText = `✗ ${task.prefix}${answerValue || "?"} (${task.fullWord})`;
                  }
                } else {
                  if (isFilledIn) {
                    chipStyle = "bg-blue-50 text-blue-800 border-blue-200 font-medium";
                    indicatorText = `${task.id + 1}. ${task.prefix}${answerValue}`;
                  } else {
                    chipStyle = "bg-white text-slate-400 border-slate-200 border-dashed italic";
                    indicatorText = `${task.id + 1}. Đang chờ...`;
                  }
                }

                return (
                  <button
                    key={task.id}
                    id={`vocabulary-tracker-btn-${task.id}`}
                    onClick={() => {
                      if (!isSubmitted) {
                        setFocusedWordId(task.id);
                        inputRefs.current[`${task.id}-0`]?.focus();
                      } else {
                        setFocusedWordId(task.id);
                      }
                    }}
                    className={`p-2.5 rounded border text-left cursor-pointer transition-all ${chipStyle}`}
                  >
                    <span className="truncate block select-all">{indicatorText}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kết quả bài làm (Active once submitted) */}
          {isSubmitted && (
            <div className="bg-slate-950 text-slate-50 rounded-2xl p-5 border border-slate-900 shadow-md scroll-mt-4" id="local-evaluation-display">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Kết Quả Bài Làm
              </h3>

              <div>
                <h4 className="text-3xl font-black font-mono text-white flex items-baseline gap-1">
                  {scoreResult} / 10
                  <span className="text-xs text-slate-400 font-normal ml-1">Điểm Học Thuật</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-2 font-sans font-medium">
                  {scoreResult === 10
                    ? "Xuất sắc! Bạn đã trả lời đúng hoàn toàn tất cả các từ học thuật. Hãy tiếp tục duy trì phong độ này cho các bài đọc tiếp theo."
                    : scoreResult >= 8
                    ? "Rất tốt! Bạn có phản xạ từ vựng học thuật cực kỳ nhạy bén và hiểu rõ cấu trúc bài khóa."
                    : scoreResult >= 5
                    ? "Kết quả khá ổn! Bạn đã đoán đúng phần lớn các từ vựng học thuật chính. Hãy xem kỹ các từ chưa đúng bên dưới."
                    : "Cố gắng lên! Bài đọc học thuật TOEFL iBT có nhiều từ vựng phức tạp. Hãy nhấp vào các ô từ trong bài đọc hoặc xem danh sách phía dưới để học từ đúng."}
                </p>
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* 4. Footer Area with exact Professional Polish layout */}
      <footer className="h-20 bg-white border-t border-slate-200 flex items-center justify-between px-6 sm:px-10 shrink-0 z-10" id="footer-actions">
        <div className="flex gap-4">
          <button 
            id="btn-footer-reset"
            onClick={handleResetChallenge}
            className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Làm lại bài này
          </button>
        </div>

        <div className="flex items-center gap-6">
          <p className="text-xs text-slate-400 italic hidden md:block">
            Trạng thái bài làm được tự động lưu lại.
          </p>
          
          {isSubmitted ? (
            <div className="flex items-center gap-3">
              {/* Reset challenge to do again, or proceed to next preset */}
              <button
                id="btn-do-again"
                onClick={() => {
                  setUserAnswers({});
                  setIsSubmitted(false);
                  setTimeRemaining(TIMER_START_SECONDS);
                  setCountUpTime(0);
                  setIsTimerPaused(false);
                  setFocusedWordId(null);
                }}
                className="px-5 py-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition-all"
              >
                Làm lại từ đầu
              </button>
              
              {/* Next topic button */}
              <button
                id="btn-next-passage"
                onClick={() => {
                  const currentIndex = passages.findIndex((p) => p.id === currentPassageId);
                  const nextIndex = (currentIndex + 1) % passages.length;
                  handleSelectPassage(passages[nextIndex].id);
                }}
                className="px-6 py-3 bg-slate-900 text-white hover:bg-slate-850 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                Bài đọc tiếp theo
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-submit-assessment"
              onClick={handleSubmitQuiz}
              disabled={answersFilledCount === 0}
              className="px-8 sm:px-10 py-3 bg-blue-800 text-white rounded font-bold hover:bg-blue-900 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
            >
              Nộp bài & Xem nhận xét
            </button>
          )}
        </div>
      </footer>

      {/* 5. Guided Help / Reference standard modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="help-modal-panel">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative border border-slate-200">
            <button
              id="btn-close-help-modal"
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
              title="Đóng hướng dẫn"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                Hướng dẫn làm bài TOEFL: Hoàn thành từ
              </h3>
            </div>

            <div className="space-y-4 text-sm text-slate-600 leading-relaxed font-sans font-medium">
              <p>
                Trong các bài kiểm tra micro-literacy phần đọc của kỳ thi TOEFL iBT tiêu chuẩn, bạn sẽ được đọc các văn bản học thuật thực tế với một số chữ cái đã bị lược bớt để đánh giá tư duy cấu trúc ngữ pháp, liên kết diễn ngôn và từ vựng chuyên ngành.
              </p>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-tight">
                  Chiến thuật làm bài:
                </h4>
                <ul className="list-disc list-inside text-xs space-y-2.5 text-slate-600 pl-1">
                  <li>
                    <strong className="text-slate-800">Đếm số chữ cái:</strong> Mỗi ký tự gạch chân đại diện cho <span className="underline">đúng một</span> chữ cái còn thiếu. Hãy quan sát giới hạn số ô nhập!
                  </li>
                  <li>
                    <strong className="text-slate-800">Liên từ & Đại từ liên kết:</strong> Các giới từ thông dụng (ví dụ: <em>of, in, into, and</em>) và đại từ (ví dụ: <em>they, these, their</em>) là những điểm trọng tâm kiểm tra.
                  </li>
                  <li>
                    <strong className="text-slate-800">Chuyển ô tự động:</strong> Việc nhập các ký tự để hoàn thành từ sẽ tự động di chuyển con trỏ chuột sang ô trống tiếp theo để bạn hoàn toàn tập trung vào mạch đọc.
                  </li>
                </ul>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-650 shrink-0 mt-0.5" />
                <span>
                  <strong>Hệ thống chấm điểm tức thì:</strong> Sau khi gửi bài, hệ thống sẽ ngay lập tức so sánh câu trả lời của bạn với đáp án chính thức và xuất kết quả học tập chi tiết tại chỗ!
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                id="btn-dismiss-help"
                onClick={() => setShowHelpModal(false)}
                className="px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-all"
              >
                Đồng ý & Bắt đầu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
