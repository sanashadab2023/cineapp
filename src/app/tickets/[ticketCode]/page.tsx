import TicketClient from "./TicketClient";

export function generateStaticParams() {
  return [
    { ticketCode: "preview" },
    { ticketCode: "demo" },
  ];
}

export default function TicketPage() {
  return <TicketClient />;
}
