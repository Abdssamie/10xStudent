/**
 * @id: student-agent-session
 * @priority: high
 * @progress: 0
 * @spec: 10xStudent specific agent session. Maps to a LangChain runnable/thread.
 * @skills: ["typescript"]
 */
export interface AgentSession {
    id: string;
    userId: string;
    projectId: string;
    /**
     * The thread ID used by LangChain/LangGraph for persistence.
     */
    threadId: string;
    createdAt: Date;
    updatedAt: Date;
}
