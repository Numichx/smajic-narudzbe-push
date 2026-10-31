export function notImplemented(operation: string): Response {
  return Response.json(
    { error: `Operacija "${operation}" još nije implementirana.` },
    { status: 501 },
  );
}
