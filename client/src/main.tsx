import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Buffer } from "buffer";
import process from "process";

globalThis.Buffer = Buffer;
globalThis.process = process;

createRoot(document.getElementById("root")!).render(<App />);
