README – Patient Symptom Checker AI (Arabic + English)
Project Goal

Build a Patient Symptom Checker using Flask + LLaMA/GPT LLM and integrate it with Next.js (server-side).

Features:

Accept patient symptoms in Arabic or English

Suggest:

Primary specialty

Optional secondary specialty

Urgency level: Routine / Soon / Urgent

Reason for suggestion

Disclaimer: This is not a medical diagnosis. Always consult a licensed doctor.

Return JSON output for frontend integration

Include Next.js server component example

Safe for healthcare / non-diagnostic

Rule-based fallback if LLM fails

Requirements

Python 3.10+

Flask

OpenAI or Hugging Face transformers (for LLM)

Node.js 18+ (Next.js server-side integration)

Environment variables for API keys (no hard-coded secrets)

Flask Backend Instructions

Create Flask app with one endpoint: /v1/symptom-to-specialty

Accept POST JSON body:

{
  "symptoms": "ركبتي توجعني بعد الجري وأحيانًا بتورم"
}


Send symptom text to LLM (LLaMA or GPT) using prompt template:

You are a medical triage assistant. 
Patient describes their symptoms in Arabic or English.
Your task: 
1. Suggest primary medical specialty
2. Suggest optional secondary specialty
3. Suggest urgency level: Routine / Soon / Urgent
4. Give reason for the suggestion
5. Include disclaimer: "This is not a medical diagnosis. Always consult a licensed doctor."

Return JSON ONLY in the following format:

{
  "suggested_specialty": "...",
  "secondary_specialty": "...",
  "urgency": "...",
  "reason": "...",
  "disclaimer": "..."
}

Patient input: "{PATIENT_SYMPTOMS}"


Return JSON output to client.

Handle errors gracefully and log patient input + AI output for auditing.

Include CORS headers for local testing.

Optional: add rule-based fallback for common symptoms.

Rule-Based Fallback Table (Optional)
Symptom Keyword	Primary Specialty	Secondary Specialty
ركبة / knee	Orthopedics	Physiotherapy
صدر / chest	Cardiology	Internal Medicine
جلد / rash	Dermatology	General Practice
Next.js Server Component Example
const res = await fetch(`${process.env.AI_SERVICE_URL}/v1/symptom-to-specialty`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ symptoms }),
  cache: "no-store",
});

const data = await res.json();

console.log(data);


Display specialty, secondary specialty, urgency, reason, and disclaimer in UI

Always show disclaimer prominently

Allow user to override suggested specialty

Arabic + English Examples

Input Arabic:

“ركبتي توجعني بعد الجري وأحيانًا بتورم”

Input English:

“My knee hurts after running and sometimes swells”

Expected JSON Output:

{
  "suggested_specialty": "Orthopedics",
  "secondary_specialty": "Physiotherapy",
  "urgency": "Routine",
  "reason": "Pain related to joints and movement",
  "disclaimer": "This is not a medical diagnosis. Always consult a licensed doctor."
}

Safety & Compliance

Never provide diagnosis or treatment

Always show disclaimer

Log AI output for auditing

Rule-based fallback ensures safe output if LLM fails

Patient data handled securely; do not store PHI unnecessarily

Deployment Notes

Use environment variables for API keys (OPENAI_API_KEY or HF token)

Run Flask backend separately from Next.js frontend

Ensure UTF-8 encoding for Arabic text

LLaMA can be run locally or via Hugging Face API for free testing

✅ Deliverables Copilot Should Generate

Flask backend with /v1/symptom-to-specialty endpoint

LLM integration using prompt template

JSON output validation

Error handling and logging

Rule-based fallback

Next.js server-side call example

README + example inputs/outputs

Comments explaining disclaimer and safety