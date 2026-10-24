import type { Note } from "@/api/types";
export type EditorValue = Pick<
  Note,
  "title" | "contentMarkdown" | "tags" | "status" | "productId"
> & { images: { id: string; url: string }[] };
export const emptyArticle: EditorValue = {
  title: "",
  contentMarkdown: "",
  tags: [],
  images: [],
  status: "DRAFT",
  productId: null,
};
export function editable(note: Note): EditorValue {
  return {
    title: note.title,
    contentMarkdown: note.contentMarkdown,
    tags: [...note.tags],
    images: note.images.map((image) => ({ ...image })),
    status: note.status,
    productId: note.productId,
  };
}
export function notePayload(value: EditorValue, version?: number) {
  return {
    title: value.title.trim(),
    contentMarkdown: value.contentMarkdown.trim(),
    imageIds: value.images.map((image) => image.id),
    tags: value.tags,
    status: value.status,
    productId: value.productId,
    ...(version !== undefined ? { version } : {}),
  };
}
export function fingerprint(value: EditorValue) {
  return JSON.stringify(notePayload(value));
}
