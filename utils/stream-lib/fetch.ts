/* eslint-disable prettier/prettier */
// @ts-expect-error
import { fetch } from "react-native-fetch-api";
import { getBytes, getLines, getMessages } from "./parse";
import type { EventSourceMessage } from "./parse";
import { AbortControllers } from "../../src/zustand/useAbortController";

export const EventStreamContentType = "text/event-stream";

const DefaultRetryInterval = 3;
const LastEventId = "last-event-id";

export interface FetchEventSourceInit extends RequestInit {
  /**
   * The request headers. FetchEventSource only supports the Record<string,string> format.
   */
  headers?: Record<string, string>;

  /**
   * Called when a response is received. Use this to validate that the response
   * actually matches what you expect (and throw if it doesn't.) If not provided,
   * will default to a basic validation to ensure the content-type is text/event-stream.
   */
  onopen?: (response: Response) => Promise<void>;

  /**
   * Called when a message is received. NOTE: Unlike the default browser
   * EventSource.onmessage, this callback is called for _all_ events,
   * even ones with a custom `event` field.
   */
  onmessage?: (ev: EventSourceMessage) => void;

  /**
   * Called when a response finishes. If you don't expect the server to kill
   * the connection, you can throw an exception here and retry using onerror.
   */
  onclose?: () => void;

  /**
   * Called when there is any error making the request / processing messages /
   * handling callbacks etc. Use this to control the retry strategy: if the
   * error is fatal, rethrow the error inside the callback to stop the entire
   * operation. Otherwise, you can return an interval (in milliseconds) after
   * which the request will automatically retry (with the last-event-id).
   * If this callback is not specified, or it returns undefined, fetchEventSource
   * will treat every error as retry-able and will try again after 1 second.
   */
  onerror?: (err: any, retryCount: number) => number | null | undefined | void;
}

export const MAX_STREAM_RETRY_COUNT = 5

export function fetchEventSource(
  input: RequestInfo,
  {
    signal: inputSignal,
    headers: inputHeaders,
    onopen: inputOnOpen,
    onmessage,
    onclose,
    onerror,
    ...rest
  }: FetchEventSourceInit
) {
  return new Promise<void>((resolve, reject) => {
    let retryCount = 0
    // make a copy of the input headers since we may modify it below:
    const headers = { ...inputHeaders };
    if (!headers.accept) {
      headers.accept = EventStreamContentType;
    }

    let curRequestController: AbortController;

    let retryInterval = DefaultRetryInterval;
    let retryTimer = 0;
    function dispose() {
      clearTimeout(retryTimer);
      curRequestController.abort();
    }

    // if the incoming signal aborts, dispose resources and resolve:
    inputSignal?.addEventListener("abort", () => {
      dispose();
      resolve(); // don't waste time constructing/logging errors
      retryCount = MAX_STREAM_RETRY_COUNT;
    });

    const onopen = inputOnOpen ?? defaultOnOpen;
    async function create() {
      retryCount += 1
      curRequestController = new AbortController();
      try {
        const response: Response = await fetch(input, {
          ...rest,
          headers,
          signal: curRequestController.signal,

          reactNative: { textStreaming: true }
        });

        await onopen(response);

        if (response.body) {
          await getBytes(
            response.body,
            getLines(
              getMessages(
                (id) => {
                  if (id) {
                    // store the id and send it back on the next retry:
                    headers[LastEventId] = id;
                  } else {
                    // don't send the last-event-id header anymore:
                    delete headers[LastEventId];
                  }
                },
                (retry) => {
                  retryInterval = retry;
                },
                onmessage
              )
            )
          );
        }

        onclose?.();
        dispose();
        resolve();
      } catch (err) {
        if (!curRequestController.signal.aborted) {
          if (retryCount >= MAX_STREAM_RETRY_COUNT) {
            AbortControllers.abort()
            onerror?.(err, retryCount)
            return
          }

          // if we haven't aborted the request ourselves:
          try {
            // check if we need to retry:
            const interval: any = onerror?.(err, retryCount) ?? retryInterval;
            clearTimeout(retryTimer);

            // @ts-expect-error
            retryTimer = setTimeout(create, interval);
          } catch (innerErr) {
            // we should not retry anymore:
            dispose();
            reject(innerErr);
          }
        }
      }
    }

    return create();
  });
}

function defaultOnOpen(response: Response) {
  const contentType = response.headers.get("content-type");
  if (!contentType?.startsWith(EventStreamContentType)) {
    throw new Error(
      `Expected content-type to be ${EventStreamContentType}, Actual: ${contentType}`
    );
  }
}
