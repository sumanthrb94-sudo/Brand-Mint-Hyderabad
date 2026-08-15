/**
 * In-memory doubles for Firestore and Cloud Storage.
 *
 * These present exactly the surface `server/firebaseRepository.ts` and
 * `server/firebase.ts` consume — `collection(name).get()`,
 * `collection(name).doc(id).get()/set()`, and `file(key).save()/getSignedUrl()`
 * — and nothing more. It is the same approach `server/journey.simulation.test.ts`
 * already takes for the test suite, lifted so the running application can use it
 * too.
 *
 * Everything above this boundary is the real product: the real routers, the real
 * authorization middleware, the real SOP gating, the real pricing and invoice
 * maths, the real PDF generator and the real React client. Only the two managed
 * Google services are replaced, because a container with no service-account
 * credentials cannot reach them.
 */

type Doc = Record<string, unknown>;

const documents = new Map<string, Map<string, Doc>>();
const objects = new Map<string, { bytes: Buffer; contentType: string }>();

function collectionMap(name: string) {
  const existing = documents.get(name);
  if (existing) return existing;
  const created = new Map<string, Doc>();
  documents.set(name, created);
  return created;
}

export const simulationFirestore = {
  collection: (name: string) => ({
    get: async () => ({
      docs: Array.from(collectionMap(name).entries(), ([id, data]) => ({ id, data: () => data })),
    }),
    doc: (id: string) => ({
      get: async () => ({ id, data: () => collectionMap(name).get(id) }),
      set: async (value: Doc, options?: { merge?: boolean }) => {
        const previous = options?.merge ? (collectionMap(name).get(id) ?? {}) : {};
        collectionMap(name).set(id, { ...previous, ...value });
      },
      delete: async () => {
        collectionMap(name).delete(id);
      },
    }),
  }),
};

export const simulationStorage = {
  file: (key: string) => ({
    save: async (contents: Buffer, options: { contentType: string }) => {
      objects.set(key, { bytes: Buffer.from(contents), contentType: options.contentType });
    },
    getSignedUrl: async () => [`/api/simulation/files/${encodeURIComponent(key)}`],
  }),
};

/** Served by the simulation file route so an invoice PDF genuinely downloads. */
export function simulationObject(key: string) {
  return objects.get(key) ?? null;
}

export function resetSimulationStore() {
  documents.clear();
  objects.clear();
}

/** Row counts per collection, for the boot log. */
export function simulationCounts() {
  return Object.fromEntries(Array.from(documents.entries(), ([name, rows]) => [name, rows.size]));
}
