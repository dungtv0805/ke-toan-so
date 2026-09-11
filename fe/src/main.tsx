import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/responsive.css";
import "./styles/responsive-bao-cao.css";
import "./styles/responsive-danh-sach.css";
import "./styles/responsive-cau-hinh.css";
import "./styles/responsive-nhap-lieu.css";
import "./common";

createRoot(document.getElementById("root")!).render(<App />);
