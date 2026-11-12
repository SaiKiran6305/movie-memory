import { z } from "zod";
export const movieSchema = z.object({
  movie: z.string().trim().min(1, "Enter your favorite movie.")
    .max(200, "Keep the movie title under 201 characters.")
    .refine(value => !/[\u0000-\u001f\u007f]/.test(value), "Use a single-line movie title."),
}).strict();
export function movieKey(title: string) { return title.trim().replace(/\s+/g, " ").toLowerCase(); }
