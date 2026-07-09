import React, { useEffect, useState, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { Box, Scroll, Text, config, IconButton, Icon, Icons } from 'folds';
import { settingsAtom } from '../../../state/settings';
import * as css from './styles.css';

export type KlipyGif = {
  id: string;
  title: string;
  file: {
    xs?: { gif?: { url: string } };
    sm?: { gif?: { url: string } };
    md?: { gif?: { url: string } };
    hd?: { gif?: { url: string } };
  };
};

export type KlipyCategory = {
  category: string;
  query: string;
  preview_url: string;
};

type GifBoardProps = {
  query?: string;
  onGifSelect?: (url: string, title: string) => void;
};

export function GifBoard({ query, onGifSelect }: GifBoardProps) {
  const [gifs, setGifs] = useState<KlipyGif[]>([]);
  const [favorites, setFavorites] = useState<KlipyGif[]>([]);
  const [categories, setCategories] = useState<KlipyCategory[]>([]);
  const [viewMode, setViewMode] = useState<'Categories' | 'Trending' | 'Favorites' | 'Search' | 'CategorySearch'>('Categories');
  const [internalQuery, setInternalQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const FAVORITES_KEY = 'klipy_favorites';

  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse klipy favorites', e);
      }
    }
  }, []);

  const settings = useAtomValue(settingsAtom);
  const KLIPY_API_KEY = settings.klipyApiKey || 'DPZfd1JYHjUe84twiXKjOYs9ziCLIVyg8QaDtdqbnnRXmydDiLptRIsWWHU5JPNo';

  useEffect(() => {
    if (query && query.trim() !== '') {
      setViewMode('Search');
      setInternalQuery('');
    } else if (viewMode === 'Search') {
      setViewMode('Categories');
    }
  }, [query]);

  useEffect(() => {
    if (viewMode === 'Categories' && categories.length === 0) {
      let active = true;
      fetch(`https://api.klipy.com/api/v1/${KLIPY_API_KEY}/gifs/categories`)
        .then(res => res.json())
        .then(data => {
          if (active && data?.data?.categories) {
            setCategories(data.data.categories);
          }
        })
        .catch(console.error);
      return () => { active = false; };
    }
  }, [viewMode, KLIPY_API_KEY, categories.length]);

  useEffect(() => {
    let active = true;

    const fetchGifs = async () => {
      if (viewMode === 'Favorites') return;

      setLoading(true);
      try {
        const isTrending = viewMode === 'Trending' || viewMode === 'Categories';
        const endpoint = isTrending ? 'trending' : 'search';
        const urlObj = new URL(`https://api.klipy.com/api/v1/${KLIPY_API_KEY}/gifs/${endpoint}`);
        urlObj.searchParams.set('limit', '50');
        
        if (!isTrending) {
          const activeQuery = (viewMode === 'Search' ? query : internalQuery) || '';
          if (activeQuery.trim() === '') return;
          urlObj.searchParams.set('q', activeQuery.trim());
        }

        const url = urlObj.toString();
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch GIFs');
        }

        const data = await response.json();
        if (active && data.data && data.data.data) {
          setGifs(data.data.data);
        }
      } catch (err) {
        console.error(err);
        if (active) setGifs([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    const timeout = setTimeout(fetchGifs, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query, internalQuery, viewMode, KLIPY_API_KEY]);

  const handleGifClick = (gif: KlipyGif) => {
    if (!onGifSelect) return;
    const url = gif.file?.md?.gif?.url || gif.file?.sm?.gif?.url || gif.file?.hd?.gif?.url || gif.file?.xs?.gif?.url;
    if (url) {
      onGifSelect(url, gif.title || 'GIF');
    }
  };

  const toggleFavorite = (evt: React.MouseEvent, gif: KlipyGif) => {
    evt.stopPropagation();
    setFavorites((prev) => {
      const isFav = prev.some((f) => f.id === gif.id);
      const next = isFav ? prev.filter((f) => f.id !== gif.id) : [gif, ...prev];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const displayedGifs = viewMode === 'Favorites' ? favorites : gifs;

  const renderHeader = (title: string) => (
    <Box direction="Row" gap="200" alignItems="Center" style={{ paddingBottom: config.space.S200 }}>
      <IconButton size="300" variant="Surface" radii="Pill" onClick={() => setViewMode('Categories')}>
        <Icon src={Icons.ArrowLeft} />
      </IconButton>
      <Text size="L400">{title}</Text>
    </Box>
  );

  const CategoryCard = ({ title, bg, onClick, icon }: { title: string, bg?: string, onClick: () => void, icon?: any }) => (
    <Box
      as="button"
      onClick={onClick}
      style={{
        position: 'relative',
        height: '100px',
        borderRadius: config.radii.R300,
        overflow: 'hidden',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        background: bg ? 'var(--bg-surface-variant)' : 'var(--bg-surface-variant)',
      }}
    >
      {bg && (
        <img
          src={bg}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
      <Box
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text size="L400" weight="Bold" style={{ color: 'white' }}>
          <span style={{ textTransform: 'capitalize' }}>{title}</span>
        </Text>
        {icon && <Icon src={icon} size="400" style={{ marginLeft: 8, color: 'white' }} filled />}
      </Box>
    </Box>
  );

  return (
    <Scroll ref={scrollRef} size="400" hideTrack>
      <Box direction="Column" gap="200" style={{ padding: config.space.S200 }}>
        {viewMode === 'Categories' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: config.space.S200 }}>
            <CategoryCard
              title="Favorites"
              icon={Icons.Star}
              bg={favorites.length > 0 ? (favorites[0].file?.md?.gif?.url || favorites[0].file?.xs?.gif?.url) : undefined}
              onClick={() => setViewMode('Favorites')}
            />
            <CategoryCard
              title="Trending"
              bg={gifs.length > 0 ? (gifs[0].file?.md?.gif?.url || gifs[0].file?.xs?.gif?.url) : undefined}
              onClick={() => setViewMode('Trending')}
            />
            {categories.map(cat => (
              <CategoryCard
                key={cat.category}
                title={cat.category}
                bg={cat.preview_url}
                onClick={() => {
                  setInternalQuery(cat.query);
                  setViewMode('CategorySearch');
                }}
              />
            ))}
          </div>
        ) : (
          <>
            {viewMode === 'Favorites' && renderHeader('Favorites')}
            {viewMode === 'Trending' && renderHeader('Trending')}
            {viewMode === 'CategorySearch' && renderHeader(internalQuery)}

            {viewMode !== 'Search' && viewMode !== 'Favorites' && loading && displayedGifs.length === 0 ? (
              <Text align="Center">Loading...</Text>
            ) : displayedGifs.length === 0 ? (
              <Text align="Center">No GIFs found</Text>
            ) : (
              <div
                style={{
                  columnCount: 2,
                  columnGap: config.space.S200,
                }}
              >
                {displayedGifs.map((gif) => {
                  const previewUrl = gif.file?.xs?.gif?.url || gif.file?.sm?.gif?.url || gif.file?.md?.gif?.url;
                  if (!previewUrl) return null;
                  const isFav = favorites.some((f) => f.id === gif.id);
                  
                  return (
                    <Box
                      as="button"
                      key={gif.id}
                      onClick={() => handleGifClick(gif)}
                      style={{
                        display: 'block',
                        width: '100%',
                        marginBottom: config.space.S200,
                        breakInside: 'avoid',
                        position: 'relative',
                        border: 'none',
                        padding: 0,
                        background: 'none',
                        cursor: 'pointer',
                        borderRadius: config.radii.R300,
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={previewUrl}
                        alt={gif.title}
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                        loading="lazy"
                      />
                      <IconButton
                        variant="Surface"
                        size="300"
                        radii="300"
                        style={{ position: 'absolute', top: 4, right: 4 }}
                        onClick={(e: React.MouseEvent) => toggleFavorite(e, gif)}
                      >
                        <Icon src={Icons.Star} filled={isFav} />
                      </IconButton>
                    </Box>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Box>
    </Scroll>
  );
}
