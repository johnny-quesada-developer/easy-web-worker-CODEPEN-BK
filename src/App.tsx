/**
 * easy-web-worker example
 */
import { createEasyWebWorker, EasyWebWorker } from "easy-web-worker";

import {
  EffectCallback,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import prismjs from "prismjs";

import "prismjs/themes/prism.min.css";
import useStableRef from "./useStableRef";

export const App = () => {
  // const workerRef = useRef<EasyWebWorker>(null);

  // useMountEffect
  const workerRef = useStableRef(
    () => {
      return createEasyWebWorker((easyWorker) => {
        let currentProgress = 0;
        let shouldPrintLogs = false;

        let resolveFirstMessage: () => void;

        easyWorker.onMessage<string>("start", (message) => {
          console.log(message.payload);

          const interval = setInterval(() => {
            currentProgress += 0.5;

            if (shouldPrintLogs) {
              console.log("currentProgress", currentProgress);
            }

            message.reportProgress(currentProgress);

            if (currentProgress === 100) {
              currentProgress = 0;
            }
          }, 1);

          resolveFirstMessage = () => {
            clearInterval(interval);
            message.resolve();
          };
        });

        easyWorker.onMessage("stop", (message) => {
          resolveFirstMessage?.();

          message.resolve();
        });

        easyWorker.onMessage("toggleLogs", (message) => {
          shouldPrintLogs = !shouldPrintLogs;

          message.resolve();
        });
      });
    },
    (worker) => {
      worker?.dispose();
    },
    [],
  );

  queueMicrotask(() => prismjs.highlightAll());

  const progressRef = useRef(null);
  const [isRunning, setIsRunning] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center p-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold text-center">
          Welcome to easy-web-worker!
        </h1>

        <p className="text-lg text-center">
          This is a simple example demonstrating how to use a worker in a React
          application. Click the button to start or stop the worker.
        </p>

        <p className="text-sm text-center p-4">
          You can open the inspector and navigate to the{" "}
          <strong>"Sources"</strong> tab to find the dynamically created worker
          file.
        </p>

        <div className="">
          <span className="font-bold text-gray-600">
            Code from the main thread:
          </span>

          {isRunning && (
            <pre className="bg-gray-100 p-4 rounded-sm overflow-auto animate-fade-in transition-all duration-200 h-56">
              <code className="language-javascript">
                {`worker.sendToMethod('stop').then(() => {
  setIsRunning(false);
});`}
              </code>
            </pre>
          )}

          {!isRunning && (
            <pre className="bg-gray-100 p-4 rounded-sm overflow-auto animate-fade-in transition-all duration-200 h-58">
              <code className="language-javascript">
                {`worker
  // The generic types are <TReturn, TPayload>
  .sendToMethod<null, string>('start', 'Hello Worker!')
  .onProgress((value) => {
    progressRef.current.style.width = \`\${value}%\`;
  })
  .then(() => {
    console.log('Task Finalized');
  });`}
              </code>
            </pre>
          )}
        </div>

        {/* progress bar */}
        <div className="w-full h-4 rounded-sm overflow-hidden border border-gray-400">
          <div
            ref={progressRef}
            className="w-32 bg-gradient-to-r from-blue-500 to-purple-500 h-full"
          ></div>
        </div>

        <div className="flex gap-3">
          <button
            className={`px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 w-20 transition-all duration-500`}
            onClick={() => {
              const worker = workerRef.current;

              if (isRunning) {
                worker.sendToMethod("stop").then(() => {
                  setIsRunning(false);
                });

                return;
              }

              setIsRunning(true);

              worker
                .sendToMethod<null, string>("start", "Hello Worker!")
                .onProgress((value) => {
                  progressRef.current.style.width = `${value}%`;
                })
                .then(() => {
                  console.log("Task Finalized");
                });
            }}
          >
            {isRunning ? "Stop" : "Start"}
          </button>

          {isRunning && (
            <button
              className="px-4 py-2 text-white bg-yellow-500 rounded hover:bg-yellow-600 animate-fade-in transition-all duration-500"
              onClick={() => {
                workerRef.current.sendToMethod("toggleLogs");
              }}
            >
              Toggle Logs
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <span className="font-bold text-gray-600">Code from the worker:</span>

          {isRunning && (
            <pre className="bg-gray-100 p-4 rounded-sm overflow-auto animate-fade-in transition-all duration-200 h-56">
              <code className="language-javascript">
                {`easyWorker.onMessage('stop', (message) => {
  // resolve previous message promise
  startPromise.resolve();

  // resolve current message promise
  message.resolve();
});`}
              </code>
            </pre>
          )}

          {!isRunning && (
            <pre className="bg-gray-100 p-4 rounded-sm overflow-auto animate-fade-in transition-all duration-200 h-56">
              <code className="language-javascript">
                {`// The first generic type is the type of the payload "Hello Worker!"
easyWorker.onMessage<string>('start', (message) => {
  console.log(message.payload); // "Hello Worker!"

  start(message);

  message.resolve();
});`}
              </code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

function useMountEffect(callback: EffectCallback) {
  const handler = useEffectEvent(callback);

  useLayoutEffect(() => {
    return handler();
  }, []);
}
