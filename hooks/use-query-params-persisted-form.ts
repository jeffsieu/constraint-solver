import { useEffect, useMemo } from "react";
import { useForm, UseFormProps, UseFormReturn } from "react-hook-form";
import { useQueryState, parseAsString } from "nuqs";
import { z } from "zod";

interface UseQueryParamsPersistedFormProps<T extends z.ZodType<any, any>>
  extends Omit<UseFormProps<z.infer<T>>, "defaultValues"> {
  schema: T;
  defaultValues: z.infer<T>;
  queryParamName?: string;
}

export function useQueryParamsPersistedForm<T extends z.ZodType<any, any>>({
  schema,
  defaultValues,
  queryParamName = "state",
  ...formProps
}: UseQueryParamsPersistedFormProps<T>): UseFormReturn<z.infer<T>> {
  // Use URL state for form data
  const [stateParam, setStateParam] = useQueryState(
    queryParamName,
    parseAsString.withDefault("")
  );

  // Parse and validate form state from URL
  const initialValues = useMemo<z.infer<T>>(() => {
    if (!stateParam) {
      return defaultValues;
    }

    try {
      const decoded = JSON.parse(decodeURIComponent(atob(stateParam)));
      const validated = schema.parse(decoded);
      return validated;
    } catch (error) {
      console.warn("Invalid form state in URL, using defaults:", error);
      return defaultValues;
    }
  }, [stateParam, schema, defaultValues]);

  // Initialize react-hook-form
  const methods = useForm<z.infer<T>>({
    ...formProps,
    defaultValues: initialValues,
  });

  // Sync form state to URL whenever it changes
  useEffect(() => {
    const subscription = methods.watch((formData) => {
      try {
        // Validate before encoding
        const validated = schema.parse(formData);
        const encoded = btoa(encodeURIComponent(JSON.stringify(validated)));
        setStateParam(encoded);
      } catch (error) {
        console.error("Failed to encode state to URL:", error);
      }
    });

    return () => subscription.unsubscribe();
  }, [methods, schema, setStateParam]);

  return methods;
}
