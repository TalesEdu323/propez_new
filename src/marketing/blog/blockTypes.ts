export type BlogContentBlock =
  | {
      type: 'text';
      data: { html?: string };
    }
  | {
      type: 'image_text';
      data: {
        text?: string;
        image_url?: string;
        image_position?: 'left' | 'right';
        image_ratio?: '50-50' | '60-40' | '70-30' | '40-60' | '30-70';
      };
    };

export interface BlogPostSummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  cover_image: string | null;
  author_name: string | null;
  author_social: string | null;
  created_at: string;
  published_at: string | null;
  tags?: string[];
}

export interface BlogPostDetail extends BlogPostSummary {
  content: BlogContentBlock[];
}
