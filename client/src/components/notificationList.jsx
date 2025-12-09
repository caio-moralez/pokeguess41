// client/src/components/NotificationList.jsx
import { motion, AnimatePresence } from "framer-motion";
import { useNotification } from "../context/notificationContext";

export default function NotificationList() {
  const { notifications } = useNotification();

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        zIndex: 9999,
      }}
    >
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            style={{
              background: n.type === "error" ? "#f70000d2" : "#ffd54f",
              color: n.type === "error" ? "#f4f751ff" : "#000",
              padding: "14px 20px",
              border: "4px solid #111",
              borderRadius: "12px",
              fontFamily: '"PokemonSolid", Inter, sans-serif',
              fontWeight: 700,
              boxShadow: "0 6px 0 rgba(0,0,0,0.2)",
              minWidth: "260px",
              textAlign: "center",
              textShadow: n.type === "error"
                ? "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000"
                : "none",
            }}
          >
            {typeof n.message === "string" ? n.message : JSON.stringify(n.message)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
