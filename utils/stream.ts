import { CompletionStreamMsg } from "../src/types";
import { onChatGPTMessage } from "./onChatGPTMessage";
import { getAuthHeader } from "../src/apis/utils";
import { MAX_STREAM_RETRY_COUNT, fetchEventSource } from "./stream-lib/fetch";
import { AbortControllers } from "../src/zustand/useAbortController";

const DEFAULT_MESSAGES = [
  {
    role: "user",
    content: "give me a short story in 20 words"
  }
];

type FetchStreamParam = Parameters<typeof fetchEventSource>[1];

export interface StreamParamsGeneric {
  url?: string;
  method?: FetchStreamParam["method"];
  messages: Array<{ role: string; content: string }>;
  onMessage: FetchStreamParam["onmessage"];
  onClose?: FetchStreamParam["onclose"];
  onError?: FetchStreamParam["onerror"];
}

export interface StreamParamsChatGPT
  extends Omit<StreamParamsGeneric, "onMessage"> {
  onChatGPTMessage: (data: CompletionStreamMsg) => void;

  // it outputs the stream msg if true
  isDebug?: boolean;
}

function getHeaders() {
  return {
    "Content-Type": "application/json"
    // ...getAuthHeader()
  };
}

export async function stream({
  url = "http://localhost:8090/v1/chat-stream",
  messages = DEFAULT_MESSAGES,
  method = "POST",
  onClose,
  onError,
  ...rest
}: StreamParamsGeneric | StreamParamsChatGPT) {
  const isChatGPTParam = "onChatGPTMessage" in rest;
  const headers = getHeaders();

  await fetchEventSource(url, {
    headers,
    method,
    body: JSON.stringify({
      messages: messages
    }),
    signal: AbortControllers.getSignal(),
    onmessage(event) {
      if (!isChatGPTParam) {
        rest.onMessage?.(event);
        return;
      }

      onChatGPTMessage({
        isDebug: rest.isDebug,
        callback: rest.onChatGPTMessage
      })(event);
    },
    onclose() {
      AbortControllers.abort();
      onClose?.();
    },
    onerror(err, retryCount) {
      // when retrying, ignore the error
      if (retryCount < MAX_STREAM_RETRY_COUNT) return;

      AbortControllers.abort();
      onError?.(err, retryCount);
    }
  });
}
