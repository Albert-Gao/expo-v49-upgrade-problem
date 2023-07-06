import { useEffect } from "react";
import { AbortControllers } from "../src/zustand/useAbortController";

// it closes the event stream connection when the component unmounts
// does NOT work in modal screen
export function useTearDownServerEventStreaming() {
  useEffect(() => {
    return () => {
      AbortControllers.abort();
    };
  });
}
