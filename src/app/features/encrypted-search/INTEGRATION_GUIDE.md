# Guide d'Intégration - Recherche de Messages Chiffrés

Ce guide explique comment intégrer la fonctionnalité de recherche chiffrée dans Cinny Desktop.

## Étape 1 : Initialisation au démarrage de l'application

### Modifier `src/client/initMatrix.ts`

Ajouter l'initialisation de la recherche chiffrée après le démarrage du client Matrix :

```typescript
import {
  initializeEncryption,
  loadMasterKey,
  initMessageIndexer,
  isMasterKeyLoaded,
} from '../app/features/encrypted-search';

// ... code existant ...

await mx.startClient({
  lazyLoadMembers: true,
});

// NOUVEAU : Initialiser la recherche chiffrée
const userId = mx.getUserId();
const deviceId = mx.getDeviceId();

if (userId && deviceId) {
  try {
    // Vérifier si déjà initialisé, sinon initialiser
    const { getEncryptionKey } = await import('../app/features/encrypted-search');
    const existingKey = await getEncryptionKey(userId);

    if (!existingKey) {
      console.log('Initializing encrypted search for the first time...');
      await initializeEncryption(userId, deviceId);
    }

    // Charger la clé de chiffrement
    await loadMasterKey(userId, deviceId);

    // Démarrer l'indexation en temps réel
    const indexer = initMessageIndexer(mx);
    indexer.start();

    console.log('Encrypted search initialized successfully');
  } catch (error) {
    console.error('Failed to initialize encrypted search:', error);
    // Ne pas bloquer le démarrage de l'app si la recherche chiffrée échoue
  }
}
```

## Étape 2 : Étendre l'interface de recherche existante

### Modifier `src/app/features/message-search/MessageSearch.tsx`

```typescript
import { useState } from 'react';
import { SearchModeToggle, SearchMode } from '../encrypted-search/components/SearchModeToggle';
import { useLocalMessageSearch } from '../encrypted-search/hooks/useLocalMessageSearch';
import { LocalSearchResultGroup } from '../encrypted-search/types';

export function MessageSearch({
  defaultRoomsFilterName,
  allowGlobal,
  rooms,
  senders,
  scrollRef,
}: MessageSearchProps) {
  // ... code existant ...

  // NOUVEAU : State pour le mode de recherche
  const [searchMode, setSearchMode] = useState<SearchMode>('server');

  // Hook pour recherche locale
  const localSearchMessages = useLocalMessageSearch(msgSearchParams);

  // Utiliser la recherche appropriée selon le mode
  const searchFunction = searchMode === 'local' ? localSearchMessages : searchMessages;

  // Modifier useInfiniteQuery pour supporter les deux modes
  const { status, data, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    enabled: !!msgSearchParams.term,
    queryKey: [
      'search',
      searchMode, // NOUVEAU : inclure le mode dans la clé
      msgSearchParams.term,
      msgSearchParams.order,
      msgSearchParams.rooms,
      msgSearchParams.senders,
    ],
    queryFn: async ({ pageParam }) => {
      if (searchMode === 'local') {
        // Recherche locale retourne un format différent
        const localResults = await searchFunction(pageParam || 0);

        // Adapter au format existant
        return {
          groups: localResults.groups.map((g) => ({
            roomId: g.roomId,
            items: g.items.map((item) => ({
              rank: item.score || 0,
              event: {
                ...item.entry,
                event_id: item.entry.eventId,
                room_id: item.entry.roomId,
                sender: item.entry.senderId,
                origin_server_ts: item.entry.timestamp,
                type: item.content.eventType,
                content: item.content.content,
              },
              context: {
                profile_info: {
                  displayname: item.content.displayName,
                },
              },
            })),
          })),
          nextToken: localResults.hasMore ? String(pageParam + 20) : undefined,
          highlights: [], // TODO: extraire des highlights du contenu
        };
      } else {
        // Recherche serveur (existant)
        return searchMessages(pageParam);
      }
    },
    initialPageParam: searchMode === 'local' ? 0 : '',
    getNextPageParam: (lastPage) => {
      if (searchMode === 'local') {
        return lastPage.nextToken ? Number(lastPage.nextToken) : undefined;
      }
      return lastPage.nextToken;
    },
  });

  return (
    <Box direction="Column" gap="700">
      {/* ... code existant ... */}

      <Box ref={scrollTopAnchorRef} direction="Column" gap="300">
        {/* NOUVEAU : Toggle de mode de recherche */}
        <SearchModeToggle mode={searchMode} onModeChange={setSearchMode} />

        <SearchInput
          active={!!msgSearchParams.term}
          loading={status === 'pending'}
          searchInputRef={searchInputRef}
          onSearch={handleSearch}
          onReset={handleSearchClear}
        />

        <SearchFilters
          defaultRoomsFilterName={defaultRoomsFilterName}
          allowGlobal={allowGlobal && searchMode === 'server'} // Désactiver global pour recherche locale
          roomList={searchPathSearchParams.global === 'true' ? allRooms : rooms}
          selectedRooms={searchParamRooms}
          onSelectedRoomsChange={handleSelectedRoomsChange}
          global={searchPathSearchParams.global === 'true'}
          onGlobalChange={handleGlobalChange}
          order={msgSearchParams.order}
          onOrderChange={handleOrderChange}
        />
      </Box>

      {/* ... reste du code inchangé ... */}
    </Box>
  );
}
```

