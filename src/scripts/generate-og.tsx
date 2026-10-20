import { ImageResponse } from "next/og";
import fs from "fs";

async function generateOgImages() {
  const fontBold = fs.readFileSync("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf");
  const fontRegular = fs.readFileSync("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf");

  const res = new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#020617",
          backgroundImage:
            "radial-gradient(circle at 15% 15%, rgba(99, 102, 241, 0.32) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(139, 92, 246, 0.28) 0%, transparent 45%)",
          fontFamily: "Liberation Sans",
          padding: "54px 64px",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Subtle decorative inner border */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            right: "20px",
            bottom: "20px",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            borderRadius: "28px",
            display: "flex",
          }}
        />

        {/* Top Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          {/* Brand Logo & Name */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                backgroundColor: "rgba(99, 102, 241, 0.22)",
                border: "1px solid rgba(129, 140, 248, 0.45)",
              }}
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 150 150"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 74.03 38.00 C 74.19 37.84, 74.58 35.70, 75.00 37.03 C 75.42 38.36, 75.64 42.67, 76.57 46.00 C 77.50 49.33, 79.40 54.17, 80.57 57.00 C 81.74 59.83, 81.72 60.00, 83.57 63.00 C 85.42 66.00, 89.59 72.17, 91.66 75.00 C 93.74 77.83, 94.21 78.17, 95.99 80.00 C 97.77 81.83, 103.00 83.76, 102.33 86.00 C 101.66 88.24, 94.94 91.09, 92.00 93.43 C 89.06 95.76, 86.90 97.57, 84.66 100.00 C 82.43 102.43, 80.18 105.38, 78.57 108.00 C 76.96 110.62, 75.76 114.53, 75.00 115.75 C 74.24 116.97, 74.75 116.62, 74.00 115.33 C 73.25 114.03, 71.67 110.05, 70.50 108.00 C 69.34 105.95, 69.42 105.57, 67.01 103.00 C 64.59 100.43, 59.25 95.26, 56.00 92.60 C 52.75 89.93, 49.04 88.10, 47.50 87.00 C 45.96 85.90, 45.12 88.00, 46.76 86.00 C 48.39 84.00, 54.72 78.00, 57.34 75.00 C 59.95 72.00, 60.99 70.17, 62.43 68.00 C 63.87 65.83, 64.67 64.67, 66.00 62.01 C 67.33 59.34, 69.36 54.67, 70.43 52.00 C 71.50 49.33, 71.83 48.33, 72.43 46.00 C 73.03 43.67, 73.76 39.33, 74.03 38.00 C 74.30 36.67, 73.87 38.16, 74.03 38.00 Z M 73.99 64.00 L 90.57 86.00 L 75.00 97.57 L 58.43 86.00 L 73.99 64.00 Z"
                  fill="#818cf8"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: "26px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#ffffff",
              }}
            >
              LoreTracker
            </span>
          </div>

          {/* Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: "9999px",
              backgroundColor: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(129, 140, 248, 0.35)",
              color: "#a5b4fc",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            DISNEY LORCANA TCG
          </div>
        </div>

        {/* Center Hero Block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: "960px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "66px",
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#ffffff",
              marginBottom: "20px",
            }}
          >
            Dominez la compétition
          </div>

          <div
            style={{
              display: "flex",
              fontSize: "23px",
              color: "#94a3b8",
              lineHeight: 1.5,
              textAlign: "center",
              maxWidth: "880px",
            }}
          >
            Synchronisez vos matchs Duels.ink, suivez les statistiques et propulsez votre équipe Lorcana en temps réel.
          </div>
        </div>

        {/* Bottom Feature Bar */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            alignItems: "center",
            width: "100%",
            justifyContent: "center",
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 24px",
              borderRadius: "14px",
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              border: "1px solid rgba(51, 65, 85, 0.8)",
              color: "#e2e8f0",
              fontSize: "17px",
              fontWeight: 700,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#818cf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
              <line x1="13" y1="19" x2="19" y2="13" />
              <line x1="16" y1="16" x2="20" y2="20" />
              <line x1="19" y1="21" x2="21" y2="19" />
            </svg>
            <span>Sync Duels.ink</span>
          </div>

          {/* Card 2 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 24px",
              borderRadius: "14px",
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              border: "1px solid rgba(51, 65, 85, 0.8)",
              color: "#e2e8f0",
              fontSize: "17px",
              fontWeight: 700,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a78bfa"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
              <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            <span>Classement & Roster</span>
          </div>

          {/* Card 3 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 24px",
              borderRadius: "14px",
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              border: "1px solid rgba(51, 65, 85, 0.8)",
              color: "#e2e8f0",
              fontSize: "17px",
              fontWeight: 700,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>Stats & Historique</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Liberation Sans",
          data: fontBold,
          style: "normal",
          weight: 700,
        },
        {
          name: "Liberation Sans",
          data: fontRegular,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 1. Save to public/og-image.png
  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync("public/og-image.png", buffer);
  console.log("Saved: public/og-image.png (" + buffer.length + " bytes)");

  // 2. Save to src/app/opengraph-image.png (Next.js static convention)
  fs.writeFileSync("src/app/opengraph-image.png", buffer);
  console.log("Saved: src/app/opengraph-image.png (" + buffer.length + " bytes)");

  // 3. Save to src/app/twitter-image.png (Next.js Twitter convention)
  fs.writeFileSync("src/app/twitter-image.png", buffer);
  console.log("Saved: src/app/twitter-image.png (" + buffer.length + " bytes)");
}

generateOgImages().catch(console.error);
