import { Metadata } from "next";
import ReservationPageClient from "./ReservationPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reservation Details — StockReserve",
  description: "View and manage your reservation. Confirm purchase or cancel to release stock.",
};

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReservationPageClient reservationId={id} />;
}
