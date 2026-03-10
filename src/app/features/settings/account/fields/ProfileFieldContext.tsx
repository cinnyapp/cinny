import React, {
  FunctionComponent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { deepCompare } from 'matrix-js-sdk/lib/utils';
import { ExtendedProfile } from '../../../../hooks/useExtendedProfile';

/// These types ensure the element functions are actually able to manipulate
/// the profile fields they're mapped to. The <C> generic parameter represents
/// extra "context" props which are passed to every element.

// strip the index signature from ExtendedProfile using mapped type magic.
// keeping the index signature causes weird typechecking issues further down the line
// plus there should never be field elements passed with keys which don't exist in ExtendedProfile.
type ExtendedProfileKeys = keyof {
  [Property in keyof ExtendedProfile as string extends Property
    ? never
    : Property]: ExtendedProfile[Property];
};

// these are the props which all field elements must accept.
// this is split into `RawProps` and `Props` so we can type `V` instead of
// spraying `ExtendedProfile[K]` all over the place.
// don't use this directly, use the `ProfileFieldElementProps` type instead
type ProfileFieldElementRawProps<V, C> = {
  defaultValue: V;
  value: V;
  setValue: (value: V) => void;
} & C;

export type ProfileFieldElementProps<
  K extends ExtendedProfileKeys,
  C
> = ProfileFieldElementRawProps<ExtendedProfile[K], C>;

// the map of extended profile keys to field element functions
type ProfileFieldElements<C> = {
  [Property in ExtendedProfileKeys]?: FunctionComponent<ProfileFieldElementProps<Property, C>>;
};

type ProfileFieldContextProps<C> = {
  fieldDefaults: ExtendedProfile;
  fieldElements: ProfileFieldElements<C>;
  children: (
    reset: () => void,
    hasChanges: boolean,
    fields: ExtendedProfile,
    fieldElements: ReactNode
  ) => ReactNode;
  context: C;
};

/// This element manages the pending state of the profile field widgets.
/// It takes the default values of each field, as well as a map associating a profile field key
/// with an element _function_ (not a rendered element!) that will be used to edit that field.
/// It renders the editor elements internally using React.createElement and passes the rendered
/// elements into the child UI. This allows it to handle the pending state entirely by itself,
/// and provides strong typechecking.
export function ProfileFieldContext<C>({
  fieldDefaults,
  fieldElements: fieldElementConstructors,
  children,
  context,
}: ProfileFieldContextProps<C>): ReactNode {
  const [fields, setFields] = useState<ExtendedProfile>(fieldDefaults);
  
  // this callback also runs when fieldDefaults changes,
  // which happens when the profile is saved and the pending fields become the new defaults
  const reset = useCallback(() => {
    setFields(fieldDefaults);
  }, [fieldDefaults]);

  // set the pending values to the defaults on the first render
  useEffect(() => {
    reset();
  }, [reset]);

  const setField = useCallback(
    (key: string, value: unknown) => {
      setFields({
        ...fields,
        [key]: value,
      });
    },
    [fields]
  );

  const hasChanges = useMemo(
    () =>
      Object.entries(fields).find(
        ([key, value]) =>
          // deep comparison is necessary here because field values can be any JSON type
          !deepCompare(fieldDefaults[key as keyof ExtendedProfile], value)
      ) !== undefined,
    [fields, fieldDefaults]
  );

  const createElement = useCallback(
    <K extends ExtendedProfileKeys>(key: K, element: ProfileFieldElements<C>[K]) => {
      const props: ProfileFieldElementRawProps<ExtendedProfile[K], C> = {
        ...context,
        defaultValue: fieldDefaults[key],
        value: fields[key],
        setValue: (value) => setField(key, value),
        key,
      };
      // element can be undefined if the field defaults didn't include its key,
      // which means the HS doesn't support setting that field
      if (element !== undefined) {
        return React.createElement(element, props);
      }
      return undefined;
    },
    [context, fieldDefaults, fields, setField]
  );

  const fieldElements = Object.entries(fieldElementConstructors).map(([key, element]) =>
    // @ts-expect-error TypeScript doesn't quite understand the magic going on here
    createElement(key, element)
  );

  return children(reset, hasChanges, fields, fieldElements);
}
