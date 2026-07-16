const INK = "#18181b";
const GOLD = "#eab308";

/**
 * Abstract anvil silhouette — leans into "Forge" rather than generic
 * document clipart. Pieces overlap slightly at every seam so the shape
 * reads as one continuous object, not floating blocks. Shared between the
 * generated favicon/app-icon routes and the marketing nav so they can't
 * drift out of sync.
 */
export function ResumeForgeMark({ size }: { size: number }) {
  const s = size / 32;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: INK,
        borderRadius: 7 * s,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 24 * s,
          height: 17 * s,
          display: "flex",
        }}
      >
        {/* Base */}
        <div
          style={{
            position: "absolute",
            top: 9 * s,
            left: 0,
            width: 17 * s,
            height: 8 * s,
            background: GOLD,
            borderRadius: `${1 * s}px 0 ${2 * s}px ${2 * s}px`,
          }}
        />
        {/* Waist — kept narrow so the face/base blocks read as a clear
            hourglass silhouette even at 16px */}
        <div
          style={{
            position: "absolute",
            top: 4.5 * s,
            left: 6 * s,
            width: 4 * s,
            height: 5.5 * s,
            background: GOLD,
          }}
        />
        {/* Face (flat top block the waist sits under) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 1 * s,
            width: 14 * s,
            height: 5 * s,
            background: GOLD,
            borderRadius: `${1.5 * s}px ${1.5 * s}px 0 0`,
          }}
        />
        {/* Horn — short and bold rather than a thin sliver, so it survives
            shrinking to a 16px favicon */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 14 * s,
            width: 7 * s,
            height: 5 * s,
            background: GOLD,
            clipPath: "polygon(0 0, 100% 45%, 0 100%)",
          }}
        />
      </div>
    </div>
  );
}
