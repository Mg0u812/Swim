import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the GoogleGenAI client
// Assumes API_KEY is set in the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the expected JSON structure for the Gemini API response
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    analyzedPractices: {
      type: Type.ARRAY,
      description: "A list of analyzed swim practices from the user's input.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A title for the practice, like 'Monday - Freestyle Focus'." },
          warmUp: { type: Type.STRING, description: "The warm-up portion of the practice." },
          mainSet: { type: Type.STRING, description: "The main set of the practice." },
          coolDown: { type: Type.STRING, description: "The cool-down portion of the practice." },
          totalYardage: { type: Type.INTEGER, description: "The estimated total yardage/meterage of the practice." },
        },
        required: ["title", "warmUp", "mainSet", "coolDown", "totalYardage"]
      }
    },
    overallAnalysis: {
      type: Type.STRING,
      description: "A brief overall analysis of the training log, highlighting training load, intensity distribution, and areas for improvement."
    },
    coachingTips: {
      type: Type.ARRAY,
      description: "Actionable tips for the swimmer to improve their training, technique, or recovery.",
      items: { type: Type.STRING }
    },
    competitionAdvice: {
        type: Type.ARRAY,
        description: "Specific advice for tapering and preparation if a competition is mentioned. Focus on rest, nutrition, and race strategy, tailored to the user's specific events if provided.",
        items: { type: Type.STRING }
    },
    weaknessImprovementTips: {
        type: Type.ARRAY,
        description: "Specific drills and advice tailored to the swimmer's self-identified weaknesses.",
        items: { type: Type.STRING }
    }
  },
  required: ["analyzedPractices", "overallAnalysis", "coachingTips"]
};

// Define the types for our structured swim analysis data
interface AnalyzedPractice {
    title: string;
    warmUp: string;
    mainSet: string;
    coolDown: string;
    totalYardage: number;
}

interface SwimAnalysisResponse {
    analyzedPractices: AnalyzedPractice[];
    overallAnalysis: string;
    coachingTips: string[];
    competitionAdvice?: string[];
    weaknessImprovementTips?: string[];
}

