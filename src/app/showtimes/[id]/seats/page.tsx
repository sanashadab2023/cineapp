import SeatsClient from "./SeatsClient";

export function generateStaticParams() {
  return [
    { id: "st-dune-1" },
    { id: "st-opp-1" },
    { id: "st-int-1" },
    { id: "preview" },
  ];
}

export default function SeatsPage() {
  return <SeatsClient />;
}
