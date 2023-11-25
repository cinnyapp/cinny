import { useEffect, useState } from 'react';
import { RelationsEvent, type Relations } from 'matrix-js-sdk/lib/models/relations';

export const useRelations = <T>(
  relations: Relations,
  getRelations: (relations: Relations) => T
) => {
  const [data, setData] = useState(() => getRelations(relations));

  useEffect(() => {
    const handleUpdate = () => {
      setData(getRelations(relations));
    };
    relations.on(RelationsEvent.Add, handleUpdate);
    relations.on(RelationsEvent.Redaction, handleUpdate);
    relations.on(RelationsEvent.Remove, handleUpdate);
    return () => {
      relations.removeListener(RelationsEvent.Add, handleUpdate);
      relations.removeListener(RelationsEvent.Redaction, handleUpdate);
      relations.removeListener(RelationsEvent.Remove, handleUpdate);
    };
  }, [relations, getRelations]);

  return data;
};
