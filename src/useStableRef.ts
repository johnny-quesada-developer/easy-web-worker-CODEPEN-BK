/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useEffectEvent, useMemo, useRef } from "react";
import isNil from "lodash/isNil";
import isFunction from "json-storage-formatter/isFunction";
import shallowCompare from "react-global-state-hooks/shallowCompare";

const unique_symbol = Symbol("internal stable ref");

type RefCreator<T> = () => T;

type CleanupFunction<T> = (value: T) => void;

/**
 * @description Hook to create a stable ref value.
 * @param value The value that that the ref will hold
 * @returns <T> stable React ref object containing the value.
 */
function useStableRef<T>(value: T): React.RefObject<T>;

/**
 * @description Run the builder on render phase to create a stable ref value.
 * The builder must be pure since React may invoke it multiple times in dev mode.
 * Do not build sources that need disposal during render phase.
 * @param {RefCreator<T>} callback A function that creates the value that the ref will hold
 * @param deps Dependency list to determine when to recreate the value
 * @returns A stable React ref object containing the value.
 */
function useStableRef<T>(
  callback: RefCreator<T>,
  deps: React.DependencyList,
): React.RefObject<T>;

/**
 * @description Creates a disposable stable ref value.
 * The builder is invoke once the component is mounted. So is not available during render phase.
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
  if (isSimpleRef) return useSimpleRef(param1 as T);

  const builder = param1 as RefCreator<T>;
  const cleanup = isFunction(param2) ? param2 : undefined;

  const isDisposableRef = !isNil(cleanup);
  if (!isDisposableRef) {
    return useNonDisposableStableRef(builder, dependencies);
  }

  return useDisposableStableRef({
    builder,
    cleanup,
    dependencies,
  });
}

/**
 * Simple stable ref hook that always updates the ref's current value.
 */
function useSimpleRef<T>(value: T): React.RefObject<T> {
  const ref = useRef<T>(value);
  ref.current = value;

  return ref;
}

/**
 * Non-disposable stable ref. State created during render phase cannot be disposed.
 * React strict mode will invoke render twice in dev mode, so the builder must be pure.
 */
function useNonDisposableStableRef<T>(
  builder: RefCreator<T>,
  dependencies: React.DependencyList,
): React.RefObject<T> {
  const ref = useMemo(
    () => ({
      current: unique_symbol as T | typeof unique_symbol,
      dependencies: undefined as React.DependencyList | undefined,
    }),
    [],
  );

  (() => {
    const isFirstRun = ref.current === unique_symbol;

    const shouldBuild =
      isFunction(builder) &&
      (isFirstRun || !shallowCompare(ref.dependencies, dependencies));

    if (shouldBuild) ref.current = builder();
  })();

  ref.dependencies = dependencies;

  return ref as React.RefObject<T>;
}

/**
 * Disposable stable ref, not available during render phase.
 */
function useDisposableStableRef<T>({
  builder,
  cleanup,
  dependencies,
}: {
  builder: RefCreator<T>;
  cleanup: CleanupFunction<T>;
  dependencies: React.DependencyList;
}): React.RefObject<T> {
  const ref = useMemo(() => {
    let current = unique_symbol as T | undefined;

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

          if (current === unique_symbol) {
            throw new Error("Stable was disposed and is no longer available.");
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

  const stableBuilder = useEffectEvent(builder);
  const stableCleanup = useEffectEvent(cleanup);

  useEffect(() => {
    const current = stableBuilder();

    ref.current = current;
    ref.isInitialized = true;

    return () => {
      stableCleanup?.(current);
      ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...dependencies]);

  return ref;
}

export default useStableRef;
