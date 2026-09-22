export function FormAlert({ error, success }: { error?: string; success?: string }) {
  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p className="text-sm text-teal" role="status">
        {success}
      </p>
    );
  }
  return null;
}
