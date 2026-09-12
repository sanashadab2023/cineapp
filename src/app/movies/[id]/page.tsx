import MovieDetailClient from "./MovieDetailClient";

export function generateStaticParams() {
  return [
    { id: "dune-part-two" },
    { id: "oppenheimer" },
    { id: "interstellar-imax" },
    { id: "cyber-odyssey-2099" },
    { id: "neon-tokyo-shadow-syndicate" },
    { id: "the-dark-knight" },
    { id: "preview" },
  ];
}

export default function MoviePage() {
  return <MovieDetailClient />;
}
