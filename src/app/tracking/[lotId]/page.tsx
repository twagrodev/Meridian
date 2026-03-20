interface TrackingPageProps {
  params: Promise<{ lotId: string }>;
}

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { lotId } = await params;

  return (
    <div className="mx-auto max-w-2xl py-12 px-4">
      <h1 className="text-2xl font-bold mb-4">Supply Chain Tracker</h1>
      <p className="text-muted-foreground mb-6">
        Tracking lot: <strong>{lotId}</strong>
      </p>
      <p className="text-muted-foreground">
        Public supply chain timeline and QR verification will appear here.
      </p>
    </div>
  );
}
