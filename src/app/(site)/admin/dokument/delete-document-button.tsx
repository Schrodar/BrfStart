"use client";

import type { FormEvent } from "react";
import { deleteDocumentAction } from "./actions";

/**
 * Raderingen tar bort både posten och filen i Storage. Det går inte att ångra,
 * så be om ett aktivt ja först.
 */
export function DeleteDocumentButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  function confirmDelete(e: FormEvent<HTMLFormElement>) {
    const answer = window.confirm(
      `Ta bort "${title}"?\n\nFilen raderas också. Det går inte att ångra.`,
    );
    if (!answer) e.preventDefault();
  }

  return (
    <form action={deleteDocumentAction} onSubmit={confirmDelete}>
      <input type="hidden" name="id" value={id} />
      <button
        aria-label={`Ta bort ${title}`}
        className="font-medium text-red-600 hover:underline"
      >
        Ta bort
      </button>
    </form>
  );
}