const App = () => {
    const [practiceInput, setPracticeInput] = useState(`Monday:
Warmup: 400 easy swim, 200 kick, 200 pull.
Main Set: 10x100 Freestyle on a 1:30 interval. Goal is to hold best average.
Cooldown: 300 easy choice.

Wednesday:
Warmup: 500 swim with drills (25 drill, 25 swim).
Main Set: 3 rounds of (4x50 on :50, 2x100 on 1:40, 200 easy on 4:00). All IM.
Cooldown: 200 backstroke.`);
    const [swimAnalysis, setSwimAnalysis] = useState<SwimAnalysisResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCompetitionWeek, setIsCompetitionWeek] = useState(false);
    const [competitionEvents, setCompetitionEvents] = useState('');
    const [weaknessesInput, setWeaknessesInput] = useState('');

    const handleAnalyzeClick = async () => {
        if (!practiceInput.trim()) {
            setError("Please enter your practice details first.");
            return;
        }
        setLoading(true);
        setError(null);
        setSwimAnalysis(null);

        try {
            let competitionPromptPart = "";
            if (isCompetitionWeek) {
                competitionPromptPart = `The user has a competition THIS WEEK.`;
                if (competitionEvents.trim()) {
                    competitionPromptPart += ` They are swimming these events: ${competitionEvents}.`;
                }
                competitionPromptPart += ` Provide specific advice on how to adjust this training, what to focus on (like race strategy for their specific events), and general competition preparation tips (tapering, nutrition, race day strategy).`;
            }

            let weaknessPromptPart = "";
            if (weaknessesInput.trim()) {
                weaknessPromptPart = `The swimmer has identified these weaknesses: ${weaknessesInput}. Provide specific, actionable drills and advice to help them improve in these areas.`;
            }

            const prompt = `Analyze the following swim practice log. Break down each practice into warm-up, main set, and cooldown. Estimate total yardage for each. Then provide an overall analysis of the training and actionable coaching tips. ${competitionPromptPart} ${weaknessPromptPart} Practice Log: ${practiceInput}`;
            
            const systemInstruction = `You are a world-class swimming coach. Your task is to analyze a user's swim practice log. Structure the output according to the provided JSON schema. Provide insightful analysis on training load and intensity, and give concrete, actionable tips to help the swimmer improve. ${isCompetitionWeek ? `Pay special attention to providing competition preparation advice, as the user has a meet this week. ${competitionEvents.trim() ? `Tailor the advice to their specific events: ${competitionEvents}.` : ''} Focus on tapering, mental prep, and race strategy.` : ''} ${weaknessesInput.trim() ? 'The user has also listed their weaknesses. Provide a dedicated set of drills and advice to address these specific points.' : ''}`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });

            const parsedResponse: SwimAnalysisResponse = JSON.parse(response.text);
            setSwimAnalysis(parsedResponse);

        } catch (e) {
            console.error(e);
            setError("Sorry, I couldn't analyze the practice log. Please try again or rephrase your input.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="main-container">
            <header>
                <h1>Swim Practice Analyzer</h1>
                <p>Log your swim practices in plain text. Our AI coach will break down your workouts, analyze your training, and provide expert tips to help you swim faster.</p>
            </header>

            <section className="input-section">
                <h2>Enter Your Practice Log</h2>
                <textarea
                    className="schedule-textarea"
                    value={practiceInput}
                    onChange={(e) => setPracticeInput(e.target.value)}
                    placeholder="e.g., Monday: 400 warm up, 10x100 free on 1:30, 200 cool down..."
                    aria-label="Practice Log Input"
                />
                 <div className="competition-toggle">
                    <input
                        type="checkbox"
                        id="competition-check"
                        checked={isCompetitionWeek}
                        onChange={(e) => {
                            setIsCompetitionWeek(e.target.checked);
                            if (!e.target.checked) {
                                setCompetitionEvents('');
                            }
                        }}
                    />
                    <label htmlFor="competition-check">Competition This Week?</label>
                </div>
                {isCompetitionWeek && (
                    <div className="events-input-container">
                        <label htmlFor="events-input">Events you're swimming:</label>
                        <input
                            type="text"
                            id="events-input"
                            className="events-input"
                            value={competitionEvents}
                            onChange={(e) => setCompetitionEvents(e.target.value)}
                            placeholder="e.g., 50 Free, 100 Back, 200 IM"
                            aria-label="Competition Events Input"
                        />
                    </div>
                )}
                <div className="weakness-input-container">
                    <label htmlFor="weakness-input">What are your weaknesses? (Optional)</label>
                    <textarea
                        id="weakness-input"
                        className="weakness-textarea"
                        value={weaknessesInput}
                        onChange={(e) => setWeaknessesInput(e.target.value)}
                        placeholder="e.g., weak underwater kicks, poor breathing technique on freestyle, slow turns..."
                        aria-label="Swimming Weaknesses Input"
                    />
                </div>
                <button
                    className="analyze-button"
                    onClick={handleAnalyzeClick}
                    disabled={loading}
                >
                    {loading ? "Analyzing..." : "Analyze My Practice"}
                </button>
            </section>

            {loading && (
                <div className="loader-container" aria-label="Loading analysis">
                    <div className="loader"></div>
                </div>
            )}

            {error && (
                <div className="error-container">
                    <p className="error-message" role="alert">{error}</p>
                </div>
            )}

            {swimAnalysis && (
                <section className="results-section" aria-live="polite">
                    <div className="results-column-1">
                        <div className="card">
                            <h3>🏊‍♂️ Your Analyzed Practices</h3>
                            {swimAnalysis.analyzedPractices.map((practice, index) => (
                                <div key={index} className="practice-card">
                                    <div className="practice-header">
                                        <h4>{practice.title}</h4>
                                        <span className="practice-yardage">{practice.totalYardage.toLocaleString()} yards</span>
                                    </div>
                                    <div className="practice-details">
                                        <div className="practice-part">
                                            <h5>Warm-Up</h5>
                                            <p>{practice.warmUp}</p>
                                        </div>
                                        <div className="practice-part">
                                            <h5>Main Set</h5>
                                            <p>{practice.mainSet}</p>
                                        </div>
                                        <div className="practice-part">
                                            <h5>Cool-Down</h5>
                                            <p>{practice.coolDown}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="results-column-2">
                        {swimAnalysis.competitionAdvice && swimAnalysis.competitionAdvice.length > 0 && (
                            <div className="card">
                                <h3>🏆 Competition Prep Advice</h3>
                                <ul className="tips-list competition">
                                    {swimAnalysis.competitionAdvice.map((tip, index) => (
                                        <li key={index}>{tip}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                         {swimAnalysis.weaknessImprovementTips && swimAnalysis.weaknessImprovementTips.length > 0 && (
                            <div className="card">
                                <h3>💪 Weakness Improvement Plan</h3>
                                <ul className="tips-list weakness">
                                    {swimAnalysis.weaknessImprovementTips.map((tip, index) => (
                                        <li key={index}>{tip}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="card">
                            <h3>💡 Overall Analysis</h3>
                            <p>{swimAnalysis.overallAnalysis}</p>
                        </div>
                        <div className="card">
                            <h3>🚀 Coaching Tips</h3>
                            <ul className="tips-list">
                                {swimAnalysis.coachingTips.map((tip, index) => (
                                    <li key={index}>{tip}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

const container = document.getElementById('app');
const root = createRoot(container!);
root.render(<App />);