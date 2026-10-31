"use client";

type PinPadProps = {
  pin: string;
  onPinChange: (pin: string) => void;
  onSubmit: () => void;
};

export function PinPad({ pin, onPinChange, onSubmit }: PinPadProps) {
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="block text-sm font-medium text-stone-700" htmlFor="pin">
        PIN
      </label>
      <input
        autoComplete="current-password"
        className="w-full rounded-lg border border-stone-300 px-3 py-2"
        id="pin"
        inputMode="numeric"
        onChange={(event) => onPinChange(event.target.value)}
        type="password"
        value={pin}
      />
      <button
        className="w-full rounded-lg bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-700"
        type="submit"
      >
        Prijava
      </button>
    </form>
  );
}
