# Recherche de Messages Chiffrés (Encrypted Search)

## Vue d'ensemble

Cette fonctionnalité permet de rechercher dans les **messages chiffrés** avec des filtres avancés de type Discord. L'index de recherche est lui-même **chiffré sur le disque** pour ne pas exposer le contenu des messages en clair.

## Fonctionnalités

✅ **Recherche dans messages chiffrés** : Contrairement à la recherche serveur, fonctionne avec les messages E2EE
✅ **Filtres Discord-like** : Support de `from:`, `in:`, `before:`, `after:`, `during:`, `has:`, `mentions:`, `pinned:`
✅ **Index chiffré** : Les données indexées sont chiffrées avec AES-GCM-256
✅ **Indexation temps réel** : Les nouveaux messages sont automatiquement indexés
✅ **Indexation historique** : Indexation en arrière-plan des messages passés
✅ **Cache intelligent** : Cache de résultats avec TTL pour performance

## Architecture

```
encrypted-search/
├── ARCHITECTURE.md          # Documentation architecture détaillée
├── README.md               # Ce fichier
├── types.ts                # Définitions TypeScript
├── index.ts                # Exports publics
│
├── db/
│   └── encryptedSearchDB.ts    # Couche IndexedDB
│
├── crypto/
│   └── searchCrypto.ts         # Chiffrement/déchiffrement
│
├── indexing/
│   ├── messageIndexer.ts       # Indexation temps réel
│   └── historicalIndexer.ts    # Indexation historique
│
├── search/
│   ├── searchQueryParser.ts    # Parseur de requêtes
│   └── searchEngine.ts         # Moteur de recherche
│
├── hooks/
│   └── useLocalMessageSearch.ts # Hook React
│
└── components/
    ├── SearchModeToggle.tsx    # Toggle serveur/local
    └── IndexingStatus.tsx      # Status d'indexation
```

## Installation et Initialisation

### 1. Initialiser le chiffrement

```typescript
import { initializeEncryption, loadMasterKey } from '@/app/features/encrypted-search';

// Au démarrage de l'app (après connexion Matrix)
const userId = mx.getUserId();
const deviceId = mx.getDeviceId();

// Initialiser (première fois seulement)
await initializeEncryption(userId, deviceId);

// Charger la clé (à chaque démarrage)
await loadMasterKey(userId, deviceId);
```

### 2. Démarrer l'indexation temps réel

```typescript
import { initMessageIndexer } from '@/app/features/encrypted-search';

const indexer = initMessageIndexer(mx);
indexer.start();
```

### 3. (Optionnel) Indexer l'historique

```typescript
import { initHistoricalIndexer } from '@/app/features/encrypted-search';

const historicalIndexer = initHistoricalIndexer(mx);

// Avec callback de progression
await historicalIndexer.indexAllRooms((event) => {
  if (event.type === 'progress') {
    console.log(`Progress: ${event.processed}/${event.total}`);
  } else if (event.type === 'complete') {
    console.log('Indexing complete!');
  }
});
```

## Utilisation

### Hook React pour la recherche

```typescript
import { useLocalMessageSearch } from '@/app/features/encrypted-search';

function MySearchComponent() {
  const searchMessages = useLocalMessageSearch({
    term: 'hello world from:@alice has:image',
    order: 'recent',
  });

  const handleSearch = async () => {
    const results = await searchMessages(0); // offset = 0

    console.log(results.groups); // Résultats groupés par room
    console.log(results.totalCount); // Nombre total
    console.log(results.hasMore); // Y a-t-il plus de résultats ?
  };

  return <button onClick={handleSearch}>Search</button>;
}
```

### Syntaxe des filtres

| Filtre      | Exemple                        | Description                       |
| ----------- | ------------------------------ | --------------------------------- |
| `from:`     | `from:@alice:matrix.org`       | Messages de cet utilisateur       |
| `mentions:` | `mentions:@bob:matrix.org`     | Messages mentionnant cet user     |
| `in:`       | `in:#general:matrix.org`       | Messages dans cette room          |
| `before:`   | `before:2024-01-15`            | Messages avant cette date         |
| `after:`    | `after:2024-01-01`             | Messages après cette date         |
| `during:`   | `during:2024-01` ou `during:2024` | Messages pendant ce mois/année |
| `has:`      | `has:image`, `has:link`        | Messages avec attachments         |
| `pinned:`   | `pinned:true`                  | Messages épinglés                 |

### Exemples de requêtes

```typescript
// Recherche simple
'hello world';

// Recherche avec filtres
'from:@alice important';
'in:#general has:image meeting';
'before:2024-01-01 urgent';
'mentions:@bob during:2024-01';

// Combinaisons complexes
'from:@alice in:#dev has:link before:2024-12-01 bug report';
```

### API Programmatique

```typescript
import { parseSearchQuery, getSearchEngine } from '@/app/features/encrypted-search';

// Parser une requête
const query = parseSearchQuery('from:@alice hello');
// => { from: '@alice:matrix.org', text: 'hello', orderBy: 'recent' }

// Recherche directe
const searchEngine = getSearchEngine();
const results = await searchEngine.search(query, 20, 0);

// Compter les résultats
const count = await searchEngine.countResults(query);
```

