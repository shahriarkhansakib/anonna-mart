import { useEffect } from "react";

export const useDocumentTitle = (title: string) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} · Anonna Mart` : "Anonna Mart";

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
};
