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
  const deps = isFunction(param2) ? param3 : param2;
  const cleanup = isFunction(param2) ? param2 : undefined;

  const dependenciesRef = useRef(deps);
  const getSnapshotRef = useRef(getSnapshot);
  const cleanupRef = useRef(cleanup);

  getSnapshotRef.current = getSnapshot;
  cleanupRef.current = cleanup;

  function getSnapshot(
    ref: React.RefObject<T | symbol>,
  ): React.RefObject<T | symbol> {
    if (isNil(deps)) {
      ref.current = param1 as T;
      return ref;
    }

    const isFirstRender = ref.current === unique_symbol;

    const shouldBuild =
      isFunction(param1) &&
      (isFirstRender || !shallowCompare(dependenciesRef.current, deps));

    // if not first render and we are rebuilding, call cleanup
    if (!isFirstRender && shouldBuild) cleanup?.(ref.current as T);

    ref.current = shouldBuild ? param1() : ref.current;

    return ref;
  }

  // creates stable references for subscribe and getSnapshot functions
  const { ref, subscribe, getSnapshotStable } = useMemo(() => {
    const ref: React.RefObject<T | typeof unique_symbol> = {
      current: unique_symbol,
    };

    const subscribe = () => {
      return () => {
        if (ref.current === unique_symbol) return;
        cleanupRef.current?.(ref.current as T);
      };
    };

    const getSnapshotStable = (): React.RefObject<T> => {
      return getSnapshotRef.current(ref) as React.RefObject<T>;
    };

    return {
      ref,
      subscribe,
      getSnapshotStable,
    };
  }, []);

  // allows to add cleanup logic without using useEffect
  useSyncExternalStore(subscribe, getSnapshotStable, getSnapshotStable);

  dependenciesRef.current = deps;

  return ref as React.RefObject<T>;
}

export default useStableRef;
