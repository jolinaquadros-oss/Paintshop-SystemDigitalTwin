import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { legacyMarkup } from "./legacyMarkup";
import { initPaintShopDigitalTwin } from "./paintShopSimulation";
import PaintingBoothOverlay from "./PaintingBoothOverlay";
import "./styles.css";

export default function App() {
  const rootRef = useRef(null);
  const lineFocusRef = useRef(false);
  const [boothOpen, setBoothOpen] = useState(false);
  const [lineFocus, setLineFocus] = useState(false);

  lineFocusRef.current = lineFocus;
  const closeBooth = () => {
    setBoothOpen(false);
    const button = document.getElementById("btnFocusBooth");
    if (button) {
      button.textContent = "Painting Booth View";
      button.title = "Show the Painting Booth inside the line view";
    }
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.innerHTML = legacyMarkup;
    
    // Connect vanilla button click to React state
    window.__toggleBoothOverlay = () => {
      setBoothOpen(current => {
        const next = !current;
        const button = document.getElementById("btnFocusBooth");
        if (button) {
          button.textContent = next ? "Close Painting Booth" : "Painting Booth View";
          button.title = next ? "Close the Painting Booth view" : "Show the Painting Booth inside the line view";
        }
        return next;
      });
    };
    window.__toggleLineFocus = () => {
      const next = !lineFocusRef.current;
      lineFocusRef.current = next;
      setLineFocus(next);
      window.__setLineFocus?.(next);

      if (next) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(err => {
            console.error("Could not enter full-screen mode:", err);
          });
        }
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.error("Could not exit full-screen mode:", err);
        });
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && lineFocusRef.current) {
        lineFocusRef.current = false;
        setLineFocus(false);
        window.__setLineFocus?.(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    initPaintShopDigitalTwin();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      delete window.__toggleBoothOverlay;
      delete window.__toggleLineFocus;
      delete window.__setLineFocus;
    };
  }, []);

  return (
    <div className={`app-shell${lineFocus ? " line-focus-mode" : ""}`}>
      <div ref={rootRef} />
      {boothOpen &&
        document.getElementById("booth-inline-slot") &&
        createPortal(
          <PaintingBoothOverlay isOpen={boothOpen} onClose={closeBooth} />,
          document.getElementById("booth-inline-slot")
        )}
    </div>
  );
}
