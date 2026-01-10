/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useEffectEvent, useMemo } from "react";
import isNil from "lodash/isNil";
import isFunction from "json-storage-formatter/isFunction";

type RefCreator<T> = () => T;

type CleanupFunction<T> = (value: T) => void;

/**
 * @description Hook to create a stable ref value.
 * @param value The value that that the ref will hold
 * @returns <T> stable React ref object containing the value.
 */
function useStableRef<T>(value: T): React.RefObject<T>;

/**
 * @description Hook to create a stable ref value.
 * @param {RefCreator<T>} callback A function that creates the value that the ref will hold
 * @param deps Dependency list to determine when to recreate the value
 * @returns A stable React ref object containing the value.
 */
function useStableRef<T>(
  callback: RefCreator<T>,
  deps: React.DependencyList,
): React.RefObject<T>;

/**
 * @description Hook to create a stable ref value.
 * @param {RefCreator<T>} callback A function that creates the value that the ref will hold
 * @param {CleanupFunction<T>} cleanup A function that cleans up the value when it is recreated
 * @param deps Dependency list to determine when to recreate the value
 * @returns A stable React ref object containing the value.
 */
function useStableRef<T>(
  callback: RefCreator<T>,
  cleanup: CleanupFunction<T>,
  deps: React.DependencyList,
): React.RefObject<T>;

function useStableRef<T>(
  param1: T | RefCreator<T>,
  param2?: CleanupFunction<T> | React.DependencyList,
  param3?: React.DependencyList,
): React.RefObject<T> {
  const dependencies = isFunction(param2) ? param3 : param2;
  const isSimpleRef = isNil(dependencies);

  const ref = useMemo(() => {
    let current = undefined as T | undefined;

    const wrapper = {
      current,
      isInitialized: false,
    };

    Object.defineProperties(wrapper, {
      current: {
        get: () => {
          if (!wrapper.isInitialized) {
            throw new Error("Stable ref is not available during render phase.");
          }

          return current;
        },
        set: (value: T) => {
          current = value;
        },
      },
    });

    return wrapper;
  }, []);

  if (isSimpleRef) {
    ref.current = param1 as T;
    ref.isInitialized = true;

    return ref;
  }

  const computeState = useEffectEvent(param1 as RefCreator<T>);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const cleanup = useEffectEvent(isFunction(param2) ? param2 : () => {});

  useEffect(() => {
    const current = computeState();

    ref.current = current;
    ref.isInitialized = true;

    return () => {
      cleanup?.(current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...dependencies]);

  return ref as React.RefObject<T>;
}

export default useStableRef;
