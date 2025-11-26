// Groq API Service for AI Chatbot
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GroqResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// System prompts for different chatbot contexts
export const SYSTEM_PROMPTS = {
  // Main dashboard chatbot - general assistant
  dashboard: `You are Arbit AI Assistant, an intelligent helper for the Arbit Transformer Thermal Analytics Platform.

Your role is to assist users with:
- Understanding transformer thermal inspection data and results
- Navigating the dashboard and its features
- Explaining thermal imaging concepts and anomaly detection
- Providing insights on transformer health and maintenance
- Answering questions about the platform's capabilities

Guidelines:
- Be concise and helpful
- Use technical terminology appropriately but explain when needed
- If you don't have specific data, provide general guidance
- Always be professional and supportive
- Keep responses focused and under 150 words unless detailed explanation is needed

You have access to the following context about the current page the user is viewing:`,

  // Inspection detail chatbot - analysis focused
  inspection: `You are Arbit AI Assistant, specialized in thermal image analysis for transformer inspections.

Your expertise includes:
- Analyzing thermal anomalies in transformer images
- Explaining bounding box annotations and their significance
- Interpreting severity levels (HIGH/MEDIUM/LOW) and risk types
- Providing maintenance recommendations based on detected issues
- Explaining thermal patterns and what they indicate about transformer health

Guidelines:
- Focus on the specific inspection data provided in the context
- Reference specific anomalies, temperatures, and annotations when available
- Provide actionable insights and recommendations
- Explain technical findings in understandable terms
- If asked about something not in the context, acknowledge the limitation
- Keep responses focused and under 200 words unless detailed analysis is needed

You have access to the following inspection context:`,
};

// Build context for dashboard chatbot
export function buildDashboardContext(data: {
  transformerCount?: number;
  inspectionCount?: number;
  activeInspections?: number;
  completedInspections?: number;
  anomaliesDetected?: number;
  healthScore?: string | number;
  currentTab?: string;
  recentActivity?: Array<{ transformer: string; status: string; time: string }>;
}): string {
  const lines: string[] = [];
  
  if (data.currentTab) {
    lines.push(`Current View: ${data.currentTab} tab`);
  }
  if (data.transformerCount !== undefined) {
    lines.push(`Total Transformers: ${data.transformerCount}`);
  }
  if (data.inspectionCount !== undefined) {
    lines.push(`Total Inspections: ${data.inspectionCount}`);
  }
  if (data.activeInspections !== undefined) {
    lines.push(`Active Inspections: ${data.activeInspections}`);
  }
  if (data.completedInspections !== undefined) {
    lines.push(`Completed Inspections: ${data.completedInspections}`);
  }
  if (data.anomaliesDetected !== undefined) {
    lines.push(`Anomalies Detected: ${data.anomaliesDetected}`);
  }
  if (data.healthScore !== undefined) {
    lines.push(`System Health Score: ${data.healthScore}%`);
  }
  if (data.recentActivity && data.recentActivity.length > 0) {
    lines.push(`Recent Activity:`);
    data.recentActivity.slice(0, 3).forEach((activity) => {
      lines.push(`  - ${activity.transformer}: ${activity.status} (${activity.time})`);
    });
  }

  return lines.length > 0 ? lines.join("\n") : "No specific context available.";
}

// Build context for inspection chatbot
export function buildInspectionContext(data: {
  inspectionId?: string;
  transformerNo?: string;
  branch?: string;
  status?: string;
  lastUpdated?: string;
  inspectionImage?: boolean;
  baselineImage?: boolean;
  annotations?: Array<{
    id: string;
    anomalyState: string;
    confidenceScore: number;
    riskType: string;
    description?: string;
  }>;
  analysisData?: {
    anomalies?: Array<{
      type?: string;
      severity_level?: string;
      confidence?: number;
      description?: string;
    }>;
    summary?: string;
    recommendations?: string[];
  };
  confirmedAnomalies?: number;
  totalAnomalies?: number;
}): string {
  const lines: string[] = [];

  if (data.inspectionId) {
    lines.push(`Inspection ID: ${data.inspectionId}`);
  }
  if (data.transformerNo) {
    lines.push(`Transformer: ${data.transformerNo}`);
  }
  if (data.branch) {
    lines.push(`Branch/Location: ${data.branch}`);
  }
  if (data.status) {
    lines.push(`Status: ${data.status}`);
  }
  if (data.lastUpdated) {
    lines.push(`Last Updated: ${data.lastUpdated}`);
  }

  lines.push(`\nImages:`);
  lines.push(`  - Inspection Image: ${data.inspectionImage ? "Uploaded" : "Not uploaded"}`);
  lines.push(`  - Baseline Image: ${data.baselineImage ? "Uploaded" : "Not uploaded"}`);

  if (data.annotations && data.annotations.length > 0) {
    lines.push(`\nManual Annotations (${data.annotations.length}):`);
    data.annotations.forEach((ann, idx) => {
      lines.push(`  ${idx + 1}. ${ann.anomalyState} - ${ann.riskType} (Confidence: ${ann.confidenceScore}%)`);
      if (ann.description) {
        lines.push(`     Description: ${ann.description}`);
      }
    });
  }

  if (data.analysisData?.anomalies && data.analysisData.anomalies.length > 0) {
    lines.push(`\nAI-Detected Anomalies (${data.analysisData.anomalies.length}):`);
    data.analysisData.anomalies.forEach((anomaly, idx) => {
      lines.push(`  ${idx + 1}. Type: ${anomaly.type || "Unknown"}, Severity: ${anomaly.severity_level || "N/A"}`);
      if (anomaly.description) {
        lines.push(`     ${anomaly.description}`);
      }
    });
  }

  if (data.confirmedAnomalies !== undefined && data.totalAnomalies !== undefined) {
    lines.push(`\nConfirmed Anomalies: ${data.confirmedAnomalies}/${data.totalAnomalies}`);
  }

  if (data.analysisData?.summary) {
    lines.push(`\nAnalysis Summary: ${data.analysisData.summary}`);
  }

  if (data.analysisData?.recommendations && data.analysisData.recommendations.length > 0) {
    lines.push(`\nRecommendations:`);
    data.analysisData.recommendations.forEach((rec) => {
      lines.push(`  - ${rec}`);
    });
  }

  return lines.length > 0 ? lines.join("\n") : "No inspection context available.";
}

// Main function to call Groq API
export async function chatWithGroq(
  messages: ChatMessage[],
  systemPrompt: string,
  context: string
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error("Groq API key not configured");
  }

  const fullSystemPrompt = `${systemPrompt}\n\n${context}`;

  const allMessages: ChatMessage[] = [
    { role: "system", content: fullSystemPrompt },
    ...messages,
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: allMessages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Groq API error: ${response.status}`
      );
    }

    const data: GroqResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from Groq API");
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Groq API error:", error);
    throw error;
  }
}
