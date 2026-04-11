import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

const COLLECTION = "pmes_progress";

/** Firestore rules may block progress docs; avoid noisy uncaught rejections. */
function isFirestorePermissionError(err) {
  const code = err && typeof err === "object" ? err.code : "";
  return code === "permission-denied" || code === "missing-or-insufficient-permissions";
}

/** @param {import('firebase/firestore').Firestore} db */
export function progressDocRef(db, appId, uid) {
  return doc(db, "artifacts", appId, "public", "data", COLLECTION, uid);
}

/**
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function loadPmesProgress(db, appId, uid) {
  try {
    const snap = await getDoc(progressDocRef(db, appId, uid));
    if (!snap.exists()) return null;
    return snap.data() ?? null;
  } catch (e) {
    if (isFirestorePermissionError(e)) return null;
    throw e;
  }
}

/**
 * Persists PMES UI state for resume-after-login. Omits undefined values for Firestore.
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} appId
 * @param {string} uid
 * @param {Record<string, unknown>} payload
 */
export async function savePmesProgress(db, appId, uid, payload) {
  try {
    const cleaned = JSON.parse(JSON.stringify(payload));
    await setDoc(
      progressDocRef(db, appId, uid),
      {
        ...cleaned,
        userId: uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (e) {
    if (isFirestorePermissionError(e)) {
      if (import.meta.env.DEV) {
        console.warn(
          "[pmesProgress] Firestore write blocked by rules — allow writes to artifacts/{appId}/public/data/pmes_progress/{uid} or progress resume will stay local-only.",
        );
      }
      return;
    }
    throw e;
  }
}

/**
 * Clears saved progress (e.g. after member completes onboarding).
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} appId
 * @param {string} uid
 */
export async function clearPmesProgress(db, appId, uid) {
  try {
    await deleteDoc(progressDocRef(db, appId, uid));
  } catch (e) {
    if (isFirestorePermissionError(e)) return;
    throw e;
  }
}
