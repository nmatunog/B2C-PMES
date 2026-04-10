import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";

export const PmesService = {
  async saveRecord(db, appId, user, data) {
    if (!user) throw new Error("Auth Required");
    const pmesRef = collection(db, "artifacts", appId, "public", "data", "pmes_records");
    const docRef = await addDoc(pmesRef, {
      ...data,
      userId: user.uid,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  },

  async saveLoi(db, appId, user, data) {
    if (!user) throw new Error("Auth Required");
    const loiRef = collection(db, "artifacts", appId, "public", "data", "loi_records");
    const docRef = await addDoc(loiRef, {
      ...data,
      userId: user.uid,
      submittedAt: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  },

  async findRecord(db, appId, email, dob) {
    const pmesRef = collection(db, "artifacts", appId, "public", "data", "pmes_records");
    const snapshot = await getDocs(pmesRef);
    const records = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter(
        (record) =>
          record.email?.toLowerCase().trim() === email.toLowerCase().trim() && record.dob === dob,
      );
    return records.find((record) => record.passed) || records[0] || null;
  },

  async getAllRecords(db, appId) {
    const pmesRef = collection(db, "artifacts", appId, "public", "data", "pmes_records");
    const snapshot = await getDocs(pmesRef);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
};
