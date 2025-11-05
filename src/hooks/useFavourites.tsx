import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useFavourites = (userId: string | undefined) => {
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadFavourites();
    }
  }, [userId]);

  const loadFavourites = async () => {
    try {
      const { data, error } = await supabase
        .from('user_favourites')
        .select('entity_type, entity_id')
        .eq('user_id', userId);

      if (error) throw error;

      const favSet = new Set(data?.map(f => `${f.entity_type}-${f.entity_id}`) || []);
      setFavourites(favSet);
    } catch (error) {
      console.error('Error loading favourites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavourite = async (entityType: string, entityId: string, entityData: any) => {
    if (!userId) {
      toast.error('Please login to save favourites');
      return;
    }

    const key = `${entityType}-${entityId}`;
    const isFavourited = favourites.has(key);

    try {
      if (isFavourited) {
        // Remove from favourites
        const { error } = await supabase
          .from('user_favourites')
          .delete()
          .eq('user_id', userId)
          .eq('entity_type', entityType)
          .eq('entity_id', entityId);

        if (error) throw error;

        setFavourites(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });

        toast.success('Removed from favourites');
      } else {
        // Add to favourites
        const { error } = await supabase
          .from('user_favourites')
          .insert({
            user_id: userId,
            entity_type: entityType,
            entity_id: entityId,
            entity_data: entityData
          });

        if (error) throw error;

        setFavourites(prev => new Set(prev).add(key));

        toast.success('Added to favourites');
      }
    } catch (error) {
      console.error('Error toggling favourite:', error);
      toast.error('Failed to update favourites');
    }
  };

  const isFavourited = (entityType: string, entityId: string) => {
    return favourites.has(`${entityType}-${entityId}`);
  };

  return { favourites, isFavourited, toggleFavourite, isLoading, refetch: loadFavourites };
};
