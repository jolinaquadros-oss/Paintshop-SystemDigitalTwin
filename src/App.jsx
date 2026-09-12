import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { legacyMarkup } from "./legacyMarkup";
import { initPaintShopDigitalTwin } from "./paintShopSimulation";
import PaintingBoothOverlay from "./PaintingBoothOverlay";
import "./styles.css";

export default function App() {
  const rootRef = useRef(null);
  const [boothOpen, setBoothOpen] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.innerHTML = legacyMarkup;
    
    // Connect vanilla button click to React state
    window.__openBoothOverlay = () => {
      setBoothOpen(true);
    };

    initPaintShopDigitalTwin();
  }, []);

  return (
    <>
      <div ref={rootRef} />
      {boothOpen &&
        document.getElementById("booth-inline-slot") &&
        createPortal(
          <PaintingBoothOverlay isOpen={boothOpen} onClose={() => setBoothOpen(false)} />,
          document.getElementById("booth-inline-slot")
        )}
    </>
  );
}