## Sécurité

### Chiffrement de l'index

- **Algorithme** : AES-GCM-256
- **Dérivation de clé** : PBKDF2 (100,000 iterations, SHA-512)
- **IV** : 12 bytes aléatoires (unique par entrée)
- **AAD** : `roomId:eventId` (protection contre replay)

### Protection de la clé maître

La clé maître est dérivée de :

- User ID (salt unique)
- Device ID (entropie)
- Access Token (optionnel)

Elle est stockée dans IndexedDB **chiffrée** avec une clé dérivée du password ou des credentials.

### Considérations de sécurité

⚠️ **Limitations** :

- La clé est en mémoire pendant l'utilisation
- Vulnérable si l'appareil est compromis pendant l'usage
- Pas de protection si accès physique + session déverrouillée

✅ **Bonnes pratiques** :

- Utiliser un password séparé pour le chiffrement (option future)
- Vider le cache régulièrement
- Limiter la durée de rétention des messages indexés

## Base de Données

### Structure IndexedDB

**Database** : `cinny-encrypted-search`

**Stores** :

1. `metadata` : Métadonnées de l'index
2. `search_index` : Index de recherche chiffré
3. `encryption_keys` : Clés de chiffrement
4. `search_cache` : Cache de résultats (TTL: 5 min)

### Schéma détaillé

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour le schéma complet.

## Performance

### Optimisations

- **Batch processing** : Indexation par lots de 100 events
- **Indexes IndexedDB** : Sur roomId, senderId, timestamp, mentions
- **Cache de recherche** : TTL de 5 minutes
- **Déchiffrement parallèle** : Batch decrypt avec Promise.all
- **Lazy loading** : Chargement à la demande des résultats

### Benchmarks estimés

- **Indexation** : ~100-200 messages/seconde
- **Recherche** : <100ms pour ~1000 messages
- **Espace disque** : ~30% de la taille des messages

## Maintenance

### Nettoyer le cache

```typescript
import { clearAllCache, clearExpiredCache } from '@/app/features/encrypted-search';

// Nettoyer cache expiré
await clearExpiredCache();

// Nettoyer tout le cache
await clearAllCache();
```

### Réindexer une room

```typescript
import { getHistoricalIndexer } from '@/app/features/encrypted-search';

const indexer = getHistoricalIndexer();
await indexer.indexRooms(['!roomId:matrix.org']);
```

### Supprimer complètement l'index

```typescript
import {
  deleteEncryptedSearchDB,
  destroyMessageIndexer,
  destroyHistoricalIndexer,
} from '@/app/features/encrypted-search';

// Arrêter les indexers
destroyMessageIndexer();
destroyHistoricalIndexer();

// Supprimer la DB
await deleteEncryptedSearchDB();
```

## Intégration avec l'UI existante

### Étendre MessageSearch.tsx

```typescript
import { SearchModeToggle, SearchMode } from '@/app/features/encrypted-search/components';
import { useLocalMessageSearch } from '@/app/features/encrypted-search';

function MessageSearch() {
  const [searchMode, setSearchMode] = useState<SearchMode>('server');

  const serverSearch = useMessageSearch(params); // Existant
  const localSearch = useLocalMessageSearch(params); // Nouveau

  const searchMessages =
    searchMode === 'local' ? localSearch : serverSearch;

  return (
    <>
      <SearchModeToggle mode={searchMode} onModeChange={setSearchMode} />
      {/* Reste de l'UI inchangé */}
    </>
  );
}
```

## Tests

### Tests unitaires

```bash
# À implémenter
yarn test encrypted-search
```

### Tests d'intégration

```typescript
import { initializeEncryption, getSearchEngine } from '@/app/features/encrypted-search';

// Test encryption round-trip
const content = { body: 'test', displayName: 'Alice', eventType: 'm.room.message', content: {} };
const { encryptedData, iv } = await encryptSearchContent(content, 'roomId', 'eventId');
const decrypted = await decryptSearchContent(encryptedData, iv, 'roomId', 'eventId');
expect(decrypted.body).toBe('test');

// Test search
const searchEngine = getSearchEngine();
const results = await searchEngine.search({ text: 'hello' }, 20, 0);
expect(results.groups.length).toBeGreaterThan(0);
```

## Limitations connues

1. **Pas de recherche cross-device** : L'index est local uniquement
2. **Recherche limitée aux messages chargés** : Nécessite indexation historique
3. **Pas de fuzzy search** : Recherche exacte uniquement (pour l'instant)
4. **Pas de recherche dans fichiers** : Seulement le texte et métadonnées
5. **Taille de l'index** : Peut devenir importante sur longue durée

## Roadmap

- [ ] Support multi-device avec sync d'index chiffré
- [ ] Fuzzy search / recherche phonétique
- [ ] Recherche dans contenu de fichiers (PDF, etc.)
- [ ] Compression de l'index
- [ ] ML pour ranking amélioré
- [ ] Export/import d'index
- [ ] Support de recherche regex
- [ ] Statistiques de recherche

## Support

Pour des questions ou problèmes :

1. Vérifier [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Consulter les logs console (search for "encrypted-search")
3. Ouvrir une issue GitHub

## License

AGPL-3.0-only (même que Cinny)
