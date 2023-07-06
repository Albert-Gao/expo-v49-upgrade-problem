import type { CompletionStreamMsg } from "../src/types";
import { AbortControllers } from "../src/zustand/useAbortController";
import type { EventSourceMessage } from "./stream-lib";

export function onChatGPTMessage({
  isDebug,
  callback
}: {
  isDebug?: boolean;
  callback: (data: CompletionStreamMsg) => void;
}) {
  return (eventMsg: EventSourceMessage) => {
    const data = JSON.parse(eventMsg.data) as CompletionStreamMsg;
    const isStreamingStopped = data.choices[0].finish_reason === "stop";

    if (isStreamingStopped) {
      AbortControllers.abort();
      return;
    }

    if (isDebug) {
      console.log(data.choices[0]);
    }

    callback(data);
  };
}
