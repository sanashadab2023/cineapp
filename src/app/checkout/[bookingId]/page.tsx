import CheckoutClient from "./CheckoutClient";

export function generateStaticParams() {
  return [
    { bookingId: "preview" },
    { bookingId: "demo" },
  ];
}

export default function CheckoutPage() {
  return <CheckoutClient />;
}
