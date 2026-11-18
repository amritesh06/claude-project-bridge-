import { useEffect, useState } from 'react';
import { pingClaudeTab } from '../../utils/claudeTab';

// status: 'checking' | 'preview' | 'no-tab' | 'tab-open'
// page:   'conversation' | 'project' | 'other' | null
// plus conversationId, projectId, messageCount, streaming when the content script answers.

export default function useClaudeStatus() {
  const [state, setState] = useState({ status: 'checking', page: null });

  useEffect(() => {
    let cancelled = false;
    pingClaudeTab().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
