"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  createDisplay,
  createNotice,
  deleteNotice,
  endNotice,
  getBuildings,
  regenerateDisplayToken,
  revokeDisplay,
  setNoticeImage,
  updateDisplay,
  updateDisplaySettings,
  updateNotice,
  type NoticeInput,
} from "@/lib/data";
import {
  BUCKET_NEWS,
  IMAGE_TYPES,
  removeFile,
  uploadFile,
  validateFile,
} from "@/lib/storage";
import { endOfDaySe, startOfDaySe } from "@/lib/board-dates";
import { REFRESH_OPTIONS } from "@/lib/board";
import type { FormState } from "@/lib/form";

function revalidate() {
  revalidatePath("/admin/tavlor");
}

/**
 * Sajtens adress för skärmlänken. Byggs av förfrågan, eftersom samma kod körs
 * på flera domäner (en deploy per förening).
 */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Ett hus-id från formuläret, bara om huset hör till föreningen. */
async function buildingFrom(formData: FormData): Promise<string | null> {
  const id = String(formData.get("buildingId") ?? "");
  if (!id) return null;
  const buildings = await getBuildings();
  return buildings.some((b) => b.id === id) ? id : null;
}

// ---------------------------------------------------------------------------
// Skärmar
// ---------------------------------------------------------------------------

/** Svar med skärmens adress – den visas bara den här gången. */
export interface DisplayLinkState {
  error?: string;
  name?: string;
  url?: string;
}

const displaySchema = z.object({
  name: z.string().trim().min(1, "Ge skärmen ett namn, t.ex. ”Uppgång B”.").max(80),
});

export async function createDisplayAction(
  _prev: DisplayLinkState,
  formData: FormData,
): Promise<DisplayLinkState> {
  await requireAdmin();
  const parsed = displaySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { token } = await createDisplay({
    name: parsed.data.name,
    buildingId: await buildingFrom(formData),
  });
  revalidate();
  return { name: parsed.data.name, url: `${await siteOrigin()}/tavla/${token}` };
}

export async function regenerateDisplayTokenAction(
  _prev: DisplayLinkState,
  formData: FormData,
): Promise<DisplayLinkState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const token = await regenerateDisplayToken(id);
  revalidate();
  if (!token) return { error: "Skärmen finns inte längre." };
  return {
    name: String(formData.get("name") ?? ""),
    url: `${await siteOrigin()}/tavla/${token}`,
  };
}

export async function updateDisplayAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = displaySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;
  await updateDisplay(String(formData.get("id") ?? ""), {
    name: parsed.data.name,
    buildingId: await buildingFrom(formData),
  });
  revalidate();
}

export async function revokeDisplayAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await revokeDisplay(String(formData.get("id") ?? ""));
  revalidate();
}

// ---------------------------------------------------------------------------
// Inställningar
// ---------------------------------------------------------------------------

const time = z.string().regex(/^\d{2}:\d{2}$/, "Ange tiden som TT:MM.");

const settingsSchema = z.object({
  showNews: z.boolean(),
  nightOff: z.boolean(),
  nightStart: time,
  nightEnd: time,
  // Bara de glesa valen – se REFRESH_OPTIONS i lib/board.ts.
  refreshMinutes: z.coerce
    .number()
    .refine((n) => REFRESH_OPTIONS.some((o) => o.minutes === n), "Välj hur ofta skärmarna uppdateras."),
});

export async function updateDisplaySettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse({
    showNews: formData.get("showNews") === "on",
    nightOff: formData.get("nightOff") === "on",
    nightStart: formData.get("nightStart"),
    nightEnd: formData.get("nightEnd"),
    refreshMinutes: formData.get("refreshMinutes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { showNews, nightOff, nightStart, nightEnd, refreshMinutes } = parsed.data;
  // Utan nattläge sparas lika tider – det betyder "alltid på".
  await updateDisplaySettings({
    showNews,
    nightStart: nightOff ? nightStart : "00:00",
    nightEnd: nightOff ? nightEnd : "00:00",
    refreshMinutes,
  });
  revalidate();
  return {
    success:
      "Inställningarna är sparade. Skärmarna får dem nästa gång de hämtar nytt innehåll.",
  };
}

// ---------------------------------------------------------------------------
// Anslag
// ---------------------------------------------------------------------------

const noticeSchema = z
  .object({
    title: z.string().trim().min(2, "Ange en rubrik.").max(120),
    body: z.string().trim().max(1200, "Håll texten kort – den ska läsas i förbifarten."),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ange från vilket datum anslaget visas."),
    endDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
    pinned: z.boolean(),
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: "Slutdatumet ligger före startdatumet.",
  });

async function parseNotice(
  formData: FormData,
): Promise<{ ok: true; input: NoticeInput } | { ok: false; error: string }> {
  const parsed = noticeSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") ?? "",
    pinned: formData.get("pinned") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Kontrollera fälten." };
  }
  const d = parsed.data;
  const startsAt = startOfDaySe(d.startDate);
  const endsAt = d.endDate ? endOfDaySe(d.endDate) : null;
  if (!startsAt || (d.endDate && !endsAt)) return { ok: false, error: "Ogiltigt datum." };
  return {
    ok: true,
    input: {
      title: d.title,
      body: d.body,
      startsAt,
      endsAt,
      pinned: d.pinned,
      buildingId: await buildingFrom(formData),
    },
  };
}

function imageFile(formData: FormData): File | null {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : null;
}

/** Laddar upp en ny bild eller tar bort den gamla, och städar bort den som ersätts. */
async function applyImage(noticeId: string, formData: FormData): Promise<string | null> {
  const file = imageFile(formData);
  if (file) {
    const err = validateFile(file, IMAGE_TYPES);
    if (err) return err;
    const up = await uploadFile(BUCKET_NEWS, `anslag/${noticeId}`, file);
    if (!up.ok) return up.error;
    const old = await setNoticeImage(noticeId, up.path);
    if (old) await removeFile(BUCKET_NEWS, old);
  } else if (formData.get("removeImage") === "on") {
    const old = await setNoticeImage(noticeId, null);
    if (old) await removeFile(BUCKET_NEWS, old);
  }
  return null;
}

export async function createNoticeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = await parseNotice(formData);
  if (!parsed.ok) return { error: parsed.error };
  const file = imageFile(formData);
  if (file) {
    const err = validateFile(file, IMAGE_TYPES);
    if (err) return { error: err };
  }
  const { id } = await createNotice(parsed.input);
  const imageError = await applyImage(id, formData);
  revalidate();
  if (imageError) {
    return { error: `Anslaget sparades, men bilden kunde inte laddas upp: ${imageError}` };
  }
  redirect("/admin/tavlor");
}

export async function updateNoticeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = await parseNotice(formData);
  if (!parsed.ok) return { error: parsed.error };
  await updateNotice(id, parsed.input);
  const imageError = await applyImage(id, formData);
  revalidate();
  if (imageError) {
    return { error: `Texten sparades, men bilden kunde inte laddas upp: ${imageError}` };
  }
  redirect("/admin/tavlor");
}

export async function endNoticeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await endNotice(String(formData.get("id") ?? ""));
  revalidate();
}

export async function deleteNoticeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const imagePath = await deleteNotice(String(formData.get("id") ?? ""));
  if (imagePath) await removeFile(BUCKET_NEWS, imagePath);
  revalidate();
}
