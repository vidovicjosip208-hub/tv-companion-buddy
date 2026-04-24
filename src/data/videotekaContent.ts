export interface ContentItem {
  id: string;
  title: string;
  thumbnail: string;
  progress?: number; // 0-100, indicates Continue Watching item
}

export interface ContentRowData {
  title: string;
  titleHighlight?: string;
  items: ContentItem[];
}

export interface ContentDetailsData {
  title: string;
  year: string;
  genre: string;
  episodes?: string;
  rating: string;
  description: string;
}

// Movies
export const movies: ContentItem[] = [];
export const movieRows: ContentRowData[] = [];
export const showRows: ContentRowData[] = [];
