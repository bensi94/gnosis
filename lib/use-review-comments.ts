import { useReducer, useCallback } from 'react';
import type { PendingReviewComment, DiffSide } from './types';

type Action =
  | { type: 'ADD'; comment: PendingReviewComment }
  | { type: 'REMOVE'; id: string }
  | { type: 'EDIT'; id: string; body: string }
  | { type: 'CLEAR_ALL' };

function reducer(state: PendingReviewComment[], action: Action): PendingReviewComment[] {
  switch (action.type) {
    case 'ADD':
      return [...state, action.comment];
    case 'REMOVE':
      return state.filter((c) => c.id !== action.id);
    case 'EDIT':
      return state.map((c) => (c.id === action.id ? { ...c, body: action.body } : c));
    case 'CLEAR_ALL':
      return [];
  }
}

export function useReviewComments() {
  const [comments, dispatch] = useReducer(reducer, []);

  const addComment = useCallback(
    (params: {
      filePath: string;
      line: number;
      side: DiffSide;
      body: string;
      hunkHeader: string;
      codeSnippet: string;
      slideIndex: number;
    }) => {
      dispatch({
        type: 'ADD',
        comment: { id: crypto.randomUUID(), ...params },
      });
    },
    [],
  );

  const removeComment = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  const editComment = useCallback((id: string, body: string) => {
    dispatch({ type: 'EDIT', id, body });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  return { comments, addComment, removeComment, editComment, clearAll };
}
