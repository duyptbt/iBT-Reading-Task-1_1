import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { curatedPassages } from "./src/data/passages.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API route: Get predesigned curated passages
app.get("/api/passages", (req, res) => {
  try {
    res.json({ success: true, passages: curatedPassages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it via the Settings > Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API route: Generate custom TOEFL complete-the-words passage using Gemini 3.5 Flash
app.post("/api/generate", async (req, res) => {
  const { topic } = req.body;
  if (!topic || typeof topic !== "string") {
    return res.status(400).json({ success: false, error: "Missing or invalid topic parameter" });
  }

  try {
    const ai = getGeminiClient();
    const systemPrompt = `You are an expert iBT TOEFL Reading curator. Your task is to generate cohesive, advanced-level academic reading paragraphs for TOEFL Reading Section Task 1: Complete the Words.
    The response must follow the strict JSON schema provided.
    Ensure exactly 10 academic/cohesive words are chosen to be completed.
    The paragraph text must be roughly 100 to 140 words.
    Importantly, in the "rawTextWithPlaceholders" string, replace the chosen full words with placeholders from {0} to {9}.
    For each chosen word, specify:
    1. id: Number from 0 to 9.
    2. fullWord: The complete original word (must be lowercase, trimmed).
    3. prefix: The prefilled starting letters (must consist of starting letters of the word, e.g., 2 to 4 letters, e.g. for "fundamental" prefix can be "fun").
    4. missing: The remainder missing letters, which when appended to the prefix form the fullWord exactly (so prefix + missing = fullWord).
    5. hint: An expressive grammatical or dictionary clue to help the TOEFL student.

    Choose a mix of closed-class relational words (like conjunctions 'although', prepositions 'through', pronouns) and rich academic content words (such as nouns/verbs like 'catalyst', 'accelerate', 'equilibrium') to reflect authentic TOEFL standards. All 10 indexes must correspond exactly between the text placeholder and the wordTasks items.`;

    const promptText = `Generate a TOEFL Reading Task 1 exercise on the raw academic topic: "${topic}". Make sure the topic is treated in an authoritative, collegiate prose style, typical of a university textbook.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "The academic title of the passage, e.g., 'The Dynamics of Coral Reef Bleaching'"
            },
            category: {
              type: Type.STRING,
              description: "The educational category of the passage, e.g., 'Environmental Science', 'Physics', 'Art History'"
            },
            rawTextWithPlaceholders: {
              type: Type.STRING,
              description: "The academic paragraph, including placeholders {0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, {8}, {9} where words are missing."
            },
            wordTasks: {
              type: Type.ARRAY,
              description: "List of exactly 10 word tasks corresponding to placeholders 0-9",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER, description: "Index of the placeholder" },
                  fullWord: { type: Type.STRING, description: "The complete lowercase word" },
                  prefix: { type: Type.STRING, description: "The starting letters of the word" },
                  missing: { type: Type.STRING, description: "The exact missing remaining letters" },
                  hint: { type: Type.STRING, description: "A detailed clue (part of speech, meaning, context)" }
                },
                required: ["id", "fullWord", "prefix", "missing", "hint"]
              }
            },
            explanation: {
              type: Type.STRING,
              description: "Detailed scholarly analysis of the passage and why the deleted words are vital for the discourse cohesion."
            }
          },
          required: ["title", "category", "rawTextWithPlaceholders", "wordTasks", "explanation"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response string returned from Gemini AI client.");
    }

    const passageData = JSON.parse(resultText.trim());

    // Clean up and validate lengths/data consistency on server-side
    if (!passageData.wordTasks || passageData.wordTasks.length !== 10) {
      throw new Error("Gemini did not return exactly 10 word tasks. Please try again.");
    }

    // Sort word tasks by id to match 0..9 sequence
    passageData.wordTasks.sort((a: any, b: any) => a.id - b.id);

    // Minor validation checks: Ensure fullWord = prefix + missing, and prefix is lowercase
    passageData.wordTasks = passageData.wordTasks.map((task: any) => {
      const fullWord = task.fullWord.toLowerCase().trim();
      const prefix = task.prefix.toLowerCase().trim();
      let missing = task.missing.toLowerCase().trim();

      // Recalculate missing letters if there was a discrepancy
      if (prefix + missing !== fullWord) {
        if (fullWord.startsWith(prefix)) {
          missing = fullWord.substring(prefix.length);
        }
      }

      return {
        id: task.id,
        fullWord,
        prefix,
        missing,
        hint: task.hint
      };
    });

    res.json({ success: true, passage: passageData });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API route: Provide AI Tutor review on incorrect answers
app.post("/api/tutor", async (req, res) => {
  const { passage, userAnswers } = req.body;
  if (!passage || !userAnswers) {
    return res.status(400).json({ success: false, error: "Missing passage or userAnswers payload." });
  }

  try {
    const ai = getGeminiClient();
    const systemPrompt = `You are a warm, highly erudite TOEFL Reading English Tutor. Your job is to analyze a student's responses, point out strengths, explain exactly why certain entries are incorrect, and give syntactic/lexicological tips for resolving them.
    CRITICAL: You must provide your comments and explanations (overallComments and tutorNote) in Vietnamese (Tiếng Việt), but keep any English vocabulary words, hints, or quotes referenced intact in English. Keep explanations encouraging, concise, and clear in Vietnamese.
    Output your analysis as beautiful, structured JSON conforming to the schema.`;

    const requestPrompt = `
      Passage Title: ${passage.title}
      Passage Text: ${passage.rawTextWithPlaceholders}

      Original Word Tasks:
      ${passage.wordTasks.map((t: any) => `Placeholder {${t.id}}: Prefixed with "${t.prefix}", Expected remainder: "${t.missing}" (Full word: "${t.fullWord}") - Clue: ${t.hint}`).join("\n")}

      Student Answers for the Missing Letters:
      ${passage.wordTasks.map((t: any) => {
        const rawAns = userAnswers[t.id] || "";
        const cleanAns = typeof rawAns === "string" ? rawAns.replace(/\s/g, "") : "";
        return `Placeholder {${t.id}}: Student filled "${cleanAns || '(left blank)'}" (Full word produced: "${t.prefix}${cleanAns}")`;
      }).join("\n")}

      Please provide:
      1. An overall score (how many of their answers matched the expected missing letters, out of 10).
      2. Encouraging overall comment (Must be written in Vietnamese).
      3. A word-by-word list of tutor explanations (tutorNote in the JSON). Explain which ones were correct, which ones had incorrect missing letters, and what lexicological advice or grammar context would help them identify the correct word next time (Must be written in Vietnamese, referencing English keywords in English).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: requestPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: "Number of correct matches out of 10" },
            overallComments: { type: Type.STRING, description: "Synthesized mentoring feedback, focusing on cohesive reading strategies" },
            wordExplanations: {
              type: Type.ARRAY,
              description: "Array of exactly 10 components mapping to the user's answers",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  word: { type: Type.STRING, description: "The correct target word" },
                  isCorrect: { type: Type.BOOLEAN },
                  tutorNote: { type: Type.STRING, description: "Grammatical or conceptual clue explaining the word and spelling connection." }
                },
                required: ["id", "word", "isCorrect", "tutorNote"]
              }
            }
          },
          required: ["score", "overallComments", "wordExplanations"]
        }
      }
    });

    const resultText = response.text;
    res.json({ success: true, feedback: JSON.parse(resultText.trim()) });
  } catch (error: any) {
    console.error("AI Tutor Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Setup Express development or production routing
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TOEFL App] Server listening at http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