## Étape 3 : Ajouter les paramètres dans Settings

### Créer `src/app/features/encrypted-search/components/EncryptedSearchSettings.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Button,
  Icon,
  Icons,
  Toggle,
  config,
  PopOut,
  Menu,
  MenuItem,
} from 'folds';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { IndexingStatus } from './IndexingStatus';
import {
  isMasterKeyLoaded,
  initializeEncryption,
  loadMasterKey,
  deleteEncryptedSearchDB,
  initMessageIndexer,
  destroyMessageIndexer,
  initHistoricalIndexer,
} from '../index';

export function EncryptedSearchSettings() {
  const mx = useMatrixClient();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEnabled(isMasterKeyLoaded());
  }, []);

  const handleToggleEncryption = async () => {
    setLoading(true);
    try {
      const userId = mx.getUserId();
      const deviceId = mx.getDeviceId();

      if (!userId || !deviceId) {
        throw new Error('User not authenticated');
      }

      if (!enabled) {
        // Activer
        await initializeEncryption(userId, deviceId);
        await loadMasterKey(userId, deviceId);

        const indexer = initMessageIndexer(mx);
        indexer.start();

        setEnabled(true);
      } else {
        // Désactiver
        destroyMessageIndexer();
        setEnabled(false);
      }
    } catch (error) {
      console.error('Failed to toggle encrypted search:', error);
      alert('Failed to toggle encrypted search: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearIndex = async () => {
    if (!confirm('Are you sure you want to clear the search index? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      destroyMessageIndexer();
      await deleteEncryptedSearchDB();
      setEnabled(false);
      alert('Search index cleared successfully');
    } catch (error) {
      console.error('Failed to clear index:', error);
      alert('Failed to clear index: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box direction="Column" gap="400">
      <Box direction="Column" gap="200">
        <Text size="H4">Encrypted Message Search</Text>
        <Text size="T300" priority="400">
          Search through your encrypted messages with advanced filters. The search index is stored
          locally and encrypted.
        </Text>
      </Box>

      <Box direction="Column" gap="300">
        <Box justifyContent="SpaceBetween" alignItems="Center">
          <Box direction="Column" gap="100">
            <Text size="L400">Enable Encrypted Search</Text>
            <Text size="T300" priority="300">
              Create a local encrypted index to search through all your messages
            </Text>
          </Box>
          <Toggle checked={enabled} onCheckedChange={handleToggleEncryption} disabled={loading} />
        </Box>

        {enabled && (
          <>
            <IndexingStatus />

            <Box direction="Column" gap="200">
              <Text size="L400">Danger Zone</Text>

              <Button
                onClick={handleClearIndex}
                variant="Critical"
                size="400"
                fill="Soft"
                disabled={loading}
              >
                <Icon src={Icons.Delete} size="200" />
                <Text>Clear Search Index</Text>
              </Button>
            </Box>
          </>
        )}
      </Box>

      <Box
        style={{
          padding: config.space.S300,
          backgroundColor: 'var(--bg-surface-low)',
          borderRadius: config.radii.R400,
        }}
        direction="Column"
        gap="200"
      >
        <Box gap="200" alignItems="Center">
          <Icon src={Icons.Info} size="200" />
          <Text size="L400">About Encrypted Search</Text>
        </Box>
        <Text size="T300" priority="300">
          • Search works in encrypted rooms (E2EE)
          <br />
          • Messages are indexed locally on your device
          <br />
          • The index is encrypted with AES-256-GCM
          <br />
          • Supports Discord-like filters (from:, in:, has:, etc.)
          <br />• May consume additional storage (~30% of message size)
        </Text>
      </Box>
    </Box>
  );
}
```

### Ajouter dans `src/app/pages/client/Settings.tsx`

```typescript
import { EncryptedSearchSettings } from '../../features/encrypted-search/components/EncryptedSearchSettings';

// Dans le rendu des settings
<SettingTile>
  <EncryptedSearchSettings />
</SettingTile>;
```

## Étape 4 : Exporter les composants

Mettre à jour `/Users/serizao/Documents/projets/cinny-desktop/cinny/src/app/features/encrypted-search/index.ts` pour exporter les composants :

```typescript
// Components
export { SearchModeToggle } from './components/SearchModeToggle';
export { IndexingStatus } from './components/IndexingStatus';
export type { SearchMode } from './components/SearchModeToggle';

// Historical indexer (manquant)
export {
  HistoricalIndexer,
  initHistoricalIndexer,
  getHistoricalIndexer,
  destroyHistoricalIndexer,
} from './indexing/historicalIndexer';
```

## Étape 5 : Nettoyage au logout

### Modifier le logout dans `src/client/action/logout.ts` (ou équivalent)

```typescript
import { clearMasterKey, destroyMessageIndexer } from '../app/features/encrypted-search';

export async function logout() {
  // ... code existant ...

  // NOUVEAU : Nettoyer la recherche chiffrée
  try {
    clearMasterKey(); // Vider la clé de la mémoire
    destroyMessageIndexer(); // Arrêter l'indexer
  } catch (error) {
    console.error('Failed to cleanup encrypted search:', error);
  }

  // ... reste du code existant ...
}
```

## Étape 6 : Tests d'intégration

### Créer des tests

```typescript
// test/encrypted-search.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  initializeEncryption,
  loadMasterKey,
  encryptSearchContent,
  decryptSearchContent,
  parseSearchQuery,
} from '../src/app/features/encrypted-search';

describe('Encrypted Search', () => {
  beforeAll(async () => {
    // Setup
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should encrypt and decrypt content', async () => {
    const content = {
      body: 'test message',
      displayName: 'Alice',
      eventType: 'm.room.message',
      content: {},
    };

    const { encryptedData, iv } = await encryptSearchContent(content, 'room1', 'event1');
    const decrypted = await decryptSearchContent(encryptedData, iv, 'room1', 'event1');

    expect(decrypted.body).toBe(content.body);
  });

  it('should parse search queries correctly', () => {
    const query = parseSearchQuery('from:@alice has:image hello');

    expect(query.from).toBe('@alice');
    expect(query.has).toBe('image');
    expect(query.text).toBe('hello');
  });
});
```

## Notes importantes

### Performance

- L'indexation initiale peut prendre plusieurs minutes
- Utiliser un Web Worker pour l'indexation en arrière-plan (future amélioration)
- Limiter la rétention des messages (ex: 1 an) pour réduire la taille de l'index

### Sécurité

- Ne jamais logger le contenu déchiffré
- Vider la clé de la mémoire au logout
- Considérer l'ajout d'un timeout d'inactivité pour vider la clé

### Compatibilité

- Fonctionne avec matrix-js-sdk 38.2.0+
- Nécessite un navigateur avec support Web Crypto API
- IndexedDB doit être disponible

## Dépannage

### La recherche locale ne fonctionne pas

1. Vérifier que la clé est chargée : `isMasterKeyLoaded()`
2. Vérifier la console pour les erreurs
3. Vérifier que l'indexation est démarrée
4. Essayer de réinitialiser : Clear Index dans Settings

### L'indexation est lente

1. Vérifier la taille de l'historique : `estimateIndexingTime()`
2. Limiter le nombre de rooms à indexer
3. Indexer par lots pendant les heures creuses

### Erreurs de chiffrement

1. Vérifier que la clé n'a pas changé
2. Essayer de recharger la clé : `loadMasterKey()`
3. En dernier recours : Clear Index et réindexer

## Support

Pour toute question ou problème :

1. Consulter [README.md](./README.md)
2. Consulter [ARCHITECTURE.md](./ARCHITECTURE.md)
3. Vérifier les logs console
4. Ouvrir une issue GitHub avec les détails
