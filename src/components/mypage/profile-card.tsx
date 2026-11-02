import { Droplet } from "lucide-react";
import { Flag } from "@/components/flag";
import { requireUser, toProfile } from "@/lib/auth/dal";
import { VOLUME_BRACKETS } from "@/lib/volume";

/** Profile summary (reads the session, so render it inside Suspense). */
export async function ProfileCard() {
  const profile = toProfile(await requireUser());

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-accent/30 via-violet/30 to-pink/30 text-2xl font-black text-ink ring-1 ring-line-strong"
          aria-hidden
        >
          {Array.from(profile.username)[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{profile.username}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <Flag code={profile.countryCode} name={profile.countryName} />
              {profile.countryName}
            </span>
            <span className="text-muted">·</span>
            <span>{profile.age}歳</span>
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-bg/60 px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs text-ink-2">
          <Droplet className="size-3.5 text-accent" aria-hidden />
          1回あたりの推定量
        </p>
        <p className="mt-0.5 text-2xl font-bold">
          {profile.volumePerSessionMl.toFixed(1)}
          <span className="ml-0.5 text-sm font-semibold text-ink-2">ml</span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted">
          {VOLUME_BRACKETS.map((b) => `${b.label} ${b.volumeMl.toFixed(1)}`).join(" / ")}
        </p>
      </div>
    </section>
  );
}

export function ProfileCardSkeleton() {
  return <div className="h-28 animate-pulse rounded-3xl bg-surface" aria-hidden />;
}
