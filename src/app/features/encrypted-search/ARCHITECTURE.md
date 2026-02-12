# Architecture de Recherche de Messages Chiffrés

## Vue d'ensemble

Ce document décrit l'architecture complète pour l'implémentation de la recherche de messages chiffrés avec filtres Discord-like dans Cinny Desktop.

## Objectifs

1. **Recherche locale** : Permettre la recherche dans les messages chiffrés (impossible avec la recherche serveur)
2. **Filtres avancés** : Support des filtres Discord-like (`from:`, `in:`, `before:`, `after:`, `during:`, `has:`, `mentions:`, `pinned:`)
3. **Sécurité** : Index de recherche chiffré sur le disque pour ne pas exposer les messages en clair
4. **Performance** : Indexation incrémentale et recherche rapide
5. **Compatibilité** : Intégration transparente avec l'UI de recherche existante

## Stack Technique

- **Stockage** : IndexedDB (base séparée `cinny-encrypted-search`)
- **Chiffrement** : Web Crypto API (AES-GCM-256 pour l'index)
- **Recherche** : FlexSearch (moteur FTS léger et performant)
- **État** : Jotai (cohérent avec l'architecture existante)

## Architecture des Composants

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer                              │
│  - MessageSearch.tsx (existant, étendu)                 │
│  - SearchFilters.tsx (étendu avec nouveaux filtres)     │
│  - LocalSearchToggle.tsx (nouveau)                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Search Layer                            │
│  - useLocalMessageSearch.ts (nouveau)                   │
│  - searchQueryParser.ts (parse filtres Discord-like)    │
│  - searchEngine.ts (FlexSearch wrapper)                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Indexing Layer                           │
│  - messageIndexer.ts (indexation temps réel)            │
│  - historicalIndexer.ts (indexation background)         │
│  - indexWorker.ts (Web Worker pour perf)                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Encrypted Storage Layer                     │
│  - encryptedSearchDB.ts (gestion IndexedDB)             │
│  - searchCrypto.ts (chiffrement/déchiffrement index)    │
└─────────────────────────────────────────────────────────┘
```

## Schéma de Base de Données

### Database: `cinny-encrypted-search`

#### Store 1: `metadata`
Métadonnées de l'index (non chiffré, minimal)

```typescript
interface IndexMetadata {
  version: number;              // Version du schéma
  userId: string;               // Matrix User ID
  lastIndexedEventId?: string;  // Dernier event indexé
  totalIndexedEvents: number;   // Nombre total d'events indexés
  createdAt: number;            // Timestamp de création
  updatedAt: number;            // Timestamp de dernière mise à jour
  indexingProgress: {
    [roomId: string]: {
      lastEventId: string;
      lastTimestamp: number;
      totalEvents: number;
    };
  };
}
```

**Clé primaire** : `userId`

#### Store 2: `search_index`
Index de recherche chiffré (données sensibles)

```typescript
interface EncryptedSearchEntry {
  // Clé primaire composite
  id: string;                   // Format: `${roomId}:${eventId}`

  // Métadonnées (non chiffrées pour filtrage)
  roomId: string;               // ID de la room (index)
  eventId: string;              // ID de l'event Matrix (index)
  senderId: string;             // User ID de l'expéditeur (index)
  timestamp: number;            // Timestamp du message (index)

  // État du message
  isEncrypted: boolean;         // Message était chiffré
  isPinned: boolean;            // Message épinglé (index)
  isEdited: boolean;            // Message édité
  isDeleted: boolean;           // Message supprimé (soft delete)

  // Mentions et références
  mentions: string[];           // User IDs mentionnés (index multi-entry)
  replyToEventId?: string;      // Si c'est une réponse
  threadRootId?: string;        // Si dans un thread

  // Type de contenu (pour filtres `has:`)
  hasAttachment: boolean;       // A des pièces jointes
  hasImage: boolean;            // A des images
  hasVideo: boolean;            // A des vidéos
  hasAudio: boolean;            // A de l'audio
  hasFile: boolean;             // A des fichiers
  hasLink: boolean;             // Contient des liens

  // Données chiffrées (BLOB chiffré avec AES-GCM)
  encryptedData: ArrayBuffer;   // Contient SearchableContent chiffré
  iv: Uint8Array;               // IV pour AES-GCM (12 bytes)

  // Métadonnées de chiffrement
  cryptoVersion: number;        // Version de l'algo de chiffrement

  // Pour la synchronisation
  indexedAt: number;            // Timestamp d'indexation
}

interface SearchableContent {
  // Contenu textuel (pour FTS)
  body: string;                 // Texte du message (déchiffré)

  // Réaction context
  displayName: string;          // Nom d'affichage de l'expéditeur
  roomName?: string;            // Nom de la room (cache)

  // Métadonnées enrichies
  attachments?: {
    type: string;               // Type MIME
    name: string;               // Nom du fichier
    size: number;               // Taille
  }[];

  links?: string[];             // URLs trouvées dans le message

  // Event original (structure minimale pour affichage)
  eventType: string;
  content: any;                 // Content minimum pour reconstruction
}
```

**Indexes** :
- `roomId` : Pour recherche par room
- `senderId` : Pour filtrage `from:`
- `timestamp` : Pour filtrage `before:`, `after:`, `during:`
- `mentions` (multi-entry) : Pour filtrage `mentions:`
- `isPinned` : Pour filtrage `pinned:`
- Composite `roomId, timestamp` : Pour pagination efficace

#### Store 3: `encryption_keys`
Clés de chiffrement dérivées (protégées)

```typescript
interface EncryptionKeyEntry {
  userId: string;               // Matrix User ID (clé primaire)

  // Clé dérivée stockée chiffrée avec la clé du compte
  encryptedKey: ArrayBuffer;    // Clé AES-GCM pour l'index, elle-même chiffrée
  salt: Uint8Array;             // Salt pour PBKDF2
  iv: Uint8Array;               // IV pour chiffrement de la clé

  // Paramètres de dérivation
  iterations: number;           // Nombre d'itérations PBKDF2 (100000)
  algorithm: string;            // 'AES-GCM'
  keySize: number;              // 256 bits

  createdAt: number;
  lastUsedAt: number;
}
```

**Clé primaire** : `userId`

#### Store 4: `search_cache`
Cache de recherche pour performance (optionnel, TTL court)

```typescript
interface SearchCacheEntry {
  queryHash: string;            // Hash de la requête (clé primaire)
  query: SearchQuery;           // Requête complète
  results: string[];            // IDs des résultats (searchIndex.id)
  totalCount: number;           // Nombre total de résultats
  createdAt: number;            // Timestamp
  expiresAt: number;            // TTL: 5 minutes
}
```

**Clé primaire** : `queryHash`
**Index** : `expiresAt` (pour nettoyage automatique)

## Flux de Données

### 1. Initialisation

```
Démarrage App
    │
    ▼
Vérifier IndexedDB existe
    │
    ├─ Non ─→ Créer schéma
    │         Dériver clé de chiffrement
    │         Initialiser metadata
    │
    ▼
Charger clé de chiffrement
    │
    ▼
Initialiser FlexSearch
    │
    ▼
Démarrer indexation temps réel
```

### 2. Indexation Temps Réel

```
Event Timeline Matrix
    │
    ▼
Event.decrypted OU Room.timeline
    │
    ▼
messageIndexer.indexEvent()
    │
    ├─ Extraire contenu textuel
    ├─ Extraire métadonnées
    ├─ Détecter mentions, liens, attachments
    │
    ▼
Chiffrer SearchableContent
    │
    ▼
Stocker dans search_index
    │
    ▼
Mettre à jour FlexSearch
```

### 3. Indexation Historique (Background)

```
User demande indexation
    │
    ▼
Lancer Web Worker
    │
    ▼
Pour chaque room:
    │
    ├─ Charger timeline via Matrix SDK
    ├─ Décrypter events (si chiffrés)
    ├─ Batch indexation (par 100)
    │   │
    │   ▼
    │   Chiffrer par batch
    │   Stocker en transaction
    │   │
    │   ▼
    │   Mettre à jour progress
    │   Notifier UI
    │
    ▼
Finaliser indexation
Notifier succès
```

### 4. Recherche

```
User saisit requête
    │
    ▼
Parser filtres Discord-like
    │
    ├─ from:@user
    ├─ in:#room
    ├─ before:2024-01-01
    ├─ after:2024-01-01
    ├─ during:2024-01
    ├─ has:image
    ├─ mentions:@user
    ├─ pinned:true
    └─ Texte libre
    │
    ▼
Vérifier cache (queryHash)
    │
    ├─ Cache hit ─→ Retourner résultats
    │
    ▼
Exécuter requête FlexSearch (texte)
    │
    ▼
Filtrer par métadonnées IndexedDB
    │
    ├─ Filtrer par roomId
    ├─ Filtrer par senderId
    ├─ Filtrer par timestamp
    ├─ Filtrer par mentions
    ├─ Filtrer par flags (pinned, etc.)
    │
    ▼
Charger entries chiffrées
    │
    ▼
Déchiffrer SearchableContent
    │
    ▼
Formater résultats
    │
    ├─ Grouper par room
    ├─ Trier par pertinence/date
    ├─ Highlighter termes
    │
    ▼
Mettre en cache
    │
    ▼
Retourner à UI
```

## Sécurité du Chiffrement

### Génération de la Clé Maître

```typescript
// Dérivation à partir des credentials Matrix
const masterKey = await deriveSearchKey(
  userId,           // Matrix User ID
  accessToken,      // Matrix access token (ou deviceId)
  deviceId          // Device ID
);
```

La clé est dérivée avec PBKDF2 (100000 iterations, SHA-512) à partir de :
- User ID (salt unique par utilisateur)
- Access Token ou Device ID (entropie)

### Chiffrement des Données

Chaque `SearchableContent` est chiffré avec :
- **Algorithm** : AES-GCM-256
- **IV** : 12 bytes aléatoires (unique par entry)
- **AAD (Additional Authenticated Data)** : `roomId:eventId` (protection contre replay)

```typescript
const encryptedData = await encryptSearchContent(
  searchableContent,
  masterKey,
  iv,
  `${roomId}:${eventId}` // AAD
);
```

### Protection de la Clé Maître

La clé maître est stockée dans `encryption_keys`, elle-même chiffrée avec une clé dérivée du password ou stockage sécurisé :

1. **Option 1** : Demander un password de chiffrement séparé (recommandé)
2. **Option 2** : Utiliser le secret storage Matrix
3. **Option 3** : Stocker en mémoire seulement (réindexation à chaque démarrage)

## Optimisations

### 1. Indexation Incrémentale
- Tracker le dernier eventId indexé par room
- Ne réindexer que les nouveaux messages
- Utiliser les timelines Matrix avec pagination

### 2. Batch Processing
- Indexer par lots de 100 events
- Utiliser des transactions IndexedDB
- Worker séparé pour ne pas bloquer UI

### 3. Cache Intelligent
- Cache de recherche avec TTL court (5 min)
- Invalider cache lors de nouveaux messages
- LRU pour limiter taille mémoire

### 4. Lazy Loading
- Ne charger que les 20 premiers résultats
- Pagination infinie avec virtualisation
- Déchiffrer à la demande

### 5. Index Partiel
- Indexer seulement les N derniers jours (configurable)
- Option d'index complet sur demande
- Purge automatique des vieux messages

## Migration et Versioning

Le schéma supporte le versioning pour évolutions futures :

```typescript
interface SchemaVersion {
  version: number;
  migrate: (db: IDBDatabase) => Promise<void>;
}

const migrations: SchemaVersion[] = [
  {
    version: 1,
    migrate: async (db) => {
      // Schéma initial
      createStores(db);
    }
  },
  {
    version: 2,
    migrate: async (db) => {
      // Ajout de nouveaux champs
      // Migration incrémentale
    }
  }
];
```

## Filtres Discord-like

### Syntaxe Supportée

| Filtre | Exemple | Description |
|--------|---------|-------------|
| `from:` | `from:@user:matrix.org` | Messages de cet utilisateur |
| `mentions:` | `mentions:@user:matrix.org` | Messages mentionnant cet utilisateur |
| `in:` | `in:#room:matrix.org` | Messages dans cette room |
| `before:` | `before:2024-01-15` | Messages avant cette date |
| `after:` | `after:2024-01-01` | Messages après cette date |
| `during:` | `during:2024-01` | Messages pendant ce mois |
| `has:` | `has:image`, `has:link`, `has:file` | Messages avec attachments |
| `pinned:` | `pinned:true` | Messages épinglés |

### Combinaisons

```
from:@alice has:image before:2024-01-01
in:#general mentions:@bob chat importante
```

## Interface Utilisateur

### Toggle Local/Server Search

```typescript
<SearchModeToggle>
  <Radio value="server">Server Search (unencrypted only)</Radio>
  <Radio value="local">Local Search (all messages)</Radio>
</SearchModeToggle>
```

### Status Indicator

```typescript
<IndexingStatus>
  {indexing ? (
    <Progress value={progress} max={total}>
      Indexing: {progress}/{total} messages
    </Progress>
  ) : (
    <Text>✓ {totalIndexed} messages indexed</Text>
  )}
</IndexingStatus>
```

### Settings

```typescript
<EncryptedSearchSettings>
  <Checkbox checked={enabled} onChange={setEnabled}>
    Enable encrypted search
  </Checkbox>

  <NumberInput
    label="Index retention (days)"
    value={retentionDays}
    onChange={setRetentionDays}
  />

  <Button onClick={reindexAll}>
    Reindex All Messages
  </Button>

  <Button onClick={clearIndex} variant="destructive">
    Clear Search Index
  </Button>
</EncryptedSearchSettings>
```

## Limitations et Trade-offs

### Avantages ✅
- Recherche dans messages chiffrés
- Filtres avancés Discord-like
- Index chiffré sur disque
- Performance acceptable (FlexSearch)
- Pas de modifications au schéma Matrix SDK

### Inconvénients ⚠️
- Nécessite indexation initiale (peut prendre du temps)
- Consommation d'espace disque (~ 30% taille des messages)
- Recherche limitée aux messages chargés localement
- Pas de recherche cross-device (index local seulement)

### Risques de Sécurité 🔒
- Clé de chiffrement en mémoire pendant l'usage
- Vulnérable si appareil compromis pendant usage
- Pas de protection si accès physique + session déverrouillée

## Prochaines Étapes

1. ✅ **Conception schéma** (ce document)
2. ⏳ Implémenter couche de stockage IndexedDB
3. ⏳ Implémenter système de chiffrement
4. ⏳ Implémenter indexation temps réel
5. ⏳ Implémenter moteur de recherche + parseur
6. ⏳ Implémenter indexation background
7. ⏳ Adapter UI existante
8. ⏳ Tests et optimisations
