"use client";

import { useActionState, useState, useEffect } from "react";
import {
  addNoteAction,
  type InsightActionState,
} from "@/server/actions/insight-actions";

interface NoteFormProps {
  targetType: "FIRM" | "LAWYER";
  targetId: string;
}

export function NoteForm({ targetType, targetId }: NoteFormProps) {
  const [state, formAction, isPending] = useActionState<InsightActionState, FormData>(
    addNoteAction,
    { success: false }
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => setIsOpen(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [state.success]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-scg-400 hover:text-scg-600"
      >
        + Add Note
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-900">Add a Note</h4>

      <form action={formAction}>
        <input type="hidden" name="targetType" value={targetType} />
        <input
          type="hidden"
          name={targetType === "FIRM" ? "firmId" : "lawyerId"}
          value={targetId}
        />

        <div className="mb-3">
          <textarea
            name="content"
            rows={3}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none"
            placeholder="Write a relationship note..."
          />
        </div>

        <div className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="isPinned"
            name="isPinned"
            value="true"
            className="h-4 w-4 rounded border-gray-300 text-scg-600 focus:ring-scg-500"
          />
          <label htmlFor="isPinned" className="text-xs text-gray-600">
            Pin this note (pinned notes appear first)
          </label>
        </div>

        {state.error && (
          <div className="mb-3 text-xs text-red-600">{state.error}</div>
        )}
        {state.success && (
          <div className="mb-3 text-xs text-green-600">Note saved!</div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-scg-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-scg-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Note"}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
