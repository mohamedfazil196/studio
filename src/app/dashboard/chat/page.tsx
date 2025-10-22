
'use client';
import { QAChat } from "@/components/qa-chat";

export default function ChatPage() {
    // A default or general context can be provided if no specific report is selected.
    const generalMedicalContext = "You are a helpful medical AI assistant. You can answer general medical questions. However, you must always include a disclaimer that you are not a real doctor and the user should consult a healthcare professional for any medical advice.";

    return (
        <QAChat reportSummary={generalMedicalContext} />
    )
}
