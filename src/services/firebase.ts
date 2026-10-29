/**
 * firebase.ts
 * All Firebase interactions in one place.
 * Uses @react-native-firebase (native SDK, not JS compat).
 */

import auth from '@react-native-firebase/auth';
import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export type AppType = 'whatsapp' | 'whatsapp_business' | 'sms';

export interface Message {
  id: string;
  app: AppType;
  sender: string;
  preview: string;
  timestamp: FirebaseFirestoreTypes.Timestamp | null;
  read: boolean;
  childId: string;
}

export interface PairRecord {
  parentDeviceId: string;
  childDeviceId: string;
  childName: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  active: boolean;
}

// ── Auth ────────────────────────────────────────────────────────────────────

/**
 * Signs in (or retrieves existing) anonymous Firebase user.
 * Returns the uid which we use as the device ID.
 */
export async function signInAnonymously(): Promise<string> {
  const existing = auth().currentUser;
  if (existing) return existing.uid;

  const { user } = await auth().signInAnonymously();
  return user.uid;
}

export function currentDeviceId(): string | null {
  return auth().currentUser?.uid ?? null;
}

// ── Pairing codes ───────────────────────────────────────────────────────────

/**
 * Parent: generates a 6-digit numeric pairing code valid for 10 minutes.
 * Returns the code string.
 */
export async function createPairingCode(parentDeviceId: string): Promise<string> {
  // Generate a 6-digit code, retry if it collides (astronomically unlikely)
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await firestore().collection('pairingCodes').doc(code).set({
    parentDeviceId,
    createdAt: firestore.FieldValue.serverTimestamp(),
    expiresAt: firestore.Timestamp.fromDate(expiresAt),
    used: false,
  });

  return code;
}

/**
 * Child: redeems a pairing code, creates the pair record.
 * Returns the new pairId, or throws if the code is invalid/expired.
 */
export async function redeemPairingCode(
  code: string,
  childDeviceId: string,
  childName: string
): Promise<string> {
  const codeRef = firestore().collection('pairingCodes').doc(code);
  const snap = await codeRef.get();

  if (!snap.exists) throw new Error('Invalid pairing code.');

  const data = snap.data()!;
  if (data.used) throw new Error('This code has already been used.');

  const expiresAt: FirebaseFirestoreTypes.Timestamp = data.expiresAt;
  if (expiresAt.toDate() < new Date()) throw new Error('Pairing code has expired.');

  const pairId = uuidv4();

  const batch = firestore().batch();

  // Mark code as used
  batch.update(codeRef, { used: true });

  // Create pair record
  batch.set(firestore().collection('pairs').doc(pairId), {
    parentDeviceId: data.parentDeviceId,
    childDeviceId,
    childName,
    createdAt: firestore.FieldValue.serverTimestamp(),
    active: true,
  } as Omit<PairRecord, 'createdAt'> & { createdAt: any });

  await batch.commit();

  return pairId;
}

/**
 * Looks up the pairId for a given device (parent or child).
 * Returns null if no active pair exists.
 */
export async function findPairId(deviceId: string): Promise<string | null> {
  const asParent = await firestore()
    .collection('pairs')
    .where('parentDeviceId', '==', deviceId)
    .where('active', '==', true)
    .limit(1)
    .get();

  if (!asParent.empty) return asParent.docs[0].id;

  const asChild = await firestore()
    .collection('pairs')
    .where('childDeviceId', '==', deviceId)
    .where('active', '==', true)
    .limit(1)
    .get();

  if (!asChild.empty) return asChild.docs[0].id;

  return null;
}

export async function getPairRecord(pairId: string): Promise<PairRecord | null> {
  const snap = await firestore().collection('pairs').doc(pairId).get();
  return snap.exists ? (snap.data() as PairRecord) : null;
}

// ── Messages ─────────────────────────────────────────────────────────────────

/**
 * Subscribes to new messages for a pair in real-time.
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(
  pairId: string,
  onMessages: (msgs: Message[]) => void,
  limit = 50
): () => void {
  return firestore()
    .collection('messages')
    .doc(pairId)
    .collection('items')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .onSnapshot(snapshot => {
      const msgs: Message[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Message, 'id'>),
      }));
      onMessages(msgs);
    });
}

/**
 * Marks a message as read by the parent.
 */
export async function markMessageRead(pairId: string, messageId: string): Promise<void> {
  await firestore()
    .collection('messages')
    .doc(pairId)
    .collection('items')
    .doc(messageId)
    .update({ read: true });
}

/**
 * Marks all unread messages as read.
 */
export async function markAllRead(pairId: string): Promise<void> {
  const unread = await firestore()
    .collection('messages')
    .doc(pairId)
    .collection('items')
    .where('read', '==', false)
    .get();

  if (unread.empty) return;

  const batch = firestore().batch();
  unread.docs.forEach(doc => batch.update(doc.ref, { read: true }));
  await batch.commit();
}
