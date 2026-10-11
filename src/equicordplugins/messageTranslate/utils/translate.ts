/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

import { getExcludedLanguages, settings } from "../settings";
import { CachedTranslation, TranslateResponse } from "../types";

const logger = new Logger("MessageTranslate");

const translationCache = new Map<string, CachedTranslation>();
const inProgress = new Set<string>();
const failed = new Map<string, { text: string; retryAt: number; }>();

export function getCached(messageId: string): CachedTranslation | undefined {
    return translationCache.get(messageId);
}

export function hasFailed(messageId: string, text: string): boolean {
    const failure = failed.get(messageId);
    return failure?.text === text && Date.now() < failure.retryAt;
}

export function isInProgress(messageId: string): boolean {
    return inProgress.has(messageId);
}

export function clearCache(messageId: string) {
    translationCache.delete(messageId);
    failed.delete(messageId);
}

async function fetchTranslation(text: string, targetLang: string): Promise<TranslateResponse> {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&dj=1&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!response.ok) {
        throw new Error(`Translation API returned ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (typeof result.src !== "string" || !Array.isArray(result.sentences)) throw new Error("Invalid translation response");
    return result;
}

export async function translate(messageId: string, text: string): Promise<CachedTranslation | null> {
    if (inProgress.has(messageId)) return null;
    const cached = translationCache.get(messageId);
    if (cached?.original === text) return cached;
    if (hasFailed(messageId, text)) return null;

    inProgress.add(messageId);

    try {
        const targetLang = settings.store.targetLanguage.trim().toLowerCase();
        const response = await fetchTranslation(text, targetLang);
        const sourceLang = response.src.trim().toLowerCase();

        if (sourceLang === targetLang || response.confidence < settings.store.confidenceRequirement || getExcludedLanguages().has(sourceLang)) {
            failed.set(messageId, { text, retryAt: Infinity });
            return null;
        }

        const translatedText = response.sentences.map(s => s.trans).filter(Boolean).join("");
        if (!translatedText || translatedText === text) {
            failed.set(messageId, { text, retryAt: Infinity });
            return null;
        }

        const entry: CachedTranslation = {
            original: text,
            translated: translatedText,
            sourceLang: response.src,
        };
        translationCache.set(messageId, entry);
        return entry;
    } catch (e) {
        logger.error("Translation failed", e);
        failed.set(messageId, { text, retryAt: Date.now() + 30000 });
        return null;
    } finally {
        inProgress.delete(messageId);
    }
}
