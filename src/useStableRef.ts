import React, { useMemo, useRef, useSyncExternalStore } from "react";
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
  const value = dependencies ? undefined : (param1 as T);
  const builder = dependencies ? (param1 as RefCreator<T>) : undefined;
  const cleanup = isFunction(param2) ? param2 : undefined;

  const props = useRef(
    {} as {
      value?: T;
      builder?: RefCreator<T>;
      cleanup?: CleanupFunction<T>;
      previousDependencies?: React.DependencyList;
    },
  );

  // update hook state
  Object.assign(props.current, {
    value,
    builder,
    cleanup,
  });

  // creates stable references for subscribe and getSnapshot functions
  const { subscribe, getSnapshot } = useMemo(() => {
    const stableRef: React.RefObject<T | typeof unique_symbol> = {
      current: unique_symbol,
    };

    const subscribe = () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    };

    const getSnapshot = () => {
      const { previousDependencies, builder, value, cleanup } = props.current;

      if (isNil(dependencies)) {
        stableRef.current = value;
        return stableRef;
      }

      const isFirstRender = stableRef.current === unique_symbol;

      const shouldBuild =
        isFunction(builder) &&
        (isFirstRender || !shallowCompare(previousDependencies, dependencies));

      if (!isFirstRender && shouldBuild) cleanup?.(stableRef.current as T);

      // eslint-disable-next-line react-hooks/immutability
      stableRef.current = shouldBuild ? builder() : stableRef.current;

      return stableRef;
    };

    return {
      subscribe,
      getSnapshot,
    };
    // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
  }, dependencies);

  // allows to add cleanup logic without using useEffect
  const ref = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // refs to hold latest props
  props.current.previousDependencies = dependencies;

  return ref as React.RefObject<T>;
}

export default useStableRef;
